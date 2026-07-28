import { getAdminAuth, getAdminFirestore, isAdminSdkConfigured, __resetAdminAppStateForTests } from '../lib/firebaseAdmin.server';

describe('firebaseAdmin.server: graceful degradation with no service account configured', () => {
  const originalKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const originalCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  beforeEach(() => {
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    __resetAdminAppStateForTests(undefined); // force re-evaluation
  });

  afterAll(() => {
    if (originalKey) process.env.FIREBASE_SERVICE_ACCOUNT_KEY = originalKey;
    if (originalCreds) process.env.GOOGLE_APPLICATION_CREDENTIALS = originalCreds;
  });

  test('isAdminSdkConfigured is false with no env vars set', () => {
    expect(isAdminSdkConfigured()).toBe(false);
  });

  test('getAdminAuth returns null instead of throwing', () => {
    expect(getAdminAuth()).toBeNull();
  });

  test('getAdminFirestore returns null instead of throwing', () => {
    expect(getAdminFirestore()).toBeNull();
  });

  test('caches the "unavailable" result rather than re-checking env vars every call', () => {
    expect(isAdminSdkConfigured()).toBe(false);
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = '{"type":"service_account"}';
    // Still false because the negative result was cached on the first call above.
    expect(isAdminSdkConfigured()).toBe(false);
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  });
});

describe('firebaseAdmin.server: test hook resets cached state', () => {
  test('__resetAdminAppStateForTests(null) forces "unavailable" regardless of env', () => {
    __resetAdminAppStateForTests(null);
    expect(getAdminAuth()).toBeNull();
    expect(getAdminFirestore()).toBeNull();
  });
});
