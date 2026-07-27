import {
  acquirePublishLock,
  releasePublishLock,
  getCachedResult,
  storeResult,
  PublishInProgressError,
} from '../lib/idempotencyStore';

describe('idempotencyStore: in-flight lock', () => {
  test('a second acquire for the same campaign while locked throws PublishInProgressError', () => {
    acquirePublishLock('campaign-lock-test-1');
    expect(() => acquirePublishLock('campaign-lock-test-1')).toThrow(PublishInProgressError);
    releasePublishLock('campaign-lock-test-1');
  });

  test('after release, the lock can be re-acquired', () => {
    acquirePublishLock('campaign-lock-test-2');
    releasePublishLock('campaign-lock-test-2');
    expect(() => acquirePublishLock('campaign-lock-test-2')).not.toThrow();
    releasePublishLock('campaign-lock-test-2');
  });

  test('different campaigns do not block each other', () => {
    acquirePublishLock('campaign-lock-test-3');
    expect(() => acquirePublishLock('campaign-lock-test-4')).not.toThrow();
    releasePublishLock('campaign-lock-test-3');
    releasePublishLock('campaign-lock-test-4');
  });
});

describe('idempotencyStore: response cache', () => {
  test('returns null for an unknown key', () => {
    expect(getCachedResult('never-seen-key')).toBeNull();
  });

  test('returns null when no key is provided', () => {
    expect(getCachedResult(undefined)).toBeNull();
  });

  test('stores and retrieves a result by key', () => {
    storeResult('idem-key-1', { campaignId: 'c1', status: 'active' });
    expect(getCachedResult('idem-key-1')).toEqual({ campaignId: 'c1', status: 'active' });
  });

  test('storeResult with no key is a safe no-op', () => {
    expect(() => storeResult(undefined, { foo: 'bar' })).not.toThrow();
  });
});
