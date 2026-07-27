/**
 * idempotencyStore.ts
 *
 * Guards against duplicate campaign dispatches:
 *  1. IN-FLIGHT LOCK: prevents concurrent publish calls for the same campaign.
 *  2. IDEMPOTENCY-KEY CACHE: returns cached response for retried requests.
 */

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedResult {
  key: string;
  storedAt: number;
  response: any;
}

const inFlightCampaigns = new Set<string>();
const idempotencyCache = new Map<string, CachedResult>();

export class PublishInProgressError extends Error {
  constructor(campaignId: string) {
    super(`A publish is already in progress for campaign ${campaignId}.`);
    this.name = 'PublishInProgressError';
  }
}

/** Acquire the in-flight lock for a campaign, or throw if already locked. */
export function acquirePublishLock(campaignId: string): void {
  if (inFlightCampaigns.has(campaignId)) {
    throw new PublishInProgressError(campaignId);
  }
  inFlightCampaigns.add(campaignId);
}

export function releasePublishLock(campaignId: string): void {
  inFlightCampaigns.delete(campaignId);
}

/** Look up a cached response for an idempotency key, if present and not expired. */
export function getCachedResult(key: string | undefined): any | null {
  if (!key) return null;
  const cached = idempotencyCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.storedAt > IDEMPOTENCY_TTL_MS) {
    idempotencyCache.delete(key);
    return null;
  }
  return cached.response;
}

export function storeResult(key: string | undefined, response: any): void {
  if (!key) return;
  idempotencyCache.set(key, { key, storedAt: Date.now(), response });
}

export function pruneExpiredIdempotencyEntries(): number {
  const now = Date.now();
  let pruned = 0;
  for (const [key, entry] of idempotencyCache.entries()) {
    if (now - entry.storedAt > IDEMPOTENCY_TTL_MS) {
      idempotencyCache.delete(key);
      pruned++;
    }
  }
  return pruned;
}
