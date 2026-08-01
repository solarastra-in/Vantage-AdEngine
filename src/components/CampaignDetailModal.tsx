import React, { useState, useMemo } from 'react';
import { Campaign, CampaignActivityEntry, PlatformType } from '../types';
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
  Trash2,
  AlertTriangle,
  Clock,
  Filter,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Edit3,
  RefreshCw,
  Info,
  Sliders,
  Check,
  Code,
  FlaskConical,
  Activity
} from 'lucide-react';

interface CampaignDetailModalProps {
  campaign: Campaign | null;
  onClose: () => void;
  onToggleStatus: (id: string) => void;
  onPublish: (id: string) => void;
  onDelete?: (id: string) => void;
}

// Helper to generate full activity timeline entries for a campaign
function generateCampaignTimeline(campaign: Campaign): CampaignActivityEntry[] {
  const entries: CampaignActivityEntry[] = [];

  // 1. Creation event
  entries.push({
    id: `act-create-${campaign.id}`,
    timestamp: campaign.createdAt || campaign.startDate || new Date().toISOString(),
    type: 'system',
    title: 'Campaign Initialized & Created',
    description: `Campaign created with "${campaign.objective}" objective and $${campaign.totalBudget.toLocaleString()} total budget target.`,
    actor: 'Workspace Admin',
    status: 'info',
    metadata: {
      objective: campaign.objective,
      totalBudget: campaign.totalBudget,
      targetAudience: campaign.targetAudience,
      startDate: campaign.startDate,
      endDate: campaign.endDate
    }
  });

  // 2. Budget allocation & Channel selection
  if (campaign.channels && campaign.channels.length > 0) {
    entries.push({
      id: `act-budget-${campaign.id}`,
      timestamp: campaign.createdAt || campaign.startDate || new Date().toISOString(),
      type: 'budget_change',
      title: 'Multi-Channel Budget Allocation Configured',
      description: `Distributed $${campaign.totalBudget.toLocaleString()} across ${campaign.channels.length} platforms: ${campaign.channels.map(c => `${c.platformName} ($${c.budget.toLocaleString()})`).join(', ')}.`,
      actor: 'Budget Optimizer',
      status: 'info',
      metadata: {
        channels: campaign.channels.map(c => ({
          platform: c.platform,
          name: c.platformName,
          budget: c.budget,
          targeting: c.targeting
        }))
      }
    });
  }

  // 3. Creative Configuration
  if (campaign.creative) {
    entries.push({
      id: `act-creative-${campaign.id}`,
      timestamp: campaign.createdAt || campaign.startDate || new Date().toISOString(),
      type: 'edit',
      title: 'Master Ad Creative & Copy Set',
      description: `Headline: "${campaign.creative.headline}" | CTA: "${campaign.creative.callToAction}".`,
      actor: 'Creative Director',
      status: 'info',
      metadata: {
        headline: campaign.creative.headline,
        primaryText: campaign.creative.primaryText,
        callToAction: campaign.creative.callToAction,
        hasMedia: !!campaign.creative.mediaUrl
      }
    });
  }

  // 4. Platform Creative Overrides (if any)
  if (campaign.platformCreatives && Object.keys(campaign.platformCreatives).length > 0) {
    const platforms = Object.keys(campaign.platformCreatives);
    entries.push({
      id: `act-overrides-${campaign.id}`,
      timestamp: campaign.createdAt || new Date().toISOString(),
      type: 'edit',
      title: 'Platform-Specific Creative Overrides Applied',
      description: `Customized copy and media specifications for ${platforms.join(', ').toUpperCase()}.`,
      actor: 'AI Creative Assistant',
      status: 'info',
      metadata: campaign.platformCreatives
    });
  }

  // 5. A/B Testing
  if (campaign.abTestConfig?.enabled) {
    entries.push({
      id: `act-abtest-${campaign.id}`,
      timestamp: campaign.createdAt || new Date().toISOString(),
      type: 'ab_test',
      title: 'A/B Multivariant Testing Activated',
      description: `Configured ${campaign.abTestConfig.variants.length} test variants targeting ${campaign.abTestConfig.testGoal} lift (${campaign.abTestConfig.confidenceThresholdPct}% confidence threshold).`,
      actor: 'A/B Stats Engine',
      status: 'info',
      metadata: {
        goal: campaign.abTestConfig.testGoal,
        variantsCount: campaign.abTestConfig.variants.length,
        autoPromoteWinner: campaign.abTestConfig.autoPromoteWinner,
        minSample: campaign.abTestConfig.minSampleImpressions
      }
    });
  }

  // 6. Platform Publish / Dispatch Attempts
  if (campaign.publishStatuses && campaign.publishStatuses.length > 0) {
    campaign.publishStatuses.forEach((ps) => {
      const isDryRun = ps.externalId?.startsWith('DRYRUN_');
      const channelName = campaign.channels.find(c => c.platform === ps.platform)?.platformName || ps.platform.toUpperCase();

      let title = `API Dispatch Attempt: ${channelName}`;
      let description = `Attempted cross-platform ad deployment to ${channelName}.`;
      let status: 'success' | 'warning' | 'error' | 'info' = 'info';

      if (ps.status === 'live') {
        if (isDryRun) {
          title = `Dry-Run Simulation Succeeded: ${channelName}`;
          description = `Simulated dispatch verified with mock payload ID: ${ps.externalId}. Connect API credentials in API Nexus for live deployment.`;
          status = 'warning';
        } else {
          title = `Live API Published: ${channelName}`;
          description = `Ad unit deployed successfully to ${channelName} production API with External ID: ${ps.externalId}.`;
          status = 'success';
        }
      } else if (ps.status === 'failed') {
        title = `API Dispatch Failed: ${channelName}`;
        description = `Deployment failed: ${ps.error || 'Authentication or API threshold exception.'}`;
        status = 'error';
      } else if (ps.status === 'publishing') {
        title = `API Dispatch In Progress: ${channelName}`;
        description = `Transmitting campaign payload to ${channelName} gateway...`;
        status = 'info';
      }

      entries.push({
        id: `act-pub-${ps.platform}-${campaign.id}-${ps.publishedAt || 'latest'}`,
        timestamp: ps.publishedAt || campaign.createdAt || new Date().toISOString(),
        type: 'publish_attempt',
        title,
        description,
        actor: isDryRun ? 'Dry-Run Engine' : 'Campaign Dispatcher',
        platform: ps.platform,
        status,
        metadata: {
          platform: ps.platform,
          externalId: ps.externalId,
          status: ps.status,
          error: ps.error,
          isDryRun
        }
      });
    });
  }

  // 7. Overall State Transition
  entries.push({
    id: `act-status-current-${campaign.id}`,
    timestamp: campaign.publishStatuses?.[0]?.publishedAt || campaign.createdAt || new Date().toISOString(),
    type: 'status_change',
    title: `Campaign Status Updated to ${campaign.status.toUpperCase()}`,
    description: `Campaign state transitioned to "${campaign.status}". ${campaign.status === 'active' ? 'Serving live ad impressions and tracking telemetry.' : campaign.status === 'paused' ? 'Ad delivery temporarily halted by manager.' : 'Campaign stored in system database.'}`,
    actor: 'Tenant Manager',
    status: campaign.status === 'active' ? 'success' : campaign.status === 'paused' ? 'warning' : 'info',
    metadata: {
      currentStatus: campaign.status,
      activeChannels: campaign.channels.length
    }
  });

  // 8. Performance telemetry milestone log
  if (campaign.metrics && campaign.metrics.impressions > 0) {
    entries.push({
      id: `act-telemetry-${campaign.id}`,
      timestamp: new Date().toISOString(),
      type: 'system',
      title: 'Real-Time Performance Telemetry Synced',
      description: `Logged ${campaign.metrics.impressions.toLocaleString()} impressions, ${campaign.metrics.clicks.toLocaleString()} clicks (${campaign.metrics.ctr.toFixed(2)}% CTR), ${campaign.metrics.conversions.toLocaleString()} conversions, and ${campaign.metrics.roas.toFixed(2)}x ROAS.`,
      actor: 'Telemetry Collector',
      status: 'success',
      metadata: campaign.metrics
    });
  }

  // 9. Append explicitly attached activity entries if available
  if (campaign.activityLog && campaign.activityLog.length > 0) {
    campaign.activityLog.forEach(item => {
      if (!entries.some(e => e.id === item.id)) {
        entries.push(item);
      }
    });
  }

  return entries;
}

