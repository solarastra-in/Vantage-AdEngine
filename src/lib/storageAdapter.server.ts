/**
 * storageAdapter.ts
 *
 * A minimal, pluggable key-value interface so the credential vault,
 * idempotency store, and audit log can be backed by something durable
 * instead of a plain in-memory Map. Every one of those three currently
 * loses all state on any restart, redeploy, or horizontal scale-out --
 * this app is bundled and run as `node dist/server.cjs` (not classic
 * per-request serverless), so it's not lost on literally every request,
 * but Vercel can still restart, redeploy, or run multiple instances behind
 * a load balancer, and each of those loses or fragments this state.
 *
 * Two implementations ship here:
 *  - InMemoryStorageAdapter: current behavior, default. Fine for local dev.
 *  - FileStorageAdapter: durable across restarts for a SINGLE Node process
 *    (writes JSON to disk). Solves "the process restarted" but NOT
 *    "requests are load-balanced across multiple instances" -- multiple
 *    instances each writing their own local file would silently diverge.
 *
 * For multi-instance production deployment, plug in a real shared store
 * (Redis, Postgres, or Firestore via firebase-admin with a service
 * account) by implementing this same interface -- see the TODO at the
 * bottom for what that adapter needs once credentials are available.
 */

export interface StorageAdapter {
  get<T = any>(key: string): Promise<T | null>;
  set<T = any>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  /** Keys matching a prefix. Used for tenant-scoped listing (e.g. all credentials for one org). */
  listKeys(prefix: string): Promise<string[]>;
}

interface InMemoryEntry {
  value: any;
  expiresAt: number | null;
}

/**
 * Default adapter -- exactly the behavior every store had before this
 * refactor (a plain object/Map), just behind the shared interface so
 * swapping in a durable adapter later doesn't require touching the vault,
 * idempotency store, or audit log again.
 */
export class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, InMemoryEntry>();

  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T = any>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.store.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : null });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async listKeys(prefix: string): Promise<string[]> {
    return [...this.store.keys()].filter(k => k.startsWith(prefix));
  }
}

/**
 * File-based JSON persistence. Durable across process restarts on a single
 * instance/disk. Writes are debounced and serialized to avoid concurrent
 * writers corrupting the file; reads are served from an in-memory cache
 * that's hydrated from disk once at startup and kept in sync on every write.
 *
 * NOT safe for multiple concurrent instances sharing the same volume
 * without a real lock -- each instance's in-memory cache would drift from
 * what's on disk. Intended for single-instance deployments only.
 */
export class FileStorageAdapter implements StorageAdapter {
  private cache: Map<string, InMemoryEntry> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private filePath: string) {}

  private async ensureLoaded(): Promise<Map<string, InMemoryEntry>> {
    if (this.cache) return this.cache;
    const fs = await import('fs/promises');
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed: Record<string, InMemoryEntry> = JSON.parse(raw);
      this.cache = new Map(Object.entries(parsed));
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        // eslint-disable-next-line no-console
        console.warn(`[FileStorageAdapter] Failed to read ${this.filePath}, starting empty:`, err.message);
      }
      this.cache = new Map();
    }
    return this.cache;
  }

  private async persist(): Promise<void> {
    if (!this.cache) return;
    const fs = await import('fs/promises');
    const obj = Object.fromEntries(this.cache.entries());
    const tmpPath = `${this.filePath}.tmp`;
    // Write to a temp file then rename -- atomic on POSIX filesystems, so a
    // crash mid-write can't leave a half-written, corrupt JSON file behind.
    await fs.writeFile(tmpPath, JSON.stringify(obj), 'utf8');
    await fs.rename(tmpPath, this.filePath);
  }

  private queueWrite(): void {
    this.writeQueue = this.writeQueue.then(() => this.persist()).catch(err => {
      // eslint-disable-next-line no-console
      console.error('[FileStorageAdapter] Persist failed:', err);
    });
  }

  async get<T = any>(key: string): Promise<T | null> {
    const cache = await this.ensureLoaded();
    const entry = cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      cache.delete(key);
      this.queueWrite();
      return null;
    }
    return entry.value as T;
  }

  async set<T = any>(key: string, value: T, ttlMs?: number): Promise<void> {
    const cache = await this.ensureLoaded();
    cache.set(key, { value, expiresAt: ttlMs ? Date.now() + ttlMs : null });
    this.queueWrite();
  }

  async delete(key: string): Promise<void> {
    const cache = await this.ensureLoaded();
    cache.delete(key);
    this.queueWrite();
  }

  async listKeys(prefix: string): Promise<string[]> {
    const cache = await this.ensureLoaded();
    return [...cache.keys()].filter(k => k.startsWith(prefix));
  }

  /** Waits for any pending write to finish -- useful in tests and before shutdown. */
  async flush(): Promise<void> {
    await this.writeQueue;
  }
}

