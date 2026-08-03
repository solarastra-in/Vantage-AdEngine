export type PlatformType = 'meta' | 'google' | 'linkedin' | 'tiktok' | 'pinterest' | 'x' | 'programmatic';

export interface ChannelBudget {
  platform: PlatformType;
  platformName: string;
  budget: number;
  startDate: string;
  endDate: string;
  targeting: string;
  adFormat: string;
  enabled: boolean;
}

export interface AdCreative {
  headline: string;
  primaryText: string;
  callToAction: string;
  mediaUrl: string;
  /**
   * The landing page a click sends someone to. Every real ad platform
   * requires this to create an actual ad -- it was missing from this
   * type entirely, meaning no ad could ever be created beyond an empty
   * campaign/budget shell no matter how correct everything else was.
   */
  destinationUrl: string;
  /** Google Search RSA requires 3-15 headlines (<=30 chars each). */
  googleRsaHeadlines?: string[];
  /** Google Search RSA requires 2-4 descriptions (<=90 chars each). */
  googleRsaDescriptions?: string[];
  /** Search keywords for the Google Ads ad group -- without these, a Search campaign has nothing to match queries against and will never serve. */
  googleKeywords?: string[];
}

export interface PlatformPublishStatus {
  platform: PlatformType;
  status: 'draft' | 'publishing' | 'live' | 'failed';
  externalId?: string;
  publishedAt?: string;
  error?: string;
}

export interface AbTestVariant {
  id: string;
  name: string;
  isControl?: boolean;
  headline: string;
  primaryText?: string;
  mediaUrl: string;
  targetAudienceSegment: string;
  trafficAllocationPct: number;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    ctr: number;
    cpc: number;
    cpa: number;
    roas: number;
    confidenceScorePct: number;
    conversionLiftPct: number;
    hasEnoughSample?: boolean;
    minimumSampleRequired?: number;
  };
  status: 'leading' | 'losing' | 'control' | 'inconclusive';
}

export interface AbTestConfig {
  enabled: boolean;
  testGoal: 'CTR' | 'CPA' | 'ROAS' | 'Conversions' | 'Volume';
  minSampleImpressions: number;
  confidenceThresholdPct: number;
  autoPromoteWinner: boolean;
  variants: AbTestVariant[];
}

export interface PlatformCreativeOverride {
  headline: string;
  primaryText: string;
  callToAction: string;
  mediaUrl?: string;
}

export interface CampaignActivityEntry {
  id: string;
  timestamp: string;
  type: 'status_change' | 'publish_attempt' | 'edit' | 'budget_change' | 'ab_test' | 'system';
  title: string;
  description: string;
  actor?: string;
  platform?: PlatformType;
  metadata?: Record<string, any>;
  status?: 'success' | 'warning' | 'error' | 'info';
}

export interface Campaign {
  id: string;
  orgId?: string; // tenant scoping -- defaults to DEFAULT_ORG_ID server-side if absent (src/lib/tenantContext.server.ts)
  name: string;
  objective: 'Brand Awareness' | 'Lead Generation' | 'E-commerce Conversions' | 'App Installs' | 'Website Traffic';
  status: 'draft' | 'publishing' | 'active' | 'paused' | 'completed';
  totalBudget: number;
  spentBudget: number;
  startDate: string;
  endDate: string;
  targetAudience: string;
  channels: ChannelBudget[];
  creative: AdCreative;
  platformImages?: Record<string, string>;
  platformCopy?: Partial<Record<PlatformType, { headline: string; primaryText: string; cta: string }>>;
  platformCreatives?: Partial<Record<PlatformType, PlatformCreativeOverride>>;
  publishStatuses: PlatformPublishStatus[];
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    roas: number;
  };
  abTestConfig?: AbTestConfig;
  biddingMechanisms?: {
    meta?: any;
    google?: any;
    linkedin?: any;
    tiktok?: any;
    pinterest?: any;
    x?: any;
    programmatic?: any;
  };
  customerName?: string;
  customerEmail?: string;
  createdAt: string;
  activityLog?: CampaignActivityEntry[];
}

export interface ChannelApiStatus {
  platform: PlatformType;
  name: string;
  connected: boolean;
  apiKeySet: boolean;
  endpointUrl: string;
  healthStatus: 'healthy' | 'degraded' | 'disconnected';
  latencyMs: number;
  activeCampaignsCount: number;
  totalSpent: number;
}

export interface InvoiceAuditLogEntry {
  id: string;
  timestamp: string;
  previousStatus?: 'DRAFT' | 'ISSUED' | 'PENDING' | 'PAID' | 'OVERDUE';
  newStatus: 'DRAFT' | 'ISSUED' | 'PENDING' | 'PAID' | 'OVERDUE';
  action: string;
  paymentMethod?: string;
  txHash?: string;
  actor: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  campaignId: string;
  campaignName: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  mediaSpend: number;
  platformFee: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  issuedDate: string;
  dueDate: string;
  paymentMethod?: string;
  txHash?: string;
  breakdown: {
    platform: string;
    amount: number;
  }[];
  auditLog?: InvoiceAuditLogEntry[];
}

export interface PerformanceTimePoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  metaReturn: number;
  googleReturn: number;
  linkedInReturn: number;
  tiktokReturn: number;
  pinterestReturn?: number;
  xReturn: number;
  programmaticReturn: number;
}

