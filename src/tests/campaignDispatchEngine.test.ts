import {
  transformForPlatform,
  hasBlockingErrors,
  dispatchCampaign,
  registerAdapter,
  PlatformAdapter,
} from '../lib/campaignDispatchEngine';
import { Campaign, ChannelBudget } from '../types';

const baseCreative = {
  headline: 'This headline is way way way too long for Google Ads limits',
  primaryText: 'Short body text well within limits.',
  callToAction: 'Learn More',
  mediaUrl: 'https://example.com/img.jpg',
  destinationUrl: 'https://example.com',
  googleRsaHeadlines: ['Headline One', 'Headline Two', 'Headline Three'],
  googleRsaDescriptions: ['Description one for the ad.', 'Description two for the ad.'],
  googleKeywords: ['test keyword'],
};

const baseChannel: ChannelBudget = {
  platform: 'google',
  platformName: 'Google Ads',
  budget: 1000,
  startDate: '',
  endDate: '',
  targeting: 'x',
  adFormat: 'x',
  enabled: true,
};

describe('campaignDispatchEngine: real schema transform + validation', () => {
  test('headline exceeding a platform limit is truncated at a word boundary, not mid-word, and recorded as an issue', () => {
    const payload = transformForPlatform({ creative: baseCreative }, baseChannel);
    expect(payload.headline.length).toBeLessThanOrEqual(30);
    expect(payload.headline.endsWith(' ')).toBe(false);
    expect(baseCreative.headline.startsWith(payload.headline)).toBe(true);
    expect(payload.issues.some(i => i.field === 'headline' && i.severity === 'auto_corrected')).toBe(true);
  });

  test('missing media URL is a blocking error, not silently accepted', () => {
    const payload = transformForPlatform(
      { creative: { ...baseCreative, mediaUrl: '' } },
      baseChannel
    );
    expect(hasBlockingErrors(payload)).toBe(true);
  });

  test('a compliant campaign produces zero issues', () => {
    const payload = transformForPlatform(
      { creative: { ...baseCreative, headline: 'Short headline' } },
      baseChannel
    );
    expect(payload.issues).toHaveLength(0);
  });
});

describe('campaignDispatchEngine: platform-specific creative overrides', () => {
  test('uses the platform override when one is present for this channel, not the master creative', () => {
    const payload = transformForPlatform(
      {
        creative: { ...baseCreative, headline: 'Master headline nobody tailored' },
        platformCreatives: {
          google: { headline: 'Google-tailored headline', primaryText: 'Google-tailored body', callToAction: 'Shop Now' },
        },
      },
      baseChannel
    );
    expect(payload.headline).toBe('Google-tailored headline');
    expect(payload.primaryText).toBe('Google-tailored body');
  });

  test('falls back to the master creative for a platform with no override -- this is what makes the fallback safe, not silent data loss', () => {
    const payload = transformForPlatform(
      {
        creative: { ...baseCreative, headline: 'Short headline' },
        platformCreatives: {
          meta: { headline: 'Meta-only override', primaryText: 'x', callToAction: 'x' },
        },
      },
      baseChannel // channel is 'google', which has no override above
    );
    expect(payload.headline).toBe('Short headline');
  });

  test('an override still gets the same real per-platform truncation as the master creative would', () => {
    const payload = transformForPlatform(
      {
        creative: baseCreative,
        platformCreatives: {
          google: { headline: 'This override headline is also way too long for Google Ads', primaryText: 'x', callToAction: 'x' },
        },
      },
      baseChannel
    );
    expect(payload.headline.length).toBeLessThanOrEqual(30);
    expect(payload.issues.some(i => i.field === 'headline' && i.severity === 'auto_corrected')).toBe(true);
  });

  test('an override missing its own mediaUrl falls back to the master mediaUrl rather than failing validation', () => {
    const payload = transformForPlatform(
      {
        creative: baseCreative, // has a real mediaUrl
        platformCreatives: {
          google: { headline: 'Short', primaryText: 'Short body', callToAction: 'Go' }, // no mediaUrl
        },
      },
      baseChannel
    );
    expect(hasBlockingErrors(payload)).toBe(false);
    expect(payload.mediaUrl).toBe(baseCreative.mediaUrl);
  });
});

