/**
 * dryRun.ts
 *
 * Every live adapter calls through this helper first. If no credential is
 * configured, the adapter behaves exactly like the old DRY_RUN adapter
 * (validated locally, fake externalId, explicitly labeled DRY_RUN) instead
 * of making a network call. This means a single adapter file works
 * correctly whether or not the operator has connected real credentials yet
 * -- there is no separate "simulate" code path to fall out of sync with the
 * real one.
 *
 * callPlatformApi also wraps every real network call in exponential
 * backoff + jitter + a simple per-platform circuit breaker. This is
 * standard, well-documented practice for every ad platform's API (Meta,
 * Google Ads, TikTok, LinkedIn, and X all rate-limit aggressively and
 * document 429/RESOURCE_EXHAUSTED + backoff as the expected client
 * behavior) -- included because the adapters built without it would fail
 * in production the first time a platform throttled a burst of requests,
 * not because it's a novel technique.
 */

import { PlatformPayload, ResolvedCredential, PlatformPerformanceMetrics, hasBlockingErrors } from '../campaignDispatchEngine';

export function dryRunResult(platform: string, payload: PlatformPayload) {
  if (hasBlockingErrors(payload)) {
    throw new Error(`Validation failed for ${platform}: ${payload.issues.map(i => i.issue).join('; ')}`);
  }
  return { externalId: `DRYRUN_${platform}_${Date.now()}`, mode: 'DRY_RUN' as const };
}

/**
 * Dry-run performance fallback: explicitly zeroed metrics, never fabricated
 * numbers dressed up as real performance. Downstream consumers (budget
 * optimizer, fatigue detector) check `mode` and know not to treat these as
 * a real signal -- this replaces what would otherwise be another
 * opportunity to accidentally re-introduce fake-but-plausible-looking data.
 */
export function dryRunPerformance(
  platform: any,
  externalId: string,
  dateRange: { start: string; end: string }
): PlatformPerformanceMetrics {
  return {
    externalId,
    platform,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    dateRange,
    mode: 'DRY_RUN',
  };
}

// ---------------------------------------------------------------------------
// Circuit breaker: per-platform-label consecutive-failure tracking. After
// `FAILURE_THRESHOLD` consecutive failures, the circuit "opens" and further
// calls fail fast (no network attempt) for `OPEN_DURATION_MS`, so a
// systemic platform outage doesn't turn into a retry storm against it.
// ---------------------------------------------------------------------------
const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 30_000;

interface CircuitState {
  consecutiveFailures: number;
  openedAt: number | null;
}
const circuits = new Map<string, CircuitState>();

function getCircuit(label: string): CircuitState {
  if (!circuits.has(label)) circuits.set(label, { consecutiveFailures: 0, openedAt: null });
  return circuits.get(label)!;
}

function isCircuitOpen(label: string): boolean {
  const c = getCircuit(label);
  if (c.openedAt === null) return false;
  if (Date.now() - c.openedAt > OPEN_DURATION_MS) {
    // Half-open: allow the next call through as a trial.
    c.openedAt = null;
    c.consecutiveFailures = 0;
    return false;
  }
  return true;
}

function recordSuccess(label: string): void {
  const c = getCircuit(label);
  c.consecutiveFailures = 0;
  c.openedAt = null;
}

function recordFailure(label: string): void {
  const c = getCircuit(label);
  c.consecutiveFailures += 1;
  if (c.consecutiveFailures >= FAILURE_THRESHOLD) {
    c.openedAt = Date.now();
  }
}

/** Exposed for tests / observability -- not used by production call paths. */
export function resetCircuit(label: string): void {
  circuits.delete(label);
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function isRetryable(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

/** Exponential backoff with full jitter (AWS-recommended formula): random(0, base * 2^attempt), capped. */
function backoffDelayMs(attempt: number, baseMs = 500, capMs = 10_000): number {
  const exp = Math.min(capMs, baseMs * 2 ** attempt);
  return Math.random() * exp;
}

function parseRetryAfterMs(headers: Headers | undefined): number | null {
  const value = headers?.get?.('retry-after');
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return seconds * 1000;
  const dateMs = Date.parse(value);
  return Number.isNaN(dateMs) ? null : Math.max(0, dateMs - Date.now());
}

/**
 * Thin wrapper around fetch that throws a descriptive error on non-2xx
 * responses (platform APIs return error detail in the body, not just a
 * status code) instead of silently returning a bad response as if it
 * succeeded. Retries with exponential backoff + jitter on 429/5xx up to
 * `maxRetries` times, honoring a Retry-After header when the platform sends
 * one. Non-retryable errors (4xx other than 429 -- bad auth, bad payload,
 * not found) fail immediately, since retrying those just repeats the same
 * failure.
 */
export async function callPlatformApi(
  url: string,
  init: RequestInit,
  platformLabel: string,
  opts: { maxRetries?: number } = {}
): Promise<any> {
  const maxRetries = opts.maxRetries ?? 3;

  if (isCircuitOpen(platformLabel)) {
    throw new Error(`${platformLabel}: circuit open after repeated failures -- failing fast without a network call. Will retry automatically after the cooldown window.`);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const retryAfter = lastError instanceof RetryableApiError ? lastError.retryAfterMs : null;
      const delay = retryAfter ?? backoffDelayMs(attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const res = await fetch(url, init);
    const text = await res.text();
    let body: any;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }

    if (res.ok) {
      recordSuccess(platformLabel);
      return body;
    }

    const detail = body?.error?.message || body?.error_description || body?.message || text || res.statusText;
    const err = new RetryableApiError(
      `${platformLabel} API error (${res.status}): ${detail}`,
      parseRetryAfterMs(res.headers)
    );

    if (!isRetryable(res.status) || attempt === maxRetries) {
      recordFailure(platformLabel);
      throw err;
    }

    lastError = err;
    // eslint-disable-next-line no-console
    console.warn(`[${platformLabel}] retryable error (${res.status}), attempt ${attempt + 1}/${maxRetries + 1}: ${detail}`);
  }

  recordFailure(platformLabel);
  throw lastError ?? new Error(`${platformLabel}: exhausted retries with no captured error.`);
}

class RetryableApiError extends Error {
  retryAfterMs: number | null;
  constructor(message: string, retryAfterMs: number | null) {
    super(message);
    this.name = 'RetryableApiError';
    this.retryAfterMs = retryAfterMs;
  }
}

export type { ResolvedCredential };
