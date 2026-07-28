import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { 
  Campaign, 
  ChannelApiStatus, 
  Invoice, 
  PerformanceTimePoint,
  PlatformType
} from '../types';
import { 
  Sparkles, 
  TrendingUp, 
  Eye, 
  MousePointerClick, 
  DollarSign, 
  ExternalLink,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface CommandCenterProps {
  campaigns: Campaign[];
  channels: ChannelApiStatus[];
  invoices: Invoice[];
  timeSeries: PerformanceTimePoint[];
  onOpenWizard: () => void;
  onNavigateTab: (tab: 'campaigns' | 'analytics' | 'api-nexus' | 'financials') => void;
  onSelectCampaign: (campaign: Campaign) => void;
  currency?: string;
  locale?: string;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  campaigns,
  channels,
  invoices,
  timeSeries,
  onOpenWizard,
  onNavigateTab,
  onSelectCampaign,
  currency = 'USD',
  locale = 'en-US',
}) => {
  const [chartMetric, setChartMetric] = useState<'spendVsReturn' | 'channelDistribution'>('spendVsReturn');

  const formatCurrency = (val: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val);
    } catch {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const primaryCampaign = campaigns[0] || null;

  const totalReach = campaigns.reduce((acc, c) => acc + c.metrics.impressions, 0);
  const totalSpend = campaigns.reduce((acc, c) => acc + c.spentBudget, 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + c.metrics.conversions, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.metrics.clicks, 0);

  // Platform performance breakdown
  const channelMetrics = [
    { name: 'Meta Suite', key: 'meta', color: '#3b82f6', value: '1.2M', sublabel: 'Impressions', percentage: 65, status: 'Active' },
    { name: 'Instagram', key: 'meta', color: '#a855f7', value: '842K', sublabel: 'Interactions', percentage: 42, status: 'Active' },
    { name: 'YouTube & Google', key: 'google', color: '#ef4444', value: '210K', sublabel: 'Full Views', percentage: 88, status: 'Active' },
    { name: 'LinkedIn Pro', key: 'linkedin', color: '#38bdf8', value: '14.2K', sublabel: 'Direct Leads', percentage: 23, status: 'Active' },
    { name: 'TikTok Ads', key: 'tiktok', color: '#22c55e', value: '620K', sublabel: 'Video Engagements', percentage: 71, status: 'Active' },
    { name: 'X / Twitter', key: 'x', color: '#f59e0b', value: '190K', sublabel: 'Impressions', percentage: 54, status: 'Active' },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#0a0a0a] text-stone-200">
      
      {/* Top Banner / Welcome */}
      <div className="bg-[#111111] border border-stone-800 p-6 rounded-sm shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-widest rounded-xs">
            <Zap className="w-3.5 h-3.5" />
            <span>Single Pane of Glass Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-white tracking-tight">
            Omni-Channel Campaign Operations
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm leading-relaxed">
            Manage multi-platform digital advertising budgets, publish ads across Meta, Google, LinkedIn, TikTok, X, and Programmatic DSP with one click, and analyze real-time ROI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={onOpenWizard}
            className="bg-amber-400 text-black px-6 py-3 text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/10 rounded-sm flex items-center gap-2"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>Publish Multi-Channel Ad</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#0d0d0d] border border-stone-800 p-5 rounded-sm shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Total Reach</span>
            <Eye className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif text-white tracking-tight italic">
            {totalReach.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-mono flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>+18.4% vs last period</span>
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-stone-800 p-5 rounded-sm shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Total Spend</span>
            <DollarSign className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif text-white tracking-tight italic">
            {formatCurrency(totalSpend)}
          </div>
          <div className="mt-2 text-[11px] text-stone-400 font-mono">
            Across {channels.length} connected channels
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-stone-800 p-5 rounded-sm shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Conversions</span>
            <MousePointerClick className="w-4 h-4 text-stone-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif text-white tracking-tight italic">
            {totalConversions.toLocaleString()}
          </div>
          <div className="mt-2 text-[11px] text-amber-400 font-mono">
            Avg CPC: ${(totalSpend / (totalClicks || 1)).toFixed(2)}
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-stone-800 p-5 rounded-sm shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold">Average ROAS</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif text-amber-400 tracking-tight italic">
            3.84x
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-mono">
            Top Performer: Google & Meta
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Blueprint & Recent Ledger) + Right Column (Intelligence Engine Graph & Channels) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (Blueprint & Ledger) */}
        <div className="lg:col-span-4 space-y-8 flex flex-col">
          
          {/* Campaign Blueprint Card */}
          <section className="bg-[#111111] border border-stone-800 p-6 rounded-sm shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-[0.2em] text-amber-400 font-bold">
                  Campaign Blueprint
                </h2>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-mono uppercase rounded-xs">
                  ACTIVE
                </span>
              </div>

              {primaryCampaign ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] uppercase text-stone-500 font-bold mb-1">
                      Campaign Identity
                    </label>
                    <div className="text-sm font-semibold text-white leading-snug">
                      {primaryCampaign.name}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase text-stone-500 font-bold mb-1">
                        Global Budget
                      </label>
                      <div className="text-xl font-serif text-white">
                        {formatCurrency(primaryCampaign.totalBudget)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-stone-500 font-bold mb-1">
                        Timeline
                      </label>
                      <div className="text-xs text-stone-300 italic mt-1 font-mono">
                        {primaryCampaign.startDate} to {primaryCampaign.endDate}
                      </div>
                    </div>
                  </div>

                  {/* Channel Breakdown */}
                  <div>
                    <label className="block text-[10px] uppercase text-stone-500 font-bold mb-2">
                      Multi-Platform Allocation
                    </label>
                    <div className="space-y-2.5 divide-y divide-stone-800/80">
                      {primaryCampaign.channels.map(ch => (
                        <div key={ch.platform} className="flex items-center justify-between pt-2 first:pt-0">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-xs text-stone-300 font-medium">{ch.platformName}</span>
                          </div>
                          <span className="text-xs font-mono text-stone-400">{formatCurrency(ch.budget)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectCampaign(primaryCampaign)}
                    className="w-full mt-4 py-2.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Manage Blueprint Details</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-stone-500 text-xs">
                  No active campaign found. Deploy one to populate blueprint.
                </div>
              )}
            </div>
          </section>

          {/* Recent Ledger Card */}
          <section className="bg-[#111111] border border-stone-800 p-6 rounded-sm shadow-2xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-[0.2em] text-stone-500 font-bold">
                  Recent Ledger
                </h2>
                <button
                  onClick={() => onNavigateTab('financials')}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer font-medium"
                >
                  View All Invoices
                </button>
              </div>

              <div className="space-y-3">
                {invoices.slice(0, 3).map(inv => (
                  <div
                    key={inv.id}
                    className="bg-stone-900/60 p-3.5 rounded-sm flex items-center justify-between text-xs border border-stone-800/80 hover:border-stone-700 transition-colors"
                  >
                    <div>
                      <div className="text-stone-200 font-semibold">{inv.id} &bull; {inv.campaignName.slice(0, 22)}...</div>
                      <div className="text-[10px] text-stone-500 font-mono mt-0.5">Due: {inv.dueDate}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[10px] tracking-wider font-bold uppercase ${
                        inv.status === 'PAID' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {inv.status}
                      </div>
                      <div className="font-mono text-stone-300 font-medium mt-0.5">{formatCurrency(inv.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>

        {/* Right Column (Intelligence Engine & Channel Grid) */}
        <div className="lg:col-span-8 flex flex-col space-y-8">
          
          {/* Omni-Channel Intelligence Engine Graph */}
          <section className="bg-[#0d0d0d] border border-stone-800 rounded-sm overflow-hidden flex flex-col shadow-2xl">
            {/* Header / Tabs */}
            <div className="p-6 border-b border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xs uppercase tracking-[0.2em] text-stone-400 font-bold">
                  Omni-Channel Intelligence Engine
                </h2>
                <p className="text-[11px] text-stone-500 font-mono mt-0.5">Real-time API Aggregation (Last 30 Days)</p>
              </div>

              <div className="flex items-center gap-2 bg-stone-900 p-1 border border-stone-800 rounded-xs text-xs">
                <button
                  onClick={() => setChartMetric('spendVsReturn')}
                  className={`px-3 py-1 rounded-xs cursor-pointer font-medium transition-colors ${
                    chartMetric === 'spendVsReturn' ? 'bg-amber-400 text-black font-bold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Spend vs ROAS
                </button>
                <button
                  onClick={() => setChartMetric('channelDistribution')}
                  className={`px-3 py-1 rounded-xs cursor-pointer font-medium transition-colors ${
                    chartMetric === 'channelDistribution' ? 'bg-amber-400 text-black font-bold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Platform Distribution
                </button>
              </div>
            </div>

            {/* Recharts Area / Bar Chart */}
            <div className="p-6 h-80">
              <ResponsiveContainer key={chartMetric} width="100%" height="100%">
                {chartMetric === 'spendVsReturn' ? (
                  <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#737373" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#737373" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '4px', color: '#f5f5f4', fontSize: '12px' }}
                      itemStyle={{ color: '#fbbf24' }}
                    />
                    <Area type="monotone" dataKey="spend" name="Media Spend ($)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorSpend)" strokeWidth={2} />
                    <Area type="monotone" dataKey="metaReturn" name="Meta ROAS ($)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMeta)" strokeWidth={2} />
                  </AreaChart>
                ) : (
                  <BarChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#737373" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#737373" tick={{ fontSize: 11 }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '4px', color: '#f5f5f4', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="metaReturn" name="Meta" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="googleReturn" name="Google" stackId="a" fill="#ef4444" />
                    <Bar dataKey="linkedInReturn" name="LinkedIn" stackId="a" fill="#38bdf8" />
                    <Bar dataKey="tiktokReturn" name="TikTok" stackId="a" fill="#22c55e" />
                    <Bar dataKey="xReturn" name="X / Twitter" stackId="a" fill="#f59e0b" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </section>

          {/* Connected Ad Channels Performance Cards Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-[0.2em] text-stone-400 font-bold">
                Connected Digital Platforms
              </h2>
              <button
                onClick={() => onNavigateTab('api-nexus')}
                className="text-xs text-amber-400 hover:underline cursor-pointer font-medium flex items-center gap-1"
              >
                <span>API Gateway Nexus</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {channelMetrics.map((channel, i) => (
                <div
                  key={i}
                  className="bg-[#0d0d0d] border border-stone-800 p-5 rounded-sm flex flex-col justify-between hover:bg-stone-900/30 transition-all cursor-default shadow-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold tracking-wider" style={{ color: channel.color }}>
                      {channel.name}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                  </div>

                  <div className="my-2">
                    <div className="text-2xl font-serif text-white">{channel.value}</div>
                    <div className="text-[10px] text-stone-500 uppercase tracking-wider">{channel.sublabel}</div>
                  </div>

                  <div className="space-y-1.5 mt-2">
                    <div className="flex justify-between text-[10px] text-stone-400 font-mono">
                      <span>Capacity</span>
                      <span>{channel.percentage}%</span>
                    </div>
                    <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${channel.percentage}%`, backgroundColor: channel.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

      </div>

    </div>
  );
};
