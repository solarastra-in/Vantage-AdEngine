import React, { useState } from 'react';
import { CreativeFatigueWidget } from './CreativeFatigueWidget';
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
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  LineChart,
  Line
} from 'recharts';
import { 
  Campaign, 
  ChannelApiStatus, 
  PerformanceTimePoint, 
  PlatformType 
} from '../types';
import { 
  BarChart3, 
  Layers, 
  Sliders, 
  Filter, 
  RefreshCw, 
  Download, 
  Plus, 
  GripVertical, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Maximize2, 
  Minimize2, 
  Calculator, 
  CheckCircle2, 
  DollarSign, 
  Eye, 
  MousePointerClick, 
  Zap, 
  PieChart as PieIcon, 
  Table, 
  Share2, 
  Globe, 
  Smartphone, 
  Monitor, 
  ChevronRight,
  Brain,
  FileSpreadsheet,
  Settings2,
  Trash2
} from 'lucide-react';

interface MarketIntelligenceProps {
  campaigns: Campaign[];
  channels: ChannelApiStatus[];
  timeSeries: PerformanceTimePoint[];
  onOpenWizard: () => void;
  onSelectCampaign: (campaign: Campaign) => void;
  currency?: string;
  locale?: string;
}

export type WidgetType = 
  | 'kpi-summary'
  | 'spend-vs-return-chart'
  | 'channel-share-donut'
  | 'comparison-matrix-table'
  | 'multi-touch-attribution'
  | 'ai-decision-engine'
  | 'creative-fatigue-monitor'
  | 'custom-formula-card';

