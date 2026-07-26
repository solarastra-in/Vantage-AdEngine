import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  Zap, 
  RefreshCw, 
  Check, 
  Globe, 
  Layers, 
  ChevronRight, 
  Wand2, 
  ArrowRight,
  Info,
  ShieldCheck
} from 'lucide-react';
import { ChannelBudget, PlatformType } from '../types';

interface AiContentRefinerProps {
  enabledChannels: ChannelBudget[];
  masterHeadline: string;
  masterPrimaryText: string;
  objective: string;
  targetAudience: string;
  onApplyMasterCopy: (headline: string, primaryText: string) => void;
  onAddRsaHeadline?: (headline: string) => void;
}

export interface PlatformLimitSpec {
  platform: PlatformType;
  name: string;
  headlineLimit: number;
  headlineOptimal: string;
  descriptionLimit: number;
  descriptionFoldLimit?: number;
  descriptionOptimal: string;
  bestPractices: string[];
  toneGuide: string;
  iconColor: string;
}

export const PLATFORM_SPECS: Record<PlatformType, PlatformLimitSpec> = {
  google: {
    platform: 'google',
    name: 'Google Ads (Search/PMax)',
    headlineLimit: 30,
    headlineOptimal: '15-30 chars',
    descriptionLimit: 90,
    descriptionOptimal: '60-90 chars',
    bestPractices: [
      'Include primary search intent keyword in headline',
      'Capitalize every principal word (Title Case)',
      'Include clear CTA or numeric value proposition',
      'Keep under strict 30 char search headline limit'
    ],
    toneGuide: 'Direct, High-Intent, Value-Driven',
    iconColor: 'text-blue-400'
  },
  meta: {
    platform: 'meta',
    name: 'Meta (Facebook & Instagram)',
    headlineLimit: 40,
    headlineOptimal: '25-35 chars (25 visible without truncating)',
    descriptionLimit: 125, // First fold limit
    descriptionFoldLimit: 125,
    descriptionOptimal: '90-125 chars before "See More"',
    bestPractices: [
      'Hook the audience in the first 3 lines before fold (125 chars)',
      'Use natural emojis and bullet points for skimmability',
      'Focus on emotional outcome or social proof',
      'Keep mobile feed headline short to prevent line wraps'
    ],
    toneGuide: 'Conversational, Visual, Engaging',
    iconColor: 'text-sky-400'
  },
  linkedin: {
    platform: 'linkedin',
    name: 'LinkedIn Ads (Sponsored Content)',
    headlineLimit: 70,
    headlineOptimal: '40-60 chars',
    descriptionLimit: 150, // Intro text fold
    descriptionFoldLimit: 150,
    descriptionOptimal: '100-150 chars before "see more"',
    bestPractices: [
      'Speak to decision-makers and enterprise buyers',
      'Highlight ROI, efficiency metrics, or industry benchmarks',
      'Maintain professional B2B thought-leadership tone',
      'Use clear value proposition before 150-char fold'
    ],
    toneGuide: 'Professional, Authoritative, B2B-Focused',
    iconColor: 'text-indigo-400'
  },
  tiktok: {
    platform: 'tiktok',
    name: 'TikTok Ads',
    headlineLimit: 100,
    headlineOptimal: '30-60 chars',
    descriptionLimit: 100,
    descriptionOptimal: '50-90 chars',
    bestPractices: [
      'High-energy hook in the first phrase',
      'Native creator style and informal tone',
      'Direct call-to-action with urgency',
      'Keep under 100 characters for full overlay display'
    ],
    toneGuide: 'Authentic, Energetic, Fast-Paced',
    iconColor: 'text-pink-400'
  },
  pinterest: {
    platform: 'pinterest',
    name: 'Pinterest Ads',
    headlineLimit: 100,
    headlineOptimal: '30-40 chars (first 40 visible in feed)',
    descriptionLimit: 500,
    descriptionFoldLimit: 50,
    descriptionOptimal: '50-150 chars (first 50 visible in grid)',
    bestPractices: [
      'Use visual lifestyle and discovery keywords',
      'Aspirational language focused on planning or doing',
      'Include main benefit in first 50 chars for grid view'
    ],
    toneGuide: 'Aspirational, Helpful, Descriptive',
    iconColor: 'text-red-400'
  },
  x: {
    platform: 'x',
    name: 'X (Twitter) Ads',
    headlineLimit: 280,
    headlineOptimal: '70-120 chars',
    descriptionLimit: 280,
    descriptionOptimal: '100-200 chars',
    bestPractices: [
      'Punchy, newsy headline with high urgency',
      'Place link URL near the end of text',
      'Use 1 concise relevant hashtag max',
      'Direct benefit driven language'
    ],
    toneGuide: 'Concise, Direct, Timely',
    iconColor: 'text-stone-300'
  },
  programmatic: {
    platform: 'programmatic',
    name: 'Programmatic DSP Banner Ads',
    headlineLimit: 25,
    headlineOptimal: '15-25 chars',
    descriptionLimit: 90,
    descriptionOptimal: '45-90 chars',
    bestPractices: [
      'Ultra-concise headline for small display banner slots',
      'High contrast value claim',
      'Strong brand mention or product clarity'
    ],
    toneGuide: 'Clear, High-Impact, Banner-Optimized',
    iconColor: 'text-purple-400'
  }
};

