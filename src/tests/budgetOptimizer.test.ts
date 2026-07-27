import {
  normalizeChannelPerformance,
  estimateMarginalConversionsPerDollar,
  computeBudgetReallocation,
} from '../lib/budgetOptimizer';

describe('budgetOptimizer: attribution normalization + marginal ROAS allocation', () => {
  test('a long-attribution-window channel observed for only a few days is scaled up relative to a fully-observed short-window channel', () => {
    const [google, meta] = normalizeChannelPerformance([
      { platform: 'google', spend: 5000, conversions: 40, attributionWindowDays: 30, daysSinceSpend: 5 },
      { platform: 'meta', spend: 5000, conversions: 60, attributionWindowDays: 1, daysSinceSpend: 5 },
    ]);
    expect(google.normalizationFactor).toBeGreaterThan(meta.normalizationFactor);
    expect(google.normalizedConversions).toBeGreaterThan(google.rawConversions);
    expect(meta.normalizationFactor).toBeCloseTo(1, 1);
  });

  test('marginal rate for a decelerating channel is below its naive average rate', () => {
    const history = [
      { spend: 1000, normalizedConversions: 50 },
      { spend: 2000, normalizedConversions: 90 },
      { spend: 3000, normalizedConversions: 120 },
    ];
    const marginal = estimateMarginalConversionsPerDollar(history);
    const naiveAvg = 120 / 3000;
    expect(marginal).toBeLessThan(naiveAvg);
  });

  test('reallocation plan sums exactly to total budget and respects min/max share bounds', () => {
    const history = {
      meta: [{ spend: 1000, normalizedConversions: 60 }, { spend: 2000, normalizedConversions: 110 }],
      google: [{ spend: 1000, normalizedConversions: 30 }, { spend: 2000, normalizedConversions: 55 }],
      linkedin: [{ spend: 1000, normalizedConversions: 10 }, { spend: 2000, normalizedConversions: 18 }],
    } as any;
    const currentSpend = { meta: 1000, google: 1000, linkedin: 1000 } as any;
    const constraints = [
      { platform: 'meta', minSharePct: 10, maxSharePct: 60, valuePerConversion: 100 },
      { platform: 'google', minSharePct: 10, maxSharePct: 60, valuePerConversion: 100 },
      { platform: 'linkedin', minSharePct: 5, maxSharePct: 40, valuePerConversion: 300 },
    ] as any;

    const plan = computeBudgetReallocation(history, currentSpend, 10000, constraints);
    const total = plan.allocations.reduce((s, a) => s + a.recommendedSpend, 0);
    expect(total).toBeCloseTo(10000, 0);

    for (const alloc of plan.allocations) {
      const constraint = constraints.find((c: any) => c.platform === alloc.platform);
      expect(alloc.recommendedSpend).toBeGreaterThanOrEqual((constraint.minSharePct / 100) * 10000 - 1);
      expect(alloc.recommendedSpend).toBeLessThanOrEqual((constraint.maxSharePct / 100) * 10000 + 1);
    }
  });

  test('a higher value-per-conversion channel (e.g. B2B) gets more than its naive conversion-rate share would suggest', () => {
    const history = {
      meta: [{ spend: 1000, normalizedConversions: 100 }],
      linkedin: [{ spend: 1000, normalizedConversions: 20 }],
    } as any;
    const currentSpend = { meta: 1000, linkedin: 1000 } as any;
    const constraints = [
      { platform: 'meta', minSharePct: 5, maxSharePct: 95, valuePerConversion: 50 },
      { platform: 'linkedin', minSharePct: 5, maxSharePct: 95, valuePerConversion: 1000 },
    ] as any;

    const plan = computeBudgetReallocation(history, currentSpend, 10000, constraints);
    const linkedinAlloc = plan.allocations.find(a => a.platform === 'linkedin')!;
    expect(linkedinAlloc.recommendedSpend).toBeGreaterThan(5000);
  });
});
