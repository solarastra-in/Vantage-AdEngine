import { getOrgId, scopedKey, DEFAULT_ORG_ID } from '../lib/tenantContext.server';

function mockReq(headers: Record<string, string | undefined>): any {
  return { headers };
}

describe('tenantContext: getOrgId', () => {
  test('uses the X-Org-Id header when present', () => {
    expect(getOrgId(mockReq({ 'x-org-id': 'org-acme' }))).toBe('org-acme');
  });

  test('falls back to DEFAULT_ORG_ID when the header is absent', () => {
    expect(getOrgId(mockReq({}))).toBe(DEFAULT_ORG_ID);
  });

  test('falls back to DEFAULT_ORG_ID when the header is empty/whitespace', () => {
    expect(getOrgId(mockReq({ 'x-org-id': '   ' }))).toBe(DEFAULT_ORG_ID);
  });

  test('trims whitespace from a valid header', () => {
    expect(getOrgId(mockReq({ 'x-org-id': '  org-acme  ' }))).toBe('org-acme');
  });
});

describe('tenantContext: scopedKey', () => {
  test('produces distinct keys for different orgs with the same resource id', () => {
    const keyA = scopedKey('org-a', 'meta');
    const keyB = scopedKey('org-b', 'meta');
    expect(keyA).not.toBe(keyB);
  });

  test('is deterministic for the same inputs', () => {
    expect(scopedKey('org-a', 'meta')).toBe(scopedKey('org-a', 'meta'));
  });
});