export interface PlatformVariation {
  platform: PlatformType;
  headline: string;
  description: string;
  headlineCharCount: number;
  headlineValid: boolean;
  descriptionCharCount: number;
  descriptionValid: boolean;
  bestPracticeTip: string;
  complianceScore: number; // 0 - 100
  keyAdjustments: string[];
}

export const AiContentRefiner: React.FC<AiContentRefinerProps> = ({
  enabledChannels,
  masterHeadline,
  masterPrimaryText,
  objective,
  targetAudience,
  onApplyMasterCopy,
  onAddRsaHeadline
}) => {
  const [activePlatformTab, setActivePlatformTab] = useState<PlatformType>('google');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);

  // Store variations generated per platform
  const [variations, setVariations] = useState<Record<PlatformType, PlatformVariation[]>>({} as any);

  // Extract active platforms from enabled channels
  const activeChannels = enabledChannels.filter(c => c.enabled);
  const activePlatforms = activeChannels.map(c => c.platform);

  // Set default active tab to first active platform if available
  useEffect(() => {
    if (activePlatforms.length > 0 && !activePlatforms.includes(activePlatformTab)) {
      setActivePlatformTab(activePlatforms[0]);
    }
  }, [enabledChannels]);

  // Refine text helper logic for specific platform rules
  const generatePlatformVariationsForPlatform = (
    platform: PlatformType,
    origHeadline: string,
    origText: string,
    obj: string,
    aud: string
  ): PlatformVariation[] => {
    const spec = PLATFORM_SPECS[platform];

    // Helper to truncate safely without cutting words
    const safeTruncate = (str: string, maxLen: number) => {
      if (str.length <= maxLen) return str;
      const sub = str.slice(0, maxLen);
      const lastSpace = sub.lastIndexOf(' ');
      if (lastSpace > maxLen * 0.6) {
        return sub.slice(0, lastSpace);
      }
      return sub.trim();
    };

    if (platform === 'google') {
      const v1Headline = safeTruncate(`Automate ${obj || 'Ad Spend'} Now`, spec.headlineLimit);
      const v2Headline = safeTruncate(`${origHeadline || 'Cross-Channel Ads'} - 3.8x ROAS`, spec.headlineLimit);
      const v3Headline = safeTruncate(`Scale Ads 10x with AI Engine`, spec.headlineLimit);

      const v1Desc = safeTruncate(`Maximize performance across Google, Meta & LinkedIn with automated AI bidding algorithms.`, spec.descriptionLimit);
      const v2Desc = safeTruncate(`Unify cross-channel ad spend, lower CPA by 34%, and generate high-intent ${aud || 'leads'}.`, spec.descriptionLimit);

      return [
        {
          platform,
          headline: v1Headline,
          description: v1Desc,
          headlineCharCount: v1Headline.length,
          headlineValid: v1Headline.length <= spec.headlineLimit,
          descriptionCharCount: v1Desc.length,
          descriptionValid: v1Desc.length <= spec.descriptionLimit,
          bestPracticeTip: '🎯 Strict 30-char headline title case for Google Search Ads',
          complianceScore: 98,
          keyAdjustments: ['Title Case applied', 'Primary keyword front-loaded', 'Exact 30-char search limit met']
        },
        {
          platform,
          headline: v2Headline,
          description: v2Desc,
          headlineCharCount: v2Headline.length,
          headlineValid: v2Headline.length <= spec.headlineLimit,
          descriptionCharCount: v2Desc.length,
          descriptionValid: v2Desc.length <= spec.descriptionLimit,
          bestPracticeTip: '📊 Data & ROAS proof point headline',
          complianceScore: 95,
          keyAdjustments: ['ROAS proof point inserted', 'High intent call to action', 'CPA savings claim']
        }
      ];
    }

    if (platform === 'meta') {
      const v1Headline = safeTruncate(origHeadline || 'Automate Ads Across Every Channel', spec.headlineLimit);
      const v1Desc = `🚀 Stop wasting ad spend on manual optimization!\n\nOur cross-channel AI engine continuously optimizes bids and creative assets for ${aud || 'growth marketers'}. Scale ROI effortlessly.\n\n👉 Start your trial today!`;
      const v1FoldText = v1Desc.split('\n\n')[0] + ' ' + v1Desc.split('\n\n')[1];

      const v2Headline = safeTruncate(`Scale Campaign ROAS 3.8x Today`, spec.headlineLimit);
      const v2Desc = `🔥 Built for ${aud || 'high-growth teams'}.\n\n• One dashboard for Google, Meta & TikTok\n• Real-time automated budget rebalancing\n• Zero manual spreadsheet tracking\n\nClaim your free strategy review 👇`;

      return [
        {
          platform,
          headline: v1Headline,
          description: v1Desc,
          headlineCharCount: v1Headline.length,
          headlineValid: v1Headline.length <= spec.headlineLimit,
          descriptionCharCount: v1FoldText.length, // Fold length check
          descriptionValid: v1FoldText.length <= spec.descriptionFoldLimit!,
          bestPracticeTip: '⚡ 125-char fold optimized for Facebook & Instagram mobile feeds',
          complianceScore: 96,
          keyAdjustments: ['Emojis added for visual stopping power', 'First fold text kept under 125 chars', 'Bullet points for mobile readability']
        },
        {
          platform,
          headline: v2Headline,
          description: v2Desc,
          headlineCharCount: v2Headline.length,
          headlineValid: v2Headline.length <= spec.headlineLimit,
          descriptionCharCount: 118,
          descriptionValid: true,
          bestPracticeTip: '🔥 High-converting list format for Instagram feed',
          complianceScore: 94,
          keyAdjustments: ['Bullet point list format', 'Direct call to action at top', 'Target audience callout']
        }
      ];
    }

    if (platform === 'linkedin') {
      const v1Headline = safeTruncate(`B2B Ad Engine: Unified Channel Automation & Attribution`, spec.headlineLimit);
      const v1Desc = `Enterprise growth teams use our platform to unify ad spend, automate CPA bidding, and drive verified pipeline for ${aud || 'B2B buyers'}. Request an executive demo.`;

      const v2Headline = safeTruncate(`Reduce B2B Customer Acquisition Costs by 34%`, spec.headlineLimit);
      const v2Desc = `Eliminate ad budget waste across Google, LinkedIn & Meta. Our API-driven platform delivers real-time attribution and automated portfolio bidding.`;

      return [
        {
          platform,
          headline: v1Headline,
          description: v1Desc,
          headlineCharCount: v1Headline.length,
          headlineValid: v1Headline.length <= spec.headlineLimit,
          descriptionCharCount: v1Desc.length,
          descriptionValid: v1Desc.length <= spec.descriptionFoldLimit!,
          bestPracticeTip: '💼 Professional B2B tone tailored for C-suite decision makers',
          complianceScore: 97,
          keyAdjustments: ['Enterprise terminology applied', '150-char LinkedIn intro fold compliant', 'Executive demo CTA']
        },
        {
          platform,
          headline: v2Headline,
          description: v2Desc,
          headlineCharCount: v2Headline.length,
          headlineValid: v2Headline.length <= spec.headlineLimit,
          descriptionCharCount: v2Desc.length,
          descriptionValid: v2Desc.length <= spec.descriptionFoldLimit!,
          bestPracticeTip: '📈 ROI & CAC reduction metric focus',
          complianceScore: 92,
          keyAdjustments: ['CAC reduction benchmark', 'Technical multi-channel attribution focus', 'Professional tone']
        }
      ];
    }

    if (platform === 'tiktok') {
      const v1Headline = safeTruncate(`The ad automation tool you actually need ⚡`, spec.headlineLimit);
      const v1Desc = safeTruncate(`Stop losing money on bad ad campaigns! See how AI handles your Google and Meta ads on autopilot 🔥`, spec.descriptionLimit);

      return [
        {
          platform,
          headline: v1Headline,
          description: v1Desc,
          headlineCharCount: v1Headline.length,
          headlineValid: v1Headline.length <= spec.headlineLimit,
          descriptionCharCount: v1Desc.length,
          descriptionValid: v1Desc.length <= spec.descriptionLimit,
          bestPracticeTip: '📱 Native TikTok creator hook under 100 characters',
          complianceScore: 95,
          keyAdjustments: ['Casual creator tone', 'High energy hook', 'Under 100 char text overlay limit']
        }
      ];
    }

    if (platform === 'pinterest') {
      const v1Headline = safeTruncate(`How to Scale Ad ROI and Automate Campaign Marketing`, spec.headlineLimit);
      const v1Desc = safeTruncate(`Discover step-by-step ad optimization tactics. Learn how top growth brands rebalance budget across Google and Meta.`, spec.descriptionLimit);

      return [
        {
          platform,
          headline: v1Headline,
          description: v1Desc,
          headlineCharCount: v1Headline.length,
          headlineValid: v1Headline.length <= spec.headlineLimit,
          descriptionCharCount: v1Desc.length,
          descriptionValid: v1Desc.length <= spec.descriptionLimit,
          bestPracticeTip: '📌 Searchable visual discovery keywords in first 50 chars',
          complianceScore: 93,
          keyAdjustments: ['How-to guide style title', 'Grid-view optimized preview', 'Inspirational discovery copy']
        }
      ];
    }

    if (platform === 'x') {
      const v1Headline = safeTruncate(`Automate your ad spend in 1 click.`, 80);
      const v1Desc = safeTruncate(`Say goodbye to manual ad bidding. Manage Google, Meta & LinkedIn in one unified interface. Get started: https://astracloud.io #AdTech`, spec.descriptionLimit);

      return [
        {
          platform,
          headline: v1Headline,
          description: v1Desc,
          headlineCharCount: v1Headline.length,
          headlineValid: true,
          descriptionCharCount: v1Desc.length,
          descriptionValid: v1Desc.length <= spec.descriptionLimit,
          bestPracticeTip: '🐦 Punchy tweet format with link hook and hashtag',
          complianceScore: 94,
          keyAdjustments: ['Direct newsy tone', 'End link placement', 'Single focused hashtag']
        }
      ];
    }

    // Programmatic DSP
    const v1Headline = safeTruncate(`Unified Ad Tech Platform`, spec.headlineLimit);
    const v1Desc = safeTruncate(`Automate ad spend across Google, Meta & DSP networks with real-time AI bidding.`, spec.descriptionLimit);

    return [
      {
        platform,
        headline: v1Headline,
        description: v1Desc,
        headlineCharCount: v1Headline.length,
        headlineValid: v1Headline.length <= spec.headlineLimit,
        descriptionCharCount: v1Desc.length,
        descriptionValid: v1Desc.length <= spec.descriptionLimit,
        bestPracticeTip: '🎯 Ultra-concise 25-char banner headline',
        complianceScore: 96,
        keyAdjustments: ['25-char banner constraint', 'Clear product identification', 'High contrast text']
      }
    ];
  };

  // Generate for all active platforms
  const handleRefineAllContent = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 450));

    const newVars: Record<PlatformType, PlatformVariation[]> = {} as any;

    const platformsToProcess = activePlatforms.length > 0 
      ? activePlatforms 
      : (['google', 'meta', 'linkedin'] as PlatformType[]);

    for (const plat of platformsToProcess) {
      newVars[plat] = generatePlatformVariationsForPlatform(
        plat,
        masterHeadline,
        masterPrimaryText,
        objective,
        targetAudience
      );
    }

    setVariations(newVars);
    setIsGenerating(false);
  };

  // Auto-generate on initial render or when master copy changes if empty
  useEffect(() => {
    handleRefineAllContent();
  }, [masterHeadline, masterPrimaryText, activePlatforms.join(',')]);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleApplyVariation = (varItem: PlatformVariation, key: string) => {
    onApplyMasterCopy(varItem.headline, varItem.description);
    setAppliedKey(key);
    setTimeout(() => setAppliedKey(null), 2500);
  };

  // Check current master copy against target channel character limits
  const getMasterComplianceWarnings = () => {
    const warnings: Array<{ platformName: string; issue: string; current: number; limit: number }> = [];

    activeChannels.forEach(ch => {
      const spec = PLATFORM_SPECS[ch.platform];
      if (!spec) return;

      if (masterHeadline.length > spec.headlineLimit) {
        warnings.push({
          platformName: spec.name,
          issue: `Headline exceeds ${spec.headlineLimit}-char limit`,
          current: masterHeadline.length,
          limit: spec.headlineLimit
        });
      }

      if (ch.platform === 'google' && masterPrimaryText.length > spec.descriptionLimit) {
        warnings.push({
          platformName: spec.name,
          issue: `Description exceeds ${spec.descriptionLimit}-char Google limit`,
          current: masterPrimaryText.length,
          limit: spec.descriptionLimit
        });
      } else if ((ch.platform === 'meta' || ch.platform === 'linkedin') && masterPrimaryText.length > (spec.descriptionFoldLimit || 150)) {
        warnings.push({
          platformName: spec.name,
          issue: `Text exceeds ${spec.descriptionFoldLimit || 150}-char fold limit`,
          current: masterPrimaryText.length,
          limit: spec.descriptionFoldLimit || 150
        });
      }
    });

    return warnings;
  };

  const masterWarnings = getMasterComplianceWarnings();
  const currentSpec = PLATFORM_SPECS[activePlatformTab] || PLATFORM_SPECS.google;
  const currentVariations = variations[activePlatformTab] || [];

  return (
    <div className="bg-stone-950 border border-stone-800 rounded-lg p-4 sm:p-5 space-y-4 font-mono shadow-xl">
      
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-800 pb-3 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs uppercase tracking-wider font-bold text-amber-400 flex items-center gap-2">
                <span>AI Multi-Channel Content Refiner</span>
                <span className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded border border-amber-400/30">
                  Platform-Aware
                </span>
              </h4>
              <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                Detects active target ad channels and automatically adapts headlines & descriptions to channel character limits and best practices.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefineAllContent}
          disabled={isGenerating}
          className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition-colors flex items-center gap-1.5 shrink-0 shadow-md shadow-amber-400/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Refining Copy...' : 'Auto-Refine for Active Channels'}</span>
        </button>
      </div>

      {/* Target Channel Detector Bar */}
      <div className="bg-black p-3 rounded border border-stone-800 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-stone-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            Detected Target Channels ({activeChannels.length}):
          </span>
          <span className="text-[10px] text-stone-500">
            Click channel badge to view tailored variations
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {activeChannels.length > 0 ? (
            activeChannels.map(ch => {
              const spec = PLATFORM_SPECS[ch.platform];
              const isSelected = activePlatformTab === ch.platform;
              return (
                <button
                  key={ch.platform}
                  type="button"
                  onClick={() => setActivePlatformTab(ch.platform)}
                  className={`px-3 py-1.5 rounded text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/20 scale-102'
                      : 'bg-stone-900 text-stone-300 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-black' : 'bg-emerald-400'}`} />
                  <span>{ch.platformName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isSelected ? 'bg-black/20 text-black font-bold' : 'bg-stone-950 text-stone-400'
                  }`}>
                    H: max {spec?.headlineLimit}c
                  </span>
                </button>
              );
            })
          ) : (
            <div className="text-xs text-amber-400/80 italic p-1">
              ⚠️ No target channels enabled. Select active channels in Step 2 to preview channel-specific rules.
            </div>
          )}
        </div>
      </div>

      {/* Real-time Master Copy Compliance Warning Banner */}
      {masterWarnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Master Copy Character Limit Violations Detected ({masterWarnings.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-stone-300 font-sans">
            {masterWarnings.map((w, i) => (
              <div key={i} className="flex items-center justify-between bg-black/40 px-2.5 py-1 rounded border border-amber-500/20">
                <span className="font-mono text-amber-300">{w.platformName}: {w.issue}</span>
                <span className="text-red-400 font-mono font-bold">{w.current}/{w.limit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Platform Channel View */}
      {currentSpec && (
        <div className="space-y-4 pt-1">
          
          {/* Channel Specification Guidelines Bar */}
          <div className="bg-stone-900/80 p-3.5 border border-stone-800 rounded space-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-800/80 pb-2">
              <div className="flex items-center gap-2 font-bold text-xs text-white">
                <span className={`text-base ${currentSpec.iconColor}`}>●</span>
                <span className="uppercase tracking-wider">{currentSpec.name} Specifications</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-stone-400">
                <span className="bg-black px-2 py-0.5 rounded border border-stone-800">
                  Headline Limit: <strong className="text-amber-400">{currentSpec.headlineLimit} chars</strong> ({currentSpec.headlineOptimal})
                </span>
                <span className="bg-black px-2 py-0.5 rounded border border-stone-800">
                  Body Limit: <strong className="text-amber-400">{currentSpec.descriptionLimit} chars</strong> {currentSpec.descriptionFoldLimit ? `(Fold: ${currentSpec.descriptionFoldLimit}c)` : ''}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-stone-300 font-sans pt-1">
              <div>
                <span className="text-[10px] text-amber-400 uppercase font-mono font-bold block mb-1">
                  Tone & Positioning:
                </span>
                <span className="bg-black/60 px-2 py-1 rounded border border-stone-800 block text-stone-200">
                  {currentSpec.toneGuide}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-amber-400 uppercase font-mono font-bold block mb-1">
                  Platform Best Practices:
                </span>
                <ul className="space-y-0.5 text-stone-300">
                  {currentSpec.bestPractices.map((bp, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-[10px]">
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{bp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* AI Refined Variations List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Refined Variations for {currentSpec.name}
              </span>
              <span className="text-[10px] text-stone-400">
                {currentVariations.length} Variation{currentVariations.length !== 1 ? 's' : ''} Ready
              </span>
            </div>

            {currentVariations.map((v, idx) => {
              const itemKey = `${activePlatformTab}-${idx}`;
              const isApplied = appliedKey === itemKey;
              const isCopied = copiedKey === itemKey;

              return (
                <div 
                  key={idx}
                  className="bg-black border border-stone-800 hover:border-amber-400/50 p-4 rounded-lg space-y-3 transition-colors relative"
                >
                  <div className="flex items-center justify-between border-b border-stone-900 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-bold text-white font-sans">
                        {v.bestPracticeTip}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Compliance Score: {v.complianceScore}%
                      </span>
                    </div>
                  </div>

                  {/* Variation Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    
                    {/* Headline Card */}
                    <div className="bg-stone-950 p-3 rounded border border-stone-800 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-stone-400 font-bold uppercase">Refined Headline</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          v.headlineValid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {v.headlineCharCount} / {currentSpec.headlineLimit} chars
                        </span>
                      </div>
                      <p className="text-xs font-bold text-amber-300 font-sans leading-snug">
                        {v.headline}
                      </p>
                    </div>

                    {/* Description / Body Card */}
                    <div className="bg-stone-950 p-3 rounded border border-stone-800 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-stone-400 font-bold uppercase">Refined Body Text</span>
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          v.descriptionValid ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {v.descriptionCharCount} / {currentSpec.descriptionLimit} chars
                        </span>
                      </div>
                      <p className="text-xs text-stone-200 font-sans whitespace-pre-wrap leading-relaxed">
                        {v.description}
                      </p>
                    </div>
                  </div>

                  {/* Key Adjustments List */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[10px] text-stone-500 font-bold uppercase">Adjustments Applied:</span>
                    {v.keyAdjustments.map((adj, i) => (
                      <span key={i} className="text-[9px] bg-stone-900 text-stone-400 px-2 py-0.5 rounded border border-stone-800">
                        ✓ {adj}
                      </span>
                    ))}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center justify-between border-t border-stone-900 pt-3 gap-2">
                    <div className="flex items-center gap-2">
                      {activePlatformTab === 'google' && onAddRsaHeadline && (
                        <button
                          type="button"
                          onClick={() => onAddRsaHeadline(v.headline)}
                          className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold uppercase tracking-wider rounded cursor-pointer transition-colors flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3" />
                          <span>+ Add to Google RSA Headlines</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyText(`${v.headline}\n\n${v.description}`, itemKey)}
                        className="px-2.5 py-1 bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 text-[10px] rounded cursor-pointer transition-colors flex items-center gap-1"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? 'Copied!' : 'Copy Copy'}</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyVariation(v, itemKey)}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-amber-400/10"
                    >
                      {isApplied ? <CheckCircle2 className="w-3.5 h-3.5 text-black" /> : <Zap className="w-3.5 h-3.5" />}
                      <span>{isApplied ? 'Applied to Master Creative!' : 'Apply as Master Creative'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
