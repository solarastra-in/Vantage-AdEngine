import { runRule, runRulesForCampaign } from '../lib/rulesEngineRunner';
import { AutomationRule } from '../lib/rulesEngine';
import { PlatformPerformanceMetrics } from '../lib/campaignDispatchEngine';

function makeRule(overrides: Partial<AutomationRule> = {}): AutomationRule {
  return {
    id: 'rule-1',
    orgId: 'org-test',
    campaignId: 'cmp-1',
    name: 'Pause on high CPA',
    enabled: true,
    condition: { metric: 'cpa', operator: '>', threshold: 30 },
    action: { type: 'PAUSE_CAMPAIGN' },
    cooldownMinutes: 60,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const highCpaMetrics: PlatformPerformanceMetrics[] = [
  { externalId: 'ext-1', platform: 'meta', impressions: 10000, clicks: 300, conversions: 10, spend: 500, dateRange: { start: '', end: '' }, mode: 'LIVE' }, // cpa = 50
];

describe('rulesEngineRunner: runRule', () => {
  test('a disabled rule is skipped without evaluating the condition', async () => {
    const executed = jest.fn();
    const record = await runRule(makeRule({ enabled: false }), highCpaMetrics, executed);
    expect(record.skippedReason).toBe('DISABLED');
    expect(executed).not.toHaveBeenCalled();
  });

  test('a triggered rule executes its action exactly once', async () => {
    const executed = jest.fn().mockResolvedValue(undefined);
    const record = await runRule(makeRule(), highCpaMetrics, executed);
    expect(record.triggered).toBe(true);
    expect(record.actionExecuted).toBe(true);
    expect(executed).toHaveBeenCalledTimes(1);
  });

  test('a non-triggered rule does not execute its action', async () => {
    const executed = jest.fn();
    const record = await runRule(makeRule({ condition: { metric: 'cpa', operator: '>', threshold: 1000 } }), highCpaMetrics, executed);
    expect(record.triggered).toBe(false);
    expect(executed).not.toHaveBeenCalled();
  });

  test('a rule in cooldown does not re-execute even though the condition is met', async () => {
    const now = new Date('2026-01-01T12:00:00Z');
    const executed = jest.fn();
    const rule = makeRule({ lastTriggeredAt: new Date('2026-01-01T11:50:00Z').toISOString(), cooldownMinutes: 60 });
    const record = await runRule(rule, highCpaMetrics, executed, now);
    expect(record.triggered).toBe(true);
    expect(record.skippedReason).toBe('COOLDOWN');
    expect(record.actionExecuted).toBe(false);
    expect(executed).not.toHaveBeenCalled();
  });

  test('an action that throws is captured in actionError, not propagated', async () => {
    const executed = jest.fn().mockRejectedValue(new Error('platform API down'));
    const record = await runRule(makeRule(), highCpaMetrics, executed);
    expect(record.actionExecuted).toBe(false);
    expect(record.actionError).toBe('platform API down');
  });

  test('insufficient data is reported distinctly from "condition not met"', async () => {
    const executed = jest.fn();
    const noConversionData: PlatformPerformanceMetrics[] = [
      { externalId: 'ext-1', platform: 'meta', impressions: 100, clicks: 5, conversions: 0, spend: 20, dateRange: { start: '', end: '' }, mode: 'LIVE' },
    ];
    const record = await runRule(makeRule(), noConversionData, executed);
    expect(record.skippedReason).toBe('INSUFFICIENT_DATA');
    expect(record.metricValue).toBeNull();
  });
});

describe('rulesEngineRunner: runRulesForCampaign', () => {
  test('evaluates multiple rules independently against the same snapshot', async () => {
    const executed = jest.fn().mockResolvedValue(undefined);
    const rules = [
      makeRule({ id: 'r1', condition: { metric: 'cpa', operator: '>', threshold: 30 } }), // triggers
      makeRule({ id: 'r2', condition: { metric: 'cpa', operator: '<', threshold: 10 } }), // does not trigger
    ];
    const records = await runRulesForCampaign(rules, highCpaMetrics, executed);
    expect(records).toHaveLength(2);
    expect(records.find(r => r.ruleId === 'r1')!.triggered).toBe(true);
    expect(records.find(r => r.ruleId === 'r2')!.triggered).toBe(false);
    expect(executed).toHaveBeenCalledTimes(1);
  });
});
