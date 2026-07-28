import { ingestCampaignPerformance, getChannelPerformanceHistory, toOptimizerHistory } from '../lib/performanceIngestion';
import { InMemoryStorageAdapter } from '../lib/storageAdapter.server';
import { Campaign } from '../types';

function makeCampaign(publishStatuses: Campaign['publishStatuses']): Campaign {
  return {
    id: 'cmp-ingest-test',
    orgId: 'org-test',
    name: 'Test',
    objective: 'Lead Generation',
    status: 'active',
    totalBudget: 1000,
    spentBudget: 500,
    startDate: '',
    endDate: '',
    targetAudience: 'x',
    channels: [],
    creative: { headline: 'h', primaryText: 'p', callToAction: 'Learn More', mediaUrl: 'x' },
    publishStatuses,
    metrics: { impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, roas: 0 },
    createdAt: new Date().toISOString(),
  };
}

describe('performanceIngestion: ingestCampaignPerformance', () => {
  test('only pulls performance for LIVE channels, skipping failed/draft ones', async () => {
    const storage = new InMemoryStorageAdapter();
    const campaign = makeCampaign([
      { platform: 'meta', status: 'live', externalId: 'ext_meta_1' },
      { platform: 'google', status: 'failed' },
      { platform: 'linkedin', status: 'draft' },
    ]);

    const calls: string[] = [];
    const result = await ingestCampaignPerformance(
      campaign,
      storage,
      async (platform, externalId) => {
        calls.push(platform);
        return { externalId, platform, impressions: 100, clicks: 10, conversions: 1, spend: 50, dateRange: { start: '2026-01-01', end: '2026-01-07' }, mode: 'LIVE' as const };
      },
      { start: '2026-01-01', end: '2026-01-07' }
    );

    expect(calls).toEqual(['meta']);
    expect(result.perChannel).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  test('a per-channel fetch failure is captured in errors, not thrown', async () => {
    const storage = new InMemoryStorageAdapter();
    const campaign = makeCampaign([
      { platform: 'meta', status: 'live', externalId: 'ext_meta_1' },
      { platform: 'google', status: 'live', externalId: 'ext_google_1' },
    ]);

    const result = await ingestCampaignPerformance(
      campaign,
      storage,
      async (platform, externalId) => {
        if (platform === 'google') throw new Error('Google Ads API rate limited');
        return { externalId, platform, impressions: 100, clicks: 10, conversions: 1, spend: 50, dateRange: { start: '2026-01-01', end: '2026-01-07' }, mode: 'LIVE' as const };
      },
      { start: '2026-01-01', end: '2026-01-07' }
    );

    expect(result.perChannel).toHaveLength(1);
    expect(result.errors).toEqual([{ platform: 'google', error: 'Google Ads API rate limited' }]);
  });

  test('successive ingestions accumulate history rather than overwriting it', async () => {
    const storage = new InMemoryStorageAdapter();
    const campaign = makeCampaign([{ platform: 'meta', status: 'live', externalId: 'ext_meta_1' }]);

    for (let day = 1; day <= 3; day++) {
      await ingestCampaignPerformance(
        campaign,
        storage,
        async (platform, externalId) => ({
          externalId,
          platform,
          impressions: 100 * day,
          clicks: 10 * day,
          conversions: day,
          spend: 50 * day,
          dateRange: { start: `2026-01-0${day}`, end: `2026-01-0${day}` },
          mode: 'LIVE' as const,
        }),
        { start: `2026-01-0${day}`, end: `2026-01-0${day}` }
      );
    }

    const history = await getChannelPerformanceHistory(storage, 'org-test', campaign.id, 'meta');
    expect(history).toHaveLength(3);
    expect(history.map(h => h.conversions)).toEqual([1, 2, 3]);
  });
});

describe('performanceIngestion: toOptimizerHistory', () => {
  test('converts real performance metrics to the optimizer input shape', () => {
    const metrics = [
      { externalId: 'a', platform: 'meta' as const, impressions: 1000, clicks: 50, conversions: 5, spend: 200, dateRange: { start: '2026-01-01', end: '2026-01-01' }, mode: 'LIVE' as const },
    ];
    expect(toOptimizerHistory(metrics)).toEqual([{ spend: 200, normalizedConversions: 5 }]);
  });

  test('excludes DRY_RUN entries so zeros never pollute a real regression', () => {
    const metrics = [
      { externalId: 'a', platform: 'meta' as const, impressions: 0, clicks: 0, conversions: 0, spend: 0, dateRange: { start: '2026-01-01', end: '2026-01-01' }, mode: 'DRY_RUN' as const },
      { externalId: 'b', platform: 'meta' as const, impressions: 1000, clicks: 50, conversions: 5, spend: 200, dateRange: { start: '2026-01-02', end: '2026-01-02' }, mode: 'LIVE' as const },
    ];
    const result = toOptimizerHistory(metrics);
    expect(result).toHaveLength(1);
    expect(result[0].spend).toBe(200);
  });
});