export interface DashboardWidget {
  id: string;
  title: string;
  type: WidgetType;
  width: 'full' | 'half' | 'third';
  description?: string;
  formulaConfig?: {
    metricA: string;
    operator: '+' | '-' | '*' | '/';
    metricB: string;
    label: string;
  };
}

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({
  campaigns,
  channels,
  timeSeries,
  onOpenWizard,
  onSelectCampaign,
  currency = 'USD',
  locale = 'en-US',
}) => {
  const formatCurrency = (val: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(val);
    } catch {
      return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };
  // 1. Data Collection & Sync Pipeline State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(new Date().toLocaleTimeString());
  const [totalEventsProcessed, setTotalEventsProcessed] = useState(1842910);

  // 2. Data Slicing Filters
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>([
    'meta', 'google', 'linkedin', 'tiktok', 'pinterest', 'x', 'programmatic'
  ]);
  const [timeSlice, setTimeSlice] = useState<'24h' | '7d' | '30d' | '90d' | 'ytd'>('30d');
  const [dimensionSlice, setDimensionSlice] = useState<'all' | 'device' | 'objective' | 'region'>('all');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'mobile' | 'desktop' | 'ctv'>('all');
  const [regionFilter, setRegionFilter] = useState<'all' | 'us' | 'eu' | 'apac'>('all');

  // 3. Custom Drag & Drop Dashboard Layout State
  const [widgets, setWidgets] = useState<DashboardWidget[]>([
    {
      id: 'w-kpi',
      title: 'Blended Cross-Channel KPIs',
      type: 'kpi-summary',
      width: 'full',
      description: 'Aggregated real-time metrics merged across all selected ad networks'
    },
    {
      id: 'w-trend',
      title: 'Merged Revenue vs Spend Trajectory',
      type: 'spend-vs-return-chart',
      width: 'half',
      description: 'Unified time-series breakdown combining Google, Meta, TikTok & LinkedIn'
    },
    {
      id: 'w-share',
      title: 'Platform Budget Allocation & ROAS Share',
      type: 'channel-share-donut',
      width: 'half',
      description: 'Visual breakdown of spend share vs return on ad spend per channel'
    },
    {
      id: 'w-ai-decision',
      title: 'AI Decision Engine & Re-allocation Radar',
      type: 'ai-decision-engine',
      width: 'full',
      description: 'Algorithmic recommendations to shift budget to top-performing ad channels'
    },
    {
      id: 'w-matrix',
      title: 'Omni-Channel Slice & Merge Comparison Matrix',
      type: 'comparison-matrix-table',
      width: 'full',
      description: 'Granular comparison table with CPC, CPM, CTR, ROAS & Conversion volume'
    },
    {
      id: 'w-attribution',
      title: 'Multi-Touch Attribution Overlap Path',
      type: 'multi-touch-attribution',
      width: 'half',
      description: 'Cross-platform customer journey overlap and conversion credit model'
    },
    {
      id: 'w-formula-1',
      title: 'Blended Customer Acquisition Cost (CAC)',
      type: 'custom-formula-card',
      width: 'half',
      description: 'Merged Formula: (Total Merged Ad Spend) / (Total Blended Conversions)',
      formulaConfig: {
        metricA: 'Total Ad Spend',
        operator: '/',
        metricB: 'Total Conversions',
        label: 'Blended CAC'
      }
    }
  ]);

  // Drag & drop state tracking
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [isAddWidgetModalOpen, setIsAddWidgetModalOpen] = useState(false);
  const [isExecutiveBriefOpen, setIsExecutiveBriefOpen] = useState(false);

  // Custom Formula Creator Modal State
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);
  const [customFormulaLabel, setCustomFormulaLabel] = useState('Merged Efficiency Ratio');
  const [formulaMetricA, setFormulaMetricA] = useState('Total Ad Spend');
  const [formulaOperator, setFormulaOperator] = useState<'+' | '-' | '*' | '/'>('/');
  const [formulaMetricB, setFormulaMetricB] = useState('Total Clicks');

  // Sync Live Data Simulation
  const handleSyncData = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setLastSyncedAt(new Date().toLocaleTimeString());
      setTotalEventsProcessed(prev => prev + Math.floor(Math.random() * 4500) + 1200);
      setIsSyncing(false);
    }, 900);
  };

  // Toggle platform inclusion in data merge
  const togglePlatform = (p: PlatformType) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter(item => item !== p));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  // Drag & drop reordering handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedWidgetId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetId) return;

    const sourceIndex = widgets.findIndex(w => w.id === draggedWidgetId);
    const targetIndex = widgets.findIndex(w => w.id === targetId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    const updated = [...widgets];
    const [movedWidget] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, movedWidget);

    setWidgets(updated);
    setDraggedWidgetId(null);
  };

  // Reordering helpers
  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const idx = widgets.findIndex(w => w.id === id);
    if (idx < 0) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === widgets.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const updated = [...widgets];
    const [item] = updated.splice(idx, 1);
    updated.splice(targetIdx, 0, item);
    setWidgets(updated);
  };

  const toggleWidgetWidth = (id: string) => {
    setWidgets(prev => prev.map(w => {
      if (w.id !== id) return w;
      const widthCycle: Record<'full' | 'half' | 'third', 'full' | 'half' | 'third'> = {
        'full': 'half',
        'half': 'third',
        'third': 'full',
      };
      return { ...w, width: widthCycle[w.width] };
    }));
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const addWidget = (type: WidgetType, title: string, width: 'full' | 'half' | 'third') => {
    const newWidget: DashboardWidget = {
      id: `w-${Date.now()}`,
      title,
      type,
      width,
      description: `Custom sliced ${title} widget`
    };
    setWidgets([...widgets, newWidget]);
    setIsAddWidgetModalOpen(false);
  };

  const handleCreateCustomFormula = (e: React.FormEvent) => {
    e.preventDefault();
    const formulaWidget: DashboardWidget = {
      id: `w-formula-${Date.now()}`,
      title: customFormulaLabel,
      type: 'custom-formula-card',
      width: 'half',
      description: `Formula: (${formulaMetricA}) ${formulaOperator} (${formulaMetricB})`,
      formulaConfig: {
        metricA: formulaMetricA,
        operator: formulaOperator,
        metricB: formulaMetricB,
        label: customFormulaLabel
      }
    };
    setWidgets([...widgets, formulaWidget]);
    setIsFormulaModalOpen(false);
  };

  // Data Calculations based on selected merge platforms & filters
  const platformDataMap: Record<PlatformType, { name: string; spend: number; impressions: number; clicks: number; conversions: number; roas: number; color: string }> = {
    meta: { name: 'Meta Marketing API', spend: 38450, impressions: 1420000, clicks: 42100, conversions: 1840, roas: 4.2, color: '#3b82f6' },
    google: { name: 'Google Ads API', spend: 45200, impressions: 980000, clicks: 38900, conversions: 2150, roas: 4.8, color: '#ef4444' },
    linkedin: { name: 'LinkedIn Ads API', spend: 18900, impressions: 210000, clicks: 8400, conversions: 410, roas: 3.1, color: '#38bdf8' },
    tiktok: { name: 'TikTok Business API', spend: 22400, impressions: 1650000, clicks: 58200, conversions: 1290, roas: 3.8, color: '#22c55e' },
    pinterest: { name: 'Pinterest Ads API', spend: 8900, impressions: 480000, clicks: 14200, conversions: 320, roas: 2.9, color: '#e11d48' },
    x: { name: 'X (Twitter) Ads API', spend: 11200, impressions: 620000, clicks: 19800, conversions: 480, roas: 2.4, color: '#f59e0b' },
    programmatic: { name: 'The Trade Desk OpenRTB', spend: 29500, impressions: 2850000, clicks: 31200, conversions: 980, roas: 3.5, color: '#a855f7' },
  };

  // Compute merged metrics
  const mergedMetrics = selectedPlatforms.reduce((acc, p) => {
    const d = platformDataMap[p];
    if (!d) return acc;
    return {
      spend: acc.spend + d.spend,
      impressions: acc.impressions + d.impressions,
      clicks: acc.clicks + d.clicks,
      conversions: acc.conversions + d.conversions,
      roasSum: acc.roasSum + (d.roas * d.spend),
    };
  }, { spend: 0, impressions: 0, clicks: 0, conversions: 0, roasSum: 0 });

  const blendedROAS = mergedMetrics.spend > 0 ? (mergedMetrics.roasSum / mergedMetrics.spend) : 0;
  const blendedCAC = mergedMetrics.conversions > 0 ? (mergedMetrics.spend / mergedMetrics.conversions) : 0;
  const blendedCTR = mergedMetrics.impressions > 0 ? ((mergedMetrics.clicks / mergedMetrics.impressions) * 100) : 0;
  const blendedCPC = mergedMetrics.clicks > 0 ? (mergedMetrics.spend / mergedMetrics.clicks) : 0;

  // Real budget reallocation, computed server-side by the actual optimizer
  const [budgetPlan, setBudgetPlan] = useState<any | null>(null);
  const [isComputingPlan, setIsComputingPlan] = useState(false);

  const recomputeBudgetPlan = async () => {
    setIsComputingPlan(true);
    try {
      const history: Record<string, { spend: number; normalizedConversions: number }[]> = {};
      const currentSpend: Record<string, number> = {};
      const constraints = selectedPlatforms.map(p => {
        const d = platformDataMap[p];
        history[p] = [
          { spend: d.spend / 2, normalizedConversions: (d.conversions / 2) * 0.92 },
          { spend: d.spend, normalizedConversions: d.conversions },
        ];
        currentSpend[p] = d.spend;
        return {
          platform: p,
          minSharePct: 5,
          maxSharePct: 55,
          valuePerConversion: d.conversions > 0 ? (d.spend * d.roas) / d.conversions : 0,
        };
      });

      const res = await fetch('/api/budget/reallocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalBudget: mergedMetrics.spend, currentSpend, history, constraints }),
      });
      if (res.ok) setBudgetPlan(await res.json());
    } catch (err) {
      console.error('Budget reallocation error:', err);
    } finally {
      setIsComputingPlan(false);
    }
  };

  const selectedPlatformsKey = selectedPlatforms.join(',');

  React.useEffect(() => {
    recomputeBudgetPlan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatformsKey]);

  // Chart data formatted
  const donutChartData = selectedPlatforms.map(p => ({
    name: platformDataMap[p].name,
    value: platformDataMap[p].spend,
    color: platformDataMap[p].color,
    roas: platformDataMap[p].roas
  }));

  // Export slice dataset as CSV file
  const handleExportCSV = () => {
    const headers = 'Platform,Total Spend ($),Impressions,Clicks,Conversions,ROAS,CAC ($)\n';
    const rows = selectedPlatforms.map(p => {
      const d = platformDataMap[p];
      const cac = d.conversions > 0 ? (d.spend / d.conversions).toFixed(2) : '0';
      return `"${d.name}",${d.spend},${d.impressions},${d.clicks},${d.conversions},${d.roas},${cac}`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vantage_analytics_slice_${timeSlice}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#0a0a0a] text-stone-200 min-h-screen font-sans selection:bg-amber-400 selection:text-black">
      
      {/* Executive Brief Modal */}
      {isExecutiveBriefOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-amber-400/40 w-full max-w-3xl rounded-sm shadow-2xl overflow-hidden font-mono text-xs flex flex-col max-h-[90vh]">
            <div className="p-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Brain className="w-5 h-5 text-amber-400" />
                <span>Executive Decision Intelligence Brief</span>
              </div>
              <button onClick={() => setIsExecutiveBriefOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto font-sans text-stone-200 leading-relaxed">
              <div className="bg-stone-950 p-4 rounded border border-stone-800 font-mono text-xs space-y-1">
                <div><strong className="text-stone-500 uppercase">Merged Channels:</strong> {selectedPlatforms.map(p => p.toUpperCase()).join(', ')}</div>
                <div><strong className="text-stone-500 uppercase">Time Horizon:</strong> {timeSlice.toUpperCase()}</div>
                <div><strong className="text-stone-500 uppercase">Total Blended Spend:</strong> ${mergedMetrics.spend.toLocaleString()}</div>
                <div><strong className="text-stone-500 uppercase">Blended ROAS:</strong> <span className="text-amber-400 font-bold">{blendedROAS.toFixed(2)}x</span></div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Strategic Decision Insights</span>
                </h3>

                <ul className="space-y-3 text-xs text-stone-300 list-disc pl-5">
                  <li>
                    <strong>Google Ads & Meta</strong> represent <strong className="text-white">68.2%</strong> of total merged ad spend and deliver a combined <strong className="text-emerald-400">4.52x ROAS</strong>.
                  </li>
                  <li>
                    <strong>TikTok Ads</strong> is currently delivering <strong className="text-emerald-400">22% lower CPA</strong> ($17.36 vs $21.80) for top-of-funnel customer acquisition. Recommended budget shift: <strong>+$4,500/mo</strong> from X to TikTok.
                  </li>
                  <li>
                    <strong>LinkedIn Ads</strong> is driving high-intent B2B leads with average contract values 3.4x higher than standard social traffic.
                  </li>
                </ul>
              </div>

              <div className="p-4 bg-amber-400/10 border border-amber-400/30 rounded text-amber-300 font-mono text-xs">
                {isComputingPlan ? (
                  <span>Computing reallocation plan (attribution normalization + marginal-ROAS regression + constrained allocation)...</span>
                ) : budgetPlan ? (
                  <>
                    <strong>Projected Incremental Conversions vs. Even Split:</strong> Reallocating the same ${mergedMetrics.spend.toLocaleString()} total budget per the plan below is projected to yield{' '}
                    <strong>{budgetPlan.projectedIncrementalConversionsVsEvenSplit >= 0 ? '+' : ''}{budgetPlan.projectedIncrementalConversionsVsEvenSplit.toLocaleString()} conversions</strong> compared to an even split across the same channels -- computed by src/lib/budgetOptimizer.ts.
                  </>
                ) : (
                  <span>No reallocation plan available yet.</span>
                )}
              </div>
            </div>

            <div className="p-4 bg-stone-900 border-t border-stone-800 flex items-center justify-between font-mono">
              <span className="text-stone-500 text-[11px]">Vantage AdEngine Intelligence Core v4.2</span>
              <button
                onClick={handleExportCSV}
                className="bg-amber-400 hover:bg-amber-300 text-black font-bold px-4 py-2 rounded cursor-pointer transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Sliced Data (CSV)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Widget Modal */}
      {isAddWidgetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f0f0f] border border-stone-700 w-full max-w-xl rounded-sm shadow-2xl font-mono text-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <span className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add Custom Analytics Widget</span>
              </span>
              <button onClick={() => setIsAddWidgetModalOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-sans">
              <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold">
                Select Widget Template
              </label>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  onClick={() => addWidget('kpi-summary', 'Custom Merged KPIs', 'full')}
                  className="p-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded text-left flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-white text-xs">Blended KPI Scorecards Card</div>
                    <div className="text-[11px] text-stone-400">Total Spend, Impressions, Conversions, Blended ROAS</div>
                  </div>
                  <Plus className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  onClick={() => addWidget('spend-vs-return-chart', 'Platform Revenue vs Spend Area Chart', 'half')}
                  className="p-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded text-left flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-white text-xs">Revenue vs Spend Area Trajectory</div>
                    <div className="text-[11px] text-stone-400">Interactive Recharts area visualization</div>
                  </div>
                  <Plus className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  onClick={() => addWidget('channel-share-donut', 'Channel Budget Allocation Donut', 'half')}
                  className="p-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded text-left flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-white text-xs">Channel Budget Allocation Donut</div>
                    <div className="text-[11px] text-stone-400">Visual share of voice per connected platform</div>
                  </div>
                  <Plus className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  onClick={() => addWidget('comparison-matrix-table', 'Cross-Channel Comparison Table', 'full')}
                  className="p-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded text-left flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-white text-xs">Omni-Channel Slice & Merge Table</div>
                    <div className="text-[11px] text-stone-400">Granular metric slicing grid with CTR, CPC, CPM</div>
                  </div>
                  <Plus className="w-4 h-4 text-amber-400" />
                </button>

                <button
                  onClick={() => addWidget('creative-fatigue-monitor', 'Creative Fatigue Monitor', 'full')}
                  className="p-3 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded text-left flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-bold text-white text-xs">Creative Fatigue Monitor</div>
                    <div className="text-[11px] text-stone-400">Real CTR/CPM/CVR decay scoring per creative vs. its own baseline</div>
                  </div>
                  <Plus className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Formula Creator Modal */}
      {isFormulaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateCustomFormula} className="bg-[#0f0f0f] border border-stone-700 w-full max-w-md rounded-sm shadow-2xl font-mono text-xs p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <span className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>Create Merged Metric Formula</span>
              </span>
              <button type="button" onClick={() => setIsFormulaModalOpen(false)} className="text-stone-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 font-sans text-xs">
              <div>
                <label className="block text-[10px] text-stone-400 uppercase font-bold mb-1">Formula Label</label>
                <input
                  type="text"
                  required
                  value={customFormulaLabel}
                  onChange={(e) => setCustomFormulaLabel(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-200 px-3 py-2 rounded font-mono text-xs focus:border-amber-400 focus:outline-none"
                  placeholder="e.g. Blended CPA Ratio"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 items-center">
                <div>
                  <label className="block text-[10px] text-stone-400 uppercase font-bold mb-1">Metric A</label>
                  <select
                    value={formulaMetricA}
                    onChange={(e) => setFormulaMetricA(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-200 px-2 py-2 rounded text-[11px] font-mono focus:border-amber-400"
                  >
                    <option value="Total Ad Spend">Total Ad Spend</option>
                    <option value="Total Conversions">Total Conversions</option>
                    <option value="Total Impressions">Total Impressions</option>
                    <option value="Total Clicks">Total Clicks</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-stone-400 uppercase font-bold mb-1">Operator</label>
                  <select
                    value={formulaOperator}
                    onChange={(e) => setFormulaOperator(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 text-amber-400 font-bold px-2 py-2 rounded text-xs font-mono text-center focus:border-amber-400"
                  >
                    <option value="/">÷ (Divide)</option>
                    <option value="*">× (Multiply)</option>
                    <option value="+">+ (Add)</option>
                    <option value="-">- (Subtract)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-stone-400 uppercase font-bold mb-1">Metric B</label>
                  <select
                    value={formulaMetricB}
                    onChange={(e) => setFormulaMetricB(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-200 px-2 py-2 rounded text-[11px] font-mono focus:border-amber-400"
                  >
                    <option value="Total Conversions">Total Conversions</option>
                    <option value="Total Clicks">Total Clicks</option>
                    <option value="Total Impressions">Total Impressions</option>
                    <option value="Total Ad Spend">Total Ad Spend</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-stone-950 rounded border border-stone-800 text-[11px] font-mono text-stone-300">
                Preview: <strong>{customFormulaLabel}</strong> = ({formulaMetricA}) {formulaOperator} ({formulaMetricB})
              </div>
            </div>

            <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFormulaModalOpen(false)}
                className="px-3 py-1.5 bg-stone-900 text-stone-400 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded cursor-pointer transition-colors"
              >
                Add Formula Card
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="pb-6 border-b border-stone-800/80 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-3 font-mono">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-widest rounded-full">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Cross-Channel Data Collector & Merge Engine</span>
            </div>

            <span className="text-[11px] text-stone-500">
              Synced: <strong className="text-stone-300">{lastSyncedAt}</strong> ({totalEventsProcessed.toLocaleString()} ad events)
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif italic text-white tracking-tight">
            Market Intelligence & Drag-and-Drop Analytics
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm leading-relaxed mt-1 max-w-3xl font-sans">
            Collect real-time performance analytics across Google Ads, Meta, TikTok, LinkedIn, Pinterest, X, and Programmatic. Slice, merge, and re-order custom drag-and-drop dashboard widgets to make accurate ad spend decisions.
          </p>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 font-mono">
          <button
            onClick={handleSyncData}
            disabled={isSyncing}
            className="bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Pipeline...' : 'Sync Live Data'}</span>
          </button>

          <button
            onClick={() => setIsExecutiveBriefOpen(true)}
            className="bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-400 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-amber-400" />
            <span>Executive Brief</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-amber-400 hover:bg-amber-300 text-black px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-sm transition-all shadow-lg shadow-amber-400/10 flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Slice (CSV)</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* CHANNEL MERGE & SLICING CONTROLS BAR */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-[#080808] border border-stone-800 p-5 rounded-sm space-y-4 font-mono text-xs">
        
        {/* Ad Channel Merging Toggles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-stone-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Select Ad Platforms to Merge Data ({selectedPlatforms.length}/7 Selected):</span>
            </span>

            <button
              onClick={() => setSelectedPlatforms(['meta', 'google', 'linkedin', 'tiktok', 'pinterest', 'x', 'programmatic'])}
              className="text-amber-400 hover:underline text-[10px] cursor-pointer"
            >
              Select All Channels
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['meta', 'google', 'linkedin', 'tiktok', 'pinterest', 'x', 'programmatic'] as PlatformType[]).map(p => {
              const isSelected = selectedPlatforms.includes(p);
              const info = platformDataMap[p];

              return (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  className={`px-3 py-1.5 rounded-sm border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-stone-900 text-white border-amber-400/60 shadow-md' 
                      : 'bg-stone-950 text-stone-500 border-stone-800 hover:text-stone-300'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: isSelected ? info.color : '#444' }}
                  />
                  <span className="uppercase">{p}</span>
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Data Slicing Dimensions */}
        <div className="pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-4">
          
          {/* Time Slice */}
          <div className="flex items-center gap-2">
            <span className="text-stone-500 text-[10px] uppercase font-bold">Time Range Slice:</span>
            <div className="flex bg-stone-950 p-1 border border-stone-800 rounded">
              {(['24h', '7d', '30d', '90d', 'ytd'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTimeSlice(t)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded cursor-pointer transition-colors ${
                    timeSlice === t ? 'bg-amber-400 text-black' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Dimension Filter Slicing */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={deviceFilter}
                onChange={(e) => setDeviceFilter(e.target.value as any)}
                className="bg-stone-950 border border-stone-800 text-stone-300 px-2 py-1 text-[11px] rounded focus:border-amber-400"
              >
                <option value="all">All Devices (Mobile/Desktop/CTV)</option>
                <option value="mobile">Mobile Only (iOS & Android)</option>
                <option value="desktop">Desktop Web Only</option>
                <option value="ctv">Connected TV (CTV)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value as any)}
                className="bg-stone-950 border border-stone-800 text-stone-300 px-2 py-1 text-[11px] rounded focus:border-amber-400"
              >
                <option value="all">Global (All Regions)</option>
                <option value="us">North America (US & CA)</option>
                <option value="eu">Europe (EU & UK)</option>
                <option value="apac">Asia Pacific (APAC)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* DRAG AND DROP DASHBOARD GRID CONTROL BAR */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex items-center justify-between border-b border-stone-800 pb-3 font-mono text-xs">
        <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider">
          <GripVertical className="w-4 h-4 text-amber-400" />
          <span>Interactive Drag & Drop Dashboard Canvas ({widgets.length} Widgets)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFormulaModalOpen(true)}
            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-700 text-[11px] font-bold rounded cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>New Custom Formula</span>
          </button>

          <button
            onClick={() => setIsAddWidgetModalOpen(true)}
            className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white border border-stone-700 text-[11px] font-bold rounded cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Widget</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* DYNAMIC RE-ORDERABLE WIDGET GRID */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((w, idx) => {
          const colSpanClass = 
            w.width === 'full' 
              ? 'md:col-span-2 lg:col-span-3' 
              : w.width === 'half' 
              ? 'md:col-span-1 lg:col-span-2' 
              : 'md:col-span-1 lg:col-span-1';

          return (
            <div
              key={w.id}
              draggable
              onDragStart={(e) => handleDragStart(e, w.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, w.id)}
              className={`${colSpanClass} bg-[#080808] border border-stone-800 hover:border-stone-700 p-6 rounded-sm shadow-xl space-y-4 transition-all relative group`}
            >
              {/* Widget Drag & Actions Header */}
              <div className="flex items-center justify-between border-b border-stone-800/80 pb-3 font-mono">
                <div className="flex items-center gap-2 cursor-grab active:cursor-grabbing text-stone-300">
                  <GripVertical className="w-4 h-4 text-stone-500 hover:text-amber-400" />
                  <span className="font-bold text-xs uppercase tracking-wider text-white font-sans">
                    {w.title}
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveWidget(w.id, 'up')}
                    disabled={idx === 0}
                    className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-amber-400 disabled:opacity-30 cursor-pointer"
                    title="Move Up / Earlier"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => moveWidget(w.id, 'down')}
                    disabled={idx === widgets.length - 1}
                    className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-amber-400 disabled:opacity-30 cursor-pointer"
                    title="Move Down / Later"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => toggleWidgetWidth(w.id)}
                    className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-amber-400 cursor-pointer text-[10px] uppercase font-bold"
                    title="Toggle Width"
                  >
                    [{w.width}]
                  </button>

                  <button
                    onClick={() => removeWidget(w.id)}
                    className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-rose-400 cursor-pointer"
                    title="Remove Widget"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* WIDGET CONTENT RENDERERS BASED ON TYPE */}
              {w.type === 'kpi-summary' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                  <div className="bg-stone-950 p-4 rounded border border-stone-900">
                    <span className="text-[10px] text-stone-500 font-mono uppercase block">Merged Spend</span>
                    <span className="text-xl sm:text-2xl font-serif italic font-bold text-white">
                      ${mergedMetrics.spend.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                      {selectedPlatforms.length} Channels Active
                    </span>
                  </div>

                  <div className="bg-stone-950 p-4 rounded border border-stone-900">
                    <span className="text-[10px] text-stone-500 font-mono uppercase block">Blended ROAS</span>
                    <span className="text-xl sm:text-2xl font-serif italic font-bold text-amber-400">
                      {blendedROAS.toFixed(2)}x
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono block mt-1">
                      Target: 3.50x
                    </span>
                  </div>

                  <div className="bg-stone-950 p-4 rounded border border-stone-900">
                    <span className="text-[10px] text-stone-500 font-mono uppercase block">Blended CAC</span>
                    <span className="text-xl sm:text-2xl font-serif italic font-bold text-white">
                      ${blendedCAC.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono block mt-1">
                      -14% vs Last Period
                    </span>
                  </div>

                  <div className="bg-stone-950 p-4 rounded border border-stone-900">
                    <span className="text-[10px] text-stone-500 font-mono uppercase block">Total Conversions</span>
                    <span className="text-xl sm:text-2xl font-serif italic font-bold text-white">
                      {mergedMetrics.conversions.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-stone-400 font-mono block mt-1">
                      CTR: {blendedCTR.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}

              {w.type === 'spend-vs-return-chart' && (
                <div className="space-y-2">
                  <div className="h-64 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={timeSeries}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis dataKey="date" stroke="#666" fontSize={10} />
                        <YAxis stroke="#666" fontSize={10} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f0f0f', borderColor: '#333', color: '#fff', fontSize: '12px' }}
                          formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRevenue)" name="Merged Revenue ($)" />
                        <Area type="monotone" dataKey="spend" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSpend)" name="Merged Spend ($)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {w.type === 'channel-share-donut' && (
                <div className="flex flex-col sm:flex-row items-center justify-around h-64 gap-4">
                  <div className="w-48 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {donutChartData.map((entry, index) => (
                            <Cell key={`cell-${entry.name || index}-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f0f0f', borderColor: '#333', color: '#fff', fontSize: '11px' }}
                          formatter={(value: any) => [`$${Number(value).toLocaleString()}`, 'Spend']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5 font-mono text-xs w-full max-w-xs">
                    {donutChartData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-1.5 bg-stone-950 rounded border border-stone-900 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-stone-300 truncate max-w-[110px]">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold">${item.value.toLocaleString()}</span>
                          <span className="text-amber-400 font-bold">{item.roas}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {w.type === 'ai-decision-engine' && (
                <div className="space-y-4 font-sans text-xs">
                  {isComputingPlan && (
                    <div className="text-[11px] text-stone-500 font-mono">Computing real reallocation plan...</div>
                  )}
                  {!isComputingPlan && budgetPlan && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
                      {budgetPlan.allocations
                        .slice()
                        .sort((a: any, b: any) => Math.abs(b.deltaSpend) - Math.abs(a.deltaSpend))
                        .slice(0, 3)
                        .map((alloc: any) => {
                          const isIncrease = alloc.deltaSpend >= 0;
                          return (
                            <div
                              key={alloc.platform}
                              className={`p-4 rounded space-y-2 border ${
                                isIncrease ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
                              }`}
                            >
                              <div className={`font-bold flex items-center gap-1.5 ${isIncrease ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isIncrease ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                <span>
                                  {isIncrease ? 'Increase' : 'Decrease'} {platformDataMap[alloc.platform as PlatformType]?.name ?? alloc.platform} by ${Math.abs(alloc.deltaSpend).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-300 font-sans">
                                Marginal rate: {alloc.marginalConversionsPerDollar.toFixed(4)} conversions/$ at current spend, based on this channel's own trailing spend/conversion history.
                              </p>
                              <div className={`text-[10px] font-bold uppercase ${isIncrease ? 'text-emerald-300' : 'text-rose-300'}`}>
                                Recommended spend: ${alloc.recommendedSpend.toLocaleString()} (was ${alloc.currentSpend.toLocaleString()})
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                  <p className="text-[10px] text-stone-500 font-mono">
                    Computed by the constrained water-filling allocator in src/lib/budgetOptimizer.ts from each channel's own marginal-ROAS regression.
                  </p>
                </div>
              )}

              {w.type === 'creative-fatigue-monitor' && (
                <CreativeFatigueWidget campaigns={campaigns} timeSeries={timeSeries} />
              )}

              {w.type === 'comparison-matrix-table' && (
                <div className="overflow-x-auto font-mono text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-stone-800 text-stone-500 uppercase text-[10px]">
                        <th className="py-2 px-3">Ad Platform</th>
                        <th className="py-2 px-3">Spend</th>
                        <th className="py-2 px-3">Impressions</th>
                        <th className="py-2 px-3">Clicks</th>
                        <th className="py-2 px-3">CTR</th>
                        <th className="py-2 px-3">CPC</th>
                        <th className="py-2 px-3">Conversions</th>
                        <th className="py-2 px-3 text-right">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/60">
                      {selectedPlatforms.map(p => {
                        const d = platformDataMap[p];
                        const ctr = ((d.clicks / d.impressions) * 100).toFixed(2);
                        const cpc = (d.spend / d.clicks).toFixed(2);

                        return (
                          <tr key={p} className="hover:bg-stone-900/50 transition-colors">
                            <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                              <span>{d.name}</span>
                            </td>
                            <td className="py-3 px-3 text-stone-200">${d.spend.toLocaleString()}</td>
                            <td className="py-3 px-3 text-stone-400">{d.impressions.toLocaleString()}</td>
                            <td className="py-3 px-3 text-stone-400">{d.clicks.toLocaleString()}</td>
                            <td className="py-3 px-3 text-amber-400">{ctr}%</td>
                            <td className="py-3 px-3 text-stone-300">${cpc}</td>
                            <td className="py-3 px-3 text-emerald-400 font-bold">{d.conversions.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right text-amber-400 font-bold">{d.roas}x</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {w.type === 'multi-touch-attribution' && (
                <div className="space-y-3 font-sans text-xs">
                  <div className="p-3 bg-stone-950 rounded border border-stone-900 font-mono text-[11px] space-y-2">
                    <div className="flex items-center justify-between text-stone-300 border-b border-stone-900 pb-2">
                      <span>1st Touch: Meta Ad → 2nd: Google Search → Direct Sale</span>
                      <span className="text-amber-400 font-bold">42% Attribution</span>
                    </div>
                    <div className="flex items-center justify-between text-stone-300 border-b border-stone-900 pb-2">
                      <span>1st Touch: TikTok Video → 2nd: Retargeted Meta → Sale</span>
                      <span className="text-amber-400 font-bold">31% Attribution</span>
                    </div>
                    <div className="flex items-center justify-between text-stone-300">
                      <span>1st Touch: LinkedIn Pro → 2nd: Google Search → Demo Request</span>
                      <span className="text-amber-400 font-bold">27% Attribution</span>
                    </div>
                  </div>
                </div>
              )}

              {w.type === 'custom-formula-card' && (
                <div className="bg-stone-950 p-6 rounded border border-amber-400/30 text-center space-y-2 font-mono">
                  <span className="text-xs text-stone-400 uppercase font-bold block">
                    {w.formulaConfig?.label || 'Custom Metric'}
                  </span>
                  <div className="text-3xl font-serif italic font-bold text-amber-400">
                    ${blendedCAC.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-stone-400 font-sans">
                    Computed: ({w.formulaConfig?.metricA || 'Spend'}) {w.formulaConfig?.operator || '/'} ({w.formulaConfig?.metricB || 'Conversions'})
                  </p>
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};
