/**
 * statsEngine.ts
 */

export interface VariantObservation {
  id: string;
  impressions: number;
  conversions: number;
}

export interface SignificanceResult {
  variantId: string;
  conversionRate: number;
  zScore: number;
  pValue: number;
  confidencePct: number;
  isSignificant: boolean;
  hasEnoughSample: boolean;
  minimumSampleRequired: number;
  status: 'leading' | 'losing' | 'control' | 'inconclusive';
}

function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741,
    a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function twoProportionZTest(
  control: VariantObservation,
  variant: VariantObservation
): { zScore: number; pValue: number } {
  const p1 = control.conversions / control.impressions;
  const p2 = variant.conversions / variant.impressions;
  const pooled =
    (control.conversions + variant.conversions) / (control.impressions + variant.impressions);

  const se = Math.sqrt(pooled * (1 - pooled) * (1 / control.impressions + 1 / variant.impressions));
  if (se === 0) return { zScore: 0, pValue: 1 };

  const z = (p2 - p1) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return { zScore: z, pValue };
}

export function minimumSampleSize(
  baselineRate: number,
  minimumDetectableEffectRel: number,
  alpha = 0.05,
  power = 0.8
): number {
  const zAlpha = 1.959963985;
  const zBeta = 0.8416212336;

  const p1 = baselineRate;
  const p2 = baselineRate * (1 + minimumDetectableEffectRel);
  const pBar = (p1 + p2) / 2;

  const numerator =
    (zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2;
  const denominator = (p2 - p1) ** 2;

  if (denominator === 0) return Infinity;
  return Math.ceil(numerator / denominator);
}

export interface EvaluateAbTestOptions {
  alpha?: number;
  minimumDetectableEffectRel?: number;
}

export function evaluateAbTest(
  control: VariantObservation,
  variants: VariantObservation[],
  opts: EvaluateAbTestOptions = {}
): SignificanceResult[] {
  const alpha = opts.alpha ?? 0.05;
  const mde = opts.minimumDetectableEffectRel ?? 0.10;

  const controlRate = control.impressions > 0 ? control.conversions / control.impressions : 0;
  const requiredN = minimumSampleSize(Math.max(controlRate, 0.001), mde, alpha);

  const controlResult: SignificanceResult = {
    variantId: control.id,
    conversionRate: controlRate,
    zScore: 0,
    pValue: 1,
    confidencePct: 0,
    isSignificant: false,
    hasEnoughSample: control.impressions >= requiredN,
    minimumSampleRequired: requiredN,
    status: 'control',
  };

  const variantResults: SignificanceResult[] = variants.map(v => {
    const rate = v.impressions > 0 ? v.conversions / v.impressions : 0;
    const hasEnoughSample = control.impressions >= requiredN && v.impressions >= requiredN;

    if (!hasEnoughSample || control.impressions === 0 || v.impressions === 0) {
      return {
        variantId: v.id,
        conversionRate: rate,
        zScore: 0,
        pValue: 1,
        confidencePct: 0,
        isSignificant: false,
        hasEnoughSample: false,
        minimumSampleRequired: requiredN,
        status: 'inconclusive',
      };
    }

    const { zScore, pValue } = twoProportionZTest(control, v);
    const confidencePct = Math.min(99.9, Math.max(0, (1 - pValue) * 100));
    const isSignificant = pValue < alpha;

    let status: SignificanceResult['status'] = 'inconclusive';
    if (isSignificant) status = zScore > 0 ? 'leading' : 'losing';

    return {
      variantId: v.id,
      conversionRate: rate,
      zScore,
      pValue,
      confidencePct,
      isSignificant,
      hasEnoughSample,
      minimumSampleRequired: requiredN,
      status,
    };
  });

  return [controlResult, ...variantResults];
}
