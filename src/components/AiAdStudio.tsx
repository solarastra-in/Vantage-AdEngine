import React, { useState } from 'react';
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Zap, 
  Target, 
  Lightbulb, 
  TrendingUp, 
  Layers, 
  ArrowRight,
  Bot
} from 'lucide-react';
import { AiOptimizationResult } from '../types';

interface AiAdStudioProps {
  onOpenWizardWithAiData: (aiData: any) => void;
}

export const AiAdStudio: React.FC<AiAdStudioProps> = ({ onOpenWizardWithAiData }) => {
  const [prompt, setPrompt] = useState('Enterprise Cloud Management Platform launching in Q1 targeting CTOs');
  const [objective, setObjective] = useState('Lead Generation');
  const [targetAudience, setTargetAudience] = useState('CTOs, VPs of Infrastructure, DevOps Leads');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiOptimizationResult | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: prompt,
          objective,
          targetAudience,
          currentHeadline: 'Automate your cloud ad operations',
          currentBody: 'Manage multi-platform digital advertising with automated budget balancing and real-time ROAS tracking.',
        }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 bg-[#0a0a0a] text-stone-200">
      
      {/* Header */}
      <div className="pb-6 border-b border-stone-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold uppercase tracking-widest rounded-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini 3.6 Flash Intelligence</span>
          </div>
          <h1 className="text-2xl font-serif italic text-white tracking-tight">
            AI Ad Creative & Media Planner
          </h1>
          <p className="text-stone-400 text-xs sm:text-sm font-mono mt-1">
            Generate high-CTR copy, target persona matrices, and budget allocations using server-side Gemini AI.
          </p>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleGenerate} className="bg-[#0d0d0d] border border-stone-800 p-6 rounded-sm shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
              Product / Campaign Topic
            </label>
            <input
              type="text"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. AI-Powered CRM software for enterprise sales teams"
              required
              className="w-full bg-stone-900 border border-stone-800 focus:border-amber-400 px-3.5 py-2.5 text-sm text-white outline-none rounded-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
              Campaign Objective
            </label>
            <select
              value={objective}
              onChange={e => setObjective(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 focus:border-amber-400 px-3.5 py-2.5 text-sm text-white outline-none rounded-xs"
            >
              <option value="Lead Generation">Lead Generation</option>
              <option value="Brand Awareness">Brand Awareness</option>
              <option value="E-commerce Conversions">E-commerce Conversions</option>
              <option value="App Installs">App Installs</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
            Core Target Persona / Audience
          </label>
          <input
            type="text"
            value={targetAudience}
            onChange={e => setTargetAudience(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 focus:border-amber-400 px-3.5 py-2.5 text-sm text-white outline-none rounded-xs"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2.5 text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors flex items-center gap-2 shadow-lg shadow-amber-400/10 rounded-sm"
        >
          {isLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Ad Strategy with Gemini AI...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-black" />
              <span>Generate Ad Copy & Media Allocation</span>
            </>
          )}
        </button>
      </form>

      {/* Results Section */}
      {result && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-amber-400">
              AI Generated Ad Blueprint
            </h2>
            <button
              onClick={() => onOpenWizardWithAiData({
                name: prompt,
                objective,
                targetAudience: result.suggestedTargeting,
                headline: result.improvedHeadlines[0],
                primaryText: result.improvedPrimaryText[0],
              })}
              className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 text-xs font-bold uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-2 rounded-xs shadow-md"
            >
              <span>Load Into Campaign Wizard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Diagnostic Forecast Banner */}
          <div className="bg-[#111111] border border-amber-400/40 p-5 rounded-sm shadow-xl space-y-1">
            <div className="text-amber-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Bot className="w-4 h-4" />
              <span>AI Media Strategy Diagnosis</span>
            </div>
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed">
              {result.diagnosticReport}
            </p>
          </div>

          {/* Headlines & Copy Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Headlines */}
            <div className="bg-[#0d0d0d] border border-stone-800 p-6 rounded-sm space-y-4">
              <h3 className="text-xs uppercase tracking-wider text-stone-300 font-bold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Recommended Ad Headlines</span>
              </h3>
              <div className="space-y-3">
                {result.improvedHeadlines.map((hl, i) => (
                  <div
                    key={i}
                    className="p-3 bg-stone-900 border border-stone-800 rounded-xs flex items-center justify-between gap-3 text-xs text-white"
                  >
                    <span>{hl}</span>
                    <button
                      onClick={() => handleCopy(hl, `hl-${i}`)}
                      className="p-1.5 text-stone-400 hover:text-amber-400 cursor-pointer shrink-0"
                    >
                      {copiedIndex === `hl-${i}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Body Copy */}
            <div className="bg-[#0d0d0d] border border-stone-800 p-6 rounded-sm space-y-4">
              <h3 className="text-xs uppercase tracking-wider text-stone-300 font-bold flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>Primary Ad Body Variations</span>
              </h3>
              <div className="space-y-3">
                {result.improvedPrimaryText.map((txt, i) => (
                  <div
                    key={i}
                    className="p-3 bg-stone-900 border border-stone-800 rounded-xs flex items-start justify-between gap-3 text-xs text-stone-300 leading-relaxed"
                  >
                    <span>{txt}</span>
                    <button
                      onClick={() => handleCopy(txt, `txt-${i}`)}
                      className="p-1.5 text-stone-400 hover:text-amber-400 cursor-pointer shrink-0"
                    >
                      {copiedIndex === `txt-${i}` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Budget Re-allocation Advice */}
          <div className="bg-[#0d0d0d] border border-stone-800 p-6 rounded-sm space-y-4">
            <h3 className="text-xs uppercase tracking-wider text-stone-300 font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Cross-Platform Recommended Budget Distribution</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {result.recommendedBudgetDistribution.map((item, i) => (
                <div key={i} className="bg-stone-900 p-4 border border-stone-800 rounded-xs space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>{item.platform}</span>
                    <span className="text-amber-400 font-mono">{item.percent}%</span>
                  </div>
                  <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400" style={{ width: `${item.percent}%` }} />
                  </div>
                  <p className="text-[11px] text-stone-400 leading-normal font-mono">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
