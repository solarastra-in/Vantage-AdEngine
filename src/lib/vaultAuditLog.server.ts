/**
 * vaultAuditLog.server.ts
 *
 * An append-only audit trail of every action taken against the credential vault.
 */

export type VaultAuditAction = 'ENCRYPT' | 'DECRYPT' | 'ROTATE' | 'DELETE' | 'ACCESS_DENIED';

export interface VaultAuditEntry {
  id: string;
  timestamp: string;
  platform: string;
  action: VaultAuditAction;
  actor: string;
  fingerprint?: string;
  outcome: 'success' | 'failure';
  detail?: string;
}

const auditLog: VaultAuditEntry[] = [];
let counter = 0;

export function recordVaultAudit(entry: Omit<VaultAuditEntry, 'id' | 'timestamp'>): VaultAuditEntry {
  const record: VaultAuditEntry = {
    ...entry,
    id: `audit_${Date.now()}_${counter++}`,
    timestamp: new Date().toISOString(),
  };
  auditLog.push(record);
  return record;
}

export function getVaultAuditLog(filter?: { platform?: string; action?: VaultAuditAction }): VaultAuditEntry[] {
  return auditLog
    .filter(e => !filter?.platform || e.platform === filter.platform)
    .filter(e => !filter?.action || e.action === filter.action)
    .slice()
    .reverse();
}

export function detectAnomalousAccess(
  platform: string,
  windowMs = 60_000,
  threshold = 20
): { anomalous: boolean; countInWindow: number } {
  const cutoff = Date.now() - windowMs;
  const countInWindow = auditLog.filter(
    e => e.platform === platform && e.action === 'DECRYPT' && new Date(e.timestamp).getTime() >= cutoff
  ).length;
  return { anomalous: countInWindow > threshold, countInWindow };
}
