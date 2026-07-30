import React from 'react';
import { Campaign } from '../types';
import { 
  X, 
  Megaphone, 
  Zap, 
  ExternalLink, 
  CheckCircle2, 
  Layers, 
  TrendingUp, 
  Eye, 
  MousePointerClick, 
  DollarSign,
  Play,
  Pause,
  Trash2
} from 'lucide-react';

interface CampaignDetailModalProps {
  campaign: Campaign | null;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onPublish: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({
  campaign,
  onClose,
  onToggleStatus,
  onPublish,
  onDelete,
}) => {
  if (!campaign) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0e0e0e] border border-stone-800 rounded-sm w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col my-8 text-stone-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-800 bg-[#0a0a0a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {campaign.name}
              </h2>
              <div className="text-[11px] text-stone-500 font-mono flex items-center gap-2">
                <span>ID: {campaign.id}</span>
                <span>&bull;</span>
                <span className="text-amber-400 uppercase font-bold">{campaign.status}</span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Key Metric Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#0d0d0d] p-4 border border-stone-800 font-mono text-xs">
            <div>
              <span className="text-stone-500 block text-[10px] uppercase">Spent / Total Budget</span>
              <span className="text-white font-bold text-sm">${campaign.spentBudget.toLocaleString()} / ${campaign.totalBudget.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px] uppercase">Total Impressions</span>
              <span className="text-white font-bold text-sm">{campaign.metrics.impressions.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px] uppercase">Conversions</span>
              <span className="text-white font-bold text-sm">{campaign.metrics.conversions.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[10px] uppercase">ROAS</span>
              <span className="text-amber-400 font-bold text-sm">{campaign.metrics.roas.toFixed(2)}x</span>
            </div>
          </div>

          {/* Ad Creative Assets */}
          <div className="bg-[#0d0d0d] border border-stone-800 p-5 rounded-sm space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-amber-400 font-bold">
              Ad Creative & Media Asset
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              {campaign.creative.mediaUrl && (
                <div className="md:col-span-1 rounded overflow-hidden border border-stone-800 max-h-48">
                  <img 
                    src={campaign.creative.mediaUrl} 
                    alt="Campaign Media Asset"
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}

              <div className={`${campaign.creative.mediaUrl ? 'md:col-span-2' : 'col-span-3'} space-y-2`}>
                <div className="text-sm font-bold text-white">{campaign.creative.headline}</div>
                <p className="text-xs text-stone-300 leading-relaxed">{campaign.creative.primaryText}</p>
                <div className="pt-2">
                  <span className="inline-block px-3 py-1 bg-amber-400 text-black text-xs font-bold uppercase tracking-wider rounded-xs">
                    CTA: {campaign.creative.callToAction}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Channels Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-wider text-stone-400 font-bold">
              Multi-Platform Channel Allocation & API Dispatch IDs
            </h3>

            <div className="border border-stone-800 rounded-xs bg-[#0d0d0d] overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-stone-900 border-b border-stone-800 text-stone-400 text-[10px] uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Platform Name</th>
                    <th className="py-2.5 px-4">Targeting Criteria</th>
                    <th className="py-2.5 px-4 text-right">Budget ($)</th>
                    <th className="py-2.5 px-4">API External ID</th>
                    <th className="py-2.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {campaign.channels.map(ch => {
                    const publishStatus = campaign.publishStatuses.find(ps => ps.platform === ch.platform);
                    return (
                      <tr key={ch.platform} className="hover:bg-stone-900/40">
                        <td className="py-3 px-4 text-white font-bold">{ch.platformName}</td>
                        <td className="py-3 px-4 text-stone-400">{ch.targeting}</td>
                        <td className="py-3 px-4 text-right text-stone-200">${ch.budget.toLocaleString()}</td>
                        <td className="py-3 px-4 text-stone-400">
                          {publishStatus?.externalId ? (
                            publishStatus.externalId.startsWith('DRYRUN_') ? (
                              <span className="text-amber-400/90 font-mono text-[11px]" title="Dry-Run mode (No API Credentials configured)">
                                {publishStatus.externalId} <span className="text-[9px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1 py-0.5 rounded-xs ml-1">Dry-Run</span>
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-mono text-[11px]" title="Live Production API Dispatch">
                                {publishStatus.externalId} <span className="text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-1 py-0.5 rounded-xs ml-1">Live API</span>
                              </span>
                            )
                          ) : (
                            'Pending Dispatch'
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-0.5 rounded-xs text-[10px] uppercase font-bold ${
                            publishStatus?.status === 'live' 
                              ? (publishStatus.externalId?.startsWith('DRYRUN_') ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20')
                              : 'text-stone-400 bg-stone-800 border border-stone-700'
                          }`}>
                            {publishStatus?.status === 'live' 
                              ? (publishStatus.externalId?.startsWith('DRYRUN_') ? 'Dry-Run OK' : 'Live') 
                              : (publishStatus?.status || 'draft')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {campaign.publishStatuses.some(ps => ps.externalId?.startsWith('DRYRUN_')) && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs rounded-xs flex items-start gap-2.5">
                <span className="text-amber-400 text-base">💡</span>
                <div>
                  <p className="font-bold text-white mb-0.5">Google Ads & Channel Credentials Note:</p>
                  <p className="text-stone-300 text-[11px] leading-relaxed">
                    This campaign ran in <strong className="text-amber-300">Dry-Run mode</strong> for channels without connected API credentials. To publish live ads directly to your production <strong className="text-white">Google Ads account</strong> or <strong className="text-white">Meta Ad Account</strong>, open <strong className="text-amber-300">API Nexus</strong> from the sidebar and input your Customer ID, Developer Token, and OAuth Access Token.
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Action Controls */}
        <div className="px-6 py-4 border-t border-stone-800 bg-[#0a0a0a] flex items-center justify-between">
          <button
            onClick={() => onPublish(campaign.id)}
            className="bg-amber-400 hover:bg-amber-300 text-black px-5 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 fill-black" />
            <span>Re-Publish Across All APIs</span>
          </button>

          <div className="flex items-center gap-3">
            {onDelete && (
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) {
                    onDelete(campaign.id);
                    onClose();
                  }
                }}
                className="px-4 py-2 bg-red-950/80 hover:bg-red-900 border border-red-700/80 text-red-200 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 rounded-xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Delete Campaign</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-stone-900 border border-stone-700 text-stone-300 hover:text-white text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
