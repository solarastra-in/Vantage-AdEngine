import React, { useState, useEffect } from 'react';
import { 
  Split, 
  Plus, 
  Trash2, 
  Sparkles, 
  BarChart3, 
  TrendingUp, 
  Award, 
  Sliders, 
  ShieldCheck, 
  CheckCircle2, 
  HelpCircle, 
  Image as ImageIcon, 
  Users, 
  Layers, 
  Play, 
  RefreshCw,
  Zap,
  Target,
  Percent,
  AlertCircle
} from 'lucide-react';
import { AbTestConfig, AbTestVariant } from '../types';

interface AbTestFrameworkProps {
  masterHeadline: string;
  masterPrimaryText: string;
  masterMediaUrl: string;
  masterAudience: string;
  config: AbTestConfig;
  onChange: (newConfig: AbTestConfig) => void;
}

const PRESET_SAMPLE_IMAGES = [
  { label: 'Modern Tech SaaS Banner', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Executive Enterprise Workstation', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80' },
  { label: 'High Impact Minimalist Abstract', url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80' },
  { label: 'AI Data Analytics Dark Grid', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80' },
];

export const AbTestFramework: React.FC<AbTestFrameworkProps> = ({
  masterHeadline,
  masterPrimaryText,
  masterMediaUrl,
  masterAudience,
  config,
  onChange,
}) => {
  const [activeTab, setActiveTab] = useState<'variants' | 'tracking' | 'settings'>('variants');
  const [isSimulating, setIsSimulating] = useState(false);

  // Initialize default variants if empty or non-matching
  useEffect(() => {
    if (!config.variants || config.variants.length === 0) {
      const defaultControl: AbTestVariant = {
        id: 'var-control-a',
        name: 'Variant A (Control - Master Creative)',
        isControl: true,
        headline: masterHeadline || 'Transform Your Ad Operations with AI Automation',
        primaryText: masterPrimaryText || 'Scale high-converting campaigns across 7 ad networks with automated budget allocation and real-time optimization.',
        mediaUrl: masterMediaUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
        targetAudienceSegment: masterAudience || 'B2B Marketing Directors & Growth Executives (US/Global)',
        trafficAllocationPct: 50,
        metrics: {
          impressions: 12450,
          clicks: 436,
          conversions: 38,
          spend: 622.50,
          ctr: 3.50,
          cpc: 1.43,
          cpa: 16.38,
          roas: 3.82,
          confidenceScorePct: 100,
          conversionLiftPct: 0.0,
        },
        status: 'control',
      };

      const defaultChallenger: AbTestVariant = {
        id: 'var-challenger-b',
        name: 'Variant B (Challenger - High Urgency Headline)',
        isControl: false,
        headline: 'Stop Wasting Ad Spend: Automate 7 Ad Networks in 60 Seconds',
        primaryText: 'Cut cost-per-acquisition by up to 42% with continuous multi-channel machine learning bid optimization.',
        mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
        targetAudienceSegment: 'Performance Marketers & Paid Search Agencies (Lookalike 1%)',
        trafficAllocationPct: 50,
        metrics: {
          impressions: 12510,
          clicks: 563,
          conversions: 52,
          spend: 625.50,
          ctr: 4.50,
          cpc: 1.11,
          cpa: 12.03,
          roas: 4.95,
          confidenceScorePct: 96.4,
          conversionLiftPct: 36.8,
        },
        status: 'leading',
      };

      onChange({
        ...config,
        variants: [defaultControl, defaultChallenger],
      });
    }
  }, []);

  const handleToggleEnable = (enabled: boolean) => {
    onChange({ ...config, enabled });
  };

  const handleAddVariant = () => {
    const nextLetter = String.fromCharCode(65 + config.variants.length); // C, D, E...
    const newVariant: AbTestVariant = {
      id: `var-challenger-${Date.now()}`,
      name: `Variant ${nextLetter} (Challenger - Custom Creative)`,
      isControl: false,
      headline: masterHeadline ? `${masterHeadline} - Edition ${nextLetter}` : 'Exclusive Early Access: AI Growth Platform',
      primaryText: masterPrimaryText || 'Drive maximum ROI with multi-platform predictive budget orchestration.',
      mediaUrl: PRESET_SAMPLE_IMAGES[config.variants.length % PRESET_SAMPLE_IMAGES.length].url,
      targetAudienceSegment: 'High Intent SaaS Buyers & VP Growth (Retargeting 30 Days)',
      trafficAllocationPct: 0, // Will be rebalanced
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        roas: 0,
        confidenceScorePct: 50,
        conversionLiftPct: 0,
      },
      status: 'inconclusive',
    };

    const updatedVariants = [...config.variants, newVariant];
    // Equalize traffic split
    const splitPct = Math.floor(100 / updatedVariants.length);
    const rebalanced = updatedVariants.map((v, idx) => ({
      ...v,
      trafficAllocationPct: idx === updatedVariants.length - 1 
        ? 100 - (splitPct * (updatedVariants.length - 1)) 
        : splitPct,
    }));

    onChange({ ...config, variants: rebalanced });
  };

  const handleRemoveVariant = (variantId: string) => {
    if (config.variants.length <= 1) return;
    const remaining = config.variants.filter(v => v.id !== variantId);
    // Rebalance split
    const splitPct = Math.floor(100 / remaining.length);
    const rebalanced = remaining.map((v, idx) => ({
      ...v,
      trafficAllocationPct: idx === remaining.length - 1 
        ? 100 - (splitPct * (remaining.length - 1)) 
        : splitPct,
    }));
    onChange({ ...config, variants: rebalanced });
  };

  const handleEqualizeTraffic = () => {
    if (config.variants.length === 0) return;
    const splitPct = Math.floor(100 / config.variants.length);
    const rebalanced = config.variants.map((v, idx) => ({
      ...v,
      trafficAllocationPct: idx === config.variants.length - 1 
        ? 100 - (splitPct * (config.variants.length - 1)) 
        : splitPct,
    }));
    onChange({ ...config, variants: rebalanced });
  };

  const handleUpdateVariantField = (id: string, field: keyof AbTestVariant, value: any) => {
    const updated = config.variants.map(v => {
      if (v.id === id) {
        return { ...v, [field]: value };
      }
      return v;
    });
    onChange({ ...config, variants: updated });
  };

  const handleSyncControlFromMaster = () => {
    const updated = config.variants.map(v => {
      if (v.isControl) {
        return {
          ...v,
          headline: masterHeadline || v.headline,
          primaryText: masterPrimaryText || v.primaryText,
          mediaUrl: masterMediaUrl || v.mediaUrl,
          targetAudienceSegment: masterAudience || v.targetAudienceSegment,
        };
      }
      return v;
    });
    onChange({ ...config, variants: updated });
  };

  const handleSimulatePerformanceTest = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const controlVariant = config.variants.find(v => v.isControl) || config.variants[0];
      const controlConversionRate = 0.030; // 3%

      const simulated = config.variants.map((v) => {
        const trafficFactor = v.trafficAllocationPct / 100;
        const baseImpressions = Math.round((15000 + Math.random() * 10000) * trafficFactor);
        const randomCtrBoost = v.isControl ? 0 : (Math.random() * 0.02 - 0.005);
        const ctr = Math.max(0.015, Math.min(0.08, 0.032 + randomCtrBoost));
        const clicks = Math.round(baseImpressions * ctr);
        const convRate = Math.max(0.01, Math.min(0.09, controlConversionRate + (v.isControl ? 0 : (Math.random() * 0.03 - 0.008))));
        const conversions = Math.round(clicks * convRate);
        const spend = +(clicks * (1.10 + Math.random() * 0.5)).toFixed(2);
        const cpc = +(spend / (clicks || 1)).toFixed(2);
        const cpa = +(spend / (conversions || 1)).toFixed(2);
        const roas = +((conversions * 140) / (spend || 1)).toFixed(2);

        // Calculate Lift vs Control
        const lift = v.isControl ? 0 : +(((conversions / (clicks || 1) - controlConversionRate) / controlConversionRate) * 100).toFixed(1);
        const conf = v.isControl ? 100 : Math.min(99.9, +(82 + Math.random() * 17.5).toFixed(1));

        let status: 'leading' | 'losing' | 'control' | 'inconclusive' = 'inconclusive';
        if (v.isControl) status = 'control';
        else if (lift > 10 && conf >= 90) status = 'leading';
        else if (lift < -5) status = 'losing';

        return {
          ...v,
          metrics: {
            impressions: baseImpressions,
            clicks,
            conversions,
            spend,
            ctr: +(ctr * 100).toFixed(2),
            cpc,
            cpa,
            roas,
            confidenceScorePct: conf,
            conversionLiftPct: lift,
          },
          status,
        };
      });

      onChange({ ...config, variants: simulated });
      setIsSimulating(false);
    }, 900);
  };

  const totalTrafficPct = config.variants.reduce((acc, v) => acc + (Number(v.trafficAllocationPct) || 0), 0);

  return (
    <div className="bg-stone-950 border border-stone-800 rounded-lg overflow-hidden font-mono text-xs">
      {/* Header & Main Toggle Bar */}
      <div className="bg-stone-900/90 border-b border-stone-800 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded flex items-center justify-center border transition-all ${
            config.enabled ? 'bg-amber-400/20 text-amber-400 border-amber-400/50' : 'bg-stone-800 text-stone-500 border-stone-700'
          }`}>
            <Split className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs uppercase font-bold tracking-wider text-white">Multivariable A/B Experimentation Engine</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                config.enabled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-stone-800 text-stone-400 border-stone-700'
              }`}>
                {config.enabled ? 'Active Split Testing' : 'Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 font-sans mt-0.5">
              Define creative variants (headlines, imagery) & audience segments with statistical confidence tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={config.enabled} 
              onChange={e => handleToggleEnable(e.target.checked)}
              className="sr-only peer" 
            />
            <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
            <span className="ml-2 text-xs font-bold text-stone-200">
              {config.enabled ? 'ON' : 'OFF'}
            </span>
          </label>
        </div>
      </div>

      {config.enabled && (
        <>
          {/* Sub Navigation Bar */}
          <div className="bg-black border-b border-stone-800 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('variants')}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'variants'
                    ? 'bg-amber-400 text-black shadow-xs'
                    : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Variants ({config.variants.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tracking')}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'tracking'
                    ? 'bg-amber-400 text-black shadow-xs'
                    : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Variant Performance Tracking</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-amber-400 text-black shadow-xs'
                    : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Significance Rules</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {totalTrafficPct !== 100 && (
                <div className="text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/30 px-2 py-1 rounded flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Split total is {totalTrafficPct}% (Must equal 100%)
                </div>
              )}

              <button
                type="button"
                onClick={handleEqualizeTraffic}
                className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 text-[11px] font-bold rounded cursor-pointer transition-colors flex items-center gap-1"
              >
                <Percent className="w-3 h-3 text-amber-400" />
                <span>Equalize Split ({Math.floor(100 / (config.variants.length || 1))}%)</span>
              </button>

              <button
                type="button"
                onClick={handleAddVariant}
                className="px-3 py-1 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 border border-amber-400/40 text-xs font-bold rounded cursor-pointer transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            </div>
          </div>

          {/* TAB 1: VARIANTS DEFINITION */}
          {activeTab === 'variants' && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <p>Define custom headlines, media assets, and audience segments for each variant branch.</p>
                <button
                  type="button"
                  onClick={handleSyncControlFromMaster}
                  className="text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Sync Control (Variant A) with Master Campaign Creative</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {config.variants.map((v, index) => (
                  <div 
                    key={v.id}
                    className={`bg-stone-900/60 border rounded-lg p-4 transition-all ${
                      v.isControl 
                        ? 'border-amber-400/40 shadow-sm shadow-amber-400/5' 
                        : 'border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    {/* Variant Header Row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800/80 pb-3 mb-3">
                      <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          v.isControl ? 'bg-amber-400 text-black' : 'bg-stone-800 text-stone-300 border border-stone-700'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        
                        <input
                          type="text"
                          value={v.name}
                          onChange={e => handleUpdateVariantField(v.id, 'name', e.target.value)}
                          className="bg-stone-950 border border-stone-800 focus:border-amber-400 px-2.5 py-1 text-xs font-bold text-white rounded w-full sm:w-80"
                        />

                        {v.isControl && (
                          <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded font-bold uppercase shrink-0">
                            CONTROL BASELINE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] uppercase text-stone-400 font-bold">Traffic Split:</label>
                          <div className="flex items-center gap-1 bg-stone-950 border border-stone-800 rounded px-2 py-1">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={v.trafficAllocationPct}
                              onChange={e => handleUpdateVariantField(v.id, 'trafficAllocationPct', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                              className="w-10 bg-transparent text-center font-bold text-amber-400 outline-none text-xs"
                            />
                            <span className="text-stone-500 font-bold text-xs">%</span>
                          </div>
                        </div>

                        {!v.isControl && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(v.id)}
                            className="p-1.5 bg-stone-950 hover:bg-red-500/20 text-stone-400 hover:text-red-400 border border-stone-800 hover:border-red-500/30 rounded cursor-pointer transition-colors"
                            title="Remove Variant"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Variant Editable Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Left: Headline & Primary Copy */}
                      <div className="md:col-span-7 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
                              <span>Variant Headline</span>
                              <span className="text-red-400">*</span>
                            </label>
                            <span className="text-[10px] text-stone-500">{v.headline.length} chars</span>
                          </div>
                          <input
                            type="text"
                            value={v.headline}
                            onChange={e => handleUpdateVariantField(v.id, 'headline', e.target.value)}
                            placeholder="Enter test headline..."
                            className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-3 py-2 text-xs text-white outline-none rounded font-sans"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1">
                            Variant Primary Body Copy
                          </label>
                          <textarea
                            rows={2}
                            value={v.primaryText || ''}
                            onChange={e => handleUpdateVariantField(v.id, 'primaryText', e.target.value)}
                            placeholder="Enter variant body text..."
                            className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-3 py-2 text-xs text-white outline-none rounded font-sans resize-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-stone-400 mb-1 flex items-center gap-1">
                            <Users className="w-3 h-3 text-sky-400" />
                            <span>Target Audience Segment</span>
                          </label>
                          <input
                            type="text"
                            value={v.targetAudienceSegment}
                            onChange={e => handleUpdateVariantField(v.id, 'targetAudienceSegment', e.target.value)}
                            placeholder="e.g. Lookalike 1% + High Intent Retargeting..."
                            className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-3 py-2 text-xs text-sky-200 outline-none rounded font-sans"
                          />
                        </div>
                      </div>

                      {/* Right: Image Preview & URL Selection */}
                      <div className="md:col-span-5 space-y-2">
                        <label className="block text-[10px] uppercase font-bold text-stone-400 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-amber-400" />
                          <span>Variant Creative Media Asset</span>
                        </label>

                        <div className="flex gap-3 items-start">
                          <div className="w-24 h-24 bg-black border border-stone-800 rounded overflow-hidden shrink-0 relative group">
                            {v.mediaUrl ? (
                              <img 
                                src={v.mediaUrl} 
                                alt={v.name} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-600">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-amber-400 font-bold p-1 text-center">
                              Variant {String.fromCharCode(65 + index)}
                            </div>
                          </div>

                          <div className="space-y-2 flex-1">
                            <input
                              type="text"
                              value={v.mediaUrl}
                              onChange={e => handleUpdateVariantField(v.id, 'mediaUrl', e.target.value)}
                              placeholder="Image URL..."
                              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-2.5 py-1.5 text-[11px] text-stone-300 outline-none rounded font-mono"
                            />

                            <div className="space-y-1">
                              <span className="text-[10px] text-stone-500 block">Quick Image Preset:</span>
                              <div className="grid grid-cols-2 gap-1">
                                {PRESET_SAMPLE_IMAGES.map((preset, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() => handleUpdateVariantField(v.id, 'mediaUrl', preset.url)}
                                    className="px-2 py-1 bg-stone-950 hover:bg-stone-800 border border-stone-800 text-[10px] text-stone-400 hover:text-white truncate rounded text-left transition-colors cursor-pointer"
                                    title={preset.label}
                                  >
                                    Preset {pIdx + 1}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: VARIANT PERFORMANCE TRACKING METRICS */}
          {activeTab === 'tracking' && (
            <div className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-900/80 border border-stone-800 p-3 rounded">
                <div>
                  <h4 className="text-xs uppercase font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Real-Time Variant Split Performance Matrix</span>
                  </h4>
                  <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                    Isolated performance metrics tracking across impressions, conversions, CPA, ROAS, and statistical confidence.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSimulatePerformanceTest}
                  disabled={isSimulating}
                  className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase tracking-wider text-xs rounded cursor-pointer transition-colors flex items-center gap-2 shrink-0 shadow-sm"
                >
                  <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                  <span>{isSimulating ? 'Simulating Traffic...' : 'Run Statistical Simulation'}</span>
                </button>
              </div>

              {/* Performance Cards per Variant */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {config.variants.map((v, idx) => (
                  <div 
                    key={v.id}
                    className={`bg-stone-900 border rounded-lg p-3.5 space-y-3 relative overflow-hidden ${
                      v.status === 'leading' 
                        ? 'border-emerald-500/50 shadow-md shadow-emerald-500/5' 
                        : v.isControl 
                        ? 'border-amber-400/40' 
                        : 'border-stone-800'
                    }`}
                  >
                    {v.status === 'leading' && (
                      <div className="absolute top-0 right-0 bg-emerald-500 text-black font-bold text-[9px] uppercase px-2 py-0.5 rounded-bl flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>Statistically Leading</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        v.isControl ? 'bg-amber-400 text-black' : 'bg-stone-800 text-stone-300'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <h5 className="font-bold text-xs text-white truncate max-w-[180px]">{v.name}</h5>
                    </div>

                    <p className="text-[11px] text-stone-300 line-clamp-1 italic font-sans bg-black/40 p-1.5 rounded border border-stone-800/80">
                      "{v.headline}"
                    </p>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-center bg-black/60 p-2 rounded border border-stone-800/60">
                      <div>
                        <span className="text-[9px] uppercase text-stone-500 font-bold block">CTR %</span>
                        <span className="text-sm font-bold text-amber-400">{v.metrics.ctr}%</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-stone-500 font-bold block">Conversions</span>
                        <span className="text-sm font-bold text-emerald-400">{v.metrics.conversions}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-stone-500 font-bold block">Cost / Conv (CPA)</span>
                        <span className="text-xs font-bold text-stone-200">${v.metrics.cpa}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-stone-500 font-bold block">ROAS</span>
                        <span className="text-xs font-bold text-sky-400">{v.metrics.roas}x</span>
                      </div>
                    </div>

                    {/* Lift & Confidence Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-stone-400 font-bold">Conversion Lift vs Control:</span>
                        <span className={`font-bold ${
                          v.metrics.conversionLiftPct > 0 
                            ? 'text-emerald-400' 
                            : v.metrics.conversionLiftPct < 0 
                            ? 'text-red-400' 
                            : 'text-stone-400'
                        }`}>
                          {v.metrics.conversionLiftPct > 0 ? `+${v.metrics.conversionLiftPct}%` : `${v.metrics.conversionLiftPct}%`}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-stone-400 font-bold">Confidence Score:</span>
                        <span className="text-amber-400 font-bold">{v.metrics.confidenceScorePct}%</span>
                      </div>

                      <div className="w-full bg-stone-950 h-1.5 rounded-full overflow-hidden border border-stone-800">
                        <div 
                          className={`h-full transition-all duration-500 ${
                            v.status === 'leading' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${v.metrics.confidenceScorePct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comprehensive Comparative Table */}
              <div className="border border-stone-800 rounded-lg overflow-x-auto bg-stone-950">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-stone-900 border-b border-stone-800 text-stone-400 uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Variant</th>
                      <th className="p-2.5">Headline preview</th>
                      <th className="p-2.5">Split</th>
                      <th className="p-2.5 text-right">Impressions</th>
                      <th className="p-2.5 text-right">Clicks</th>
                      <th className="p-2.5 text-right">CTR</th>
                      <th className="p-2.5 text-right">Conversions</th>
                      <th className="p-2.5 text-right">CPA</th>
                      <th className="p-2.5 text-right">ROAS</th>
                      <th className="p-2.5 text-right">Lift vs Ctrl</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 text-stone-200">
                    {config.variants.map((v, i) => (
                      <tr key={v.id} className="hover:bg-stone-900/50">
                        <td className="p-2.5 font-bold flex items-center gap-1.5 whitespace-nowrap">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                            v.isControl ? 'bg-amber-400 text-black' : 'bg-stone-800 text-stone-300'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span>{v.name}</span>
                        </td>
                        <td className="p-2.5 text-stone-400 max-w-[180px] truncate">{v.headline}</td>
                        <td className="p-2.5 font-bold text-amber-400">{v.trafficAllocationPct}%</td>
                        <td className="p-2.5 text-right">{v.metrics.impressions.toLocaleString()}</td>
                        <td className="p-2.5 text-right">{v.metrics.clicks.toLocaleString()}</td>
                        <td className="p-2.5 text-right font-bold text-amber-400">{v.metrics.ctr}%</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">{v.metrics.conversions}</td>
                        <td className="p-2.5 text-right">${v.metrics.cpa}</td>
                        <td className="p-2.5 text-right text-sky-400 font-bold">{v.metrics.roas}x</td>
                        <td className={`p-2.5 text-right font-bold ${
                          v.metrics.conversionLiftPct > 0 ? 'text-emerald-400' : v.metrics.conversionLiftPct < 0 ? 'text-red-400' : 'text-stone-400'
                        }`}>
                          {v.metrics.conversionLiftPct > 0 ? `+${v.metrics.conversionLiftPct}%` : `${v.metrics.conversionLiftPct}%`}
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase border ${
                            v.status === 'leading'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : v.isControl
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-stone-800 text-stone-400 border-stone-700'
                          }`}>
                            {v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: STATISTICAL RULES & GOALS */}
          {activeTab === 'settings' && (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-stone-900/60 p-3.5 rounded border border-stone-800">
                  <h4 className="text-xs uppercase font-bold text-amber-400 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span>Primary Optimization Goal</span>
                  </h4>
                  <p className="text-[11px] text-stone-400 font-sans">
                    Select the key metric used to evaluate winner significance and automated traffic re-routing.
                  </p>

                  <select
                    value={config.testGoal}
                    onChange={e => onChange({ ...config, testGoal: e.target.value as any })}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-3 py-2 text-xs text-white outline-none rounded font-bold"
                  >
                    <option value="CTR">Click-Through Rate (CTR %)</option>
                    <option value="CPA">Lowest Cost Per Acquisition (CPA $)</option>
                    <option value="ROAS">Highest Return on Ad Spend (ROAS x)</option>
                    <option value="Conversions">Total Conversion Volume</option>
                  </select>
                </div>

                <div className="space-y-3 bg-stone-900/60 p-3.5 rounded border border-stone-800">
                  <h4 className="text-xs uppercase font-bold text-amber-400 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confidence & Sample Size Thresholds</span>
                  </h4>
                  <p className="text-[11px] text-stone-400 font-sans">
                    Minimum data volume required before declaring statistical significance.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                        Min. Sample (Impressions)
                      </label>
                      <input
                        type="number"
                        step="500"
                        value={config.minSampleImpressions}
                        onChange={e => onChange({ ...config, minSampleImpressions: parseInt(e.target.value) || 1000 })}
                        className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-3 py-1.5 text-xs text-white outline-none rounded font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">
                        Confidence Target %
                      </label>
                      <select
                        value={config.confidenceThresholdPct}
                        onChange={e => onChange({ ...config, confidenceThresholdPct: parseInt(e.target.value) || 95 })}
                        className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-3 py-1.5 text-xs text-white outline-none rounded font-mono"
                      >
                        <option value={90}>90% Confidence</option>
                        <option value={95}>95% Confidence (Standard)</option>
                        <option value={99}>99% High Rigor</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-stone-900/60 p-3.5 rounded border border-stone-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-white">Automated Winner Promotion Engine</h5>
                    <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                      Automatically shift 100% of campaign budget to the winning variant once statistical confidence is achieved.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input 
                    type="checkbox" 
                    checked={config.autoPromoteWinner} 
                    onChange={e => onChange({ ...config, autoPromoteWinner: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-stone-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                </label>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
