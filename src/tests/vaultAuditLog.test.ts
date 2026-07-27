import { recordVaultAudit, getVaultAuditLog, detectAnomalousAccess } from '../lib/vaultAuditLog.server';

describe('vaultAuditLog: append-only trail of vault actions', () => {
  test('records an entry with a generated id and timestamp, never the secret itself', () => {
    const entry = recordVaultAudit({ platform: 'meta-test-1', action: 'ENCRYPT', actor: 'user-1', fingerprint: 'abc123', outcome: 'success' });
    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
    expect(JSON.stringify(entry)).not.toContain('plaintext');
  });

  test('filters by platform and action', () => {
    recordVaultAudit({ platform: 'google-test-1', action: 'DECRYPT', actor: 'dispatch-engine', outcome: 'success' });
    recordVaultAudit({ platform: 'google-test-1', action: 'DELETE', actor: 'user-2', outcome: 'success' });

    const decryptsOnly = getVaultAuditLog({ platform: 'google-test-1', action: 'DECRYPT' });
    expect(decryptsOnly.every(e => e.action === 'DECRYPT' && e.platform === 'google-test-1')).toBe(true);
  });

  test('most recent entries come first', () => {
    const p = 'order-test-platform';
    recordVaultAudit({ platform: p, action: 'ENCRYPT', actor: 'a', outcome: 'success' });
    recordVaultAudit({ platform: p, action: 'DECRYPT', actor: 'b', outcome: 'success' });
    const log = getVaultAuditLog({ platform: p });
    expect(log[0].action).toBe('DECRYPT');
    expect(log[1].action).toBe('ENCRYPT');
  });

  test('detects anomalous decrypt volume above threshold', () => {
    const p = 'anomaly-test-platform';
    for (let i = 0; i < 25; i++) {
      recordVaultAudit({ platform: p, action: 'DECRYPT', actor: 'dispatch-engine', outcome: 'success' });
    }
    const result = detectAnomalousAccess(p, 60_000, 20);
    expect(result.anomalous).toBe(true);
    expect(result.countInWindow).toBeGreaterThan(20);
  });

  test('does not flag normal decrypt volume as anomalous', () => {
    const p = 'normal-test-platform';
    for (let i = 0; i < 3; i++) {
      recordVaultAudit({ platform: p, action: 'DECRYPT', actor: 'dispatch-engine', outcome: 'success' });
    }
    const result = detectAnomalousAccess(p, 60_000, 20);
    expect(result.anomalous).toBe(false);
  });
});
