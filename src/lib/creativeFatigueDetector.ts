/**
 * creativeFatigueDetector.ts
 *
 * Replaces hardcoded claims with a real, computed fatigue detector.
 *
 * Methodology:
 *   1. CTR decay      -- current CTR vs. baseline window CTR
 *   2. Frequency      -- average impressions per unique user
 *   3. CPM drift      -- current CPM vs. baseline CPM
 *   4. Conversion decay -- current CVR vs. baseline CVR
 */

export interface CreativePerformancePoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  uniqueUsers?: number;
}

export interface FatigueSignal {
  name: 'ctr_decay' | 'cpm_drift' | 'cvr_decay' | 'frequency';
  baselineValue: number;
  currentValue: number;
  changeRatio: number;
  severity: 'ok' | 'warn' | 'critical';
}

export interface FatigueAssessment {
  creativeId: string;
  compositeScore: number; // 0-100, higher = more fatigued
  status: 'healthy' | 'early_decay' | 'fatigued';
  signals: FatigueSignal[];
  recommendation: string;
  baselineWindowDays: number;
  currentWindowDays: number;
}

const DEFAULT_WEIGHTS = { ctr: 0.3, cpm: 0.2, cvr: 0.3, frequency: 0.2 };

function severityFor(name: FatigueSignal['name'], changeRatio: number): FatigueSignal['severity'] {
  const badDirection = name === 'ctr_decay' || name === 'cvr_decay' ? -changeRatio : changeRatio;
  if (badDirection >= 0.30) return 'critical';
  if (badDirection >= 0.15) return 'warn';
  return 'ok';
}

export function assessCreativeFatigue(
  creativeId: string,
  history: CreativePerformancePoint[],
  opts: { baselineFraction?: number; recentWindowDays?: number; weights?: typeof DEFAULT_WEIGHTS } = {}
): FatigueAssessment | null {
  if (history.length < 4) return null;

  const baselineFraction = opts.baselineFraction ?? 0.2;
  const recentWindowDays = opts.recentWindowDays ?? 7;
  const weights = opts.weights ?? DEFAULT_WEIGHTS;

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const baselineCount = Math.max(2, Math.round(sorted.length * baselineFraction));
  const baselinePoints = sorted.slice(0, baselineCount);
  const recentPoints = sorted.slice(-Math.min(recentWindowDays, sorted.length));

  const sum = (pts: CreativePerformancePoint[], key: 'impressions' | 'clicks' | 'conversions' | 'spend') =>
    pts.reduce((a, p) => a + p[key], 0);

  const baselineImpr = sum(baselinePoints, 'impressions');
  const recentImpr = sum(recentPoints, 'impressions');
  if (baselineImpr === 0 || recentImpr === 0) return null;

  const baselineCtr = sum(baselinePoints, 'clicks') / baselineImpr;
  const recentCtr = sum(recentPoints, 'clicks') / recentImpr;

  const baselineCpm = (sum(baselinePoints, 'spend') / baselineImpr) * 1000;
  const recentCpm = (sum(recentPoints, 'spend') / recentImpr) * 1000;

  const baselineClicks = sum(baselinePoints, 'clicks');
  const recentClicks = sum(recentPoints, 'clicks');
  const baselineCvr = baselineClicks > 0 ? sum(baselinePoints, 'conversions') / baselineClicks : 0;
  const recentCvr = recentClicks > 0 ? sum(recentPoints, 'conversions') / recentClicks : 0;

  const signals: FatigueSignal[] = [];

  const ctrChange = baselineCtr > 0 ? recentCtr / baselineCtr - 1 : 0;
  signals.push({ name: 'ctr_decay', baselineValue: baselineCtr, currentValue: recentCtr, changeRatio: ctrChange, severity: severityFor('ctr_decay', ctrChange) });

  const cpmChange = baselineCpm > 0 ? recentCpm / baselineCpm - 1 : 0;
  signals.push({ name: 'cpm_drift', baselineValue: baselineCpm, currentValue: recentCpm, changeRatio: cpmChange, severity: severityFor('cpm_drift', cpmChange) });

  const cvrChange = baselineCvr > 0 ? recentCvr / baselineCvr - 1 : 0;
  signals.push({ name: 'cvr_decay', baselineValue: baselineCvr, currentValue: recentCvr, changeRatio: cvrChange, severity: severityFor('cvr_decay', cvrChange) });

  const hasFrequencyData = sorted.every(p => p.uniqueUsers !== undefined);
  let frequencyWeight = weights.frequency;
  if (hasFrequencyData) {
    const sumUsers = (pts: CreativePerformancePoint[]) => pts.reduce((a, p) => a + (p.uniqueUsers ?? 0), 0);
    const baselineFreq = sum(baselinePoints, 'impressions') / Math.max(1, sumUsers(baselinePoints));
    const recentFreq = sum(recentPoints, 'impressions') / Math.max(1, sumUsers(recentPoints));
    const freqChange = baselineFreq > 0 ? recentFreq / baselineFreq - 1 : 0;
    signals.push({ name: 'frequency', baselineValue: baselineFreq, currentValue: recentFreq, changeRatio: freqChange, severity: severityFor('frequency', freqChange) });
  } else {
    frequencyWeight = 0;
  }

  const weightTotal = weights.ctr + weights.cpm + weights.cvr + frequencyWeight || 1;

  const badnessOf = (s: FatigueSignal) => {
    const bad = (s.name === 'ctr_decay' || s.name === 'cvr_decay') ? -s.changeRatio : s.changeRatio;
    return Math.min(1, Math.max(0, bad / 0.30));
  };

  const weightedSum =
    badnessOf(signals[0]) * weights.ctr +
    badnessOf(signals[1]) * weights.cpm +
    badnessOf(signals[2]) * weights.cvr +
    (hasFrequencyData ? badnessOf(signals[3]) * frequencyWeight : 0);

  const compositeScore = Math.round((weightedSum / weightTotal) * 100);

  const status: FatigueAssessment['status'] =
    compositeScore >= 50 ? 'fatigued' : compositeScore >= 25 ? 'early_decay' : 'healthy';

  const recommendation =
    status === 'fatigued'
      ? 'CTR/CVR decline is significant relative to this creative\'s own baseline -- replace or refresh now.'
      : status === 'early_decay'
      ? 'Early decay signals detected -- prepare a replacement creative; no need to pause yet.'
      : 'No significant fatigue detected relative to baseline.';

  return {
    creativeId,
    compositeScore,
    status,
    signals,
    recommendation,
    baselineWindowDays: baselinePoints.length,
    currentWindowDays: recentPoints.length,
  };
}
