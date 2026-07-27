import { callPlatformApi, resetCircuit } from '../lib/adapters/dryRun';

function mockResponse(status: number, body: any, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status',
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } as any,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('callPlatformApi: retry with backoff', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    resetCircuit('TestPlatform');
  });

  test('retries on 429 and eventually succeeds', async () => {
    let calls = 0;
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      calls++;
      if (calls < 3) return mockResponse(429, { error: { message: 'rate limited' } });
      return mockResponse(200, { id: 'success-id' });
    });

    const result = await callPlatformApi('https://example.com', { method: 'POST' }, 'TestPlatform', { maxRetries: 3 });
    expect(result).toEqual({ id: 'success-id' });
    expect(calls).toBe(3);
  });

  test('does NOT retry on a non-retryable 400 -- fails immediately', async () => {
    let calls = 0;
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      calls++;
      return mockResponse(400, { error: { message: 'bad request' } });
    });

    await expect(callPlatformApi('https://example.com', {}, 'TestPlatform', { maxRetries: 3 })).rejects.toThrow(/bad request/);
    expect(calls).toBe(1);
  });

  test('honors Retry-After header when present', async () => {
    let calls = 0;
    const delays: number[] = [];
    const realSetTimeout = global.setTimeout;
    // @ts-ignore
    global.setTimeout = (fn: any, ms: number) => {
      delays.push(ms);
      return realSetTimeout(fn, 0); // don't actually wait in the test
    };

    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      calls++;
      if (calls === 1) return mockResponse(429, { error: { message: 'slow down' } }, { 'retry-after': '2' });
      return mockResponse(200, { id: 'ok' });
    });

    await callPlatformApi('https://example.com', {}, 'TestPlatform', { maxRetries: 2 });
    expect(delays).toContain(2000);

    global.setTimeout = realSetTimeout;
  });

  test('exhausts retries and throws the last error', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async () => mockResponse(503, { error: { message: 'always down' } }));
    await expect(callPlatformApi('https://example.com', {}, 'TestPlatform', { maxRetries: 2 })).rejects.toThrow(/always down/);
  });

  test('circuit breaker opens after repeated failures and fails fast without calling fetch', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async () => mockResponse(503, { error: { message: 'down' } }));

    // Exceed the failure threshold across several independent calls.
    for (let i = 0; i < 5; i++) {
      try {
        await callPlatformApi('https://example.com', {}, 'TestPlatform', { maxRetries: 0 });
      } catch {
        // expected
      }
    }

    const callsBeforeOpen = fetchMock.mock.calls.length;
    await expect(callPlatformApi('https://example.com', {}, 'TestPlatform', { maxRetries: 0 })).rejects.toThrow(/circuit open/);
    // Circuit-open call should not have made an additional fetch call.
    expect(fetchMock.mock.calls.length).toBe(callsBeforeOpen);
  });

  test('a successful call resets the circuit', async () => {
    let calls = 0;
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      calls++;
      return calls <= 2 ? mockResponse(503, { error: { message: 'down' } }) : mockResponse(200, { id: 'ok' });
    });

    for (let i = 0; i < 2; i++) {
      try {
        await callPlatformApi('https://example.com', {}, 'TestPlatform', { maxRetries: 0 });
      } catch {
        // expected for first 2
      }
    }
    // Third call succeeds and should reset the failure count.
    const result = await callPlatformApi('https://example.com', {}, 'TestPlatform', { maxRetries: 0 });
    expect(result).toEqual({ id: 'ok' });
  });
});
