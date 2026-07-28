/**
 * rulesEngine.ts
 *
 * The category-defining feature this whole pipeline was missing. Research
 * across the actual market leaders (Revealbot, Madgicx, Smartly.io) is
 * consistent: their core value proposition is condition -> action
 * automation reacting to REAL performance data -- "IF CPA > $50 THEN
 * pause", "IF ROAS < 2 THEN reallocate", "IF frequency > 4 THEN alert."
 * Everything built in prior passes (real dispatch, real budget
 * optimization, real performance ingestion) was infrastructure this
 * feature actually needs to be real rather than decorative.
 *
 * This file is pure evaluation logic -- no IO, no storage, no network --
 * so it's fully unit-testable and reusable from both the server-side
 * runner (rulesEngineRunner.server.ts) and, if useful later, a client-side
 * "preview what this rule would have done" simulator.
 */

import { PlatformType } from '../types';
import { PlatformPerformanceMetrics } from './campaignDispatchEngine';

export type RuleMetric = 'cpa' | 'roas' | 'ctr' | 'spend' | 'conversions' | 'impressions';
export type RuleOperator = '>' | '<' | '>=' | '<=';

export interface RuleCondition {
  metric: RuleMetric;
  operator: RuleOperator;
  threshold: number;
  /** If omitted, evaluated against the blended total across all live channels. */
  platform?: PlatformType;
  /** Revenue attributed per conversion, needed only for the 'roas' metric. Defaults to 1 (ROAS becomes conversions/spend). */
  valuePerConversion?: number;
}

export type RuleAction =
  | { type: 'PAUSE_CAMPAIGN' }
  | { type: 'REALLOCATE_BUDGET' }
  | { type: 'ALERT'; message?: string };

export interface AutomationRule {
  id: string;
  orgId: string;
  campaignId: string;
  name: string;
  enabled: boolean;
  condition: RuleCondition;
  action: RuleAction;
  /** Minimum minutes between two triggers of this rule, to prevent thrashing (e.g. pause/unpause loops). */
  cooldownMinutes: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface AggregatedPerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
}

/**
 * Sums PlatformPerformanceMetrics across channels, optionally filtered to
 * one platform. DRY_RUN entries are excluded -- a rule evaluated against
 * all-zero placeholder data would trigger on garbage (e.g. cpa = 0/0).
 */
export function aggregatePerformance(
  metrics: PlatformPerformanceMetrics[],
  platform?: PlatformType
): AggregatedPerformance {
  const relevant = metrics.filter(m => m.mode === 'LIVE' && (!platform || m.platform === platform));
  return relevant.reduce(
    (acc, m) => ({
      impressions: acc.impressions + m.impressions,
      clicks: acc.clicks + m.clicks,
      conversions: acc.conversions + m.conversions,
      spend: acc.spend + m.spend,
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
  );
}

/**
 * Computes a single metric value from aggregated performance. Returns null
 * when the metric is mathematically undefined for the available data
 * (e.g. CPA with zero conversions) -- callers must treat null as "cannot
 * evaluate yet," never as 0 or Infinity, both of which would make a
 * threshold comparison silently wrong in one direction or the other.
 */
export function computeMetricValue(
  metric: RuleMetric,
  perf: AggregatedPerformance,
  valuePerConversion = 1
): number | null {
  switch (metric) {
    case 'spend':
      return perf.spend;
    case 'conversions':
      return perf.conversions;
    case 'impressions':
      return perf.impressions;
    case 'cpa':
      return perf.conversions > 0 ? perf.spend / perf.conversions : null;
    case 'ctr':
      return perf.impressions > 0 ? perf.clicks / perf.impressions : null;
    case 'roas':
      return perf.spend > 0 ? (perf.conversions * valuePerConversion) / perf.spend : null;
  }
}

function compare(value: number, operator: RuleOperator, threshold: number): boolean {
  switch (operator) {
    case '>':
      return value > threshold;
    case '<':
      return value < threshold;
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
  }
}

export interface RuleEvaluationResult {
  ruleId: string;
  triggered: boolean;
  reason: string;
  metricValue: number | null;
}

/**
 * Evaluates one rule's condition against real performance data. Does NOT
 * execute the action or check cooldown -- that's the runner's job
 * (rulesEngineRunner.server.ts), since cooldown requires knowing wall-clock
 * time and this function stays a pure, deterministic evaluator for testing.
 */
export function evaluateCondition(
  condition: RuleCondition,
  metrics: PlatformPerformanceMetrics[]
): RuleEvaluationResult {
  const perf = aggregatePerformance(metrics, condition.platform);
  const value = computeMetricValue(condition.metric, perf, condition.valuePerConversion);

  if (value === null) {
    return {
      ruleId: '',
      triggered: false,
      reason: `Cannot evaluate ${condition.metric}: insufficient data (e.g. zero conversions for a CPA/ROAS check).`,
      metricValue: null,
    };
  }

  const triggered = compare(value, condition.operator, condition.threshold);
  return {
    ruleId: '',
    triggered,
    reason: triggered
      ? `${condition.metric} (${value.toFixed(4)}) ${condition.operator} ${condition.threshold} -- condition met.`
      : `${condition.metric} (${value.toFixed(4)}) does not satisfy ${condition.operator} ${condition.threshold}.`,
    metricValue: value,
  };
}

/** Pure cooldown check -- given now and lastTriggeredAt, is the rule allowed to fire again? */
export function isInCooldown(rule: Pick<AutomationRule, 'lastTriggeredAt' | 'cooldownMinutes'>, now: Date = new Date()): boolean {
  if (!rule.lastTriggeredAt) return false;
  const elapsedMs = now.getTime() - new Date(rule.lastTriggeredAt).getTime();
  return elapsedMs < rule.cooldownMinutes * 60_000;
}
