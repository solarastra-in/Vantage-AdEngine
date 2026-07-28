/**
 * performanceIngestion.ts
 *
 * Closes the gap that every other real module in this codebase (budget
 * optimizer, creative fatigue detector) had to work around by deriving
 * synthetic-but-labeled history from aggregate snapshots: there was no
 * actual pipeline pulling real performance data back FROM the ad
 * platforms. Every adapter now implements fetchPerformance() (see
 * src/lib/adapters/*.ts); this module is what calls it for every live
 * channel of a campaign and persists the result.
 *
 * Storage shape: one durable record per (orgId, campaignId, platform, date
 * range), so a history of pulls accumulates over time -- which is exactly
 * the real (spend, conversions) time series the budget optimizer's
 * regression and the fatigue detector's baseline comparison actually want,
 * instead of the two-point derivation both were using as a stopgap.
 */

import { PlatformType, Campaign } from '../types';
import { PlatformPerformanceMetrics } from './campaignDispatchEngine';
import { StorageAdapter } from './storageAdapter.server';

export interface IngestionResult {
  campaignId: string;
  pulledAt: string;
  perChannel: PlatformPerformanceMetrics[];
  errors: { platform: PlatformType; error: string }[];
}

const PERFORMANCE_KEY_PREFIX = 'performance-history:';

function historyKey(orgId: string, campaignId: string, platform: PlatformType): string {
  return `${PERFORMANCE_KEY_PREFIX}${orgId}:${campaignId}:${platform}`;
}

/**
 * Pulls performance for every LIVE channel of a campaign and appends each
 * pull to that channel's durable history (capped at MAX_HISTORY_POINTS so
 * this doesn't grow unboundedly for a long-running campaign pulled daily
 * for years).
 */
const MAX_HISTORY_POINTS = 180; // ~6 months of daily pulls

export async function ingestCampaignPerformance(
  campaign: Campaign,
  storage: StorageAdapter,
  fetchPerformanceFor: (
    platform: PlatformType,
    externalId: string,
    dateRange: { start: string; end: string }
  ) => Promise<PlatformPerformanceMetrics>,
  dateRange: { start: string; end: string }
): Promise<IngestionResult> {
  const orgId = campaign.orgId ?? 'unknown';
  const liveChannels = campaign.publishStatuses.filter(p => p.status === 'live' && p.externalId);

  const perChannel: PlatformPerformanceMetrics[] = [];
  const errors: IngestionResult['errors'] = [];

  await Promise.all(
    liveChannels.map(async status => {
      try {
        const metrics = await fetchPerformanceFor(status.platform, status.externalId!, dateRange);
        perChannel.push(metrics);

        const key = historyKey(orgId, campaign.id, status.platform);
        const existing = (await storage.get<PlatformPerformanceMetrics[]>(key)) ?? [];
        const updated = [...existing, metrics].slice(-MAX_HISTORY_POINTS);
        await storage.set(key, updated);
      } catch (err: any) {
        errors.push({ platform: status.platform, error: err.message });
      }
    })
  );

  return {
    campaignId: campaign.id,
    pulledAt: new Date().toISOString(),
    perChannel,
    errors,
  };
}

/** Reads the accumulated performance history for one campaign channel. */
export async function getChannelPerformanceHistory(
  storage: StorageAdapter,
  orgId: string,
  campaignId: string,
  platform: PlatformType
): Promise<PlatformPerformanceMetrics[]> {
  return (await storage.get<PlatformPerformanceMetrics[]>(historyKey(orgId, campaignId, platform))) ?? [];
}

/**
 * Converts accumulated real performance history into the (spend,
 * normalizedConversions) point series the budget optimizer expects
 * (src/lib/budgetOptimizer.ts). Once enough real history has accumulated,
 * callers should prefer this over the derived-from-snapshot approach the
 * MarketIntelligence widget currently falls back to.
 */
export function toOptimizerHistory(
  metrics: PlatformPerformanceMetrics[]
): { spend: number; normalizedConversions: number }[] {
  return metrics
    .filter(m => m.mode === 'LIVE') // never let dry-run zeros pollute a real regression
    .map(m => ({ spend: m.spend, normalizedConversions: m.conversions }));
}
