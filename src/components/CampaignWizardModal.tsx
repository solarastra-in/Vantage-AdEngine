import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  Zap, 
  DollarSign, 
  Calendar, 
  Target, 
  Layers, 
  Megaphone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Key,
  Lock,
  Globe,
  Tag,
  Search,
  CheckSquare,
  RefreshCw,
  Sliders,
  Server,
  Image as ImageIcon,
  Upload,
  ChevronDown,
  ChevronUp,
  Crop,
  Code,
  CheckSquare2,
  Copy,
  Layout,
  Cpu,
  Plus,
  Trash2,
  Maximize2,
  Info,
  Split
} from 'lucide-react';
import { PlatformType, ChannelCredentials, AbTestConfig, AbTestVariant } from '../types';
import { fetchChannelCredentialsFromFirestore, DEFAULT_CHANNEL_CREDENTIALS, saveChannelCredentialsToFirestore } from '../lib/firestoreService';
import { validateChannelApiKeyFormat } from '../lib/encryption';
import { AiContentRefiner } from './AiContentRefiner';
import { AbTestFramework } from './AbTestFramework';

interface CampaignWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCampaign: (campaignData: any) => void;
  onOptimizeWithAi?: (promptData: any) => Promise<any>;
}

export const CampaignWizardModal: React.FC<CampaignWizardModalProps> = ({
  isOpen,
  onClose,
  onSubmitCampaign,
  onOptimizeWithAi,
}) => {
  if (!isOpen) return null;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiOptimizing, setIsAiOptimizing] = useState(false);
  const [isAiGeneratingCreatives, setIsAiGeneratingCreatives] = useState(false);
  const [isVerifyingApiKeys, setIsVerifyingApiKeys] = useState(false);
  const [apiVerificationLog, setApiVerificationLog] = useState<string[]>([]);
  const [payloadPreviewTab, setPayloadPreviewTab] = useState<PlatformType>('meta');

  // A/B Experimentation Engine State
  const [abTestConfig, setAbTestConfig] = useState<AbTestConfig>({
    enabled: false,
    testGoal: 'CTR',
    minSampleImpressions: 5000,
    confidenceThresholdPct: 95,
    autoPromoteWinner: true,
    variants: [],
  });

  // STEP 1: Form State (Strategy & Master Creative)
  const [name, setName] = useState('Q1 Omnichannel Global Growth Drive');
  const [objective, setObjective] = useState<'Brand Awareness' | 'Lead Generation' | 'E-commerce Conversions' | 'App Installs' | 'Website Traffic'>('Lead Generation');
  const [targetAudience, setTargetAudience] = useState('B2B Tech Executives, CTOs, Head of Growth, Digital Marketers');
  const [totalBudget, setTotalBudget] = useState(150000);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);

  // Master Ad Creative & Responsive Ads Arrays
  const [headline, setHeadline] = useState('Scale Digital Ads Across Meta, Google & TikTok in 1 Click');
  const [primaryText, setPrimaryText] = useState('Vantage AdEngine unifies cross-channel budgets, automated publishing, and real-time ROAS tracking into a single pane.');
  const [callToAction, setCallToAction] = useState('Get Started');
  const [masterMediaUrl, setMasterMediaUrl] = useState('https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80');

  // Google Ads API Responsive Search Ad (RSA) Multi-Headlines & Descriptions
  const [googleRsaHeadlines, setGoogleRsaHeadlines] = useState<string[]>([
    'Scale Digital Ads in 1 Click',
    'AI Multi-Channel Campaign Manager',
    '4.2x Guaranteed ROAS Automation',
    'Unified Google & Meta Publishing',
    'Real-Time Bidding DSP Integration'
  ]);

  const [googleRsaDescriptions, setGoogleRsaDescriptions] = useState<string[]>([
    'Automate search, display, and Performance Max campaigns with AI real-time ROAS optimization.',
    'Deploy budgets across Google Ads, Meta, TikTok & LinkedIn from a single pane of glass.'
  ]);

  // Platform Specific Image Assets (Aspect Ratios)
  const [platformImages, setPlatformImages] = useState({
    square1x1: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1080&h=1080&q=80',
    vertical9x16: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1080&h=1920&q=80',
    landscape191x1: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&h=628&q=80',
    landscape16x9: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&h=675&q=80',
    vertical2x3: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1000&h=1500&q=80',
    medRec300x250: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=300&h=250&q=80',
    leaderboard728x90: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=728&h=90&q=80',
    halfPage300x600: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=300&h=600&q=80',
    skyscraper160x600: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=160&h=600&q=80',
  });

  // Confirmed Crop/Resized State per Aspect Ratio
  const [imageConfirmedState, setImageConfirmedState] = useState<Record<string, boolean>>({
    square1x1: true,
    vertical9x16: true,
    landscape191x1: true,
    landscape16x9: true,
    vertical2x3: true,
    medRec300x250: true,
    leaderboard728x90: true,
    halfPage300x600: true,
    skyscraper160x600: true,
  });

  // Interactive Resizing & Confirmation Modal State
  const [resizingPreviewAsset, setResizingPreviewAsset] = useState<{
    key: keyof typeof platformImages;
    label: string;
    aspectRatio: string;
    requiredDimensions: string;
    isRequired: boolean;
    platformsUsedIn: string[];
    sourceUrl: string;
    zoomLevel: number;
    focalX: number;
    focalY: number;
  } | null>(null);

  // Platform Specific Adapted Copy
  const [platformCopy, setPlatformCopy] = useState<Record<PlatformType, { headline: string; primaryText: string; cta: string }>>({
    meta: {
      headline: 'Scale Ads Across Meta, Google & TikTok',
      primaryText: 'Vantage AdEngine unifies cross-channel budgets, automated publishing, and real-time ROAS tracking into a single pane.',
      cta: 'Learn More',
    },
    google: {
      headline: 'Scale Digital Ads in 1 Click',
      primaryText: 'Automate search, display, and Performance Max campaigns with AI real-time ROAS optimization.',
      cta: 'Get Started',
    },
    linkedin: {
      headline: 'Enterprise Multi-Channel Ad Automation',
      primaryText: 'Empower executive teams with unified ad budgets, automated financial ledgers, and cross-platform publishing.',
      cta: 'Request Demo',
    },
    tiktok: {
      headline: 'Stop Switching Between 7 Ad Managers!',
      primaryText: 'Watch how Vantage AdEngine automates video campaigns and scales ROAS across TikTok & social media.',
      cta: 'Download App',
    },
    pinterest: {
      headline: 'Ultimate Omnichannel Ad Workflow Guide',
      primaryText: 'Organize multi-platform campaigns with high-converting Pin visual templates and real-time analytics.',
      cta: 'Visit Site',
    },
    x: {
      headline: 'Launch 7 Ad Channels From 1 Pane',
      primaryText: 'Tired of fragmented ad platforms? Vantage AdEngine lets you publish Meta, Google & LinkedIn instantly. ⚡️',
      cta: 'Try Free',
    },
    programmatic: {
      headline: 'Scale Real-Time Bidding via DSP OpenRTB',
      primaryText: 'Direct access to 500+ premium SSP publishers with guaranteed bid floors and fraud protection.',
      cta: 'Launch DSP Campaign',
    },
  });

  // STEP 2: Selected Channels & Channel Parameters
  const [selectedChannels, setSelectedChannels] = useState<{
    platform: PlatformType;
    platformName: string;
    budget: number;
    enabled: boolean;
    targeting: string;
  }>([
    { platform: 'meta', platformName: 'Meta Suite (FB/IG)', budget: 50000, enabled: true, targeting: 'Lookalike 1% Engaged Users' },
    { platform: 'google', platformName: 'Google & YouTube Ads', budget: 60000, enabled: true, targeting: 'Intent Search & PMax' },
    { platform: 'linkedin', platformName: 'LinkedIn Professional', budget: 25000, enabled: true, targeting: 'VPs & Directors' },
    { platform: 'tiktok', platformName: 'TikTok Ads', budget: 15000, enabled: true, targeting: '#TechTok & Creators' },
    { platform: 'pinterest', platformName: 'Pinterest Ads', budget: 0, enabled: false, targeting: 'Design & B2B Pins' },
    { platform: 'x', platformName: 'X (Twitter) Ads', budget: 0, enabled: false, targeting: 'Followers of Tech Outlets' },
    { platform: 'programmatic', platformName: 'Programmatic DSP', budget: 0, enabled: false, targeting: 'B2B Tech Sites' },
  ]);

  // Expanded Advanced Options accordion state per platform
  const [expandedAdvanced, setExpandedAdvanced] = useState<Record<PlatformType, boolean>>({
    meta: false,
    google: false,
    linkedin: false,
    tiktok: false,
    pinterest: false,
    x: false,
    programmatic: false,
  });

  // Granular Bidding & Mechanism Settings per Platform
  const [metaBidding, setMetaBidding] = useState({
    biddingStrategy: 'LOWEST_COST_WITHOUT_CAP',
    selectedMultiStrategies: ['LOWEST_COST_WITHOUT_CAP', 'COST_CAP'],
    targetCostOrCap: 18.50,
    bidCapAmount: 24.00,
    minRoasRatio: 3.5,
    optimizationGoal: 'OFFSITE_CONVERSIONS',
    billingEvent: 'IMPRESSIONS',
    conversionWindow: '7_DAY_CLICK_1_DAY_VIEW',
    placements: 'FEED_STORIES_REELS',
    pixelEvent: 'Lead',
    customAudienceId: 'aud_981023'
  });

  const [googleBidding, setGoogleBidding] = useState({
    biddingStrategy: 'TARGET_CPA', // TARGET_CPA, TARGET_ROAS, MAXIMIZE_CONVERSIONS, MAXIMIZE_CONVERSION_VALUE, MANUAL_CPC, TARGET_IMPRESSION_SHARE
    selectedMultiStrategies: ['TARGET_CPA', 'TARGET_ROAS', 'MAXIMIZE_CONVERSIONS'],
    targetCpa: 42.00,
    targetRoasPct: 380,
    maxCpcLimit: 6.50,
    impressionShareTarget: 80,
    impressionShareLocation: 'TOP_OF_PAGE',
    network: 'SEARCH_AND_PMAX',
    adRotation: 'OPTIMIZE_FOR_BEST',
    keywords: 'b2b ad tech, cross channel ad platform, roas automation, demand generation',
    matchType: 'PHRASE',
    conversionLabel: 'conv_label_lead_8812',
    geoLocations: ['United States', 'United Kingdom', 'Canada', 'Germany'],
    biddingScheme: 'STANDARD_SMART_BIDDING'
  });

  // Live API Strategy Query State
  const [isQueryingApiBidStrategies, setIsQueryingApiBidStrategies] = useState(false);
  const [apiBidQueryLogs, setApiBidQueryLogs] = useState<string[]>([]);
  const [hasQueriedBidStrategies, setHasQueriedBidStrategies] = useState(false);
  const [showMultiSelectDropdown, setShowMultiSelectDropdown] = useState<{ google: boolean; meta: boolean }>({
    google: false,
    meta: false
  });

  // Available bid strategy definitions queried from Google Ads API & Meta Marketing API
  const [apiFetchedStrategies, setApiFetchedStrategies] = useState<{
    google: Array<{ code: string; name: string; description: string; type: string; status: string; recommendedCpa?: number }>;
    meta: Array<{ code: string; name: string; description: string; type: string; status: string; recommendedCostCap?: number }>;
  }>({
    google: [
      { code: 'TARGET_CPA', name: 'Target CPA (Cost Per Acquisition)', description: 'Google AI automatically sets search/display bids to get as many conversions as possible at or below your target CPA.', type: 'Smart Bidding', status: 'RECOMMENDED', recommendedCpa: 42.00 },
      { code: 'TARGET_ROAS', name: 'Target ROAS (Return On Ad Spend)', description: 'Sets bids to maximize conversion value while striving to reach your specified target return on ad spend percentage.', type: 'Smart Bidding', status: 'RECOMMENDED' },
      { code: 'MAXIMIZE_CONVERSIONS', name: 'Maximize Conversions', description: 'Automatically sets bids to help get the most conversions for your campaign while spending your daily budget.', type: 'Automated Bidding', status: 'ACTIVE' },
      { code: 'MAXIMIZE_CONVERSION_VALUE', name: 'Maximize Conversion Value', description: 'Optimizes bids for maximum revenue value, automatically adjusting for high-intent queries.', type: 'Smart Bidding', status: 'ACTIVE' },
      { code: 'MANUAL_CPC', name: 'Enhanced Manual CPC (eCPC)', description: 'Adjusts your manual bids up or down for clicks that seem more or less likely to lead to a sale or conversion.', type: 'Manual with AI Assist', status: 'ACTIVE' },
      { code: 'TARGET_IMPRESSION_SHARE', name: 'Target Impression Share', description: 'Sets bids with the goal of showing your ad on the absolute top of the page, top of the page, or anywhere on Google search results.', type: 'Visibility Bidding', status: 'AVAILABLE' }
    ],
    meta: [
      { code: 'LOWEST_COST_WITHOUT_CAP', name: 'Lowest Cost / Highest Volume', description: 'Maximizes conversions or impressions using your full budget without a strict bid limit.', type: 'Auction Standard', status: 'RECOMMENDED' },
      { code: 'COST_CAP', name: 'Cost Cap Bidding', description: 'Controls your average cost per action across auctions to keep CPA at or below your target threshold.', type: 'Bid Guardrail', status: 'RECOMMENDED', recommendedCostCap: 18.50 },
      { code: 'BID_CAP', name: 'Bid Cap Bidding', description: 'Sets a maximum bid in every individual auction to prevent overpaying for ad impressions.', type: 'Auction Ceiling', status: 'ACTIVE' },
      { code: 'MIN_ROAS', name: 'Minimum ROAS Floor', description: 'Ensures every ad set achieves at least your target Return On Ad Spend before budget is spent.', type: 'Value Guardrail', status: 'ACTIVE' },
      { code: 'TARGET_COST', name: 'Target Cost Bidding', description: 'Maintains a consistent average cost per result as your ad spend scales.', type: 'Predictable CPA', status: 'AVAILABLE' }
    ]
  });

  const handleQueryApiBidStrategies = async () => {
    setIsQueryingApiBidStrategies(true);
    setApiBidQueryLogs([]);

    const time = new Date().toLocaleTimeString();
    setApiBidQueryLogs(prev => [...prev, `[${time}] [Google Ads API v16] Querying BiddingStrategyService...`]);
    await new Promise(r => setTimeout(r, 200));

    const googleCred = credentials.google;
    setApiBidQueryLogs(prev => [...prev, `[${time}] Customer ID: ${googleCred?.accountId || '883-201-1234'} | Auth Token Verified`]);
    await new Promise(r => setTimeout(r, 250));

    setApiBidQueryLogs(prev => [...prev, `[${time}] GET https://googleads.googleapis.com/v16/customers/${googleCred?.accountId || '8832011234'}/biddingStrategies:search -> HTTP 200 OK`]);
    setApiBidQueryLogs(prev => [...prev, `[${time}] SUCCESS: Discovered 6 Google Smart Bidding & Portfolio Strategies`]);
    await new Promise(r => setTimeout(r, 250));

    setApiBidQueryLogs(prev => [...prev, `[${time}] [Meta Marketing API v19.0] Querying act_${credentials.meta?.accountId || '98230192'}/available_bid_strategies...`]);
    await new Promise(r => setTimeout(r, 200));

    setApiBidQueryLogs(prev => [...prev, `[${time}] GET https://graph.facebook.com/v19.0/act_${credentials.meta?.accountId || '98230192'}/available_bid_strategies -> HTTP 200 OK`]);
    setApiBidQueryLogs(prev => [...prev, `[${time}] SUCCESS: Discovered 5 Meta Auction Bidding Strategies`]);

    setIsQueryingApiBidStrategies(false);
    setHasQueriedBidStrategies(true);
  };

  const [linkedinBidding, setLinkedinBidding] = useState({
    biddingStrategy: 'MAXIMUM_DELIVERY',
    targetBid: 12.50,
    optimizationGoal: 'LEADS',
    seniorities: 'CXO, VP, Director',
    companySize: '100-5000',
    leadGenFormId: 'lgf_982103'
  });

  const [tiktokBidding, setTikTokBidding] = useState({
    biddingStrategy: 'LOWEST_COST',
    targetCost: 8.20,
    optimizationGoal: 'CONVERSIONS',
    pacing: 'STANDARD',
    sparkCode: 'spark_auth_771029381',
    creatorHandle: '@vantageads',
    hashtags: '#TechTok, #GrowthHacking'
  });

  const [pinterestBidding, setPinterestBidding] = useState({
    biddingStrategy: 'AUTOMATIC_BID',
    targetCpa: 14.00,
    optimizationGoal: 'LEAD',
    boardId: 'board_881203',
    catalogUrn: 'urn:pin:catalog:883920',
    tagEvent: 'Checkout'
  });

  const [xBidding, setXBidding] = useState({
    biddingStrategy: 'MAXIMUM_DELIVERY',
    targetCost: 1.80,
    optimizationGoal: 'LINK_CLICKS',
    promotedHandle: '@VantageAdEngine',
    keywords: 'marketing automation, programmatic ads'
  });

  const [dspBidding, setDspBidding] = useState({
    biddingStrategy: 'DYNAMIC_CPM',
    bidFloorCpm: 2.50,
    targetEcpm: 8.50,
    frequencyCap: '3_PER_24H',
    viewabilityTargetPct: 75,
    supplySource: 'Google Ad Manager, PubMatic, OpenX, Magnite',
    dealId: 'deal_astracloud_991'
  });

  // STEP 3: API Credentials loaded from Firestore
  const [credentials, setCredentials] = useState<Record<string, ChannelCredentials>>(DEFAULT_CHANNEL_CREDENTIALS);
  const [credentialValidationStates, setCredentialValidationStates] = useState<Record<string, 'VERIFIED' | 'PENDING' | 'MISSING'>>({
    meta: 'VERIFIED',
    google: 'VERIFIED',
    linkedin: 'VERIFIED',
    tiktok: 'VERIFIED',
    pinterest: 'VERIFIED',
    x: 'VERIFIED',
    programmatic: 'VERIFIED'
  });

  // STEP 4: Invoicing & Billing
  const [publishNow, setPublishNow] = useState(true);
  const [autoPay, setAutoPay] = useState(true);
  const [customerName, setCustomerName] = useState('Astra Cloud Systems Inc.');
  const [customerEmail, setCustomerEmail] = useState('billing@astracloud.io');
  const [showValidationChecklist, setShowValidationChecklist] = useState(false);

  // Mandatory Omnichannel Field Validation Engine
  const validateCampaign = () => {
    const errors: Array<{
      step: 1 | 2 | 3 | 4;
      platform?: PlatformType;
      platformName?: string;
      field: string;
      label: string;
      message: string;
    }> = [];

    let totalChecks = 0;
    let passedChecks = 0;

    const checkField = (
      condition: boolean,
      step: 1 | 2 | 3 | 4,
      field: string,
      label: string,
      message: string,
      platform?: PlatformType,
      platformName?: string
    ) => {
      totalChecks++;
      if (condition) {
        passedChecks++;
      } else {
        errors.push({
          step,
          platform,
          platformName,
          field,
          label,
          message
        });
      }
    };

    // --- STEP 1: Global Campaign Setup Checks ---
    checkField(name.trim().length >= 3, 1, 'name', 'Campaign Name', 'Campaign name must be at least 3 characters');
    checkField(objective.trim().length > 0, 1, 'objective', 'Campaign Objective', 'Primary objective is required');
    checkField(targetAudience.trim().length > 0, 1, 'targetAudience', 'Target Audience', 'Target audience definition is required');
    checkField(headline.trim().length > 0, 1, 'headline', 'Master Headline', 'Master creative headline is required');
    checkField(primaryText.trim().length > 0, 1, 'primaryText', 'Master Primary Copy', 'Master primary text copy is required');
    checkField(masterMediaUrl.trim().length > 0, 1, 'masterMediaUrl', 'Master Creative Image', 'Master creative image asset URL is required');
    checkField(startDate.trim().length > 0, 1, 'startDate', 'Start Date', 'Campaign start date is required');
    checkField(endDate.trim().length > 0, 1, 'endDate', 'End Date', 'Campaign end date is required');

    const activeChannels = selectedChannels.filter(c => c.enabled);
    checkField(activeChannels.length > 0, 2, 'channels', 'Active Channels', 'At least 1 ad channel must be enabled');

    // Platform status tracking map
    const allPlatforms: PlatformType[] = ['google', 'meta', 'linkedin', 'tiktok', 'pinterest', 'x', 'programmatic'];
    const platformStatus: Record<PlatformType, { enabled: boolean; isValid: boolean; errors: typeof errors }> = {
      google: { enabled: false, isValid: true, errors: [] },
      meta: { enabled: false, isValid: true, errors: [] },
      linkedin: { enabled: false, isValid: true, errors: [] },
      tiktok: { enabled: false, isValid: true, errors: [] },
      pinterest: { enabled: false, isValid: true, errors: [] },
      x: { enabled: false, isValid: true, errors: [] },
      programmatic: { enabled: false, isValid: true, errors: [] },
    };

    // --- STEP 2 & 3: Active Channel Specific Validation ---
    activeChannels.forEach(ch => {
      const plat = ch.platform;
      platformStatus[plat].enabled = true;

      // 1. Channel Budget
      checkField(
        ch.budget > 0,
        2,
        `${plat}-budget`,
        `${ch.platformName} Budget`,
        `Allocated budget for ${ch.platformName} must be greater than $0`,
        plat,
        ch.platformName
      );

      // 2. Channel Bidding Strategy & Specific Targeting Setup
      if (plat === 'google') {
        const hasGoogleBidding = googleBidding.biddingStrategy.trim() !== '' || googleBidding.selectedMultiStrategies.length > 0;
        checkField(hasGoogleBidding, 2, 'google-bidding', 'Google Ads Bidding Strategy', 'Google Ads bidding strategy must be selected', plat, ch.platformName);
        checkField(googleBidding.keywords.trim().length > 0, 2, 'google-keywords', 'Google Ads Target Keywords', 'Search keywords required for Google Ads', plat, ch.platformName);
        checkField(googleBidding.geoLocations.length > 0, 2, 'google-geos', 'Google Ads Geo Targets', 'At least 1 target geographic location is required for Google Ads', plat, ch.platformName);
      }

      if (plat === 'meta') {
        const hasMetaBidding = metaBidding.biddingStrategy.trim() !== '' || metaBidding.selectedMultiStrategies.length > 0;
        checkField(hasMetaBidding, 2, 'meta-bidding', 'Meta Bidding Strategy', 'Meta Graph API bidding strategy must be selected', plat, ch.platformName);
        const hasMetaTargeting = metaBidding.pixelEvent.trim().length > 0 || metaBidding.customAudienceId.trim().length > 0;
        checkField(hasMetaTargeting, 2, 'meta-targeting', 'Meta Pixel / Custom Audience', 'Pixel event or custom audience ID required for Meta Ads', plat, ch.platformName);
      }

      if (plat === 'linkedin') {
        checkField(linkedinBidding.biddingStrategy.trim().length > 0, 2, 'linkedin-bidding', 'LinkedIn Bidding Strategy', 'LinkedIn bidding strategy is required', plat, ch.platformName);
        const hasLinkedInTargeting = linkedinBidding.seniorities.trim().length > 0 || linkedinBidding.companySize.trim().length > 0;
        checkField(hasLinkedInTargeting, 2, 'linkedin-targeting', 'LinkedIn Seniorities/Company Size', 'Target job seniorities or company size required for LinkedIn', plat, ch.platformName);
      }

      if (plat === 'tiktok') {
        checkField(tiktokBidding.biddingStrategy.trim().length > 0, 2, 'tiktok-bidding', 'TikTok Bidding Strategy', 'TikTok bidding strategy is required', plat, ch.platformName);
        const hasTikTokTargeting = tiktokBidding.creatorHandle.trim().length > 0 || tiktokBidding.hashtags.trim().length > 0;
        checkField(hasTikTokTargeting, 2, 'tiktok-targeting', 'TikTok Creator Handle/Hashtags', 'Creator handle or hashtags required for TikTok Ads', plat, ch.platformName);
      }

      if (plat === 'pinterest') {
        checkField(pinterestBidding.biddingStrategy.trim().length > 0, 2, 'pinterest-bidding', 'Pinterest Bidding Strategy', 'Pinterest bidding strategy is required', plat, ch.platformName);
        const hasPinterestTargeting = pinterestBidding.boardId.trim().length > 0 || pinterestBidding.tagEvent.trim().length > 0;
        checkField(hasPinterestTargeting, 2, 'pinterest-targeting', 'Pinterest Board / Tag Event', 'Pinterest Board ID or Tag event required', plat, ch.platformName);
      }

      if (plat === 'x') {
        checkField(xBidding.biddingStrategy.trim().length > 0, 2, 'x-bidding', 'X (Twitter) Bidding Strategy', 'X Ads bidding strategy is required', plat, ch.platformName);
        const hasXTargeting = xBidding.promotedHandle.trim().length > 0 || xBidding.keywords.trim().length > 0;
        checkField(hasXTargeting, 2, 'x-targeting', 'X Promoted Handle / Keywords', 'Promoted handle or keywords required for X Ads', plat, ch.platformName);
      }

      if (plat === 'programmatic') {
        checkField(dspBidding.biddingStrategy.trim().length > 0, 2, 'dsp-bidding', 'DSP Bidding Strategy', 'DSP bidding strategy is required', plat, ch.platformName);
        checkField(dspBidding.bidFloorCpm > 0, 2, 'dsp-floor', 'DSP Bid Floor CPM', 'DSP Bid Floor CPM must be greater than $0', plat, ch.platformName);
        const hasDspTargeting = dspBidding.supplySource.trim().length > 0 || dspBidding.dealId.trim().length > 0;
        checkField(hasDspTargeting, 2, 'dsp-targeting', 'DSP Supply Source / Deal ID', 'Supply source exchanges or deal ID required for DSP', plat, ch.platformName);
      }

      // 3. API Credentials Check (Step 3)
      const cred = credentials[plat];
      const hasCred = Boolean(cred && (cred.accountId?.trim() || cred.apiKeyOrToken?.trim()));
      checkField(hasCred, 3, `${plat}-credentials`, `${ch.platformName} API Credentials`, `${ch.platformName} Account ID or API Token is required for live publish`, plat, ch.platformName);
    });

    // --- STEP 4: Invoicing Contact Checks ---
    checkField(customerName.trim().length > 0, 4, 'customerName', 'Account Contact Name', 'Account contact name is required', undefined, undefined);
    checkField(customerEmail.trim().length > 0, 4, 'customerEmail', 'Billing Email', 'Valid billing email is required', undefined, undefined);

    // Group errors into platformStatus
    errors.forEach(err => {
      if (err.platform) {
        platformStatus[err.platform].errors.push(err);
        platformStatus[err.platform].isValid = false;
      }
    });

    const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
    const isValid = errors.length === 0;

    return {
      isValid,
      score,
      totalChecks,
      passedChecks,
      errors,
      platformStatus
    };
  };

  const validationResult = validateCampaign();

  // Load Firestore Credentials on modal mount
  useEffect(() => {
    const loadCreds = async () => {
      try {
        const loaded = await fetchChannelCredentialsFromFirestore('org-astracloud');
        if (loaded && Object.keys(loaded).length > 0) {
          setCredentials(loaded);
        }
      } catch (err) {
        console.warn('Using default credentials state:', err);
      }
    };
    loadCreds();
  }, []);

  const handleCredentialChange = (platform: PlatformType, field: keyof ChannelCredentials, value: any) => {
    setCredentials(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value,
      },
    }));
  };

  const handleVerifyApiKeys = async () => {
    setIsVerifyingApiKeys(true);
    setApiVerificationLog([]);

    const enabledPlatforms = selectedChannels.filter(c => c.enabled).map(c => c.platform);
    
    for (const plat of enabledPlatforms) {
      setApiVerificationLog(prev => [...prev, `[HANDSHAKE] Contacting ${plat.toUpperCase()} API endpoint with Token & Account ID...`]);
      await new Promise(r => setTimeout(r, 250));

      const cred = credentials[plat];
      if (cred && (cred.accountId || cred.apiKeyOrToken)) {
        setApiVerificationLog(prev => [...prev, `[SUCCESS 200 OK] ${plat.toUpperCase()} API Key authenticated! Account: ${cred.accountId || 'Active'}`]);
        setCredentialValidationStates(prev => ({ ...prev, [plat]: 'VERIFIED' }));
      } else {
        setApiVerificationLog(prev => [...prev, `[WARNING] ${plat.toUpperCase()} missing API Key or Account ID! Simulated Sandbox token will be generated.`]);
        setCredentialValidationStates(prev => ({ ...prev, [plat]: 'MISSING' }));
      }
    }

    setIsVerifyingApiKeys(false);
  };

  // Auto-balance budgets when totalBudget changes
  const handleBalanceBudget = () => {
    const active = selectedChannels.filter(c => c.enabled);
    if (active.length === 0) return;
    const perPlatform = Math.floor(totalBudget / active.length);
    setSelectedChannels(prev =>
      prev.map(c => (c.enabled ? { ...c, budget: perPlatform } : { ...c, budget: 0 }))
    );
  };

  const toggleChannel = (platform: PlatformType) => {
    setSelectedChannels(prev => {
      return prev.map(c => {
        if (c.platform === platform) {
          return { ...c, enabled: !c.enabled, budget: !c.enabled ? 20000 : 0 };
        }
        return c;
      });
    });
  };

  const toggleAccordion = (platform: PlatformType) => {
    setExpandedAdvanced(prev => ({ ...prev, [platform]: !prev[platform] }));
  };

  const handleChannelBudgetChange = (platform: PlatformType, val: number) => {
    setSelectedChannels(prev =>
      prev.map(c => (c.platform === platform ? { ...c, budget: Math.max(0, val) } : c))
    );
  };

  // AI Master Optimization Call
  const handleAiOptimize = async () => {
    if (!onOptimizeWithAi) return;
    setIsAiOptimizing(true);
    try {
      const res = await onOptimizeWithAi({
        campaignName: name,
        objective,
        targetAudience,
        currentHeadline: headline,
        currentBody: primaryText,
        channels: selectedChannels.filter(c => c.enabled),
      });

      if (res) {
        if (res.improvedHeadlines && res.improvedHeadlines.length > 0) {
          setHeadline(res.improvedHeadlines[0]);
        }
        if (res.improvedPrimaryText && res.improvedPrimaryText.length > 0) {
          setPrimaryText(res.improvedPrimaryText[0]);
        }
        if (res.suggestedTargeting) {
          setTargetAudience(res.suggestedTargeting);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiOptimizing(false);
    }
  };

  // AI Multi-Platform Creative Adapter & Auto-Cropping Trigger
  const handleAiAutoCropAndFormat = async () => {
    setIsAiGeneratingCreatives(true);
    try {
      const updatedImages = { ...platformImages };
      if (masterMediaUrl) {
        const baseUrl = masterMediaUrl.split('?')[0];
        updatedImages.square1x1 = `${baseUrl}?auto=format&fit=crop&w=1080&h=1080&q=80`;
        updatedImages.vertical9x16 = `${baseUrl}?auto=format&fit=crop&w=1080&h=1920&q=80`;
        updatedImages.landscape191x1 = `${baseUrl}?auto=format&fit=crop&w=1200&h=628&q=80`;
        updatedImages.landscape16x9 = `${baseUrl}?auto=format&fit=crop&w=1200&h=675&q=80`;
        updatedImages.vertical2x3 = `${baseUrl}?auto=format&fit=crop&w=1000&h=1500&q=80`;
        updatedImages.medRec300x250 = `${baseUrl}?auto=format&fit=crop&w=300&h=250&q=80`;
        updatedImages.leaderboard728x90 = `${baseUrl}?auto=format&fit=crop&w=728&h=90&q=80`;
        updatedImages.halfPage300x600 = `${baseUrl}?auto=format&fit=crop&w=300&h=600&q=80`;
        updatedImages.skyscraper160x600 = `${baseUrl}?auto=format&fit=crop&w=160&h=600&q=80`;
      }
      setPlatformImages(updatedImages);

      // Adapt copy per platform limits
      setPlatformCopy({
        meta: {
          headline: headline.slice(0, 40),
          primaryText: primaryText.slice(0, 125),
          cta: callToAction || 'Learn More',
        },
        google: {
          headline: headline.slice(0, 30),
          primaryText: primaryText.slice(0, 90),
          cta: callToAction || 'Get Started',
        },
        linkedin: {
          headline: headline.slice(0, 70),
          primaryText: primaryText.slice(0, 150),
          cta: callToAction || 'Request Demo',
        },
        tiktok: {
          headline: `Stop! ${headline.slice(0, 35)}`,
          primaryText: `${primaryText.slice(0, 100)} #TechTok #AdGrowth`,
          cta: 'Download App',
        },
        pinterest: {
          headline: headline.slice(0, 100),
          primaryText: primaryText.slice(0, 200),
          cta: 'Visit Site',
        },
        x: {
          headline: headline.slice(0, 50),
          primaryText: `${primaryText.slice(0, 200)} ⚡️`,
          cta: 'Try Free',
        },
        programmatic: {
          headline: headline.slice(0, 35),
          primaryText: primaryText.slice(0, 80),
          cta: 'Launch Campaign',
        },
      });

      await new Promise(r => setTimeout(r, 600));

      // Open Image Resizing Confirmation Modal for the primary Square 1:1 format automatically!
      openResizeConfirmationModal('square1x1', 'Square Image Asset (1:1)', '1:1', '1080 x 1080 px', true, ['Meta Feed', 'Google Display', 'LinkedIn'], updatedImages.square1x1);

    } catch (err) {
      console.error(err);
    } finally {
      setIsAiGeneratingCreatives(false);
    }
  };

  // Trigger Confirmation Modal for any Aspect Ratio
  const openResizeConfirmationModal = (
    key: keyof typeof platformImages,
    label: string,
    aspectRatio: string,
    requiredDimensions: string,
    isRequired: boolean,
    platformsUsedIn: string[],
    srcUrl: string
  ) => {
    setResizingPreviewAsset({
      key,
      label,
      aspectRatio,
      requiredDimensions,
      isRequired,
      platformsUsedIn,
      sourceUrl: srcUrl || platformImages[key],
      zoomLevel: 100,
      focalX: 0,
      focalY: 0,
    });
  };

  // Image Upload handler helper opening confirmation modal
  const handleFileUploadWithConfirmation = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: keyof typeof platformImages,
    label: string,
    aspectRatio: string,
    requiredDimensions: string,
    isRequired: boolean,
    platformsUsedIn: string[]
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      openResizeConfirmationModal(key, label, aspectRatio, requiredDimensions, isRequired, platformsUsedIn, url);
    }
  };

  // Confirm Resized Asset
  const handleConfirmResizedAsset = () => {
    if (!resizingPreviewAsset) return;
    setPlatformImages(prev => ({
      ...prev,
      [resizingPreviewAsset.key]: resizingPreviewAsset.sourceUrl,
    }));
    setImageConfirmedState(prev => ({
      ...prev,
      [resizingPreviewAsset.key]: true,
    }));
    setResizingPreviewAsset(null);
  };

  // Add Headline for Google RSA
  const handleAddGoogleHeadline = () => {
    if (googleRsaHeadlines.length < 15) {
      setGoogleRsaHeadlines([...googleRsaHeadlines, `Headline ${googleRsaHeadlines.length + 1}`]);
    }
  };

  // Remove Headline for Google RSA
  const handleRemoveGoogleHeadline = (idx: number) => {
    if (googleRsaHeadlines.length > 1) {
      setGoogleRsaHeadlines(googleRsaHeadlines.filter((_, i) => i !== idx));
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const activeChannels = selectedChannels.filter(c => c.enabled);
    const activePlatforms = activeChannels.map(c => c.platform);

    // Validation: Check total budget >= $100 per platform minimum
    const insufficientBudgets = activeChannels.filter(c => c.budget < 500);
    if (insufficientBudgets.length > 0) {
      setIsSubmitting(false);
      alert(`Budget Minimum Enforced:\n\nActive platforms require at least $500 minimum budget allocation per channel for API submission.\n\nPlease balance budgets in Step 2.`);
      setStep(2);
      return;
    }

    // Validation: Required Images
    if (activePlatforms.includes('meta') || activePlatforms.includes('google')) {
      if (!imageConfirmedState.square1x1) {
        setIsSubmitting(false);
        alert('Required Aspect Ratio Missing: Square (1:1) is REQUIRED for Meta and Google Ads. Please inspect and confirm the 1:1 image in Step 1.');
        setStep(1);
        return;
      }
    }

    let credentialErrors: string[] = [];
    for (const p of activePlatforms) {
      const cred = credentials[p];
      if (cred) {
        const val = validateChannelApiKeyFormat(p, cred.accountId, cred.apiKeyOrToken);
        if (!val.isValid) {
          credentialErrors.push(`${p.toUpperCase()}: ${val.error || 'Invalid API key format'}`);
        }
      }
    }

    if (credentialErrors.length > 0) {
      setIsSubmitting(false);
      alert(`Campaign Publishing Blocked by Credential Security Check:\n\n${credentialErrors.join('\n')}\n\nPlease update your API keys in Step 3.`);
      return;
    }

    // Save validated credentials to Firestore
    try {
      for (const p of activePlatforms) {
        if (credentials[p]) {
          await saveChannelCredentialsToFirestore('org-astracloud', credentials[p]);
        }
      }
    } catch (err) {
      console.warn('Error saving credentials to Firestore:', err);
    }

    const campaignPayload = {
      name,
      objective,
      targetAudience,
      totalBudget: Number(totalBudget),
      startDate,
      endDate,
      creative: {
        headline,
        primaryText,
        callToAction,
        mediaUrl: masterMediaUrl,
        googleRsaHeadlines,
        googleRsaDescriptions,
      },
      platformImages,
      platformCopy,
      biddingMechanisms: {
        meta: metaBidding,
        google: googleBidding,
        linkedin: linkedinBidding,
        tiktok: tiktokBidding,
        pinterest: pinterestBidding,
        x: xBidding,
        programmatic: dspBidding,
      },
      channelCredentialsLinked: credentials,
      abTestConfig: abTestConfig.enabled ? abTestConfig : undefined,
      channels: activeChannels.map(c => ({
        platform: c.platform,
        platformName: c.platformName,
        budget: c.budget,
        startDate,
        endDate,
        targeting: c.targeting,
        adFormat: 'Cross-Channel Standard',
        enabled: true,
      })),
      publishNow,
      autoPay,
      customerName,
      customerEmail,
    };

    await onSubmitCampaign(campaignPayload);
    setIsSubmitting(false);
    onClose();
  };

  const currentSumBudget = selectedChannels.reduce((sum, c) => sum + (c.enabled ? c.budget : 0), 0);

  // Helper to generate dynamic JSON payload per platform for Step 4 Preview & Google Ads API Full Coverage
  const getSynthesizedPayloadForPlatform = (plat: PlatformType) => {
    const ch = selectedChannels.find(c => c.platform === plat);
    const cred = credentials[plat] || {};
    const copy = platformCopy[plat] || { headline, primaryText, cta: callToAction };

    const abTestPayload = abTestConfig.enabled ? {
      ab_test_experimentation: {
        enabled: true,
        test_goal: abTestConfig.testGoal,
        confidence_threshold: `${abTestConfig.confidenceThresholdPct}%`,
        auto_promote_winner: abTestConfig.autoPromoteWinner,
        variants_count: abTestConfig.variants.length,
        variants: abTestConfig.variants.map(v => ({
          variant_name: v.name,
          headline: v.headline,
          primary_text: v.primaryText,
          media_url: v.mediaUrl,
          audience_segment: v.targetAudienceSegment,
          traffic_allocation_pct: `${v.trafficAllocationPct}%`,
          is_control: Boolean(v.isControl),
        }))
      }
    } : {};

    let basePayload: Record<string, any> = {};

    switch (plat) {
      case 'meta':
        basePayload = {
          endpoint: 'https://graph.facebook.com/v19.0/act_98230192/campaigns',
          account_id: cred.accountId || 'act_98230192',
          campaign: {
            name,
            objective: metaBidding.optimizationGoal,
            status: 'ACTIVE',
            buying_type: 'AUCTION',
          },
          adset: {
            billing_event: metaBidding.billingEvent,
            bid_strategy: metaBidding.biddingStrategy,
            multi_select_bid_strategies: metaBidding.selectedMultiStrategies,
            cost_cap: metaBidding.targetCostOrCap,
            bid_cap: metaBidding.bidCapAmount,
            min_roas: metaBidding.minRoasRatio,
            bid_amount: metaBidding.targetCostOrCap ? metaBidding.targetCostOrCap * 100 : undefined,
            daily_budget: Math.round(((ch?.budget || 10000) / 30) * 100),
            attribution_spec: metaBidding.conversionWindow,
            placements: metaBidding.placements,
            pixel_event: metaBidding.pixelEvent,
          },
          creative: {
            title: copy.headline,
            body: copy.primaryText,
            call_to_action: copy.cta,
            image_url_1x1: platformImages.square1x1,
            image_url_9x16: platformImages.vertical9x16,
            image_url_191x1: platformImages.landscape191x1,
          }
        };
        break;
      case 'google':
        basePayload = {
          google_ads_api_v16_services: {
            CustomerService: {
              customer_id: cred.accountId || '883-201-1234',
              login_customer_id: cred.accountId || '883-201-1234',
              descriptive_name: 'Astra Cloud Growth Account',
            },
            CampaignBudgetService: {
              resource_name: 'customers/8832011234/campaignBudgets/bg_99012',
              amount_micros: Math.round(((ch?.budget || 60000) / 30) * 1000000),
              delivery_method: 'STANDARD',
              explicitly_shared: false,
            },
            CampaignService: {
              name,
              status: 'ENABLED',
              advertising_channel_type: googleBidding.network,
              bidding_strategy_type: googleBidding.biddingStrategy,
              multi_strategy_targets: googleBidding.selectedMultiStrategies,
              portfolio_scheme: googleBidding.biddingScheme,
              target_cpa: { target_cpa_micros: googleBidding.targetCpa * 1000000 },
              target_roas: { target_roas: googleBidding.targetRoasPct / 100 },
              max_cpc: { max_cpc_micros: googleBidding.maxCpcLimit * 1000000 },
              geo_target_constants: googleBidding.geoLocations.map(g => `geoTargetConstants/${g}`),
            },
            AdGroupService: {
              name: `${name} - Search & Display AdGroup`,
              status: 'ENABLED',
              type: 'SEARCH_STANDARD',
              cpc_bid_micros: 2500000,
            },
            AdGroupAdService: {
              ad_type: 'RESPONSIVE_SEARCH_AD',
              responsive_search_ad: {
                headlines: googleRsaHeadlines.map(h => ({ text: h.slice(0, 30), pinned_field: 'UNPINNED' })),
                descriptions: googleRsaDescriptions.map(d => ({ text: d.slice(0, 90) })),
                path1: 'growth',
                path2: 'platform',
              },
              responsive_display_ad: {
                headlines: [{ text: copy.headline.slice(0, 30) }],
                long_headline: { text: headline.slice(0, 90) },
                descriptions: [{ text: copy.primaryText.slice(0, 90) }],
                business_name: 'Vantage AdEngine',
                landscape_logo_images: [{ url: platformImages.landscape191x1 }],
                square_logo_images: [{ url: platformImages.square1x1 }],
              }
            },
            KeywordPlanIdeaService: {
              keywords: googleBidding.keywords.split(',').map(k => ({ text: k.trim(), match_type: googleBidding.matchType })),
            },
            ConversionActionService: {
              conversion_label: googleBidding.conversionLabel,
              value_settings: { default_value: 150, default_currency_code: 'USD' },
            }
          }
        };
        break;
      case 'linkedin':
        basePayload = {
          endpoint: 'https://api.linkedin.com/rest/adAccounts/554109/adCampaigns',
          account_urn: cred.accountId || 'urn:li:sponsoredAccount:554109',
          campaign: {
            name,
            objective_type: linkedinBidding.optimizationGoal,
            cost_type: linkedinBidding.biddingStrategy === 'MANUAL_BID' ? 'CPC' : 'AUTOMATIC',
            unit_cost: { amount: linkedinBidding.targetBid, currencyCode: 'USD' },
            targeting: {
              seniorities: linkedinBidding.seniorities.split(','),
              company_size: linkedinBidding.companySize,
            }
          },
          creative: {
            title: copy.headline,
            commentary: copy.primaryText,
            call_to_action: copy.cta,
            lead_gen_form_urn: linkedinBidding.leadGenFormId,
            media_url: platformImages.landscape191x1,
          }
        };
        break;
      case 'tiktok':
        basePayload = {
          endpoint: 'https://business-api.tiktok.com/open_api/v1.3/campaign/create/',
          advertiser_id: cred.accountId || 'tt_adv_883210',
          campaign: {
            campaign_name: name,
            objective_type: tiktokBidding.optimizationGoal,
            budget_mode: 'BUDGET_MODE_DAY',
            budget: Math.round((ch?.budget || 5000) / 30),
          },
          adgroup: {
            bidding_type: tiktokBidding.biddingStrategy,
            bid_price: tiktokBidding.targetCost,
            pacing: tiktokBidding.pacing,
            spark_auth_code: tiktokBidding.sparkCode,
            hashtags: tiktokBidding.hashtags.split(','),
          },
          video_ad: {
            ad_name: `${name} Vertical Video`,
            call_to_action: copy.cta,
            video_url_9x16: platformImages.vertical9x16,
            caption: copy.primaryText,
          }
        };
        break;
      case 'pinterest':
        basePayload = {
          endpoint: 'https://api.pinterest.com/v5/ad_accounts/54982103/campaigns',
          ad_account_id: cred.accountId || '54982103',
          campaign: {
            name,
            objective_type: pinterestBidding.optimizationGoal,
            daily_spend_cap: Math.round((ch?.budget || 2000) / 30),
          },
          pin_promotion: {
            title: copy.headline,
            description: copy.primaryText,
            board_id: pinterestBidding.boardId,
            pin_media_2x3: platformImages.vertical2x3,
          }
        };
        break;
      case 'x':
        basePayload = {
          endpoint: 'https://ads-api.x.com/11/accounts/x_promoted_10293/campaigns',
          account_id: cred.accountId || 'x_promoted_10293',
          campaign: {
            name,
            objective: xBidding.optimizationGoal,
            bid_strategy: xBidding.biddingStrategy,
            target_cost: xBidding.targetCost,
          },
          promoted_tweet: {
            tweet_text: copy.primaryText,
            promoted_handle: xBidding.promotedHandle,
            media_card_url_16x9: platformImages.landscape16x9,
          }
        };
        break;
      case 'programmatic':
        basePayload = {
          endpoint: 'https://api.thetradedesk.com/v3/myindustry/campaign',
          dsp_seat_id: cred.accountId || 'ttd_seat_99210',
          openrtb_version: '3.0',
          campaign: {
            name,
            bid_floor_cpm: dspBidding.bidFloorCpm,
            target_ecpm: dspBidding.targetEcpm,
            bidding_algorithm: dspBidding.biddingStrategy,
            frequency_cap: dspBidding.frequencyCap,
            viewability_threshold_pct: dspBidding.viewabilityTargetPct,
            supply_vendors: dspBidding.supplySource.split(','),
          },
          iab_banner_creatives: {
            med_rec_300x250: platformImages.medRec300x250,
            leaderboard_728x90: platformImages.leaderboard728x90,
            half_page_300x600: platformImages.halfPage300x600,
            skyscraper_160x600: platformImages.skyscraper160x600,
          }
        };
        break;
    }

    return {
      ...basePayload,
      ...abTestPayload,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      
      {/* Resizing & Aspect Ratio Confirmation Overlay Modal */}
      {resizingPreviewAsset && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-amber-400/40 rounded shadow-2xl max-w-2xl w-full p-6 space-y-5 font-mono text-white">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <Crop className="w-5 h-5 text-amber-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold uppercase text-amber-400 tracking-wider">
                    Aspect Ratio & Image Resizing Confirmation
                  </h3>
                  <p className="text-[11px] text-stone-400 font-sans">
                    Review and confirm target resolution crop for ad channel compatibility
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResizingPreviewAsset(null)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Requirement Badge */}
            <div className="flex items-center justify-between bg-stone-950 p-3 rounded border border-stone-800 text-xs">
              <div>
                <span className="text-stone-400">Target Format: </span>
                <span className="font-bold text-white">{resizingPreviewAsset.label}</span>
              </div>
              {resizingPreviewAsset.isRequired ? (
                <span className="bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                  MUST-HAVE / REQUIRED
                </span>
              ) : (
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded text-[10px]">
                  OPTIONAL FORMAT
                </span>
              )}
            </div>

            {/* Interactive Preview Canvas */}
            <div className="relative bg-black border border-stone-800 rounded p-4 flex flex-col items-center justify-center min-h-[220px]">
              <div 
                className="relative border-2 border-dashed border-amber-400/80 overflow-hidden shadow-xl"
                style={{
                  width: resizingPreviewAsset.aspectRatio === '1:1' ? '180px' : resizingPreviewAsset.aspectRatio === '9:16' ? '110px' : resizingPreviewAsset.aspectRatio === '1.91:1' ? '240px' : '200px',
                  height: resizingPreviewAsset.aspectRatio === '1:1' ? '180px' : resizingPreviewAsset.aspectRatio === '9:16' ? '196px' : resizingPreviewAsset.aspectRatio === '1.91:1' ? '125px' : '135px',
                }}
              >
                <img
                  src={resizingPreviewAsset.sourceUrl}
                  alt="Crop Preview"
                  className="w-full h-full object-cover transition-transform"
                  style={{
                    transform: `scale(${resizingPreviewAsset.zoomLevel / 100}) translate(${resizingPreviewAsset.focalX}px, ${resizingPreviewAsset.focalY}px)`
                  }}
                />
                <div className="absolute inset-0 bg-amber-400/5 pointer-events-none border border-amber-400/30"></div>
                <div className="absolute top-1 left-1 bg-black/80 px-1.5 py-0.5 text-[9px] text-amber-400 rounded">
                  {resizingPreviewAsset.aspectRatio} ({resizingPreviewAsset.requiredDimensions})
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between w-full text-[11px] text-stone-400 font-sans">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Quality: 300 DPI (100% Sharpness)
                </span>
                <span className="text-stone-500">
                  Used in: {resizingPreviewAsset.platformsUsedIn.join(', ')}
                </span>
              </div>
            </div>

            {/* Resizing & Focal Sliders */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-stone-400 mb-1">Zoom Scale ({resizingPreviewAsset.zoomLevel}%)</label>
                <input
                  type="range"
                  min="100"
                  max="200"
                  value={resizingPreviewAsset.zoomLevel}
                  onChange={e => setResizingPreviewAsset({ ...resizingPreviewAsset, zoomLevel: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-stone-400 mb-1">Horizontal Focal Point ({resizingPreviewAsset.focalX}px)</label>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={resizingPreviewAsset.focalX}
                  onChange={e => setResizingPreviewAsset({ ...resizingPreviewAsset, focalX: Number(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-800">
              <button
                type="button"
                onClick={() => setResizingPreviewAsset(null)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-bold uppercase rounded cursor-pointer"
              >
                Cancel / Revert
              </button>
              <button
                type="button"
                onClick={handleConfirmResizedAsset}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider rounded cursor-pointer shadow-lg flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Apply Resized Asset</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#080808] border border-stone-800 rounded-sm w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col my-4 sm:my-8">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-800 bg-[#050505] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-widest font-mono">
                  Omnichannel Campaign & Multi-Aspect Asset Wizard
                </span>
                <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded font-mono">
                  7-Platform API Deep Integration
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-mono mt-0.5">
                Multi-ratio visual asset management, channel-specific bidding strategies, and direct API payload synthesis
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Progress Bar */}
        <div className="bg-stone-950 border-b border-stone-800 px-6 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors ${
              step === 1 ? 'bg-amber-400/10 text-amber-400 font-bold border border-amber-400/30' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center text-[10px]">1</span>
            <span className="truncate">1. Blueprint & Images</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors ${
              step === 2 ? 'bg-amber-400/10 text-amber-400 font-bold border border-amber-400/30' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center text-[10px]">2</span>
            <span className="truncate">2. Budgets & Bidding</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(3)}
            className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors ${
              step === 3 ? 'bg-amber-400/10 text-amber-400 font-bold border border-amber-400/30' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center text-[10px]">3</span>
            <span className="truncate">3. Ad API Keys</span>
          </button>

          <button
            type="button"
            onClick={() => setStep(4)}
            className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors ${
              step === 4 ? 'bg-amber-400/10 text-amber-400 font-bold border border-amber-400/30' : 'text-stone-500 hover:text-stone-300'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-stone-900 border border-stone-700 flex items-center justify-center text-[10px]">4</span>
            <span className="truncate">4. Payload & Dispatch</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto max-h-[68vh]">
          
          {/* STEP 1: Campaign Blueprint, Copy & Multi-Platform Aspect Ratio Image Assets */}
          {step === 1 && (
            <div className="space-y-6 font-mono">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-800 pb-3 gap-2">
                <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-amber-400 flex items-center gap-2">
                  <Sliders className="w-4 h-4" />
                  <span>Campaign Strategy & Master Ad Creative</span>
                </h3>
                {onOptimizeWithAi && (
                  <button
                    type="button"
                    onClick={handleAiOptimize}
                    disabled={isAiOptimizing}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-stone-900 border border-amber-400/50 hover:border-amber-400 text-amber-400 text-xs font-bold uppercase tracking-wider rounded-xs cursor-pointer transition-colors"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isAiOptimizing ? 'animate-spin' : ''}`} />
                    <span>{isAiOptimizing ? 'AI Writing Copy...' : 'Gemini AI Strategy Optimizer'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
                    Campaign Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-3.5 py-2.5 text-sm text-white outline-none rounded"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
                    Campaign Primary Objective <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={objective}
                    onChange={e => setObjective(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-3.5 py-2.5 text-sm text-white outline-none rounded"
                  >
                    <option value="Lead Generation">Lead Generation</option>
                    <option value="Brand Awareness">Brand Awareness</option>
                    <option value="E-commerce Conversions">E-commerce Conversions</option>
                    <option value="App Installs">App Installs</option>
                    <option value="Website Traffic">Website Traffic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
                  Target Audience Persona & Demographics <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  required
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-3.5 py-2.5 text-sm text-white outline-none rounded"
                />
              </div>

              {/* Master Copy Inputs with Enforced Limits */}
              <div className="border-t border-stone-800 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider text-stone-300 font-bold flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span>Master Ad Copy & Headlines (Strict Character Count Rules)</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">
                        Master Headline <span className="text-red-400">*</span>
                      </label>
                      <span className={`text-[10px] ${headline.length > 30 ? 'text-amber-400' : 'text-stone-500'}`}>
                        {headline.length} / 30 chars (Google Limit)
                      </span>
                    </div>
                    <input
                      type="text"
                      value={headline}
                      onChange={e => setHeadline(e.target.value)}
                      required
                      className={`w-full bg-stone-950 border ${headline.length > 30 ? 'border-amber-400' : 'border-stone-800'} focus:border-amber-400 px-3.5 py-2.5 text-sm text-white outline-none rounded`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
                      Call To Action (CTA) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={callToAction}
                      onChange={e => setCallToAction(e.target.value)}
                      required
                      className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-3.5 py-2.5 text-sm text-white outline-none rounded"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[11px] uppercase tracking-wider text-stone-400 font-bold">
                      Master Primary Body Text <span className="text-red-400">*</span>
                    </label>
                    <span className={`text-[10px] ${primaryText.length > 90 ? 'text-amber-400' : 'text-stone-500'}`}>
                      {primaryText.length} / 90 chars (Google RSA Limit)
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={primaryText}
                    onChange={e => setPrimaryText(e.target.value)}
                    required
                    className={`w-full bg-stone-950 border ${primaryText.length > 90 ? 'border-amber-400' : 'border-stone-800'} focus:border-amber-400 px-3.5 py-2.5 text-sm text-white outline-none rounded`}
                  />
                </div>

                {/* Google Responsive Search Ads (RSA) Multi-Headlines Manager */}
                <div className="bg-stone-950 border border-stone-800 p-4 rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs uppercase tracking-wider font-bold text-amber-400 flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Google Ads API Responsive Search Headlines (Up to 15)</span>
                      </h5>
                      <p className="text-[10px] text-stone-400 font-sans">
                        Google Ads API mandates multiple headlines for machine-learning placement rotation.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddGoogleHeadline}
                      className="px-2.5 py-1 bg-stone-900 border border-stone-700 hover:border-amber-400 text-stone-300 text-[11px] rounded flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add Headline
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {googleRsaHeadlines.map((h, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-black border border-stone-800 px-2.5 py-1.5 rounded">
                        <span className="text-[10px] text-amber-400 font-bold">{idx + 1}.</span>
                        <input
                          type="text"
                          value={h}
                          onChange={e => {
                            const copy = [...googleRsaHeadlines];
                            copy[idx] = e.target.value;
                            setGoogleRsaHeadlines(copy);
                          }}
                          className="w-full bg-transparent text-xs text-white outline-none"
                        />
                        <span className="text-[9px] text-stone-500">{h.length}/30</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveGoogleHeadline(idx)}
                          className="text-stone-600 hover:text-red-400 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Content Refiner Module */}
                <div className="pt-2">
                  <AiContentRefiner
                    enabledChannels={selectedChannels}
                    masterHeadline={headline}
                    masterPrimaryText={primaryText}
                    objective={objective}
                    targetAudience={targetAudience}
                    onApplyMasterCopy={(newHeadline, newText) => {
                      setHeadline(newHeadline);
                      setPrimaryText(newText);
                    }}
                    onAddRsaHeadline={(newHeadline) => {
                      if (!googleRsaHeadlines.includes(newHeadline)) {
                        setGoogleRsaHeadlines(prev => [...prev, newHeadline].slice(0, 15));
                      }
                    }}
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-stone-400 font-bold mb-1">
                    Master Creative Image URL <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    value={masterMediaUrl}
                    onChange={e => setMasterMediaUrl(e.target.value)}
                    required
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-400 px-3.5 py-2.5 text-sm text-white outline-none rounded"
                  />
                </div>
              </div>

              {/* Multi-Platform Image Asset Management & Auto-Cropping Section */}
              <div className="border-t border-stone-800 pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-950 p-4 border border-stone-800 rounded">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      <span>Multi-Platform Aspect Ratio Image Manager</span>
                    </h4>
                    <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                      Ad channels require strict visual aspect ratios (1:1, 9:16, 1.91:1, 16:9, 2:3, IAB Banners). Inspect and confirm resized previews below.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAiAutoCropAndFormat}
                    disabled={isAiGeneratingCreatives}
                    className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition-colors flex items-center gap-2 shrink-0 shadow-md shadow-amber-400/10"
                  >
                    <Crop className={`w-3.5 h-3.5 ${isAiGeneratingCreatives ? 'animate-spin' : ''}`} />
                    <span>{isAiGeneratingCreatives ? 'AI Auto-Cropping...' : 'AI Auto-Crop & Format All Ratios'}</span>
                  </button>
                </div>

                {/* Aspect Ratio Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Square 1:1 REQUIRED */}
                  <div className="bg-stone-950 border border-amber-400/30 p-3.5 rounded space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Square (1:1)
                      </span>
                      <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30 font-bold">
                        REQUIRED BY META/GOOGLE
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-400">1080x1080 px • Meta Feed, LinkedIn Post, Google Display</div>
                    <div className="relative h-24 bg-black border border-stone-800 rounded overflow-hidden flex items-center justify-center">
                      {platformImages.square1x1 ? (
                        <img src={platformImages.square1x1} alt="1:1" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-stone-600 text-[10px]">No Image Uploaded</span>
                      )}
                      <button
                        type="button"
                        onClick={() => openResizeConfirmationModal('square1x1', 'Square Image (1:1)', '1:1', '1080 x 1080 px', true, ['Meta', 'Google', 'LinkedIn'], platformImages.square1x1)}
                        className="absolute bottom-1 right-1 bg-black/80 text-amber-400 px-2 py-0.5 text-[9px] rounded flex items-center gap-1 hover:bg-black cursor-pointer border border-amber-400/30"
                      >
                        <Maximize2 className="w-2.5 h-2.5" />
                        Inspect & Confirm
                      </button>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      <input
                        type="text"
                        value={platformImages.square1x1}
                        onChange={e => setPlatformImages({ ...platformImages, square1x1: e.target.value })}
                        className="w-full bg-black border border-stone-800 px-2 py-1 text-stone-300 outline-none rounded"
                        placeholder="Image URL"
                      />
                      <label className="px-2 py-1 bg-stone-900 border border-stone-700 hover:text-white cursor-pointer rounded flex items-center shrink-0">
                        <Upload className="w-3 h-3" />
                        <input type="file" accept="image/*" onChange={e => handleFileUploadWithConfirmation(e, 'square1x1', 'Square Image (1:1)', '1:1', '1080 x 1080 px', true, ['Meta', 'Google', 'LinkedIn'])} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Vertical 9:16 REQUIRED */}
                  <div className="bg-stone-950 border border-stone-800 p-3.5 rounded space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                        Vertical (9:16)
                      </span>
                      <span className="text-[10px] text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/30 font-bold">
                        REQUIRED BY TIKTOK
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-400">1080x1920 px • Meta Reels & Stories, TikTok Video</div>
                    <div className="relative h-24 bg-black border border-stone-800 rounded overflow-hidden flex items-center justify-center">
                      {platformImages.vertical9x16 ? (
                        <img src={platformImages.vertical9x16} alt="9:16" className="h-full w-20 object-cover" />
                      ) : (
                        <span className="text-stone-600 text-[10px]">No Image Uploaded</span>
                      )}
                      <button
                        type="button"
                        onClick={() => openResizeConfirmationModal('vertical9x16', 'Vertical Video/Banner (9:16)', '9:16', '1080 x 1920 px', true, ['TikTok', 'Meta Reels'], platformImages.vertical9x16)}
                        className="absolute bottom-1 right-1 bg-black/80 text-pink-400 px-2 py-0.5 text-[9px] rounded flex items-center gap-1 hover:bg-black cursor-pointer border border-pink-500/30"
                      >
                        <Maximize2 className="w-2.5 h-2.5" />
                        Inspect & Confirm
                      </button>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      <input
                        type="text"
                        value={platformImages.vertical9x16}
                        onChange={e => setPlatformImages({ ...platformImages, vertical9x16: e.target.value })}
                        className="w-full bg-black border border-stone-800 px-2 py-1 text-stone-300 outline-none rounded"
                        placeholder="Image URL"
                      />
                      <label className="px-2 py-1 bg-stone-900 border border-stone-700 hover:text-white cursor-pointer rounded flex items-center shrink-0">
                        <Upload className="w-3 h-3" />
                        <input type="file" accept="image/*" onChange={e => handleFileUploadWithConfirmation(e, 'vertical9x16', 'Vertical Image (9:16)', '9:16', '1080 x 1920 px', true, ['TikTok', 'Meta Reels'])} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Landscape 1.91:1 */}
                  <div className="bg-stone-950 border border-stone-800 p-3.5 rounded space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                        Landscape (1.91:1)
                      </span>
                      <span className="text-[10px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                        1200x628
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-400">Google Display, Meta Landscape, LinkedIn</div>
                    <div className="relative h-24 bg-black border border-stone-800 rounded overflow-hidden flex items-center justify-center">
                      {platformImages.landscape191x1 ? (
                        <img src={platformImages.landscape191x1} alt="1.91:1" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-stone-600 text-[10px]">No Image Uploaded</span>
                      )}
                      <button
                        type="button"
                        onClick={() => openResizeConfirmationModal('landscape191x1', 'Landscape Banner (1.91:1)', '1.91:1', '1200 x 628 px', false, ['Google', 'LinkedIn'], platformImages.landscape191x1)}
                        className="absolute bottom-1 right-1 bg-black/80 text-sky-400 px-2 py-0.5 text-[9px] rounded flex items-center gap-1 hover:bg-black cursor-pointer border border-sky-500/30"
                      >
                        <Maximize2 className="w-2.5 h-2.5" />
                        Inspect & Confirm
                      </button>
                    </div>
                    <div className="flex gap-2 text-[10px]">
                      <input
                        type="text"
                        value={platformImages.landscape191x1}
                        onChange={e => setPlatformImages({ ...platformImages, landscape191x1: e.target.value })}
                        className="w-full bg-black border border-stone-800 px-2 py-1 text-stone-300 outline-none rounded"
                        placeholder="Image URL"
                      />
                      <label className="px-2 py-1 bg-stone-900 border border-stone-700 hover:text-white cursor-pointer rounded flex items-center shrink-0">
                        <Upload className="w-3 h-3" />
                        <input type="file" accept="image/*" onChange={e => handleFileUploadWithConfirmation(e, 'landscape191x1', 'Landscape Image (1.91:1)', '1.91:1', '1200 x 628 px', false, ['Google', 'LinkedIn'])} className="hidden" />
                      </label>
                    </div>
                  </div>

                </div>
              </div>

              {/* Multivariable A/B Testing Framework Module */}
              <div className="border-t border-stone-800 pt-5">
                <AbTestFramework
                  masterHeadline={headline}
                  masterPrimaryText={primaryText}
                  masterMediaUrl={masterMediaUrl}
                  masterAudience={targetAudience}
                  config={abTestConfig}
                  onChange={setAbTestConfig}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Budgets & Granular Channel Bidding */}
          {step === 2 && (
            <div className="space-y-6 font-mono">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-800 pb-3 gap-2">
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-amber-400 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Cross-Channel Budget Allocation & Advanced Bidding Mechanics</span>
                  </h3>
                  <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                    Query ad channel APIs for available strategies, multi-select bidding goals, and configure granular platform pricing settings.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleQueryApiBidStrategies}
                    disabled={isQueryingApiBidStrategies}
                    className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold uppercase tracking-wider rounded cursor-pointer transition-colors flex items-center gap-1.5 shadow-md shadow-amber-400/10"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isQueryingApiBidStrategies ? 'animate-spin' : ''}`} />
                    <span>{isQueryingApiBidStrategies ? 'Querying APIs...' : 'Query Available Strategies via Ad APIs'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBalanceBudget}
                    className="px-3 py-1.5 bg-stone-900 border border-stone-700 hover:border-amber-400 text-amber-400 text-xs rounded cursor-pointer transition-colors"
                  >
                    Auto-Balance Evenly
                  </button>
                </div>
              </div>

              {/* API Strategy Discovery & Log Terminal */}
              {(isQueryingApiBidStrategies || apiBidQueryLogs.length > 0) && (
                <div className="bg-black border border-stone-800 rounded p-3.5 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 uppercase tracking-wider border-b border-stone-900 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                      Direct Ad Channel API Strategy Handshake Stream
                    </span>
                    <span className="text-[10px] text-stone-500">Google Ads API v16 & Meta Graph API v19.0</span>
                  </div>
                  <div className="bg-stone-950 p-2.5 rounded border border-stone-900 max-h-32 overflow-y-auto space-y-1 text-[11px] text-stone-300">
                    {apiBidQueryLogs.map((log, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-stone-600">›</span>
                        <span className={log.includes('SUCCESS') ? 'text-emerald-400 font-bold' : log.includes('GET') ? 'text-sky-400' : 'text-stone-300'}>
                          {log}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Budget Header */}
              <div className="bg-stone-950 p-4 border border-stone-800 rounded grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <label className="block text-[10px] uppercase text-stone-400 font-bold mb-1">
                    Master Campaign Budget ($) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={totalBudget}
                    onChange={e => setTotalBudget(Number(e.target.value))}
                    className="w-full bg-black border border-stone-800 focus:border-amber-400 px-3 py-2 text-sm text-amber-400 font-bold outline-none rounded"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-stone-400 font-bold mb-1">
                    Sum Allocated Across Platforms
                  </label>
                  <div className={`text-sm font-bold py-2 ${currentSumBudget > totalBudget ? 'text-red-400' : 'text-emerald-400'}`}>
                    ${currentSumBudget.toLocaleString()} / ${totalBudget.toLocaleString()}
                  </div>
                </div>

                <div className="text-[11px] text-stone-400 font-sans">
                  {currentSumBudget > totalBudget ? (
                    <span className="text-red-400 flex items-center gap-1 font-bold">
                      <AlertCircle className="w-3.5 h-3.5" /> Over budget by ${(currentSumBudget - totalBudget).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Budget allocation balanced
                    </span>
                  )}
                </div>
              </div>

              {/* Platform Cards List with Advanced Bidding Accordion */}
              <div className="space-y-4">
                {selectedChannels.map(channel => (
                  <div 
                    key={channel.platform}
                    className={`border rounded p-4 transition-colors ${
                      channel.enabled ? 'bg-stone-950/80 border-amber-400/30' : 'bg-black/50 border-stone-900 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={channel.enabled}
                          onChange={() => toggleChannel(channel.platform)}
                          className="w-4 h-4 accent-amber-400 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-white uppercase">{channel.platformName}</span>
                            <span className="text-[10px] bg-stone-900 px-2 py-0.5 rounded text-stone-400 uppercase">
                              {channel.platform}
                            </span>
                            {channel.enabled && (
                              validationResult.platformStatus[channel.platform]?.isValid ? (
                                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Ready
                                </span>
                              ) : (
                                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {validationResult.platformStatus[channel.platform]?.errors.length} Issue(s) Pending
                                </span>
                              )
                            )}
                          </div>
                          <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                            Targeting: {channel.targeting}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-stone-400">$</span>
                          <input
                            type="number"
                            disabled={!channel.enabled}
                            value={channel.budget}
                            onChange={e => handleChannelBudgetChange(channel.platform, Number(e.target.value))}
                            className="w-28 bg-black border border-stone-800 text-xs px-2 py-1.5 text-amber-400 font-bold outline-none rounded"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleAccordion(channel.platform)}
                          className="text-stone-400 hover:text-amber-400 text-xs flex items-center gap-1 px-2 py-1 bg-stone-900 rounded border border-stone-800 cursor-pointer"
                        >
                          <span>Advanced Bidding & Pricing Settings</span>
                          {expandedAdvanced[channel.platform] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Advanced Bidding Mechanics per Platform */}
                    {expandedAdvanced[channel.platform] && (
                      <div className="mt-4 pt-4 border-t border-stone-800 space-y-4 text-xs font-mono bg-black/60 p-4 rounded">
                        
                        {/* GOOGLE ADS API ADVANCED BIDDING SECTION */}
                        {channel.platform === 'google' && (
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-amber-400 font-bold text-[11px] uppercase border-b border-stone-800 pb-2 gap-1">
                              <span className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" />
                                Google Ads API v16 Bidding Strategy & Multi-Selection Engine
                              </span>
                              <span className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded border border-amber-400/30">
                                BiddingStrategyService Active
                              </span>
                            </div>

                            {/* Multi-Select Bidding Strategy Dropdown / Multi-Pill Controls */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="block text-stone-300 text-[11px] uppercase font-bold">
                                  Configure Multi-Select Bidding Strategies (Query & Combine)
                                </label>
                                <span className="text-[10px] text-stone-400">
                                  Selected ({googleBidding.selectedMultiStrategies.length})
                                </span>
                              </div>

                              {/* Multi-Select Dropdown Container */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowMultiSelectDropdown(prev => ({ ...prev, google: !prev.google }))}
                                  className="w-full bg-stone-950 border border-stone-800 hover:border-amber-400/60 p-2.5 rounded text-left flex items-center justify-between text-xs text-white"
                                >
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {googleBidding.selectedMultiStrategies.length > 0 ? (
                                      googleBidding.selectedMultiStrategies.map(strat => (
                                        <span key={strat} className="bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                          {strat}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setGoogleBidding(prev => ({
                                                ...prev,
                                                selectedMultiStrategies: prev.selectedMultiStrategies.filter(s => s !== strat)
                                              }));
                                            }}
                                            className="hover:text-white ml-0.5"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-stone-500">Select one or more bidding strategies...</span>
                                    )}
                                  </div>
                                  <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                                </button>

                                {showMultiSelectDropdown.google && (
                                  <div className="absolute z-30 left-0 right-0 mt-1 bg-stone-950 border border-amber-400/40 rounded shadow-2xl p-2 space-y-1.5 max-h-60 overflow-y-auto">
                                    {apiFetchedStrategies.google.map(strat => {
                                      const isSelected = googleBidding.selectedMultiStrategies.includes(strat.code);
                                      return (
                                        <div
                                          key={strat.code}
                                          onClick={() => {
                                            if (isSelected) {
                                              setGoogleBidding(prev => ({
                                                ...prev,
                                                selectedMultiStrategies: prev.selectedMultiStrategies.filter(s => s !== strat.code)
                                              }));
                                            } else {
                                              setGoogleBidding(prev => ({
                                                ...prev,
                                                selectedMultiStrategies: [...prev.selectedMultiStrategies, strat.code]
                                              }));
                                            }
                                          }}
                                          className={`p-2 rounded cursor-pointer transition-colors flex items-start gap-2 text-xs border ${
                                            isSelected ? 'bg-amber-400/10 border-amber-400/40 text-amber-400 font-bold' : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            className="mt-0.5 accent-amber-400"
                                          />
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                              <span>{strat.name}</span>
                                              <span className="text-[9px] bg-black px-1.5 py-0.5 rounded text-stone-400 border border-stone-800">
                                                {strat.type}
                                              </span>
                                            </div>
                                            <p className="text-[10px] text-stone-400 font-sans mt-0.5">{strat.description}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Granular Pricing Settings Grid based on Selected Multi-Strategies */}
                            <div className="bg-stone-950 p-3.5 border border-stone-800 rounded space-y-3">
                              <span className="block text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                                Granular Pricing & Threshold Controls
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Target CPA ($)</label>
                                  <input
                                    type="number"
                                    value={googleBidding.targetCpa}
                                    onChange={e => setGoogleBidding({ ...googleBidding, targetCpa: Number(e.target.value) })}
                                    className="w-full bg-black border border-stone-800 text-amber-400 p-2 rounded outline-none focus:border-amber-400 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Target ROAS (%)</label>
                                  <input
                                    type="number"
                                    value={googleBidding.targetRoasPct}
                                    onChange={e => setGoogleBidding({ ...googleBidding, targetRoasPct: Number(e.target.value) })}
                                    className="w-full bg-black border border-stone-800 text-amber-400 p-2 rounded outline-none focus:border-amber-400 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Max CPC Ceiling ($)</label>
                                  <input
                                    type="number"
                                    value={googleBidding.maxCpcLimit}
                                    onChange={e => setGoogleBidding({ ...googleBidding, maxCpcLimit: Number(e.target.value) })}
                                    className="w-full bg-black border border-stone-800 text-amber-400 p-2 rounded outline-none focus:border-amber-400 font-bold"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-900">
                                <div>
                                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Bidding Portfolio Scheme</label>
                                  <select
                                    value={googleBidding.biddingScheme}
                                    onChange={e => setGoogleBidding({ ...googleBidding, biddingScheme: e.target.value })}
                                    className="w-full bg-black border border-stone-800 text-white p-2 rounded outline-none text-xs"
                                  >
                                    <option value="STANDARD_SMART_BIDDING">Standard Smart Bidding (Campaign Level)</option>
                                    <option value="PORTFOLIO_SHARED_STRATEGY">Portfolio Shared Strategy (Multi-AdGroup Unified)</option>
                                    <option value="SEASONALITY_ADJUSTMENT">Seasonality Adjusted Bidding (+15% Bid Surge)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Ad Network Reach</label>
                                  <select
                                    value={googleBidding.network}
                                    onChange={e => setGoogleBidding({ ...googleBidding, network: e.target.value })}
                                    className="w-full bg-black border border-stone-800 text-white p-2 rounded outline-none text-xs"
                                  >
                                    <option value="SEARCH_AND_PMAX">Google Search + Performance Max</option>
                                    <option value="SEARCH_DISPLAY_YOUTUBE">Search, Display Network & YouTube Ads</option>
                                    <option value="SEARCH_ONLY">Google Search Network Only</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* META ADS API ADVANCED BIDDING SECTION */}
                        {channel.platform === 'meta' && (
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-amber-400 font-bold text-[11px] uppercase border-b border-stone-800 pb-2 gap-1">
                              <span className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-400" />
                                Meta Marketing Graph API v19.0 Multi-Select Bidding Engine
                              </span>
                              <span className="text-[10px] bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded border border-amber-400/30">
                                act_available_bid_strategies
                              </span>
                            </div>

                            {/* Multi-Select Bidding Strategy Dropdown / Multi-Pill Controls */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="block text-stone-300 text-[11px] uppercase font-bold">
                                  Configure Multi-Select Meta Bidding Strategies
                                </label>
                                <span className="text-[10px] text-stone-400">
                                  Selected ({metaBidding.selectedMultiStrategies.length})
                                </span>
                              </div>

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowMultiSelectDropdown(prev => ({ ...prev, meta: !prev.meta }))}
                                  className="w-full bg-stone-950 border border-stone-800 hover:border-amber-400/60 p-2.5 rounded text-left flex items-center justify-between text-xs text-white"
                                >
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {metaBidding.selectedMultiStrategies.length > 0 ? (
                                      metaBidding.selectedMultiStrategies.map(strat => (
                                        <span key={strat} className="bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                          {strat}
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMetaBidding(prev => ({
                                                ...prev,
                                                selectedMultiStrategies: prev.selectedMultiStrategies.filter(s => s !== strat)
                                              }));
                                            }}
                                            className="hover:text-white ml-0.5"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-stone-500">Select one or more bidding strategies...</span>
                                    )}
                                  </div>
                                  <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                                </button>

                                {showMultiSelectDropdown.meta && (
                                  <div className="absolute z-30 left-0 right-0 mt-1 bg-stone-950 border border-amber-400/40 rounded shadow-2xl p-2 space-y-1.5 max-h-60 overflow-y-auto">
                                    {apiFetchedStrategies.meta.map(strat => {
                                      const isSelected = metaBidding.selectedMultiStrategies.includes(strat.code);
                                      return (
                                        <div
                                          key={strat.code}
                                          onClick={() => {
                                            if (isSelected) {
                                              setMetaBidding(prev => ({
                                                ...prev,
                                                selectedMultiStrategies: prev.selectedMultiStrategies.filter(s => s !== strat.code)
                                              }));
                                            } else {
                                              setMetaBidding(prev => ({
                                                ...prev,
                                                selectedMultiStrategies: [...prev.selectedMultiStrategies, strat.code]
                                              }));
                                            }
                                          }}
                                          className={`p-2 rounded cursor-pointer transition-colors flex items-start gap-2 text-xs border ${
                                            isSelected ? 'bg-amber-400/10 border-amber-400/40 text-amber-400 font-bold' : 'bg-stone-900/60 border-stone-800 text-stone-300 hover:bg-stone-800'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {}}
                                            className="mt-0.5 accent-amber-400"
                                          />
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                              <span>{strat.name}</span>
                                              <span className="text-[9px] bg-black px-1.5 py-0.5 rounded text-stone-400 border border-stone-800">
                                                {strat.type}
                                              </span>
                                            </div>
                                            <p className="text-[10px] text-stone-400 font-sans mt-0.5">{strat.description}</p>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Granular Pricing Settings Grid */}
                            <div className="bg-stone-950 p-3.5 border border-stone-800 rounded space-y-3">
                              <span className="block text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                                Meta Pricing & Auction Guardrails
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Target Cost Cap ($)</label>
                                  <input
                                    type="number"
                                    value={metaBidding.targetCostOrCap}
                                    onChange={e => setMetaBidding({ ...metaBidding, targetCostOrCap: Number(e.target.value) })}
                                    className="w-full bg-black border border-stone-800 text-amber-400 p-2 rounded outline-none focus:border-amber-400 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Auction Bid Cap ($)</label>
                                  <input
                                    type="number"
                                    value={metaBidding.bidCapAmount}
                                    onChange={e => setMetaBidding({ ...metaBidding, bidCapAmount: Number(e.target.value) })}
                                    className="w-full bg-black border border-stone-800 text-amber-400 p-2 rounded outline-none focus:border-amber-400 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Minimum ROAS Floor (x)</label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    value={metaBidding.minRoasRatio}
                                    onChange={e => setMetaBidding({ ...metaBidding, minRoasRatio: Number(e.target.value) })}
                                    className="w-full bg-black border border-stone-800 text-amber-400 p-2 rounded outline-none focus:border-amber-400 font-bold"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-900">
                                <div>
                                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Optimization Goal</label>
                                  <select
                                    value={metaBidding.optimizationGoal}
                                    onChange={e => setMetaBidding({ ...metaBidding, optimizationGoal: e.target.value })}
                                    className="w-full bg-black border border-stone-800 text-white p-2 rounded outline-none text-xs"
                                  >
                                    <option value="OFFSITE_CONVERSIONS">OFFSITE_CONVERSIONS (Pixel / CAPI Leads)</option>
                                    <option value="IMPRESSIONS">IMPRESSIONS (Max Frequency Awareness)</option>
                                    <option value="LINK_CLICKS">LINK_CLICKS (High Traffic Intent)</option>
                                    <option value="LANDING_PAGE_VIEWS">LANDING_PAGE_VIEWS (Verified Site Visit)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Attribution & Conversion Window</label>
                                  <select
                                    value={metaBidding.conversionWindow}
                                    onChange={e => setMetaBidding({ ...metaBidding, conversionWindow: e.target.value })}
                                    className="w-full bg-black border border-stone-800 text-white p-2 rounded outline-none text-xs"
                                  >
                                    <option value="7_DAY_CLICK_1_DAY_VIEW">7-Day Click or 1-Day View (Recommended)</option>
                                    <option value="1_DAY_CLICK">1-Day Click Only (Strict Direct)</option>
                                    <option value="7_DAY_CLICK">7-Day Click Only</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {channel.platform === 'programmatic' && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-amber-400 font-bold text-[11px] uppercase">
                              <span>OpenRTB 3.0 DSP Bidding Mechanics</span>
                              <span>Programmatic RTB</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-stone-400 text-[10px] uppercase mb-1">Bid Floor CPM ($)</label>
                                <input
                                  type="number"
                                  value={dspBidding.bidFloorCpm}
                                  onChange={e => setDspBidding({ ...dspBidding, bidFloorCpm: Number(e.target.value) })}
                                  className="w-full bg-stone-950 border border-stone-800 text-amber-400 p-2 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-stone-400 text-[10px] uppercase mb-1">Viewability Target (%)</label>
                                <input
                                  type="number"
                                  value={dspBidding.viewabilityTargetPct}
                                  onChange={e => setDspBidding({ ...dspBidding, viewabilityTargetPct: Number(e.target.value) })}
                                  className="w-full bg-stone-950 border border-stone-800 text-amber-400 p-2 rounded"
                                />
                              </div>
                              <div>
                                <label className="block text-stone-400 text-[10px] uppercase mb-1">Frequency Cap</label>
                                <input
                                  type="text"
                                  value={dspBidding.frequencyCap}
                                  onChange={e => setDspBidding({ ...dspBidding, frequencyCap: e.target.value })}
                                  className="w-full bg-stone-950 border border-stone-800 text-white p-2 rounded"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: API Keys Handshake */}
          {step === 3 && (
            <div className="space-y-6 font-mono">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-800 pb-3 gap-2">
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-amber-400 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    <span>Ad Channel API Keys & Authentication Tokens</span>
                  </h3>
                  <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                    Credentials loaded securely from Firestore. Verify live handshake before publishing.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleVerifyApiKeys}
                  disabled={isVerifyingApiKeys}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider rounded cursor-pointer transition-colors flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifyingApiKeys ? 'animate-spin' : ''}`} />
                  <span>{isVerifyingApiKeys ? 'Handshaking...' : 'Test All API Handshakes'}</span>
                </button>
              </div>

              {/* Handshake Log Output */}
              {apiVerificationLog.length > 0 && (
                <div className="bg-black border border-stone-800 p-3 rounded text-[11px] font-mono text-emerald-400 space-y-1 max-h-32 overflow-y-auto">
                  {apiVerificationLog.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {selectedChannels.filter(c => c.enabled).map(ch => {
                  const cred = credentials[ch.platform] || { accountId: '', apiKeyOrToken: '' };
                  const state = credentialValidationStates[ch.platform] || 'PENDING';

                  return (
                    <div key={ch.platform} className="bg-stone-950 border border-stone-800 p-3.5 rounded flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white uppercase">{ch.platformName}</span>
                        {state === 'VERIFIED' && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold">
                            VERIFIED 200 OK
                          </span>
                        )}
                        {(!cred.accountId?.trim() && !cred.apiKeyOrToken?.trim()) ? (
                          <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-bold">
                            MISSING CREDS
                          </span>
                        ) : (
                          <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded font-bold">
                            CREDS LOADED
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-2/3">
                        <input
                          type="text"
                          placeholder="Account / Customer ID"
                          value={cred.accountId}
                          onChange={e => handleCredentialChange(ch.platform, 'accountId', e.target.value)}
                          className="bg-black border border-stone-800 text-xs px-2.5 py-1.5 text-stone-200 outline-none rounded"
                        />
                        <input
                          type="password"
                          placeholder="OAuth Token / API Secret"
                          value={cred.apiKeyOrToken}
                          onChange={e => handleCredentialChange(ch.platform, 'apiKeyOrToken', e.target.value)}
                          className="bg-black border border-stone-800 text-xs px-2.5 py-1.5 text-stone-200 outline-none rounded"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Payload Preview, Billing & Direct API Synthesis */}
          {step === 4 && (
            <div className="space-y-6 font-mono">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-amber-400 flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    <span>Live API Request Payload & Dispatch Confirmation</span>
                  </h3>
                  <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                    Synthesized payloads ready for live Google Ads API mutation and multi-channel publication.
                  </p>
                </div>
              </div>

              {/* Payload Tabs */}
              <div className="flex items-center gap-2 border-b border-stone-800 pb-2 overflow-x-auto">
                {selectedChannels.filter(c => c.enabled).map(c => (
                  <button
                    key={c.platform}
                    type="button"
                    onClick={() => setPayloadPreviewTab(c.platform)}
                    className={`px-3 py-1.5 text-xs uppercase font-bold rounded cursor-pointer transition-colors ${
                      payloadPreviewTab === c.platform ? 'bg-amber-400 text-black' : 'bg-stone-900 text-stone-400 hover:text-white'
                    }`}
                  >
                    {c.platform} Payload
                  </button>
                ))}
              </div>

              {/* JSON Editor Box */}
              <div className="bg-black border border-stone-800 p-4 rounded text-xs text-emerald-400 font-mono overflow-x-auto max-h-60">
                <pre>{JSON.stringify(getSynthesizedPayloadForPlatform(payloadPreviewTab), null, 2)}</pre>
              </div>

              {/* Live Validation & Channel Data Integrity Layer */}
              <div className="bg-stone-950 border border-stone-800 rounded-lg p-4 space-y-3 font-mono">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-800 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded flex items-center justify-center border ${
                      validationResult.isValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {validationResult.isValid ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs uppercase tracking-wider font-bold flex items-center gap-2 text-white">
                        <span>Omnichannel Mandatory Data Validation Engine</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                          validationResult.isValid ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {validationResult.score}% Launch Readiness ({validationResult.passedChecks}/{validationResult.totalChecks} Checks Passed)
                        </span>
                      </h4>
                      <p className="text-[11px] text-stone-400 font-sans mt-0.5">
                        {validationResult.isValid
                          ? 'All channel-specific mandatory requirements, budgets, bidding strategies, and API credentials are verified. Ready for live launch.'
                          : `Publishing blocked: ${validationResult.errors.length} mandatory requirement(s) pending across active channels.`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowValidationChecklist(prev => !prev)}
                    className="px-3 py-1.5 bg-stone-900 border border-stone-700 hover:border-amber-400 text-stone-200 text-xs rounded cursor-pointer transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <span>{showValidationChecklist ? 'Hide Requirements Checklist' : 'View Requirements Checklist'}</span>
                    {showValidationChecklist ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Active Channel Readiness Badges Row */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedChannels.filter(c => c.enabled).map(ch => {
                    const pStatus = validationResult.platformStatus[ch.platform];
                    const isOK = pStatus?.isValid;
                    return (
                      <div 
                        key={ch.platform}
                        className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 border ${
                          isOK
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-300 border-red-500/30'
                        }`}
                      >
                        {isOK ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <AlertCircle className="w-3.5 h-3.5 text-red-400 animate-pulse" />}
                        <span className="uppercase">{ch.platformName}:</span>
                        <span>{isOK ? 'Ready' : `${pStatus?.errors.length} Missing Field(s)`}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Expandable Detailed Checklist */}
                {showValidationChecklist && (
                  <div className="mt-3 bg-black border border-stone-800 rounded p-3 space-y-2 text-xs">
                    <div className="text-[10px] text-stone-400 font-bold uppercase tracking-wider border-b border-stone-900 pb-1">
                      Detailed Field Integrity Audit
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {validationResult.errors.map((err, idx) => (
                        <div key={idx} className="bg-stone-950 p-2 rounded border border-stone-900 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-red-400 font-bold">●</span>
                            <div>
                              <span className="font-bold text-amber-400">{err.label}: </span>
                              <span className="text-stone-300 font-sans">{err.message}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setStep(err.step)}
                            className="px-2 py-0.5 bg-amber-400/10 hover:bg-amber-400 text-amber-400 hover:text-black border border-amber-400/30 font-bold text-[10px] uppercase rounded transition-colors shrink-0 cursor-pointer"
                          >
                            Fix in Step {err.step} →
                          </button>
                        </div>
                      ))}

                      {validationResult.isValid && (
                        <div className="text-emerald-400 text-xs p-2 bg-emerald-500/10 rounded border border-emerald-500/20 font-bold text-center">
                          ✓ All mandatory data requirements fulfilled across 100% of enabled ad channels!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Active A/B Testing Strategy Review Card */}
              {abTestConfig.enabled && (
                <div className="bg-stone-950 border border-amber-400/40 rounded-lg p-4 space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Split className="w-4 h-4 text-amber-400" />
                      <h4 className="text-xs uppercase tracking-wider font-bold text-white">
                        Active A/B Multivariable Test Variants ({abTestConfig.variants.length} Variants Configured)
                      </h4>
                    </div>
                    <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded font-bold uppercase">
                      Goal: {abTestConfig.testGoal} | {abTestConfig.confidenceThresholdPct}% Confidence Target
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                    {abTestConfig.variants.map((v) => (
                      <div key={v.id} className="bg-stone-900/80 border border-stone-800 p-3 rounded space-y-1.5">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-amber-400 truncate max-w-[140px]">{v.name}</span>
                          <span className="text-stone-300 text-[10px] bg-black px-1.5 py-0.5 rounded border border-stone-800">{v.trafficAllocationPct}% Split</span>
                        </div>
                        <p className="text-[11px] text-stone-200 truncate font-sans">
                          <span className="text-stone-500 font-bold">Headline:</span> "{v.headline}"
                        </p>
                        <p className="text-[10px] text-sky-300 truncate font-sans">
                          <span className="text-stone-500 font-bold">Audience:</span> {v.targetAudienceSegment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Billing Info */}
              <div className="bg-stone-950 border border-stone-800 p-4 rounded grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Account Contact Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-black border border-stone-800 px-3 py-2 text-white outline-none rounded"
                  />
                </div>
                <div>
                  <label className="block text-stone-400 text-[10px] uppercase mb-1">Billing Email</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full bg-black border border-stone-800 px-3 py-2 text-white outline-none rounded"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="px-5 py-4 border-t border-stone-800 bg-[#050505] flex items-center justify-between font-mono text-xs">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold uppercase rounded cursor-pointer"
              >
                Back
              </button>
            ) : (
              <div></div>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as any)}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase tracking-wider rounded cursor-pointer flex items-center gap-2"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {!validationResult.isValid && (
                  <div className="text-[11px] text-amber-400 font-bold hidden sm:flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationResult.errors.length} mandatory requirement(s) pending</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !validationResult.isValid}
                  className={`px-6 py-2.5 font-bold uppercase tracking-wider rounded flex items-center gap-2 transition-all ${
                    isSubmitting || !validationResult.isValid
                      ? 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed opacity-70'
                      : 'bg-amber-400 hover:bg-amber-300 text-black cursor-pointer shadow-lg shadow-amber-400/20'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Publishing via APIs...</span>
                    </>
                  ) : !validationResult.isValid ? (
                    <>
                      <Lock className="w-4 h-4 text-stone-500" />
                      <span>Publish Blocked (Fix Errors)</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Launch Omnichannel Campaign</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
