import { InMemoryStorageAdapter, FileStorageAdapter, FirestoreStorageAdapter, createStorageAdapter } from '../lib/storageAdapter.server';
import fs from 'fs';

describe('InMemoryStorageAdapter', () => {
  test('stores and retrieves a value', async () => {
    const adapter = new InMemoryStorageAdapter();
    await adapter.set('key1', { a: 1 });
    expect(await adapter.get('key1')).toEqual({ a: 1 });
  });

  test('returns null for a missing key', async () => {
    const adapter = new InMemoryStorageAdapter();
    expect(await adapter.get('missing')).toBeNull();
  });

  test('deletes a key', async () => {
    const adapter = new InMemoryStorageAdapter();
    await adapter.set('key1', 'value');
    await adapter.delete('key1');
    expect(await adapter.get('key1')).toBeNull();
  });

  test('expires a value after its TTL', async () => {
    const adapter = new InMemoryStorageAdapter();
    await adapter.set('key1', 'value', 20);
    expect(await adapter.get('key1')).toBe('value');
    await new Promise(r => setTimeout(r, 50));
    expect(await adapter.get('key1')).toBeNull();
  });

  test('a value with no TTL never expires', async () => {
    const adapter = new InMemoryStorageAdapter();
    await adapter.set('key1', 'value');
    await new Promise(r => setTimeout(r, 30));
    expect(await adapter.get('key1')).toBe('value');
  });

  test('listKeys returns only keys matching the prefix', async () => {
    const adapter = new InMemoryStorageAdapter();
    await adapter.set('org-a:meta', 1);
    await adapter.set('org-a:google', 2);
    await adapter.set('org-b:meta', 3);
    const keys = await adapter.listKeys('org-a:');
    expect(keys.sort()).toEqual(['org-a:google', 'org-a:meta']);
  });
});

describe('FileStorageAdapter', () => {
  const testPath = '/tmp/test-storage-adapter.json';

  afterEach(() => {
    if (fs.existsSync(testPath)) fs.unlinkSync(testPath);
    if (fs.existsSync(testPath + '.tmp')) fs.unlinkSync(testPath + '.tmp');
  });

  test('persists a value to disk and a new instance can read it back (simulated restart)', async () => {
    const adapter1 = new FileStorageAdapter(testPath);
    await adapter1.set('org-a:meta', { accountId: '123' });
    await adapter1.flush();

    const adapter2 = new FileStorageAdapter(testPath);
    expect(await adapter2.get('org-a:meta')).toEqual({ accountId: '123' });
  });

  test('a delete persists across a simulated restart', async () => {
    const adapter1 = new FileStorageAdapter(testPath);
    await adapter1.set('key1', 'value');
    await adapter1.delete('key1');
    await adapter1.flush();

    const adapter2 = new FileStorageAdapter(testPath);
    expect(await adapter2.get('key1')).toBeNull();
  });

  test('starts empty if the file does not exist yet, without throwing', async () => {
    const adapter = new FileStorageAdapter('/tmp/does-not-exist-vantage-store.json');
    expect(await adapter.get('anything')).toBeNull();
  });

  test('respects TTL across a simulated restart', async () => {
    const adapter1 = new FileStorageAdapter(testPath);
    await adapter1.set('short-lived', 'value', 20);
    await adapter1.flush();
    await new Promise(r => setTimeout(r, 50));

    const adapter2 = new FileStorageAdapter(testPath);
    expect(await adapter2.get('short-lived')).toBeNull();
  });

  test('listKeys works after reload from disk', async () => {
    const adapter1 = new FileStorageAdapter(testPath);
    await adapter1.set('org-a:meta', 1);
    await adapter1.set('org-a:google', 2);
    await adapter1.flush();

    const adapter2 = new FileStorageAdapter(testPath);
    const keys = await adapter2.listKeys('org-a:');
    expect(keys.sort()).toEqual(['org-a:google', 'org-a:meta']);
  });
});

describe('FirestoreStorageAdapter (no Admin SDK configured in this environment)', () => {
  test('get() throws a clear, actionable error instead of a cryptic Firestore SDK error', async () => {
    const adapter = new FirestoreStorageAdapter();
    await expect(adapter.get('any-key')).rejects.toThrow(/Admin SDK to be configured/);
  });

  test('set() throws the same clear error', async () => {
    const adapter = new FirestoreStorageAdapter();
    await expect(adapter.set('any-key', 'value')).rejects.toThrow(/Admin SDK to be configured/);
  });
});

describe('createStorageAdapter', () => {
  const originalEnv = process.env.STORAGE_BACKEND;
  afterEach(() => {
    process.env.STORAGE_BACKEND = originalEnv;
  });

  test('defaults to InMemoryStorageAdapter', () => {
    delete process.env.STORAGE_BACKEND;
    expect(createStorageAdapter()).toBeInstanceOf(InMemoryStorageAdapter);
  });

  test('selects FileStorageAdapter when STORAGE_BACKEND=file', () => {
    process.env.STORAGE_BACKEND = 'file';
    expect(createStorageAdapter()).toBeInstanceOf(FileStorageAdapter);
  });

  test('selects FirestoreStorageAdapter when STORAGE_BACKEND=firestore', () => {
    process.env.STORAGE_BACKEND = 'firestore';
    expect(createStorageAdapter()).toBeInstanceOf(FirestoreStorageAdapter);
  });
});