/**
 * Firestore-backed persistence via the Admin SDK -- the multi-instance
 * answer FileStorageAdapter explicitly can't be (each instance's local
 * disk is separate). Uses the same firebase project/Firestore database
 * this app already depends on client-side, so there's no new infra to
 * provision beyond the service account already needed for
 * firebaseAdmin.server.ts's other features (items 2 and 3 from the prior
 * review). Documents live under `_kv_store/{sanitizedKey}` -- a flat,
 * app-owned collection separate from the `organizations/...` tree the rest
 * of the app uses, so this doesn't need to know about or respect
 * firestore.rules (Admin SDK writes bypass rules entirely by design).
 */
export class FirestoreStorageAdapter implements StorageAdapter {
  private collectionName = '_kv_store';

  /** Firestore document IDs can't contain '/'; keys here often do (e.g. "org-a:meta"). */
  private sanitizeKey(key: string): string {
    return key.replace(/\//g, '__SLASH__');
  }

  private async db() {
    const { getAdminFirestore } = await import('./firebaseAdmin.server');
    const db = getAdminFirestore();
    if (!db) {
      throw new Error(
        'FirestoreStorageAdapter requires the Admin SDK to be configured ' +
        '(FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS). ' +
        'Set STORAGE_BACKEND=memory or file instead if you have not provisioned a service account yet.'
      );
    }
    return db;
  }

  async get<T = any>(key: string): Promise<T | null> {
    const db = await this.db();
    const doc = await db.collection(this.collectionName).doc(this.sanitizeKey(key)).get();
    if (!doc.exists) return null;
    const data = doc.data() as { value: T; expiresAt: number | null };
    if (data.expiresAt !== null && Date.now() > data.expiresAt) {
      await doc.ref.delete();
      return null;
    }
    return data.value;
  }

  async set<T = any>(key: string, value: T, ttlMs?: number): Promise<void> {
    const db = await this.db();
    await db
      .collection(this.collectionName)
      .doc(this.sanitizeKey(key))
      .set({ key, value, expiresAt: ttlMs ? Date.now() + ttlMs : null, updatedAt: Date.now() });
  }

  async delete(key: string): Promise<void> {
    const db = await this.db();
    await db.collection(this.collectionName).doc(this.sanitizeKey(key)).delete();
  }

  async listKeys(prefix: string): Promise<string[]> {
    const db = await this.db();
    // Firestore has no native "starts with" query on document ID, so this
    // relies on a stored `key` field with a range query -- requires that
    // field to exist on every doc (set() below writes it).
    const snapshot = await db
      .collection(this.collectionName)
      .where('key', '>=', prefix)
      .where('key', '<', prefix + '\uf8ff')
      .get();
    return snapshot.docs.map(d => d.data().key as string);
  }
}

/**
 * Selects the adapter based on env config, so nothing else in the codebase
 * needs to know which one is active. Defaults to in-memory (current
 * behavior) unless STORAGE_BACKEND=file|firestore is set.
 */
export function createStorageAdapter(): StorageAdapter {
  const backend = process.env.STORAGE_BACKEND ?? 'memory';
  if (backend === 'file') {
    const filePath = process.env.STORAGE_FILE_PATH ?? './data/vantage-store.json';
    return new FileStorageAdapter(filePath);
  }
  if (backend === 'firestore') {
    return new FirestoreStorageAdapter();
  }
  return new InMemoryStorageAdapter();
}