export interface AiOptimizationResult {
  improvedHeadlines: string[];
  improvedPrimaryText: string[];
  suggestedTargeting: string;
  suggestedGoogleKeywords?: string[];
  recommendedBudgetDistribution: { platform: string; percent: number; reason: string }[];
  diagnosticReport: string;
}

export type UserRole = 'SUPER_ADMIN' | 'CAMPAIGN_MANAGER' | 'FINANCE_ADMIN' | 'READ_ONLY_ANALYST';

export interface UserPermissions {
  canCreateCampaigns: boolean;
  canPublishCampaigns: boolean;
  canEditCredentials: boolean;
  canManageBilling: boolean;
  canManageOrganizations: boolean;
}

export interface ChannelCredentials {
  platform: PlatformType;
  accountId: string;
  apiKeyOrToken: string;
  apiSecret?: string;
  pixelIdOrTag?: string;
  developerToken?: string;
  merchantOrCompanyUrn?: string;
  environment: 'PRODUCTION' | 'SANDBOX_SIMULATED';
  lastValidatedAt?: string;
  validationStatus: 'CONNECTED' | 'DISCONNECTED' | 'INVALID_CREDENTIALS';
  isEncrypted?: boolean;
  keyHash?: string;
  encryptionAlgorithm?: string;
  permissionsGranted?: string[];
}

export interface ChannelDetailedSpecs {
  meta?: {
    adAccountId: string;
    pixelId: string;
    capiToken: string;
    optimizationGoal: string;
    placements: string[];
    headline: string;
    primaryText: string;
    callToAction: string;
  };
  google?: {
    customerId: string;
    developerToken: string;
    campaignType: string;
    biddingStrategy: string;
    keywords: string[];
    headlines: string[];
    descriptions: string[];
  };
  linkedin?: {
    accountUrn: string;
    companyUrn: string;
    seniorityTargeting: string[];
    headline: string;
    bodyText: string;
    leadGenFormEnabled: boolean;
  };
  tiktok?: {
    advertiserId: string;
    sparkAuthCode: string;
    videoFormat: string;
    hashtags: string[];
    ctaButton: string;
    scriptHook: string;
  };
  pinterest?: {
    accountId: string;
    catalogMerchantUrn: string;
    targetBoardUrn: string;
    pinTitle: string;
    pinDescription: string;
  };
  x?: {
    accountId: string;
    promotedCardType: string;
    targetedKeywords: string[];
    tweetText: string;
  };
  programmatic?: {
    dspSeatId: string;
    bidFloorCpm: number;
    bannerSizes: string[];
    viewabilityTargetPct: number;
    sspPublisherIds: string[];
  };
}

export interface PlatformCreativeAssets {
  square1x1?: string;       // 1:1 e.g. Meta, LinkedIn, Google Display
  vertical9x16?: string;    // 9:16 e.g. Meta Stories/Reels, TikTok
  landscape191x1?: string;  // 1.91:1 e.g. Meta Feed, Google, LinkedIn
  landscape16x9?: string;   // 16:9 e.g. X, YouTube
  vertical2x3?: string;     // 2:3 e.g. Pinterest
  iabBanners?: {
    medRec300x250?: string;
    leaderboard728x90?: string;
    halfPage300x600?: string;
    skyscraper160x600?: string;
  };
}

export interface PlatformBiddingConfig {
  strategy: string;         // e.g. LOWEST_COST_WITHOUT_CAP, TARGET_CPA, TARGET_ROAS, MAXIMUM_DELIVERY
  bidCapOrTargetCost?: number;
  optimizationGoal?: string;
  billingEvent?: string;
  conversionWindow?: string;
  pacing?: 'STANDARD' | 'ACCELERATED';
  networkPlacement?: string[];
  adRotation?: string;
  frequencyCap?: string;
  viewabilityTargetPct?: number;
  bidFloorCpm?: number;
}

export interface ChannelTestCase {
  id: string;
  name: string;
  description: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  durationMs: number;
  assertions: {
    check: string;
    passed: boolean;
    details?: string;
  }[];
}

export interface ChannelTestResult {
  platform: PlatformType;
  channelName: string;
  endpointUrl: string;
  overallStatus: 'PASSED' | 'FAILED';
  latencyMs: number;
  testedAt: string;
  credentialsStatus: 'PRODUCTION_READY' | 'SANDBOX_SIMULATED' | 'REQUIRES_KEYS';
  testCases: ChannelTestCase[];
  samplePayloadGenerated: Record<string, any>;
  aiValidationNotes: string;
}

export interface CUJScenario {
  cujId: string;
  title: string;
  cujCategory: 'Workspace Onboarding' | 'API Credentials & Handshake' | 'AI Multi-Channel Creative' | 'Omnichannel Assembly' | 'Cross-Platform Dispatch & Edge Cases' | 'Financial & Telemetry';
  description: string;
  targetChannels: string[];
  status: 'PASSED' | 'FAILED';
  totalAssertions: number;
  passedAssertions: number;
  durationMs: number;
  testCases: ChannelTestCase[];
  edgeCaseScenarios: {
    scenarioName: string;
    simulatedCondition: string;
    expectedHandling: string;
    result: 'PASSED' | 'HANDLED';
    logs: string;
  }[];
}

export interface TestSuiteSummary {
  timestamp: string;
  totalChannelsTested: number;
  passedChannelsCount: number;
  failedChannelsCount: number;
  totalAssertionsRun: number;
  passedAssertionsCount: number;
  avgLatencyMs: number;
  results: ChannelTestResult[];
  cujScenarios: CUJScenario[];
}


