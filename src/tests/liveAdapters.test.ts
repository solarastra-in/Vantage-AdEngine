import { metaAdapter } from '../lib/adapters/metaAdapter';
import { googleAdapter } from '../lib/adapters/googleAdapter';
import { tiktokAdapter } from '../lib/adapters/tiktokAdapter';
import { PlatformPayload } from '../lib/campaignDispatchEngine';

const validPayload: PlatformPayload = {
  platform: 'meta',
  headline: 'Test Headline',
  primaryText: 'Test body text',
  mediaUrl: 'https://example.com/img.jpg',
  callToAction: 'Learn More',
  budget: 1000,
  targeting: 'x',
  issues: [],
};

describe('live adapters: dry-run fallback with no credential', () => {
  test('meta adapter returns DRY_RUN mode when credential is null, without making a network call', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const result = await metaAdapter.publish(validPayload, null);
    expect(result.mode).toBe('DRY_RUN');
    expect(result.externalId).toMatch(/^DRYRUN_meta_/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  test('adapters with blocking validation errors still throw in dry-run mode (validation is not skipped)', async () => {
    const invalidPayload = { ...validPayload, mediaUrl: '', issues: [{ field: 'mediaUrl', issue: 'missing', severity: 'error' as const }] };
    await expect(metaAdapter.publish(invalidPayload, null)).rejects.toThrow(/Validation failed/);
  });
});

describe('live adapters: real call construction when credential IS present (fetch mocked)', () => {
  afterEach(() => jest.restoreAllMocks());

  test('meta adapter calls the real Graph API endpoint with the account id and access token', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ id: '120210000000001' }),
    } as Response);

    const result = await metaAdapter.publish(validPayload, { accountId: '98230192', secret: 'FAKE_TOKEN' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('graph.facebook.com');
    expect(url).toContain('act_98230192/campaigns');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string).access_token).toBe('FAKE_TOKEN');
    expect(result).toEqual({ externalId: '120210000000001', mode: 'LIVE' });
  });

  test('meta adapter surfaces the platform error message on a non-2xx response instead of swallowing it', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => JSON.stringify({ error: { message: 'Invalid parameter: access_token' } }),
    } as Response);

    await expect(
      metaAdapter.publish(validPayload, { accountId: '98230192', secret: 'BAD_TOKEN' })
    ).rejects.toThrow(/Invalid parameter: access_token/);
  });

  test('google adapter requires a developer token and fails clearly without one', async () => {
    await expect(
      googleAdapter.publish(validPayload, { accountId: '8832011', secret: 'oauth_token' })
    ).rejects.toThrow(/developer token/);
  });

  test('google adapter includes developer-token header and developerToken from extra fields', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ results: [{ resourceName: 'customers/8832011/campaigns/111' }] }),
    } as Response);

    const result = await googleAdapter.publish(validPayload, {
      accountId: '8832011',
      secret: 'oauth_token',
      extra: { developerToken: 'dev_tok_123' },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as any)['developer-token']).toBe('dev_tok_123');
    expect(result.externalId).toBe('customers/8832011/campaigns/111');
  });

  test('google adapter normalizes a dash-formatted customer ID (e.g. "514-401-5092") before building the API URL -- Google Ads rejects dashes', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ results: [{ resourceName: 'customers/5144015092/campaigns/999' }] }),
    } as Response);

    await googleAdapter.publish(validPayload, {
      accountId: '514-401-5092',
      secret: 'oauth_token',
      extra: { developerToken: 'dev_tok_123' },
    });

    const urls = fetchMock.mock.calls.map(c => String(c[0]));
    expect(urls.some(u => u.includes('customers/5144015092/'))).toBe(true);
    expect(urls.every(u => !u.includes('514-401-5092'))).toBe(true);
  });

  test('google adapter rejects an account ID that normalizes to nothing (no digits at all)', async () => {
    await expect(
      googleAdapter.publish(validPayload, { accountId: 'abc-def', secret: 'oauth_token', extra: { developerToken: 'dev_tok' } })
    ).rejects.toThrow(/doesn't contain any digits/);
  });

  test('tiktok adapter treats a non-zero response code as an error even when HTTP status is 200', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ code: 40001, message: 'Invalid advertiser_id' }),
    } as Response);

    await expect(
      tiktokAdapter.publish(validPayload, { accountId: 'adv_123', secret: 'token' })
    ).rejects.toThrow(/Invalid advertiser_id/);
  });
});
