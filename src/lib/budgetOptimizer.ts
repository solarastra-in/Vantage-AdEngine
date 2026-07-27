/**
 * budgetOptimizer.ts
 */

import { PlatformType } from '../types';

export interface ChannelPerformanceSample {
  platform: PlatformType;
  spend: number;
  conversions: number;
  attributionWindowDays: number;
  daysSinceSpend: number;
}

export interface NormalizedChannelPerformance {
  platform: PlatformType;
  spend: number;
  rawConversions: number;
  normalizedConversions: number;
  normalizationFactor: number;
}

function attributionDecayFactor(attributionWindowDays: number, daysSinceSpend: number): number {
  const lambda = 3 / Math.max(attributionWindowDays, 1);
  const observedFraction = 1 - Math.exp(-lambda * Math.max(daysSinceSpend, 0.01));
  const clamped = Math.min(Math.max(observedFraction, 0.05), 1);
  return 1 / clamped;
}

export function normalizeChannelPerformance(
  samples: ChannelPerformanceSample[]
): NormalizedChannelPerformance[] {
  return samples.map(s => {
    const factor = attributionDecayFactor(s.attributionWindowDays, s.daysSinceSpend);
    return {
      platform: s.platform,
      spend: s.spend,
      rawConversions: s.conversions,
      normalizedConversions: s.conversions * factor,
      normalizationFactor: factor,
    };
  });
}

export interface ChannelHistoryPoint {
  spend: number;
  normalizedConversions: number;
}

export function estimateMarginalConversionsPerDollar(history: ChannelHistoryPoint[]): number {
  if (history.length === 0) return 0;
  if (history.length === 1) {
    return history[0].spend > 0 ? history[0].normalizedConversions / history[0].spend : 0;
  }

  const n = history.length;
  const meanX = history.reduce((a, h) => a + h.spend, 0) / n;
  const meanY = history.reduce((a, h) => a + h.normalizedConversions, 0) / n;

  let num = 0;
  let den = 0;
  for (const h of history) {
    num += (h.spend - meanX) * (h.normalizedConversions - meanY);
    den += (h.spend - meanX) ** 2;
  }

  if (den === 0) {
    return meanX > 0 ? meanY / meanX : 0;
  }

  const slope = num / den;
  const avgRate = meanX > 0 ? meanY / meanX : 0;
  return Math.max(slope, avgRate * 0.05);
}

export interface AllocationConstraint {
  platform: PlatformType;
  minSharePct: number;
  maxSharePct: number;
  valuePerConversion: number;
}

export interface ChannelAllocationResult {
  platform: PlatformType;
  currentSpend: number;
  recommendedSpend: number;
  deltaSpend: number;
  marginalConversionsPerDollar: number;
  projectedIncrementalConversions: number;
}

export interface BudgetReallocationPlan {
  totalBudget: number;
  increments: number;
  allocations: ChannelAllocationResult[];
  projectedTotalIncrementalConversions: number;
  projectedIncrementalConversionsVsEvenSplit: number;
}

export function computeBudgetReallocation(
  history: Record<PlatformType, ChannelHistoryPoint[]>,
  currentSpend: Record<PlatformType, number>,
  totalBudget: number,
  constraints: AllocationConstraint[],
  stepCount = 200
): BudgetReallocationPlan {
  const stepSize = totalBudget / stepCount;

  const state = constraints.map(c => ({
    platform: c.platform,
    minSpend: (c.minSharePct / 100) * totalBudget,
    maxSpend: (c.maxSharePct / 100) * totalBudget,
    valuePerConversion: c.valuePerConversion,
    baseMarginalRate: estimateMarginalConversionsPerDollar(history[c.platform] ?? []),
    allocated: (c.minSharePct / 100) * totalBudget,
    saturationExponent: 0,
  }));

  let remaining = totalBudget - state.reduce((a, s) => a + s.allocated, 0);

  const SATURATION_DECAY = 0.985;

  while (remaining > 1e-6) {
    const step = Math.min(stepSize, remaining);

    let best: (typeof state)[number] | null = null;
    let bestValue = -Infinity;
    for (const s of state) {
      if (s.allocated >= s.maxSpend - 1e-9) continue;
      const currentMarginalRate = s.baseMarginalRate * SATURATION_DECAY ** s.saturationExponent;
      const value = currentMarginalRate * s.valuePerConversion;
      if (value > bestValue) {
        bestValue = value;
        best = s;
      }
    }

    if (!best) break;

    const room = best.maxSpend - best.allocated;
    const applied = Math.min(step, room);
    best.allocated += applied;
    best.saturationExponent += applied / stepSize;
    remaining -= applied;
  }

  const allocations: ChannelAllocationResult[] = state.map(s => {
    const deltaSpend = s.allocated - (currentSpend[s.platform] ?? 0);
    const projected = s.baseMarginalRate * s.allocated;
    return {
      platform: s.platform,
      currentSpend: currentSpend[s.platform] ?? 0,
      recommendedSpend: Math.round(s.allocated * 100) / 100,
      deltaSpend: Math.round(deltaSpend * 100) / 100,
      marginalConversionsPerDollar: Math.round(s.baseMarginalRate * 10000) / 10000,
      projectedIncrementalConversions: Math.round(projected * 100) / 100,
    };
  });

  const projectedTotal = allocations.reduce((a, r) => a + r.projectedIncrementalConversions, 0);

  const evenSplit = totalBudget / constraints.length;
  const evenSplitProjected = state.reduce((a, s) => a + s.baseMarginalRate * evenSplit, 0);

  return {
    totalBudget,
    increments: stepCount,
    allocations,
    projectedTotalIncrementalConversions: Math.round(projectedTotal * 100) / 100,
    projectedIncrementalConversionsVsEvenSplit:
      Math.round((projectedTotal - evenSplitProjected) * 100) / 100,
  };
}
