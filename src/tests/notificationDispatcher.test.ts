import { sendNotification } from '../lib/notificationDispatcher.server';

describe('notificationDispatcher: no webhook configured', () => {
  const original = process.env.NOTIFICATION_WEBHOOK_URL;
  beforeEach(() => {
    delete process.env.NOTIFICATION_WEBHOOK_URL;
  });
  afterAll(() => {
    if (original) process.env.NOTIFICATION_WEBHOOK_URL = original;
  });

  test('returns sent: false with a clear reason instead of throwing', async () => {
    const result = await sendNotification({ severity: 'warning', title: 'Test', message: 'Something happened' });
    expect(result.sent).toBe(false);
    expect(result.reason).toContain('NOTIFICATION_WEBHOOK_URL');
  });
});

describe('notificationDispatcher: webhook configured (fetch mocked)', () => {
  const original = process.env.NOTIFICATION_WEBHOOK_URL;
  const originalFormat = process.env.NOTIFICATION_WEBHOOK_FORMAT;

  beforeEach(() => {
    process.env.NOTIFICATION_WEBHOOK_URL = 'https://hooks.example.com/webhook';
  });
  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NOTIFICATION_WEBHOOK_FORMAT = originalFormat;
  });
  afterAll(() => {
    if (original) process.env.NOTIFICATION_WEBHOOK_URL = original;
    else delete process.env.NOTIFICATION_WEBHOOK_URL;
  });

  test('sends a Slack-shaped payload by default', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, text: async () => '' } as Response);
    const result = await sendNotification({ severity: 'critical', title: 'Rule Triggered', message: 'CPA too high', context: { campaignId: 'cmp-1' } });

    expect(result.sent).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hooks.example.com/webhook');
    const body = JSON.parse(init?.body as string);
    expect(body.text).toContain('Rule Triggered');
    expect(body.text).toContain('CPA too high');
    expect(body.text).toContain('campaignId');
  });

  test('sends a plain JSON payload when format=generic', async () => {
    process.env.NOTIFICATION_WEBHOOK_FORMAT = 'generic';
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, text: async () => '' } as Response);
    await sendNotification({ severity: 'info', title: 'Test', message: 'msg' });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(body).toEqual({ severity: 'info', title: 'Test', message: 'msg' });
  });

  test('a non-2xx response is reported as not sent, with the status in the reason', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 500, text: async () => 'server error' } as Response);
    const result = await sendNotification({ severity: 'warning', title: 'Test', message: 'msg' });
    expect(result.sent).toBe(false);
    expect(result.reason).toContain('500');
  });

  test('a network error is caught and reported, not thrown', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('DNS resolution failed'));
    const result = await sendNotification({ severity: 'warning', title: 'Test', message: 'msg' });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe('DNS resolution failed');
  });
});
