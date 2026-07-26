import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  ShieldCheck, 
  Zap, 
  Globe2, 
  BarChart3, 
  Layers, 
  Send, 
  Lock, 
  ChevronRight, 
  Star, 
  Check, 
  X,
  Bot,
  Terminal,
  Cpu,
  Layers2
} from 'lucide-react';
import { submitContactLeadToFirestore } from '../lib/firestoreService';
import { signInWithGoogle } from '../lib/firebase';

interface LandingPageProps {
  onNavigateToPortal: () => void;
  onSelectPlanAndOnboard?: (planName: 'Starter' | 'Growth' | 'Enterprise') => void;
  onLoginSuperAdminDemo?: () => void;
  onLoginTenantAdminDemo?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToPortal,
  onSelectPlanAndOnboard,
  onLoginSuperAdminDemo,
  onLoginTenantAdminDemo,
}) => {
  // Contact Form State
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [monthlyAdSpend, setMonthlyAdSpend] = useState('$50,000 - $100,000');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedPlanModal, setSelectedPlanModal] = useState<'Starter' | 'Growth' | 'Enterprise' | null>(null);

  // Calculator State
  const [monthlyBudgetCalc, setMonthlyBudgetCalc] = useState<number>(50000);
  const estimatedRoas = 4.2;
  const estimatedConversions = Math.round((monthlyBudgetCalc * estimatedRoas) / 45);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !workEmail || !companyName) return;

    setIsSubmitting(true);
    try {
      await submitContactLeadToFirestore({
        fullName,
        workEmail,
        companyName,
        monthlyAdSpend,
        message,
      });
      setSubmitSuccess(true);
      setFullName('');
      setWorkEmail('');
      setCompanyName('');
      setMessage('');
    } catch (err) {
      console.error('Lead submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle();
      onNavigateToPortal();
    } catch (err) {
      console.error('Google Sign in:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-stone-100 font-sans selection:bg-amber-400 selection:text-black">
      {/* Top Announcement Bar */}
      <div className="bg-amber-400/10 border-b border-amber-400/20 px-4 py-2 text-center text-xs text-amber-300 font-mono flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span>Vantage AdEngine v4.2 Release: Single-Click Cross-Platform API Dispatch now live across 7 Channels</span>
        <button 
          onClick={onNavigateToPortal} 
          className="underline hover:text-amber-200 cursor-pointer font-bold ml-2"
        >
          Launch Enterprise Portal &rarr;
        </button>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070707]/90 border-b border-stone-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-stone-900 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-400/10">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-white uppercase tracking-[0.25em] text-sm font-extrabold block">Vantage</span>
              <span className="text-[10px] text-amber-400/80 font-mono tracking-widest block uppercase">Omnichannel AdEngine</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-medium uppercase tracking-wider text-stone-400">
            <a href="#features" className="hover:text-amber-400 transition-colors">Platform</a>
            <a href="#channels" className="hover:text-amber-400 transition-colors">Channel APIs</a>
            <a href="#calculator" className="hover:text-amber-400 transition-colors">ROI Calculator</a>
            <a href="#pricing" className="hover:text-amber-400 transition-colors">Pricing</a>
            <a href="#contact" className="hover:text-amber-400 transition-colors">Contact</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAuthModal(true)}
              className="text-xs font-bold uppercase tracking-wider text-stone-300 hover:text-white px-3 py-2 cursor-pointer transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={onNavigateToPortal}
              className="bg-amber-400 text-black px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest hover:bg-amber-300 transition-colors cursor-pointer rounded-sm flex items-center gap-2 shadow-lg shadow-amber-400/10"
            >
              <span>Launch App</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden border-b border-stone-800/80 bg-gradient-to-b from-[#0a0a0a] via-[#070707] to-[#070707]">
        {/* Glow ambient background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900 border border-stone-800 text-stone-300 text-xs font-mono mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SaaS Multi-Tenant Enterprise Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif text-white tracking-tight leading-[1.1] max-w-5xl mx-auto italic font-normal">
            The Enterprise <span className="not-italic font-sans font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">Omnichannel Ad Engine</span> for Scaleups & Agencies
          </h1>

          <p className="mt-6 text-base sm:text-xl text-stone-400 max-w-3xl mx-auto font-light leading-relaxed">
            Manage, publish, and optimize digital ad campaigns across Meta, Google, LinkedIn, TikTok, Pinterest, X, and Programmatic DSP from a single unified workspace. Powered by Gemini AI & real-time automated budget dispatch.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => {
                setSelectedPlanModal('Growth');
                setShowAuthModal(true);
              }}
              className="w-full sm:w-auto bg-amber-400 text-black px-8 py-4 text-xs font-extrabold uppercase tracking-widest hover:bg-amber-300 transition-colors cursor-pointer rounded-sm flex items-center justify-center gap-3 shadow-xl shadow-amber-400/15"
            >
              <span>Start 14-Day Free Trial</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            <button
              onClick={onNavigateToPortal}
              className="w-full sm:w-auto bg-stone-900 border border-stone-700 text-stone-200 px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-stone-800 transition-colors cursor-pointer rounded-sm flex items-center justify-center gap-2"
            >
              <Terminal className="w-4 h-4 text-amber-400" />
              <span>Explore Live Demo Workspace</span>
            </button>
          </div>

          {/* Quick Demo Login Shortcut */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-stone-400">
            <span>Instant Demo Logins:</span>
            {onLoginSuperAdminDemo && (
              <button
                onClick={onLoginSuperAdminDemo}
                className="px-3 py-1 bg-stone-900 border border-amber-400/30 text-amber-400 hover:bg-stone-800 rounded cursor-pointer"
              >
                [SaaS Super Admin]
              </button>
            )}
            {onLoginTenantAdminDemo && (
              <button
                onClick={onLoginTenantAdminDemo}
                className="px-3 py-1 bg-stone-900 border border-stone-700 text-stone-300 hover:bg-stone-800 rounded cursor-pointer"
              >
                [Astra Cloud Tenant Admin]
              </button>
            )}
          </div>

          {/* Supported Channel Badges */}
          <div className="mt-16 pt-10 border-t border-stone-900 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 items-center opacity-85">
            {[
              { name: 'Meta Ads', badge: 'v19.0 API', color: 'border-blue-500/30 text-blue-400' },
              { name: 'Google Ads', badge: 'v16 Ads API', color: 'border-emerald-500/30 text-emerald-400' },
              { name: 'LinkedIn Ads', badge: 'REST API', color: 'border-sky-500/30 text-sky-400' },
              { name: 'TikTok Ads', badge: 'Open API 1.3', color: 'border-pink-500/30 text-pink-400' },
              { name: 'Pinterest Ads', badge: 'v5 API', color: 'border-red-500/30 text-red-400' },
              { name: 'X (Twitter) Ads', badge: 'v11 API', color: 'border-stone-400/30 text-stone-300' },
              { name: 'Programmatic DSP', badge: 'OpenRTB 3.0', color: 'border-amber-500/30 text-amber-400' },
            ].map((ch, idx) => (
              <div key={idx} className={`p-3 rounded bg-stone-950/80 border ${ch.color} flex flex-col items-center justify-center`}>
                <span className="text-xs font-bold text-white tracking-wide">{ch.name}</span>
                <span className="text-[10px] font-mono mt-1 opacity-75">{ch.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Features Grid */}
      <section id="features" className="py-24 border-b border-stone-800/80 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block mb-2">Built For Modern Growth Ops</span>
            <h2 className="text-3xl sm:text-5xl font-serif italic text-white tracking-tight">
              Architected as an End-to-End <span className="not-italic font-sans font-extrabold text-stone-100">Multi-Tenant SaaS Portal</span>
            </h2>
            <p className="mt-4 text-stone-400 text-sm sm:text-base font-light">
              Provide your team and corporate sub-tenants with segregated ad workspaces, automated financial invoicing, and Gemini-driven multi-channel creative generation.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-sm bg-stone-900/60 border border-stone-800 hover:border-amber-400/40 transition-all group">
              <div className="w-12 h-12 rounded bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide uppercase">Multi-Tenant Workspaces</h3>
              <p className="mt-3 text-stone-400 text-xs sm:text-sm leading-relaxed font-light">
                Manage separate customer companies, assign user roles (Super Admin, Tenant Admin, Campaign Manager), and isolate campaigns and API credentials securely in Firebase Firestore.
              </p>
            </div>

            <div className="p-8 rounded-sm bg-stone-900/60 border border-stone-800 hover:border-amber-400/40 transition-all group">
              <div className="w-12 h-12 rounded bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide uppercase">AI Multi-Channel Creative Studio</h3>
              <p className="mt-3 text-stone-400 text-xs sm:text-sm leading-relaxed font-light">
                Generate tailored ad headlines, body copy, and hashtags respecting exact character limits for Meta, Google, LinkedIn, TikTok, and Pinterest using server-side Gemini 3.6 API.
              </p>
            </div>

            <div className="p-8 rounded-sm bg-stone-900/60 border border-stone-800 hover:border-amber-400/40 transition-all group">
              <div className="w-12 h-12 rounded bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-wide uppercase">Financial Ledger & Invoices</h3>
              <p className="mt-3 text-stone-400 text-xs sm:text-sm leading-relaxed font-light">
                Automated 10% platform fee calculation, real-time media spend tracking, corporate credit card / crypto invoice settlement, and printable billing statements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Channel API Capabilities Matrix */}
      <section id="channels" className="py-24 border-b border-stone-800/80 bg-[#070707]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block mb-2">Deep Platform Integrations</span>
              <h2 className="text-3xl sm:text-4xl font-serif italic text-white">
                Comprehensive <span className="not-italic font-sans font-extrabold">API Nexus Specifications</span>
              </h2>
            </div>
            <p className="text-stone-400 text-xs sm:text-sm max-w-md mt-4 md:mt-0 font-light">
              Direct REST and Graph API integration with native OAuth token refreshing, webhooks, and endpoint latency monitoring.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Meta Marketing API v19.0',
                platform: 'Meta Suite (FB / IG)',
                specs: ['Ad Set Optimization Goals (LINK_CLICKS, CONVERSIONS)', 'Meta Pixel & Conversions API (CAPI) Integration', 'Reels & Stories Dynamic Creative Asset Mapping', 'Custom Audience & Lookalike 1% Sync'],
                latency: '124ms',
                badge: 'FB & Instagram',
              },
              {
                title: 'Google Ads API v16',
                platform: 'Google & YouTube',
                specs: ['Performance Max (PMax) Asset Groups', 'Search Keyword Match Types (EXACT, PHRASE, BROAD)', 'Target CPA / Target ROAS Smart Bidding', 'YouTube Bumper & In-Stream Video Placements'],
                latency: '98ms',
                badge: 'Search & PMax',
              },
              {
                title: 'LinkedIn Marketing Solutions',
                platform: 'LinkedIn Ads',
                specs: ['Lead Generation Form Auto-Sync to CRM', 'Account-Based Marketing (ABM) Company List Matching', 'Job Title & Seniority Professional Demographics', 'Sponsored InMail & Single Image Sponsored Content'],
                latency: '185ms',
                badge: 'B2B Professional',
              },
              {
                title: 'TikTok Business Open API v1.3',
                platform: 'TikTok Ads',
                specs: ['Spark Ads Creator Content Auth Code Binding', 'Interactive Add-On Cards & Voting Stickers', '#Hashtag Interest & Community Behavioral Targeting', 'TikTok Pixel Custom Event Telemetry'],
                latency: '142ms',
                badge: 'TikTok Spark',
              },
              {
                title: 'Pinterest Ads API v5',
                platform: 'Pinterest Ads',
                specs: ['Shopping Pin Catalog Product Feeds', 'Idea Pins & Multi-Image Carousel Boards', 'ActLike Lookalike Audience Expansion', 'Keyword Search Intent & Category Targeting'],
                latency: '110ms',
                badge: 'Visual Search',
              },
              {
                title: 'X (Twitter) Ads API v11',
                platform: 'X Ads',
                specs: ['Promoted Website Cards & App Cards', 'Conversation ID & Specific Follower Handles Targeting', 'Line Item Bid Strategy Adjustments', 'Real-time Engagement Tracking'],
                latency: '160ms',
                badge: 'Real-Time Feed',
              },
            ].map((channel, i) => (
              <div key={i} className="p-6 rounded bg-stone-900/40 border border-stone-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-amber-400 font-bold px-2.5 py-1 bg-amber-400/10 rounded border border-amber-400/20">{channel.badge}</span>
                    <span className="text-[10px] font-mono text-stone-500">Latency: {channel.latency}</span>
                  </div>
                  <h3 className="text-base font-bold text-white tracking-wide">{channel.title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {channel.specs.map((spec, sIdx) => (
                      <li key={sIdx} className="flex items-start gap-2 text-xs text-stone-300 font-light">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive ROI & Budget Calculator */}
      <section id="calculator" className="py-20 border-b border-stone-800/80 bg-[#090909]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded border border-amber-400/30 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-amber-400/10 pointer-events-none">
              <BarChart3 className="w-48 h-48" />
            </div>

            <div className="relative z-10">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block mb-2">Interactive Media Estimator</span>
              <h2 className="text-2xl sm:text-4xl font-serif italic text-white">
                Project Your Omnichannel Performance
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-stone-400 font-light">
                Adjust your intended monthly media budget across all 7 channels to preview projected conversions and return on ad spend (ROAS).
              </p>

              <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-6">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-2">
                      <span className="text-stone-400">Monthly Ad Budget Allocation:</span>
                      <span className="text-amber-400 font-bold">${monthlyBudgetCalc.toLocaleString()} / mo</span>
                    </div>
                    <input 
                      type="range" 
                      min="10000" 
                      max="500000" 
                      step="5000"
                      value={monthlyBudgetCalc}
                      onChange={(e) => setMonthlyBudgetCalc(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer h-2 bg-stone-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-stone-500 font-mono mt-1">
                      <span>$10,000</span>
                      <span>$250,000</span>
                      <span>$500,000</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-stone-900/80 border border-stone-800 rounded">
                      <span className="text-[10px] uppercase text-stone-500 font-mono block">Estimated ROAS</span>
                      <span className="text-lg font-serif text-amber-400 italic font-bold">{estimatedRoas}x</span>
                    </div>
                    <div className="p-3 bg-stone-900/80 border border-stone-800 rounded">
                      <span className="text-[10px] uppercase text-stone-500 font-mono block">Projected Revenue</span>
                      <span className="text-lg font-serif text-emerald-400 italic font-bold">
                        ${(monthlyBudgetCalc * estimatedRoas).toLocaleString()}
                      </span>
                    </div>
                    <div className="p-3 bg-stone-900/80 border border-stone-800 rounded">
                      <span className="text-[10px] uppercase text-stone-500 font-mono block">Est. Conversions</span>
                      <span className="text-lg font-serif text-white italic font-bold">
                        {estimatedConversions.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 bg-stone-900/90 border border-stone-800 rounded flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs uppercase font-bold text-white tracking-widest font-mono">Platform Fee Included</h4>
                    <p className="text-xs text-stone-400 mt-2 font-light">
                      Vantage AdEngine applies a flat 10% platform management fee on total media spend with zero hidden markups.
                    </p>
                    <div className="mt-4 pt-4 border-t border-stone-800 flex justify-between items-center text-xs">
                      <span className="text-stone-400">Monthly Vantage Fee:</span>
                      <span className="font-mono text-amber-400 font-bold">${(monthlyBudgetCalc * 0.1).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={onNavigateToPortal}
                    className="mt-6 w-full bg-amber-400 text-black py-3 text-xs font-bold uppercase tracking-widest hover:bg-amber-300 transition-colors cursor-pointer rounded-sm flex items-center justify-center gap-2"
                  >
                    <span>Launch Campaign Strategy</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Tiers Section */}
      <section id="pricing" className="py-24 border-b border-stone-800/80 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block mb-2">Flexible SaaS Tiering</span>
            <h2 className="text-3xl sm:text-5xl font-serif italic text-white">
              Transparent Plans for Every Scale
            </h2>
            <p className="mt-3 text-stone-400 text-sm font-light">
              Choose the right workspace capacity for your in-house brand or marketing agency.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="p-8 rounded bg-stone-900/50 border border-stone-800 flex flex-col justify-between relative">
              <div>
                <span className="text-xs font-mono uppercase text-stone-400 font-bold block">Starter</span>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-serif italic text-white">$299</span>
                  <span className="text-xs font-mono text-stone-500 ml-2">/ month</span>
                </div>
                <p className="mt-2 text-xs text-stone-400 font-light">Ideal for early-stage startups running up to $30k/mo ad budget.</p>

                <ul className="mt-8 space-y-3">
                  {[
                    'Up to $30,000 / mo managed ad budget',
                    '3 Team Member Seats',
                    '4 Connected Channels (Meta, Google, X, LinkedIn)',
                    'Gemini AI Creative Generator',
                    'Standard Invoicing & Reports',
                  ].map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2.5 text-xs text-stone-300">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => {
                  setSelectedPlanModal('Starter');
                  setShowAuthModal(true);
                }}
                className="mt-8 w-full bg-stone-800 hover:bg-stone-700 text-white py-3 text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors rounded-sm"
              >
                Select Starter
              </button>
            </div>

            {/* Growth Plan (Popular) */}
            <div className="p-8 rounded bg-stone-900 border-2 border-amber-400 flex flex-col justify-between relative shadow-xl shadow-amber-400/5">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-black px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest rounded-full font-mono">
                Most Popular for Agencies
              </div>

              <div>
                <span className="text-xs font-mono uppercase text-amber-400 font-bold block">Growth Scale</span>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-serif italic text-white">$999</span>
                  <span className="text-xs font-mono text-stone-500 ml-2">/ month</span>
                </div>
                <p className="mt-2 text-xs text-stone-400 font-light">Designed for fast-growing agencies managing up to $150k/mo budget.</p>

                <ul className="mt-8 space-y-3">
                  {[
                    'Up to $150,000 / mo managed ad budget',
                    '12 Team Member Seats',
                    'All 7 Connected Channels including TikTok & DSP',
                    'Single-Click Cross-Platform API Dispatch',
                    'Automated Multi-Tenant Customer Billing',
                    'Priority Gemini 3.6 Flash Creative Studio',
                  ].map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2.5 text-xs text-stone-200 font-medium">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => {
                  setSelectedPlanModal('Growth');
                  setShowAuthModal(true);
                }}
                className="mt-8 w-full bg-amber-400 hover:bg-amber-300 text-black py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer transition-colors rounded-sm shadow-md"
              >
                Select Growth
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="p-8 rounded bg-stone-900/50 border border-stone-800 flex flex-col justify-between relative">
              <div>
                <span className="text-xs font-mono uppercase text-stone-400 font-bold block">Enterprise</span>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-serif italic text-white">$2,499</span>
                  <span className="text-xs font-mono text-stone-500 ml-2">/ month</span>
                </div>
                <p className="mt-2 text-xs text-stone-400 font-light">Unlimited capacity for enterprise brand portfolios & global DSP networks.</p>

                <ul className="mt-8 space-y-3">
                  {[
                    'Unlimited Managed Ad Budget',
                    'Unlimited Seats & Custom User Roles',
                    'All Channels + OpenRTB DSP Direct SSP Access',
                    'Custom Dedicated API Gateway Endpoints',
                    'Dedicated Account Manager & SLA Guarantee',
                    'Custom Webhook & Data Warehouse Exports',
                  ].map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-center gap-2.5 text-xs text-stone-300">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => {
                  setSelectedPlanModal('Enterprise');
                  setShowAuthModal(true);
                }}
                className="mt-8 w-full bg-stone-800 hover:bg-stone-700 text-white py-3 text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors rounded-sm"
              >
                Select Enterprise
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section className="py-20 border-b border-stone-800/80 bg-[#070707]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block mb-2">Trusted By Industry Leaders</span>
            <h2 className="text-2xl sm:text-3xl font-serif italic text-white">What Growth Executives Say</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: "Vantage AdEngine cut our cross-platform campaign launch cycle from 4 days down to 8 minutes. The single-click API dispatch to Meta, Google, and LinkedIn is remarkable.",
                author: "Sarah Jenkins",
                title: "VP Growth & Media",
                company: "Astra Cloud Systems",
              },
              {
                quote: "Being able to onboard client companies as distinct tenant workspaces with automated platform fee invoicing has transformed our agency's financial transparency.",
                author: "David Chen",
                title: "Chief Marketing Officer",
                company: "Acme Growth Labs",
              },
              {
                quote: "The Gemini AI Creative Studio generates channel-tailored copy that strictly complies with character limits across TikTok, Pinterest, and Google. Massive time saver.",
                author: "Amara Patel",
                title: "Head of Performance Ads",
                company: "Quantum Tech Mobility",
              },
            ].map((t, idx) => (
              <div key={idx} className="p-6 rounded bg-stone-900/40 border border-stone-800 flex flex-col justify-between">
                <div>
                  <div className="flex gap-1 text-amber-400 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-stone-300 italic font-serif leading-relaxed">
                    "{t.quote}"
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-stone-800/80">
                  <div className="text-xs font-bold text-white">{t.author}</div>
                  <div className="text-[10px] text-stone-500 font-mono mt-0.5">{t.title} &bull; {t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Contact & Lead Intake Form */}
      <section id="contact" className="py-24 bg-[#080808]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-stone-900/60 border border-stone-800 rounded p-8 sm:p-12">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold block mb-2">Get In Touch</span>
              <h2 className="text-2xl sm:text-4xl font-serif italic text-white">Schedule an Enterprise Demo</h2>
              <p className="mt-2 text-xs sm:text-sm text-stone-400 font-light">
                Our growth engineering team will set up your multi-tenant workspace and configure custom API keys.
              </p>
            </div>

            {submitSuccess ? (
              <div className="p-8 rounded bg-emerald-950/40 border border-emerald-500/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Inquiry Received!</h3>
                <p className="text-xs text-stone-300 font-light">
                  Thank you! Our enterprise onboarding specialist will reach out within 2 business hours.
                </p>
                <button
                  onClick={() => setSubmitSuccess(false)}
                  className="mt-4 text-xs font-bold font-mono text-amber-400 hover:underline cursor-pointer"
                >
                  Submit Another Inquiry &rarr;
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Full Name *</label>
                    <input 
                      type="text" 
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full bg-stone-950 border border-stone-800 rounded px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Work Email *</label>
                    <input 
                      type="email" 
                      required
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full bg-stone-950 border border-stone-800 rounded px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Company Name *</label>
                    <input 
                      type="text" 
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Media Inc."
                      className="w-full bg-stone-950 border border-stone-800 rounded px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Est. Monthly Ad Budget</label>
                    <select
                      value={monthlyAdSpend}
                      onChange={(e) => setMonthlyAdSpend(e.target.value)}
                      className="w-full bg-stone-950 border border-stone-800 rounded px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="Under $25,000">Under $25,000 / mo</option>
                      <option value="$25,000 - $50,000">$25,000 - $50,000 / mo</option>
                      <option value="$50,000 - $100,000">$50,000 - $100,000 / mo</option>
                      <option value="$100,000 - $250,000">$100,000 - $250,000 / mo</option>
                      <option value="$250,000+">$250,000+ / mo (Enterprise)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-2">Message or Requirements</label>
                  <textarea 
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us about your multi-channel advertising goals or required DSP integrations..."
                    className="w-full bg-stone-950 border border-stone-800 rounded px-4 py-3 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-amber-400 text-black py-4 text-xs font-extrabold uppercase tracking-widest hover:bg-amber-300 transition-colors cursor-pointer rounded-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/10"
                >
                  {isSubmitting ? (
                    <span>Submitting Inquiry...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Request Enterprise Consultation</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-12 bg-[#050505] text-stone-500 text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span className="text-stone-300 font-bold uppercase tracking-wider">Vantage AdEngine SaaS Portal</span>
          </div>

          <div>
            &copy; {new Date().getFullYear()} Vantage AdEngine Inc. All rights reserved. Powered by Firebase Firestore & Gemini 3.6.
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={onNavigateToPortal} className="hover:text-amber-400 underline cursor-pointer">Portal</button>
            <a href="#privacy" className="hover:text-amber-400">Privacy</a>
            <a href="#terms" className="hover:text-amber-400">Terms</a>
          </div>
        </div>
      </footer>

      {/* Sign In & Onboarding Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/80 z-50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded max-w-md w-full p-6 sm:p-8 relative">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wide">
                {selectedPlanModal ? `Onboard Plan: ${selectedPlanModal}` : 'Sign In to Vantage'}
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                Access your multi-tenant ad manager workspace using Google Auth or Instant Demo.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleGoogleAuth}
                className="w-full bg-white text-black py-3 px-4 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-3 hover:bg-stone-200 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-800" />
                </div>
                <div className="relative flex justify-center text-[10px] font-mono uppercase">
                  <span className="bg-stone-900 px-2 text-stone-500">Or Instant Demo Access</span>
                </div>
              </div>

              <div className="space-y-2">
                {onLoginSuperAdminDemo && (
                  <button
                    onClick={() => {
                      setShowAuthModal(false);
                      onLoginSuperAdminDemo();
                    }}
                    className="w-full bg-stone-800 border border-amber-400/40 text-amber-400 py-2.5 px-3 rounded text-xs font-mono font-bold flex items-center justify-between hover:bg-stone-800/80 cursor-pointer"
                  >
                    <span>1. SaaS Super Admin Panel</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {onLoginTenantAdminDemo && (
                  <button
                    onClick={() => {
                      setShowAuthModal(false);
                      onLoginTenantAdminDemo();
                    }}
                    className="w-full bg-stone-800 border border-stone-700 text-stone-200 py-2.5 px-3 rounded text-xs font-mono font-bold flex items-center justify-between hover:bg-stone-800/80 cursor-pointer"
                  >
                    <span>2. Astra Cloud Tenant Workspace</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