describe('campaignDispatchEngine: saga-style dispatch with compensation', () => {
  function makeCampaign(channels: ChannelBudget[]): Campaign {
    return {
      id: 'cmp-test-' + Math.random(),
      name: 'Test',
      objective: 'Lead Generation',
      status: 'draft',
      totalBudget: 3000,
      spentBudget: 0,
      startDate: '',
      endDate: '',
      targetAudience: 'x',
      channels,
      creative: { ...baseCreative, headline: 'Short headline' },
      publishStatuses: [],
      metrics: { impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, roas: 0 },
      createdAt: new Date().toISOString(),
    };
  }

  test('when one channel fails, channels that already went live are rolled back (all-or-nothing default)', async () => {
    const liveCalls: string[] = [];
    const rollbackCalls: string[] = [];

    registerAdapter({
      platform: 'meta',
      async publish() { liveCalls.push('meta'); return { externalId: 'EXT_meta_1', mode: 'LIVE' as const }; },
      async rollback() { rollbackCalls.push('meta'); },
    } as PlatformAdapter);
    registerAdapter({
      platform: 'linkedin',
      async publish() { throw new Error('LinkedIn auth rejected'); },
      async rollback() {},
    } as PlatformAdapter);

    const campaign = makeCampaign([
      { ...baseChannel, platform: 'meta', platformName: 'Meta' },
      { ...baseChannel, platform: 'linkedin', platformName: 'LinkedIn' },
    ]);

    const report = await dispatchCampaign(campaign, () => null);

    expect(report.overallStatus).toBe('ALL_FAILED');
    expect(liveCalls).toContain('meta');
    expect(rollbackCalls).toContain('meta');
    const metaResult = report.results.find(r => r.platform === 'meta')!;
    expect(metaResult.outcome).toBe('ROLLED_BACK');
    expect(metaResult.compensated).toBe(true);
  });

  test('when every channel succeeds, nothing is rolled back and status is ALL_LIVE', async () => {
    registerAdapter({
      platform: 'meta',
      async publish() { return { externalId: 'EXT_meta_2', mode: 'LIVE' as const }; },
      async rollback() {},
    } as PlatformAdapter);
    registerAdapter({
      platform: 'google',
      async publish() { return { externalId: 'EXT_google_2', mode: 'LIVE' as const }; },
      async rollback() {},
    } as PlatformAdapter);

    const campaign = makeCampaign([
      { ...baseChannel, platform: 'meta', platformName: 'Meta' },
      { ...baseChannel, platform: 'google', platformName: 'Google', budget: 1000 },
    ]);

    const report = await dispatchCampaign(campaign, () => null);
    expect(report.overallStatus).toBe('ALL_LIVE');
    expect(report.results.every(r => r.outcome === 'LIVE')).toBe(true);
  });

  test('a channel with a blocking validation error is skipped before any network call, and still triggers rollback of siblings', async () => {
    const liveCalls: string[] = [];
    const rollbackCalls: string[] = [];

    registerAdapter({
      platform: 'meta',
      async publish() { liveCalls.push('meta'); return { externalId: 'EXT_meta_3', mode: 'LIVE' as const }; },
      async rollback() { rollbackCalls.push('meta'); },
    } as PlatformAdapter);

    const campaign = makeCampaign([
      { ...baseChannel, platform: 'meta', platformName: 'Meta' },
      { ...baseChannel, platform: 'google', platformName: 'Google', budget: 0 },
    ]);

    const report = await dispatchCampaign(campaign, () => null);
    const googleResult = report.results.find(r => r.platform === 'google')!;
    expect(googleResult.outcome).toBe('SKIPPED_VALIDATION');
    expect(rollbackCalls).toContain('meta');
  });
});