export const CampaignDetailModal: React.FC<CampaignDetailModalProps> = ({
  campaign,
  onClose,
  onToggleStatus,
  onPublish,
  onDelete,
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');
  
  // Timeline Filtering & Sorting state
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Generate & filter timeline
  const allTimelineEntries = useMemo(() => {
    if (!campaign) return [];
    return generateCampaignTimeline(campaign);
  }, [campaign]);

  const filteredTimelineEntries = useMemo(() => {
    return allTimelineEntries
      .filter(entry => {
        if (categoryFilter !== 'all' && entry.type !== categoryFilter) {
          return false;
        }
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = entry.title.toLowerCase().includes(q);
          const matchDesc = entry.description.toLowerCase().includes(q);
          const matchActor = entry.actor?.toLowerCase().includes(q);
          const matchPlatform = entry.platform?.toLowerCase().includes(q);
          return matchTitle || matchDesc || matchActor || matchPlatform;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
  }, [allTimelineEntries, categoryFilter, searchTerm, sortOrder]);

  if (!campaign) return null;

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(campaign.id);
      onClose();
    } catch (err) {
      console.error('Failed to delete campaign:', err);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const getStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'error':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    }
  };

  const getEntryIcon = (type: string, status?: string) => {
    if (status === 'error') return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
    switch (type) {
      case 'publish_attempt':
        return <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />;
      case 'status_change':
        return <RefreshCw className="w-3.5 h-3.5 text-blue-400" />;
      case 'edit':
        return <Edit3 className="w-3.5 h-3.5 text-purple-400" />;
      case 'budget_change':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-400" />;
      case 'ab_test':
        return <FlaskConical className="w-3.5 h-3.5 text-pink-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-stone-400" />;
    }
  };

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

        {/* View Switcher Navigation Tabs */}
        <div className="px-6 bg-[#0a0a0a] border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors ${
                activeTab === 'overview'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              Campaign Overview
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`py-3 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
                activeTab === 'timeline'
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Activity Timeline</span>
              <span className="px-1.5 py-0.5 text-[9px] bg-stone-800 text-stone-300 rounded font-mono">
                {allTimelineEntries.length}
              </span>
            </button>
          </div>

          <button
            onClick={() => onToggleStatus(campaign.id)}
            className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded border cursor-pointer flex items-center gap-1.5 ${
              campaign.status === 'active'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {campaign.status === 'active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{campaign.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[72vh] overflow-y-auto">
          
          {activeTab === 'overview' && (
            <>
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
            </>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6">
              
              {/* Activity Timeline Filters & Search Control Bar */}
              <div className="bg-[#0d0d0d] border border-stone-800 p-4 rounded-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    <span className="text-[10px] uppercase text-stone-500 font-bold font-mono mr-1 flex items-center gap-1">
                      <Filter className="w-3 h-3" /> Filter:
                    </span>
                    {[
                      { id: 'all', label: 'All Events' },
                      { id: 'publish_attempt', label: 'API Dispatches' },
                      { id: 'status_change', label: 'State Changes' },
                      { id: 'edit', label: 'Edits & Creative' },
                      { id: 'budget_change', label: 'Budget Changes' },
                      { id: 'ab_test', label: 'A/B Tests' },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id)}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded cursor-pointer whitespace-nowrap transition-colors ${
                          categoryFilter === cat.id
                            ? 'bg-amber-400 text-black font-bold'
                            : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:w-48">
                      <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search timeline..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs pl-8 pr-3 py-1.5 rounded outline-none focus:border-amber-500/50 font-mono"
                      />
                    </div>

                    <button
                      onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                      className="px-2.5 py-1.5 bg-stone-900 border border-stone-800 text-stone-300 hover:text-white text-xs font-mono rounded cursor-pointer flex items-center gap-1 shrink-0"
                      title="Toggle sort direction"
                    >
                      <ArrowUpDown className="w-3 h-3 text-amber-400" />
                      <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Timeline Visualization Feed */}
              {filteredTimelineEntries.length === 0 ? (
                <div className="p-8 text-center bg-[#0d0d0d] border border-stone-800 rounded-xs">
                  <Clock className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                  <p className="text-xs text-stone-400 font-mono">No timeline activity matches your search filter.</p>
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-stone-800 space-y-6 my-2">
                  {filteredTimelineEntries.map((entry, idx) => {
                    const isExpanded = expandedEntryId === entry.id;
                    const formattedDate = new Date(entry.timestamp).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div key={entry.id} className="relative group">
                        {/* Timeline Node Point Dot */}
                        <div className={`absolute -left-[31px] top-1.5 w-6 h-6 rounded-full border flex items-center justify-center bg-[#0e0e0e] shadow-md transition-transform group-hover:scale-110 ${
                          entry.status === 'success' ? 'border-emerald-500/60 text-emerald-400' :
                          entry.status === 'warning' ? 'border-amber-500/60 text-amber-400' :
                          entry.status === 'error' ? 'border-rose-500/60 text-rose-400' :
                          'border-stone-700 text-stone-400'
                        }`}>
                          {getEntryIcon(entry.type, entry.status)}
                        </div>

                        {/* Event Card */}
                        <div className="bg-[#0d0d0d] border border-stone-800/80 hover:border-stone-700 rounded-xs p-4 space-y-2 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white tracking-wide">
                                {entry.title}
                              </span>

                              {entry.platform && (
                                <span className="px-1.5 py-0.5 bg-stone-900 border border-stone-700 text-amber-400 font-mono text-[10px] uppercase rounded-xs">
                                  {entry.platform}
                                </span>
                              )}

                              <span className={`px-2 py-0.5 border text-[9px] uppercase font-mono font-bold rounded-xs ${getStatusBadgeStyle(entry.status)}`}>
                                {entry.status || 'info'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500 shrink-0">
                              <Clock className="w-3 h-3 text-stone-600" />
                              <span>{formattedDate}</span>
                            </div>
                          </div>

                          <p className="text-xs text-stone-300 leading-relaxed font-sans">
                            {entry.description}
                          </p>

                          <div className="pt-1 flex items-center justify-between text-[11px] text-stone-500 font-mono border-t border-stone-900">
                            {entry.actor && (
                              <span className="flex items-center gap-1 text-stone-400">
                                <span>Actor:</span>
                                <strong className="text-stone-300 font-semibold">{entry.actor}</strong>
                              </span>
                            )}

                            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                              <button
                                onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                                className="text-amber-400/90 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors ml-auto"
                              >
                                <Code className="w-3 h-3" />
                                <span>{isExpanded ? 'Hide Payload Details' : 'View Payload Details'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                          </div>

                          {/* Expanded JSON / Key-Value Details */}
                          {isExpanded && entry.metadata && (
                            <div className="mt-2 p-3 bg-black/80 border border-stone-800 rounded font-mono text-[11px] text-stone-300 space-y-1.5 overflow-x-auto">
                              <div className="text-[10px] uppercase font-bold text-amber-400 mb-1">
                                Event Payload Metadata:
                              </div>
                              <pre className="text-stone-300 leading-tight">
                                {JSON.stringify(entry.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

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
                onClick={() => setShowConfirmDelete(true)}
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

      {/* Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-red-900/50 rounded-xs max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-950/80 border border-red-800 text-red-400 rounded-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Delete Campaign?</h3>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Are you sure you want to delete campaign <strong className="text-white font-mono">"{campaign.name}"</strong>? This will permanently erase all channel configurations and analytics data. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-xs font-mono cursor-pointer rounded-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-mono font-semibold cursor-pointer rounded-xs transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
