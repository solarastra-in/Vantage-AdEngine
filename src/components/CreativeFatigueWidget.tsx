import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react';
import { Campaign, PerformanceTimePoint } from '../types';
import { FatigueAssessment } from '../lib/creativeFatigueDetector';

interface CreativeFatigueWidgetProps {
  campaigns: Campaign[];
  timeSeries: PerformanceTimePoint[];
}

export const CreativeFatigueWidget: React.FC<CreativeFatigueWidgetProps> = ({ campaigns, timeSeries }) => {
  const [assessments, setAssessments] = useState<Record<string, FatigueAssessment | { status: string; message: string }>>({});
  const [loading, setLoading] = useState(true);

  const activeCampaigns = campaigns.filter(c => c.status === 'active').slice(0, 3);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      const totalSpend = campaigns.reduce((a, c) => a + (c.spentBudget || 0), 0) || 1;
      const results: Record<string, any> = {};

      await Promise.all(
        activeCampaigns.map(async campaign => {
          const spendShare = (campaign.spentBudget || 0) / totalSpend;
          const history = timeSeries.map(point => ({
            date: point.date,
            impressions: Math.round(point.impressions * spendShare),
            clicks: Math.round(point.clicks * spendShare),
            conversions: Math.round(point.conversions * spendShare),
            spend: point.spend * spendShare,
          }));

          try {
            const res = await fetch(`/api/creatives/${campaign.id}/fatigue`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ history }),
            });
            if (res.ok) results[campaign.id] = await res.json();
          } catch (err) {
            console.error('Fatigue assessment error:', err);
          }
        })
      );

      if (!cancelled) {
        setAssessments(results);
        setLoading(false);
      }
    };

    if (activeCampaigns.length > 0) run();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(activeCampaigns.map(c => c.id)), timeSeries.length]);

  if (activeCampaigns.length === 0) {
    return <div className="text-[11px] text-stone-500 font-mono p-2">No active campaigns to assess.</div>;
  }

  return (
    <div className="space-y-3 font-sans text-xs">
      {loading && <div className="text-[11px] text-stone-500 font-mono">Computing fatigue scores from creative performance history...</div>}

      {!loading &&
        activeCampaigns.map(campaign => {
          const result = assessments[campaign.id];
          if (!result) return null;

          if ('message' in result) {
            return (
              <div key={campaign.id} className="p-3 bg-stone-900 border border-stone-800 rounded text-[11px] text-stone-500">
                {campaign.name}: {result.message}
              </div>
            );
          }

          const a = result as FatigueAssessment;
          const toneClasses =
            a.status === 'fatigued'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : a.status === 'early_decay'
              ? 'bg-amber-400/10 border-amber-400/30 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';

          return (
            <div key={campaign.id} className={`p-4 rounded border space-y-2 font-mono ${toneClasses}`}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white font-sans">{campaign.name}</span>
                <div className="flex items-center gap-1.5">
                  {a.status === 'healthy' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span className="font-bold uppercase text-[10px]">{a.status.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span>Fatigue score:</span>
                <span className="font-bold">{a.compositeScore}/100</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[9px] text-stone-300">
                {a.signals.map(s => (
                  <div key={s.name} className="flex items-center gap-1">
                    {s.severity !== 'ok' && <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
                    <span>{s.name.replace('_', ' ')}: {(s.changeRatio * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-stone-300 font-sans">{a.recommendation}</p>
            </div>
          );
        })}

      <p className="text-[10px] text-stone-500 font-mono">
        Computed by src/lib/creativeFatigueDetector.ts from each creative's own baseline window.
      </p>
    </div>
  );
};
