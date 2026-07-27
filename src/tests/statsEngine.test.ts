import { evaluateAbTest, minimumSampleSize } from '../lib/statsEngine';

describe('statsEngine: real statistical significance (replaces random confidence)', () => {
  test('small sample with a real-looking effect is NOT reported as significant', () => {
    const [, variant] = evaluateAbTest(
      { id: 'control', impressions: 200, conversions: 8 },
      [{ id: 'variant-a', impressions: 200, conversions: 14 }]
    );
    expect(variant.hasEnoughSample).toBe(false);
    expect(variant.status).toBe('inconclusive');
    expect(variant.confidencePct).toBe(0);
  });

  test('large sample with a genuine effect is correctly flagged leading with high confidence', () => {
    const [, variant] = evaluateAbTest(
      { id: 'control', impressions: 10000, conversions: 400 },
      [{ id: 'variant-a', impressions: 10000, conversions: 700 }],
      { minimumDetectableEffectRel: 0.5 }
    );
    expect(variant.hasEnoughSample).toBe(true);
    expect(variant.status).toBe('leading');
    expect(variant.isSignificant).toBe(true);
    expect(variant.confidencePct).toBeGreaterThan(95);
  });

  test('large sample with NO real difference is NOT falsely flagged significant', () => {
    const [, variant] = evaluateAbTest(
      { id: 'control', impressions: 10000, conversions: 400 },
      [{ id: 'variant-a', impressions: 10000, conversions: 410 }],
      { minimumDetectableEffectRel: 0.5 }
    );
    expect(variant.isSignificant).toBe(false);
    expect(variant.status).toBe('inconclusive');
  });

  test('a losing variant (negative z-score) is flagged losing, not leading', () => {
    const [, variant] = evaluateAbTest(
      { id: 'control', impressions: 10000, conversions: 700 },
      [{ id: 'variant-a', impressions: 10000, conversions: 400 }],
      { minimumDetectableEffectRel: 0.5 }
    );
    expect(variant.status).toBe('losing');
  });

  test('minimum sample size shrinks as the target effect size grows', () => {
    const nSmallEffect = minimumSampleSize(0.04, 0.10);
    const nLargeEffect = minimumSampleSize(0.04, 0.50);
    expect(nLargeEffect).toBeLessThan(nSmallEffect);
  });

  test('confidence is never reported as exactly random-range noise (82-99.9) for a zero-effect case', () => {
    const [, variant] = evaluateAbTest(
      { id: 'control', impressions: 5000, conversions: 200 },
      [{ id: 'variant-a', impressions: 5000, conversions: 201 }],
      { minimumDetectableEffectRel: 0.5 }
    );
    expect(variant.confidencePct).toBeLessThan(82);
  });
});
