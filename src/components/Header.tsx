import React from 'react';
import { Sparkles, Plus, RefreshCw, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  totalReach: number;
  totalSpend: number;
  avgRoi: number;
  activeNodesCount: number;
  onOpenWizard: () => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  totalReach,
  totalSpend,
  avgRoi,
  activeNodesCount,
  onOpenWizard,
  onRefreshData,
  isRefreshing,
}) => {
  return (
    <header className="h-20 border-b border-stone-800 flex items-center justify-between px-4 sm:px-8 bg-[#0a0a0a] text-stone-200 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      {/* Metrics Section */}
      <div className="flex items-center space-x-6 sm:space-x-12 overflow-x-auto no-scrollbar py-1">
        <div className="flex flex-col shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Total Reach</span>
          <span className="text-xl sm:text-2xl font-serif text-white tracking-tight italic">
            {totalReach.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Ad Spend</span>
          <span className="text-xl sm:text-2xl font-serif text-white tracking-tight italic">
            ${totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex flex-col shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Avg ROI</span>
          <span className="text-xl sm:text-2xl font-serif text-amber-400 tracking-tight italic">
            {avgRoi.toFixed(2)}x
          </span>
        </div>

        <div className="hidden lg:flex flex-col shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">API Sync Status</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
            <span className="text-xs font-mono text-stone-300">{activeNodesCount} Platform Nodes Active</span>
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div className="flex items-center space-x-3 shrink-0 ml-4">
        {onRefreshData && (
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            title="Sync Platform APIs"
            className="p-2.5 rounded bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        )}

        <button
          onClick={onOpenWizard}
          className="bg-amber-400 text-black px-4 sm:px-6 py-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-amber-300 transition-colors flex items-center gap-2 shadow-lg shadow-amber-400/10 rounded-sm"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Deploy Campaign</span>
        </button>
      </div>
    </header>
  );
};
