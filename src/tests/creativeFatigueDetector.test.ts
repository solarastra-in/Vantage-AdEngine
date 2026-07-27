import { assessCreativeFatigue } from '../lib/creativeFatigueDetector';

function makePoint(date: string, impressions: number, ctr: number, cvr: number, spend: number, uniqueUsers?: number) {
  return {
    date,
    impressions,
    clicks: Math.round(impressions * ctr),
    conversions: Math.round(impressions * ctr * cvr),
    spend,
    uniqueUsers,
  };
}

describe('creativeFatigueDetector: real decay detection vs. removed hardcoded claim', () => {
  test('returns null with insufficient history instead of guessing', () => {
    const result = assessCreativeFatigue('c1', [makePoint('2026-01-01', 1000, 0.03, 0.1, 20)]);
    expect(result).toBeNull();
  });

  test('a genuinely decaying creative (CTR drops 40%) is flagged fatigued or early_decay, not healthy', () => {
    const history = Array.from({ length: 20 }, (_, i) =>
      makePoint(`2026-01-${String(i + 1).padStart(2, '0')}`, 10000, i < 4 ? 0.03 : 0.03 * Math.max(0.55, 1 - i * 0.025), 0.1, 200)
    );
    const result = assessCreativeFatigue('c2', history)!;
    expect(result.status).not.toBe('healthy');
    const ctrSignal = result.signals.find(s => s.name === 'ctr_decay')!;
    expect(ctrSignal.changeRatio).toBeLessThan(0);
    expect(ctrSignal.severity).not.toBe('ok');
  });

  test('a stable creative (no decay) is correctly flagged healthy', () => {
    const history = Array.from({ length: 20 }, (_, i) => makePoint(`2026-01-${String(i + 1).padStart(2, '0')}`, 10000, 0.03, 0.1, 200));
    const result = assessCreativeFatigue('c3', history)!;
    expect(result.status).toBe('healthy');
    expect(result.compositeScore).toBeLessThan(25);
  });

  test('a creative that IMPROVES over time is not falsely flagged as fatigued', () => {
    const history = Array.from({ length: 20 }, (_, i) =>
      makePoint(`2026-01-${String(i + 1).padStart(2, '0')}`, 10000, i < 4 ? 0.02 : 0.02 * (1 + i * 0.02), 0.1, 200)
    );
    const result = assessCreativeFatigue('c4', history)!;
    expect(result.status).toBe('healthy');
  });

  test('rising CPM at stable CTR contributes to the composite score', () => {
    const history = Array.from({ length: 20 }, (_, i) =>
      makePoint(`2026-01-${String(i + 1).padStart(2, '0')}`, 10000, 0.03, 0.1, i < 4 ? 200 : 200 * (1 + i * 0.03))
    );
    const result = assessCreativeFatigue('c5', history)!;
    const cpmSignal = result.signals.find(s => s.name === 'cpm_drift')!;
    expect(cpmSignal.changeRatio).toBeGreaterThan(0);
  });
});
