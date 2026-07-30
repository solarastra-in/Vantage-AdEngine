import React from 'react';
import { CheckCircle2, XCircle, RotateCcw, AlertTriangle, X } from 'lucide-react';

export interface DispatchResultUI {
  platform: string;
  outcome: 'LIVE' | 'FAILED' | 'ROLLED_BACK' | 'SKIPPED_VALIDATION';
  externalId?: string;
  error?: string;
  mode?: 'LIVE' | 'DRY_RUN';
}

export interface DispatchReportUI {
  campaignId: string;
  overallStatus: 'ALL_LIVE' | 'PARTIAL' | 'ALL_FAILED';
  results: DispatchResultUI[];
}

export const DispatchReportBanner: React.FC<{ report: DispatchReportUI; onDismiss: () => void }> = ({
  report,
  onDismiss,
}) => {
  const headline =
    report.overallStatus === 'ALL_LIVE'
      ? 'All channels published successfully'
      : report.overallStatus === 'PARTIAL'
      ? 'Published to some channels; others failed'
      : 'Publish failed -- channels that went live were rolled back';

  const toneClasses =
    report.overallStatus === 'ALL_LIVE'
      ? 'border-emerald-500/30 bg-emerald-500/5'
      : report.overallStatus === 'PARTIAL'
      ? 'border-amber-500/30 bg-amber-500/5'
      : 'border-rose-500/30 bg-rose-500/5';

  return (
    <div className={`fixed bottom-6 right-6 z-50 w-full max-w-md rounded-lg border ${toneClasses} bg-stone-950/95 backdrop-blur p-4 shadow-2xl font-mono text-xs`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {report.overallStatus === 'ALL_LIVE' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : report.overallStatus === 'PARTIAL' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="font-sans font-bold text-white text-sm">{headline}</span>
        </div>
        <button onClick={onDismiss} className="text-stone-500 hover:text-stone-300">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {report.results.map(r => (
          <div key={r.platform} className="border-t border-stone-800/60 pt-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="uppercase text-stone-400 font-bold">{r.platform}</span>
              <div className="flex items-center gap-1.5">
                {r.outcome === 'LIVE' && (
                  <span className={`flex items-center gap-1 ${r.mode === 'LIVE' ? 'text-emerald-400 font-semibold' : 'text-amber-400/90'}`}>
                    <CheckCircle2 className="w-3 h-3" />
                    {r.mode === 'LIVE' ? 'Live API Sent' : 'Dry-run OK'}
                  </span>
                )}
                {r.outcome === 'FAILED' && (
                  <span className="flex items-center gap-1 text-rose-400 font-semibold" title={r.error}>
                    <XCircle className="w-3 h-3" />
                    Failed
                  </span>
                )}
                {r.outcome === 'ROLLED_BACK' && (
                  <span className="flex items-center gap-1 text-amber-400" title="Rolled back because a sibling channel failed">
                    <RotateCcw className="w-3 h-3" />
                    Rolled back
                  </span>
                )}
                {r.outcome === 'SKIPPED_VALIDATION' && (
                  <span className="flex items-center gap-1 text-rose-300" title={r.error}>
                    <AlertTriangle className="w-3 h-3" />
                    Invalid
                  </span>
                )}
              </div>
            </div>
            {r.error && (
              <p className="mt-1 text-[11px] text-rose-300/90 font-mono bg-rose-500/10 border border-rose-500/20 p-1.5 rounded-xs break-all leading-normal">
                ⚠️ {r.error}
              </p>
            )}
          </div>
        ))}
      </div>

      {report.results.some(r => r.mode === 'DRY_RUN' || r.externalId?.startsWith('DRYRUN_')) && (
        <div className="mt-2.5 pt-2 border-t border-stone-800/80 text-[10px] text-amber-300/90 leading-snug">
          💡 <span className="font-semibold">Dry-Run Mode:</span> Channels without connected API credentials run in Dry-Run mode. To publish directly to your live Google Ads or Meta account, configure API credentials in <span className="underline font-semibold">API Nexus</span>.
        </div>
      )}

      {report.overallStatus !== 'ALL_LIVE' && (
        <p className="mt-2 text-[10px] text-stone-500 leading-relaxed border-t border-stone-800/60 pt-1.5">
          {report.overallStatus === 'ALL_FAILED'
            ? 'This campaign was not left partially live: any channel that briefly succeeded was rolled back automatically.'
            : 'Partial-publish mode is on -- failed channels above did not roll back the ones that succeeded.'}
        </p>
      )}
    </div>
  );
};
