/**
 * rulesEngineRunner.ts
 *
 * Orchestrates one automation rule: evaluate its condition against real
 * performance data, respect cooldown, and if triggered, execute its action
 * via an injected callback. Action execution (pausing a campaign,
 * reallocating budget, sending an alert) is injected rather than hardcoded
 * here, so this stays testable without a real server, storage, or network
 * -- the same dependency-injection pattern performanceIngestion.ts and
 * campaignDispatchEngine.ts's credentialResolver already use.
 */

import { AutomationRule, evaluateCondition, isInCooldown } from './rulesEngine';
import { PlatformPerformanceMetrics } from './campaignDispatchEngine';

export interface RuleExecutionRecord {
  ruleId: string;
  campaignId: string;
  evaluatedAt: string;
  triggered: boolean;
  skippedReason?: 'DISABLED' | 'COOLDOWN' | 'INSUFFICIENT_DATA';
  reason: string;
  metricValue: number | null;
  actionExecuted: boolean;
  actionError?: string;
}

export interface RuleActionExecutor {
  (rule: AutomationRule): Promise<void>;
}

/**
 * Evaluates a single rule and, if it fires and isn't in cooldown, calls
 * executeAction. Returns a record either way -- including for rules that
 * didn't trigger or were skipped -- so callers get a complete audit trail
 * of every evaluation, not just the ones that acted.
 */
export async function runRule(
  rule: AutomationRule,
  metrics: PlatformPerformanceMetrics[],
  executeAction: RuleActionExecutor,
  now: Date = new Date()
): Promise<RuleExecutionRecord> {
  const evaluatedAt = now.toISOString();

  if (!rule.enabled) {
    return {
      ruleId: rule.id,
      campaignId: rule.campaignId,
      evaluatedAt,
      triggered: false,
      skippedReason: 'DISABLED',
      reason: 'Rule is disabled.',
      metricValue: null,
      actionExecuted: false,
    };
  }

  const evaluation = evaluateCondition(rule.condition, metrics);

  if (evaluation.metricValue === null) {
    return {
      ruleId: rule.id,
      campaignId: rule.campaignId,
      evaluatedAt,
      triggered: false,
      skippedReason: 'INSUFFICIENT_DATA',
      reason: evaluation.reason,
      metricValue: null,
      actionExecuted: false,
    };
  }

  if (!evaluation.triggered) {
    return {
      ruleId: rule.id,
      campaignId: rule.campaignId,
      evaluatedAt,
      triggered: false,
      reason: evaluation.reason,
      metricValue: evaluation.metricValue,
      actionExecuted: false,
    };
  }

  if (isInCooldown(rule, now)) {
    return {
      ruleId: rule.id,
      campaignId: rule.campaignId,
      evaluatedAt,
      triggered: true,
      skippedReason: 'COOLDOWN',
      reason: `${evaluation.reason} (condition met, but rule fired within the last ${rule.cooldownMinutes} minutes -- skipping to avoid thrashing.)`,
      metricValue: evaluation.metricValue,
      actionExecuted: false,
    };
  }

  try {
    await executeAction(rule);
    return {
      ruleId: rule.id,
      campaignId: rule.campaignId,
      evaluatedAt,
      triggered: true,
      reason: evaluation.reason,
      metricValue: evaluation.metricValue,
      actionExecuted: true,
    };
  } catch (err: any) {
    return {
      ruleId: rule.id,
      campaignId: rule.campaignId,
      evaluatedAt,
      triggered: true,
      reason: evaluation.reason,
      metricValue: evaluation.metricValue,
      actionExecuted: false,
      actionError: err.message,
    };
  }
}

/** Runs every enabled rule for the given campaign against the same performance snapshot. */
export async function runRulesForCampaign(
  rules: AutomationRule[],
  metrics: PlatformPerformanceMetrics[],
  executeAction: RuleActionExecutor,
  now: Date = new Date()
): Promise<RuleExecutionRecord[]> {
  return Promise.all(rules.map(rule => runRule(rule, metrics, executeAction, now)));
}
