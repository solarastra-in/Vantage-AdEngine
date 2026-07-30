import React, { useState } from 'react';
import { Campaign, PlatformType } from '../types';
import { 
  Megaphone, 
  Zap, 
  Play, 
  Pause, 
  Plus, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  ArrowUpRight,
  Search,
  Filter,
  DollarSign,
  Copy,
  CheckSquare,
  Square,
  X,
  Layers,
  Sparkles,
  Trash2
} from 'lucide-react';

interface CampaignManagerProps {
  campaigns: Campaign[];
  onOpenWizard: () => void;
  onSelectCampaign: (campaign: Campaign) => void;
  onToggleStatus: (campaignId: string) => void;
  onPublishCampaign: (campaignId: string) => void;
  onDeleteCampaign?: (campaignId: string) => void;
  onBulkPause?: (campaignIds: string[]) => void;
  onBulkResume?: (campaignIds: string[]) => void;
  onBulkDuplicate?: (campaignIds: string[]) => void;
  onBulkDelete?: (campaignIds: string[]) => void;
}

export const CampaignManager: React.FC<CampaignManagerProps> = ({
  campaigns,
  onOpenWizard,
  onSelectCampaign,
  onToggleStatus,
  onPublishCampaign,
  onDeleteCampaign,
  onBulkPause,
  onBulkResume,
  onBulkDuplicate,
  onBulkDelete,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'publishing' | 'paused' | 'draft'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.objective.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const showNotice = (msg: string) => {
    setBulkNotice(msg);
    setTimeout(() => setBulkNotice(null), 3500);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isAllSelected = filteredCampaigns.length > 0 && filteredCampaigns.every(c => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCampaigns.map(c => c.id));
    }
  };

  const handlePauseSelected = () => {
    if (selectedIds.length === 0) return;
    if (onBulkPause) {
      onBulkPause(selectedIds);
    } else {
      selectedIds.forEach(id => {
        const cmp = campaigns.find(c => c.id === id);
        if (cmp && cmp.status === 'active') {
          onToggleStatus(id);
        }
      });
    }
    showNotice(`Bulk paused ${selectedIds.length} campaign(s).`);
  };

  const handleResumeSelected = () => {
    if (selectedIds.length === 0) return;
    if (onBulkResume) {
      onBulkResume(selectedIds);
    } else {
      selectedIds.forEach(id => {
        const cmp = campaigns.find(c => c.id === id);
        if (cmp && cmp.status === 'paused') {
          onToggleStatus(id);
        }
      });
    }
    showNotice(`Bulk resumed ${selectedIds.length} campaign(s).`);
  };

  const handleDuplicateSelected = () => {
    if (selectedIds.length === 0) return;
    if (onBulkDuplicate) {
      onBulkDuplicate(selectedIds);
    }
    showNotice(`Bulk duplicated ${selectedIds.length} campaign(s).`);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected campaign(s)?`)) {
      const idsToDelete = [...selectedIds];
      setSelectedIds([]);
      if (onBulkDelete) {
        await onBulkDelete(idsToDelete);
      } else if (onDeleteCampaign) {
        for (const id of idsToDelete) {
          await onDeleteCampaign(id);
        }
      }
      showNotice(`Deleted ${idsToDelete.length} campaign(s).`);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#0a0a0a] text-stone-200">
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-800">
        <div>
          <h1 className="text-2xl font-serif italic text-white tracking-tight">
            Omni-Campaign Command Suite
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm font-mono mt-1">
            Manage multi-channel digital ad deployments, live platform states, and individual budgets.
          </p>
        </div>

        <button
          onClick={onOpenWizard}
          className="bg-amber-400 text-black px-6 py-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/10 rounded-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Multi-Channel Campaign</span>
        </button>
      </div>

      {/* Bulk Action Status Toast/Notice */}
      {bulkNotice && (
        <div className="bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-sm text-xs font-mono font-bold flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{bulkNotice}</span>
          </div>
          <button onClick={() => setBulkNotice(null)} className="text-stone-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0d0d0d] p-4 border border-stone-800 rounded-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={toggleSelectAll}
            className="p-2 bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 rounded cursor-pointer transition-colors flex items-center gap-2 text-xs font-mono"
            title={isAllSelected ? "Deselect All" : "Select All Filtered Campaigns"}
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4 text-amber-400 fill-amber-400/20" />
            ) : (
              <Square className="w-4 h-4 text-stone-500" />
            )}
            <span className="hidden sm:inline font-bold">Select All</span>
          </button>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
            <input
              type="text"
              placeholder="Search campaigns by name, objective..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 text-xs text-white pl-9 pr-3 py-2.5 outline-none focus:border-amber-400 font-mono rounded-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {(['all', 'active', 'publishing', 'paused', 'draft'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-amber-400 text-black'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Sticky / Active Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-stone-900 via-stone-950 to-stone-900 border-2 border-amber-400/80 p-4 rounded-sm shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-amber-400 fill-amber-400/20" />
              ) : (
                <Square className="w-4 h-4 text-stone-500" />
              )}
              <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
            <span className="text-stone-600">|</span>
            <div className="bg-amber-400/10 border border-amber-400/40 text-amber-400 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>{selectedIds.length} Campaign(s) Selected</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <button
              onClick={handlePauseSelected}
              className="bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-amber-400 text-stone-200 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1.5 rounded-xs"
            >
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span>Pause Selected ({selectedIds.length})</span>
            </button>

            <button
              onClick={handleResumeSelected}
              className="bg-stone-900 hover:bg-stone-800 border border-stone-700 hover:border-emerald-400 text-stone-200 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1.5 rounded-xs"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
              <span>Resume Selected ({selectedIds.length})</span>
            </button>

            <button
              onClick={handleDuplicateSelected}
              className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1.5 rounded-xs shadow-md shadow-amber-400/20"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate Selected ({selectedIds.length})</span>
            </button>

            <button
              onClick={handleDeleteSelected}
              className="bg-red-950/80 hover:bg-red-900 border border-red-700/80 text-red-200 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1.5 rounded-xs shadow-md shadow-red-900/20"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="p-2 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xs transition-colors cursor-pointer"
              title="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Campaign List Cards */}
      <div className="space-y-4">
        {filteredCampaigns.map(campaign => {
          const isSelected = selectedIds.includes(campaign.id);
          return (
            <div
              key={campaign.id}
              className={`bg-[#0d0d0d] border rounded-sm p-6 hover:border-stone-700 transition-all shadow-xl space-y-5 ${
                isSelected ? 'border-amber-400/70 bg-amber-400/[0.02]' : 'border-stone-800'
              }`}
            >
              {/* Top row: Checkbox, Name, Objective, Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(campaign.id);
                      }}
                      className="text-stone-500 hover:text-amber-400 cursor-pointer transition-colors"
                      title={isSelected ? "Deselect campaign" : "Select campaign for bulk action"}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-amber-400 fill-amber-400/20" />
                      ) : (
                        <Square className="w-5 h-5 text-stone-600 hover:text-stone-400" />
                      )}
                    </button>

                    <h3 className="text-base font-bold text-white leading-snug">
                      {campaign.name}
                    </h3>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-xs font-mono uppercase font-bold tracking-wider ${
                      campaign.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      campaign.status === 'publishing' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse' :
                      campaign.status === 'paused' ? 'bg-stone-800 text-stone-400 border border-stone-700' :
                      'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    }`}>
                      {campaign.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-stone-400 font-mono pl-8">
                    <span>Objective: <strong className="text-stone-200">{campaign.objective}</strong></span>
                    <span>&bull;</span>
                    <span>Dates: {campaign.startDate} to {campaign.endDate}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {campaign.status === 'draft' || campaign.status === 'paused' ? (
                    <button
                      onClick={() => onPublishCampaign(campaign.id)}
                      className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-1.5 rounded-xs"
                    >
                      <Zap className="w-3.5 h-3.5 fill-black" />
                      <span>Single-Click Publish</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onToggleStatus(campaign.id)}
                      className="bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 px-3.5 py-2 text-xs font-medium cursor-pointer transition-colors flex items-center gap-1.5 rounded-xs"
                    >
                      {campaign.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{campaign.status === 'active' ? 'Pause' : 'Resume'}</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectCampaign(campaign)}
                    className="bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 p-2 text-xs font-medium cursor-pointer transition-colors rounded-xs"
                    title="View Deep Analytics"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>

                  {onDeleteCampaign && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) {
                          setSelectedIds(prev => prev.filter(id => id !== campaign.id));
                          await onDeleteCampaign(campaign.id);
                          showNotice(`Deleted campaign "${campaign.name}".`);
                        }
                      }}
                      className="bg-stone-900 hover:bg-red-950/60 border border-stone-700 hover:border-red-600 text-stone-400 hover:text-red-300 p-2 text-xs font-medium cursor-pointer transition-colors rounded-xs"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>

              {/* Metrics Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-stone-950 p-4 border border-stone-800/80 rounded-xs text-xs font-mono">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase block">Spent / Total Budget</span>
                  <span className="text-stone-200 font-bold">
                    ${campaign.spentBudget.toLocaleString()} / ${campaign.totalBudget.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase block">Impressions / Reach</span>
                  <span className="text-stone-200 font-bold">{campaign.metrics.impressions.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase block">Conversions</span>
                  <span className="text-stone-200 font-bold">{campaign.metrics.conversions.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-500 uppercase block">Return On Ad Spend</span>
                  <span className="text-amber-400 font-bold">{campaign.metrics.roas.toFixed(2)}x ROAS</span>
                </div>
              </div>

              {/* Platform Status Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] text-stone-500 uppercase font-mono mr-2">Channels Dispatched:</span>
                {campaign.channels.map(ch => {
                  const statusObj = campaign.publishStatuses.find(ps => ps.platform === ch.platform);
                  const isLive = statusObj?.status === 'live';
                  return (
                    <div
                      key={ch.platform}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs border text-[11px] font-mono ${
                        isLive 
                          ? 'bg-stone-900/90 border-stone-800 text-stone-300' 
                          : 'bg-stone-950 border-stone-900 text-stone-500'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-stone-600'}`} />
                      <span>{ch.platformName}</span>
                      <span className="text-stone-500 text-[10px]">(${ch.budget.toLocaleString()})</span>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}

        {filteredCampaigns.length === 0 && (
          <div className="bg-[#0d0d0d] border border-stone-800 p-12 text-center text-stone-500 text-xs font-mono">
            No campaigns matched your filter query. Click "New Multi-Channel Campaign" to launch one.
          </div>
        )}
      </div>

    </div>
  );
};

