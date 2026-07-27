/**
 * tenantContext.server.ts
 *
 * The client (App.tsx) has tracked `currentOrgId` since the beginning, and
 * every Firestore path is correctly scoped as `organizations/{orgId}/...`.
 * But server.ts's in-memory stores (campaigns, the credential vault, the
 * idempotency store, the vault audit log) had NO orgId concept at all --
 * everything was one global store shared across every tenant hitting the
 * process. Concretely, that meant a second organization's campaign could
 * dispatch using the FIRST organization's stored Meta/Google credentials,
 * since credentialVault was keyed only by platform name.
 *
 * This module is the single place that extracts and validates the tenant
 * context for a request, so every store can be scoped consistently by
 * composite key (`${orgId}:${resourceId}`) rather than each endpoint
 * reinventing its own scoping (or forgetting to).
 *
 * TODO (production hardening): orgId here comes from a client-sent header,
 * which is fine for this stage (no auth backend wired up yet -- see the
 * Firebase Auth TODO in firestore.rules) but must be replaced with an
 * orgId derived from a verified auth token (e.g. a custom claim on the
 * Firebase ID token) before this is trusted across an untrusted network.
 * A client-sent header is trivially spoofable; it stops ACCIDENTAL
 * cross-tenant bugs (the actual issue found), not a malicious client.
 */

import { Request } from 'express';

export const DEFAULT_ORG_ID = 'org-astracloud'; // matches App.tsx's current default

export function getOrgId(req: Request): string {
  const headerOrgId = req.headers['x-org-id'];
  if (typeof headerOrgId === 'string' && headerOrgId.trim()) return headerOrgId.trim();
  return DEFAULT_ORG_ID;
}

/** Composite key for per-tenant scoping of any Map/object-keyed store. */
export function scopedKey(orgId: string, resourceId: string): string {
  return `${orgId}:${resourceId}`;
}
