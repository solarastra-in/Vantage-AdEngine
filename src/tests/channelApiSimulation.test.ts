import { PlatformType } from '../types';
import { validateChannelApiKeyFormat } from '../lib/encryption';

export interface ChannelApiMockResponse {
  platform: PlatformType;
  status: 'SUCCESS' | 'RATE_LIMITED' | 'UNAUTHORIZED' | 'INVALID_PAYLOAD';
  responseCode: number;
  externalCampaignId?: string;
  errorMessage?: string;
  retryAfterSeconds?: number;
  cujRef: string;
}

/**
 * Simulates API communication call to external ad platforms
 */
export function simulateChannelApiPublishCall(
  platform: PlatformType,
  payload: {
    accountId: string;
    apiKeyOrToken: string;
    headline: string;
    primaryText: string;
    budget: number;
  },
  mockCondition: 'NORMAL' | 'SIMULATE_429_RATE_LIMIT' | 'SIMULATE_401_EXPIRED_TOKEN' | 'SIMULATE_INVALID_KEY' = 'NORMAL'
): ChannelApiMockResponse {
  // Validate format first
  const val = validateChannelApiKeyFormat(platform, payload.accountId, payload.apiKeyOrToken);
  if (!val.isValid || mockCondition === 'SIMULATE_INVALID_KEY') {
    return {
      platform,
      status: 'INVALID_PAYLOAD',
      responseCode: 400,
      errorMessage: val.error || 'Invalid API Key or Account ID format',
      cujRef: 'CUJ-2: API Credentials & Handshake',
    };
  }

  if (mockCondition === 'SIMULATE_429_RATE_LIMIT') {
    return {
      platform,
      status: 'RATE_LIMITED',
      responseCode: 429,
      errorMessage: `429 Too Many Requests: Rate limit exceeded on ${platform.toUpperCase()} API`,
      retryAfterSeconds: 30,
      cujRef: 'CUJ-5: Cross-Platform Dispatch & Edge Cases',
    };
  }

  if (mockCondition === 'SIMULATE_401_EXPIRED_TOKEN') {
    return {
      platform,
      status: 'UNAUTHORIZED',
      responseCode: 401,
      errorMessage: `401 Unauthorized: Access Token expired for ${platform.toUpperCase()}`,
      cujRef: 'CUJ-5: Cross-Platform Dispatch & Edge Cases',
    };
  }

  // Character limit validation checks per platform spec
  if (platform === 'x' && payload.headline.length > 280) {
    return {
      platform,
      status: 'INVALID_PAYLOAD',
      responseCode: 422,
      errorMessage: 'X Tweet text exceeds 280 character threshold',
      cujRef: 'CUJ-3: AI Multi-Channel Creative Specs',
    };
  }

  return {
    platform,
    status: 'SUCCESS',
    responseCode: 200,
    externalCampaignId: `${platform}_ext_${Math.floor(100000 + Math.random() * 900000)}`,
    cujRef: 'CUJ-4: Omnichannel Assembly',
  };
}

describe('CUJ-1, CUJ-2, CUJ-3, CUJ-5: All 7 Channels API Simulation Test Suite', () => {
  const allPlatforms: PlatformType[] = ['meta', 'google', 'linkedin', 'tiktok', 'pinterest', 'x', 'programmatic'];

  const sampleValidPayloads: Record<PlatformType, { accountId: string; apiKeyOrToken: string; headline: string; primaryText: string; budget: number }> = {
    meta: { accountId: 'act_98230192', apiKeyOrToken: 'EAAG_valid_token_string_here', headline: 'Meta Ad Headline', primaryText: 'Meta Primary Copy', budget: 1000 },
    google: { accountId: '883-201-1234', apiKeyOrToken: '1//04_google_valid_refresh_token', headline: 'Google Search Ad', primaryText: 'Google Ad Description', budget: 1500 },
    linkedin: { accountId: 'urn:li:sponsoredAccount:554109', apiKeyOrToken: 'AQV_valid_linkedin_token', headline: 'B2B Lead Campaign', primaryText: 'LinkedIn Lead Gen Text', budget: 2000 },
    tiktok: { accountId: 'tt_adv_883210', apiKeyOrToken: 'tt_secret_valid_token_long', headline: 'TikTok Spark Viral', primaryText: 'TikTok Ad Copy', budget: 1200 },
    pinterest: { accountId: '54982103', apiKeyOrToken: 'pina_access_tok_valid_long', headline: 'Pinterest Pin Ad', primaryText: 'Pin Description', budget: 800 },
    x: { accountId: 'x_promoted_10293', apiKeyOrToken: 'x_bearer_tok_valid_long', headline: 'Promoted Tweet Headline', primaryText: 'X Ad Body', budget: 900 },
    programmatic: { accountId: 'ttd_seat_99210', apiKeyOrToken: 'dsp_openrtb_secret_valid', headline: 'DSP Banner Headline', primaryText: 'DSP Target Copy', budget: 2500 },
  };

  test('Simulates successful HTTP 200 campaign publishing across all 7 platforms', () => {
    for (const p of allPlatforms) {
      const res = simulateChannelApiPublishCall(p, sampleValidPayloads[p], 'NORMAL');
      expect(res.status).toBe('SUCCESS');
      expect(res.responseCode).toBe(200);
      expect(res.externalCampaignId).toBeDefined();
      expect(res.externalCampaignId).toContain(`${p}_ext_`);
    }
  });

  test('Simulates 429 Rate Limit response and returns retry-after header simulation (CUJ-5)', () => {
    const res = simulateChannelApiPublishCall('meta', sampleValidPayloads.meta, 'SIMULATE_429_RATE_LIMIT');
    expect(res.status).toBe('RATE_LIMITED');
    expect(res.responseCode).toBe(429);
    expect(res.retryAfterSeconds).toBe(30);
    expect(res.cujRef).toContain('CUJ-5');
  });

  test('Simulates 401 Token Expiration error handling and refresh signal (CUJ-5)', () => {
    const res = simulateChannelApiPublishCall('google', sampleValidPayloads.google, 'SIMULATE_401_EXPIRED_TOKEN');
    expect(res.status).toBe('UNAUTHORIZED');
    expect(res.responseCode).toBe(401);
    expect(res.errorMessage).toContain('401 Unauthorized');
    expect(res.cujRef).toContain('CUJ-5');
  });

  test('Simulates payload character limit validation error on X (Twitter) (CUJ-3)', () => {
    const longHeadlinePayload = {
      ...sampleValidPayloads.x,
      headline: 'A'.repeat(290), // Exceeds 280 chars
    };
    const res = simulateChannelApiPublishCall('x', longHeadlinePayload, 'NORMAL');
    expect(res.status).toBe('INVALID_PAYLOAD');
    expect(res.responseCode).toBe(422);
    expect(res.errorMessage).toContain('280 character threshold');
  });
});
