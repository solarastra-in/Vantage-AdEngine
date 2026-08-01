import {
  getGoogleOAuthConfig,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  createOAuthState,
  consumeOAuthState,
} from '../lib/oauth/googleOAuth.server';

const REAL_ENV = process.env;

describe('googleOAuth: getGoogleOAuthConfig', () => {
  beforeEach(() => {
    process.env = { ...REAL_ENV };
  });
  afterAll(() => {
    process.env = REAL_ENV;
  });

  test('returns null when any required env var is missing', () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    delete process.env.GOOGLE_OAUTH_REDIRECT_URI;
    expect(getGoogleOAuthConfig()).toBeNull();
  });

  test('returns null when only some env vars are set', () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'client123';
    delete process.env.GOOGLE_OAUTH_CLIENT_SECRET;
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://example.com/callback';
    expect(getGoogleOAuthConfig()).toBeNull();
  });

  test('returns a real config object when all three are set', () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'client123';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'secret456';
    process.env.GOOGLE_OAUTH_REDIRECT_URI = 'https://example.com/api/oauth/google/callback';
    expect(getGoogleOAuthConfig()).toEqual({
      clientId: 'client123',
      clientSecret: 'secret456',
      redirectUri: 'https://example.com/api/oauth/google/callback',
    });
  });
});

describe('googleOAuth: buildAuthorizationUrl', () => {
  const config = { clientId: 'client123', clientSecret: 'secret456', redirectUri: 'https://example.com/callback' };

  test('includes the Google Ads scope, offline access, and forced consent', () => {
    const url = buildAuthorizationUrl(config, 'state-token-abc');
    expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url).toContain(encodeURIComponent('https://www.googleapis.com/auth/adwords'));
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
    expect(url).toContain('state=state-token-abc');
    expect(url).toContain(`client_id=${config.clientId}`);
    expect(url).toContain(`redirect_uri=${encodeURIComponent(config.redirectUri)}`);
  });
});

describe('googleOAuth: exchangeCodeForTokens', () => {
  const config = { clientId: 'client123', clientSecret: 'secret456', redirectUri: 'https://example.com/callback' };
  afterEach(() => jest.restoreAllMocks());

  test('parses a successful token response into accessToken/refreshToken/expiresAt', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ access_token: 'ya29.real_access_token', refresh_token: '1//real_refresh_token', expires_in: 3599 }),
    } as Response);

    const result = await exchangeCodeForTokens(config, '4/0AXEQ_a_real_auth_code');
    expect(result.accessToken).toBe('ya29.real_access_token');
    expect(result.refreshToken).toBe('1//real_refresh_token');
    expect(new Date(result.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  test('sends the authorization code as a POST with the correct grant_type', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600 }),
    } as Response);

    await exchangeCodeForTokens(config, 'the-real-code');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init?.method).toBe('POST');
    const body = new URLSearchParams(init?.body as string);
    expect(body.get('code')).toBe('the-real-code');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('client_id')).toBe('client123');
  });

  test('throws with the real Google error_description on failure, not a generic message', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: 'invalid_grant', error_description: 'Malformed auth code.' }),
    } as Response);

    await expect(exchangeCodeForTokens(config, 'bad-code')).rejects.toThrow(/Malformed auth code/);
  });

  test('handles a response with no refresh_token (returns null, does not throw)', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ access_token: 'tok', expires_in: 3600 }), // no refresh_token field
    } as Response);

    const result = await exchangeCodeForTokens(config, 'code');
    expect(result.refreshToken).toBeNull();
  });

  test('throws a clear, actionable error when the response body is not valid JSON at all -- caught via a live smoke test where a network/proxy error page came back instead of a real Google response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => 'Host not identified by the proxy -- 502 Bad Gateway',
    } as Response);

    await expect(exchangeCodeForTokens(config, 'code')).rejects.toThrow(/non-JSON response/);
    await expect(exchangeCodeForTokens(config, 'code')).rejects.toThrow(/Host not identified/);
  });
});

describe('googleOAuth: refreshAccessToken', () => {
  const config = { clientId: 'client123', clientSecret: 'secret456', redirectUri: 'https://example.com/callback' };
  afterEach(() => jest.restoreAllMocks());

  test('exchanges a refresh token for a fresh access token', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ access_token: 'ya29.fresh_token', expires_in: 3599 }),
    } as Response);

    const result = await refreshAccessToken(config, '1//stored_refresh_token');
    expect(result.accessToken).toBe('ya29.fresh_token');

    const [, init] = fetchMock.mock.calls[0];
    const body = new URLSearchParams(init?.body as string);
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('1//stored_refresh_token');
  });

  test('throws a clear, actionable error (mentioning re-authorization) when the refresh token is invalid/revoked', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: 'invalid_grant', error_description: 'Token has been expired or revoked.' }),
    } as Response);

    await expect(refreshAccessToken(config, 'revoked-token')).rejects.toThrow(/expired or revoked/);
    await expect(refreshAccessToken(config, 'revoked-token')).rejects.toThrow(/re-authorized/);
  });
});

describe('googleOAuth: CSRF state store', () => {
  test('a created state can be consumed exactly once', () => {
    const state = createOAuthState('org-123', 'google', '2330588547', 'Xzaqp9GgfobUz1suCzdtPg');
    const first = consumeOAuthState(state);
    expect(first).toEqual({
      orgId: 'org-123',
      platform: 'google',
      accountId: '2330588547',
      developerToken: 'Xzaqp9GgfobUz1suCzdtPg',
      createdAt: expect.any(Number),
    });

    const second = consumeOAuthState(state);
    expect(second).toBeNull();
  });

  test('an unknown state returns null', () => {
    expect(consumeOAuthState('never-issued-token')).toBeNull();
  });

  test('an expired state returns null even though it was never consumed', () => {
    const state = createOAuthState('org-456', 'google', '1234567890', 'dev_tok');
    const originalNow = Date.now;
    Date.now = () => originalNow() + 11 * 60_000; // 11 minutes later, past the 10-minute TTL
    try {
      expect(consumeOAuthState(state)).toBeNull();
    } finally {
      Date.now = originalNow;
    }
  });
});
