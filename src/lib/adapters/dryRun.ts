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
 */

import { PlatformPayload, ResolvedCredential, hasBlockingErrors } from '../campaignDispatchEngine';

export function dryRunResult(platform: string, payload: PlatformPayload) {
  if (hasBlockingErrors(payload)) {
    throw new Error(`Validation failed for ${platform}: ${payload.issues.map(i => i.issue).join('; ')}`);
  }
  return { externalId: `DRYRUN_${platform}_${Date.now()}`, mode: 'DRY_RUN' as const };
}

/**
 * Thin wrapper around fetch that throws a descriptive error on non-2xx
 * responses (platform APIs return error detail in the body, not just a
 * status code) instead of silently returning a bad response as if it
 * succeeded.
 */
export async function callPlatformApi(
  url: string,
  init: RequestInit,
  platformLabel: string
): Promise<any> {
  const res = await fetch(url, init);
  const text = await res.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const detail = body?.error?.message || body?.error_description || body?.message || text || res.statusText;
    throw new Error(`${platformLabel} API error (${res.status}): ${detail}`);
  }
  return body;
}

export type { ResolvedCredential };
