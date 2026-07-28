import { aggregatePerformance, computeMetricValue, evaluateCondition, isInCooldown } from '../lib/rulesEngine';
import { PlatformPerformanceMetrics } from '../lib/campaignDispatchEngine';

function metric(overrides: Partial<PlatformPerformanceMetrics> = {}): PlatformPerformanceMetrics {
  return {
    externalId: 'ext-1',
    platform: 'meta',
    impressions: 10000,
    clicks: 300,
    conversions: 15,
    spend: 500,
    dateRange: { start: '2026-01-01', end: '2026-01-07' },
    mode: 'LIVE',
    ...overrides,
  };
}

describe('rulesEngine: aggregatePerformance', () => {
  test('sums across channels', () => {
    const perf = aggregatePerformance([
      metric({ platform: 'meta', spend: 100, conversions: 5 }),
      metric({ platform: 'google', spend: 200, conversions: 10 }),
    ]);
    expect(perf.spend).toBe(300);
    expect(perf.conversions).toBe(15);
  });

  test('filters to a single platform when specified', () => {
    const perf = aggregatePerformance(
      [metric({ platform: 'meta', spend: 100 }), metric({ platform: 'google', spend: 200 })],
      'meta'
    );
    expect(perf.spend).toBe(100);
  });

  test('excludes DRY_RUN entries -- a rule should never trigger on placeholder zeros', () => {
    const perf = aggregatePerformance([
      metric({ mode: 'DRY_RUN', spend: 0, conversions: 0 }),
      metric({ mode: 'LIVE', spend: 100, conversions: 5 }),
    ]);
    expect(perf.spend).toBe(100);
    expect(perf.conversions).toBe(5);
  });
});

describe('rulesEngine: computeMetricValue', () => {
  test('cpa = spend / conversions', () => {
    expect(computeMetricValue('cpa', { impressions: 0, clicks: 0, conversions: 10, spend: 500 })).toBe(50);
  });

  test('cpa is null (not 0 or Infinity) with zero conversions', () => {
    expect(computeMetricValue('cpa', { impressions: 0, clicks: 0, conversions: 0, spend: 500 })).toBeNull();
  });

  test('roas uses valuePerConversion when provided', () => {
    const value = computeMetricValue('roas', { impressions: 0, clicks: 0, conversions: 10, spend: 100 }, 50);
    expect(value).toBe(5); // (10 * 50) / 100
  });

  test('ctr = clicks / impressions', () => {
    expect(computeMetricValue('ctr', { impressions: 1000, clicks: 30, conversions: 0, spend: 0 })).toBe(0.03);
  });

  test('ctr is null with zero impressions', () => {
    expect(computeMetricValue('ctr', { impressions: 0, clicks: 0, conversions: 0, spend: 0 })).toBeNull();
  });
});

describe('rulesEngine: evaluateCondition', () => {
  test('a CPA-too-high condition triggers correctly', () => {
    const result = evaluateCondition(
      { metric: 'cpa', operator: '>', threshold: 30 },
      [metric({ spend: 500, conversions: 10 })] // cpa = 50
    );
    expect(result.triggered).toBe(true);
    expect(result.metricValue).toBe(50);
  });

  test('a CPA-too-high condition does NOT trigger when CPA is actually low', () => {
    const result = evaluateCondition(
      { metric: 'cpa', operator: '>', threshold: 100 },
      [metric({ spend: 500, conversions: 10 })] // cpa = 50
    );
    expect(result.triggered).toBe(false);
  });

  test('returns metricValue null and triggered false when the metric is undefined for the data', () => {
    const result = evaluateCondition({ metric: 'roas', operator: '<', threshold: 1 }, [metric({ spend: 0, conversions: 0 })]);
    expect(result.metricValue).toBeNull();
    expect(result.triggered).toBe(false);
  });

  test('respects a platform-scoped condition', () => {
    const result = evaluateCondition({ metric: 'spend', operator: '>', threshold: 150, platform: 'meta' }, [
      metric({ platform: 'meta', spend: 100 }),
      metric({ platform: 'google', spend: 200 }),
    ]);
    // meta-only spend is 100, which does not exceed 150, even though blended spend (300) would.
    expect(result.triggered).toBe(false);
  });
});

describe('rulesEngine: isInCooldown', () => {
  test('not in cooldown if never triggered before', () => {
    expect(isInCooldown({ cooldownMinutes: 60 })).toBe(false);
  });

  test('in cooldown if triggered recently', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    const lastTriggeredAt = new Date('2026-01-01T11:50:00Z').toISOString(); // 10 min ago
    expect(isInCooldown({ lastTriggeredAt, cooldownMinutes: 60 }, now)).toBe(true);
  });

  test('not in cooldown once enough time has passed', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    const lastTriggeredAt = new Date('2026-01-01T10:00:00Z').toISOString(); // 2 hours ago
    expect(isInCooldown({ lastTriggeredAt, cooldownMinutes: 60 }, now)).toBe(false);
  });
});
