/**
 * campaignDispatchEngine.ts
 *
 * Replaces the previous simulated publish flow (setTimeout + Math.random()
 * external IDs) with a real transform -> validate -> dispatch -> compensate
 * pipeline. This is the core mechanism behind "single-click cross-platform
 * publishing": one canonical Campaign object is deterministically transformed
 * into N platform-specific payloads, each is validated against that
 * platform's actual constraints, and if any subset of channels fails after
 * others have already gone live, a compensation (rollback) step runs against
 * the channels that succeeded -- so a campaign is never left half-published
 * without the operator knowing exactly which channels are live vs rolled back.
 *
 * Design notes for the patent write-up:
 *  - The "hard part" is not calling 7 different HTTP APIs. It's (a) resolving
 *    conflicting per-platform constraints from one source of truth without
 *    silently corrupting the creative, and (b) treating a 7-way publish as a
 *    single atomic-ish operation with defined compensation instead of an
 *    uncoordinated fan-out where partial failure has no defined semantics.
 *  - Adapters are pluggable. A LiveAdapter that calls the real Meta/Google/
 *    etc. APIs can be dropped in per platform without touching the
 *    orchestrator, transform, or validation logic.
 */

import { Campaign, ChannelBudget, PlatformType, AdCreative } from '../types';

// ---------------------------------------------------------------------------
// 1. Canonical -> platform-specific transform
// ---------------------------------------------------------------------------

export interface PlatformConstraints {
  maxHeadlineLength?: number;
  maxPrimaryTextLength?: number;
  minHeadlinesCount?: number;
  maxHeadlinesCount?: number;
  requiredFields: string[];
  supportedAspectRatios: string[];
}

export const PLATFORM_CONSTRAINTS: Record<PlatformType, PlatformConstraints> = {
  meta: {
    maxHeadlineLength: 40,
    maxPrimaryTextLength: 125,
    requiredFields: ['adAccountId', 'pixelId', 'optimizationGoal'],
    supportedAspectRatios: ['1:1', '9:16', '16:9'],
  },
  google: {
    maxHeadlineLength: 30,
    maxPrimaryTextLength: 90,
    minHeadlinesCount: 3,
    maxHeadlinesCount: 15,
    requiredFields: ['customerId', 'developerToken', 'biddingStrategy'],
    supportedAspectRatios: ['1.91:1', '1:1'],
  },
  linkedin: {
    maxHeadlineLength: 70,
    maxPrimaryTextLength: 150,
    requiredFields: ['accountUrn', 'companyUrn'],
    supportedAspectRatios: ['1.91:1'],
  },
  tiktok: {
    requiredFields: ['advertiserId'],
    supportedAspectRatios: ['9:16'],
  },
  pinterest: {
    maxHeadlineLength: 100,
    maxPrimaryTextLength: 500,
    requiredFields: ['accountId', 'targetBoardUrn'],
    supportedAspectRatios: ['2:3', '1:1'],
  },
  x: {
    maxHeadlineLength: 280,
    requiredFields: ['accountId'],
    supportedAspectRatios: ['16:9'],
  },
  programmatic: {
    requiredFields: ['dspSeatId', 'bidFloorCpm'],
    supportedAspectRatios: ['728x90', '300x250', '160x600', '320x50'],
  },
};

export interface TransformIssue {
  field: string;
  issue: string;
  severity: 'error' | 'auto_corrected';
  originalValue?: string;
  correctedValue?: string;
}

export interface PlatformPayload {
  platform: PlatformType;
  headline: string;
  primaryText: string;
  mediaUrl: string;
  destinationUrl: string;
  callToAction: string;
  budget: number;
  targeting: string;
  issues: TransformIssue[];
  /** Only meaningfully used by the Google adapter, but carried generically since they live on the shared creative. */
  googleRsaHeadlines?: string[];
  googleRsaDescriptions?: string[];
  googleKeywords?: string[];
}

/**
 * Deterministically truncates text at a word boundary rather than a hard
 * character cut, so auto-corrected copy doesn't end mid-word.
 */
function truncateAtWordBoundary(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice).trim();
}

/**
 * Transforms one canonical campaign + creative into a platform-specific
 * payload, applying that platform's real constraints. Every deviation from
 * the source (truncation, missing field) is recorded in `issues` rather than
 * silently discarded -- this is what the previous code's hardcoded
 * `valid: true` responses did not do.
 */
export function transformForPlatform(
  campaign: Pick<Campaign, 'creative' | 'platformCreatives'>,
  channel: ChannelBudget
): PlatformPayload {
  const constraints = PLATFORM_CONSTRAINTS[channel.platform];
  const issues: TransformIssue[] = [];

  // Prefer a real, platform-tailored override if one was generated for this
  // channel (src/components/CampaignWizardModal.tsx's AI Content Refiner
  // step) -- previously this data was generated in the wizard, included in
  // the submit payload, and then silently dropped: the server never stored
  // it and this function only ever read the single master `creative`,
  // truncating it generically per platform regardless of what
  // platform-specific copy had actually been written. Falls back to the
  // master creative (with generic truncation) when no override exists for
  // this platform, which is still correct behavior for channels the user
  // didn't specifically tailor copy for.
  const override = campaign.platformCreatives?.[channel.platform];
  const creative: AdCreative = override
    ? {
        headline: override.headline,
        primaryText: override.primaryText,
        callToAction: override.callToAction,
        mediaUrl: override.mediaUrl || campaign.creative.mediaUrl,
        destinationUrl: campaign.creative.destinationUrl,
        googleRsaHeadlines: campaign.creative.googleRsaHeadlines,
        googleRsaDescriptions: campaign.creative.googleRsaDescriptions,
        googleKeywords: campaign.creative.googleKeywords,
      }
    : campaign.creative;

  let headline = creative.headline;
  if (constraints.maxHeadlineLength && headline.length > constraints.maxHeadlineLength) {
    const corrected = truncateAtWordBoundary(headline, constraints.maxHeadlineLength);
    issues.push({
      field: 'headline',
      issue: `Exceeds ${channel.platformName} limit of ${constraints.maxHeadlineLength} chars`,
      severity: 'auto_corrected',
      originalValue: headline,
      correctedValue: corrected,
    });
    headline = corrected;
  }

  let primaryText = creative.primaryText;
  if (constraints.maxPrimaryTextLength && primaryText.length > constraints.maxPrimaryTextLength) {
    const corrected = truncateAtWordBoundary(primaryText, constraints.maxPrimaryTextLength);
    issues.push({
      field: 'primaryText',
      issue: `Exceeds ${channel.platformName} limit of ${constraints.maxPrimaryTextLength} chars`,
      severity: 'auto_corrected',
      originalValue: primaryText,
      correctedValue: corrected,
    });
    primaryText = corrected;
  }

  if (!creative.mediaUrl) {
    issues.push({ field: 'mediaUrl', issue: 'No creative media URL supplied', severity: 'error' });
  }

  if (!creative.destinationUrl) {
    issues.push({ field: 'destinationUrl', issue: 'No destination/landing page URL supplied -- required to create a real ad on any platform', severity: 'error' });
  }

  if (!channel.budget || channel.budget <= 0) {
    issues.push({ field: 'budget', issue: 'Channel budget must be > 0', severity: 'error' });
  }

  if (channel.platform === 'google') {
    const headlines = creative.googleRsaHeadlines ?? [];
    const descriptions = creative.googleRsaDescriptions ?? [];
    const keywords = creative.googleKeywords ?? [];
    if (headlines.length < 3) {
      issues.push({ field: 'googleRsaHeadlines', issue: `Google Search ads require at least 3 headlines (have ${headlines.length})`, severity: 'error' });
    }
    if (descriptions.length < 2) {
      issues.push({ field: 'googleRsaDescriptions', issue: `Google Search ads require at least 2 descriptions (have ${descriptions.length})`, severity: 'error' });
    }
    if (keywords.length < 1) {
      issues.push({ field: 'googleKeywords', issue: 'Google Search ads require at least one keyword to match against -- without one, the campaign will never serve', severity: 'error' });
    }
  }

  return {
    platform: channel.platform,
    headline,
    primaryText,
    mediaUrl: creative.mediaUrl,
    destinationUrl: creative.destinationUrl,
    callToAction: creative.callToAction,
    budget: channel.budget,
    targeting: channel.targeting,
    issues,
    googleRsaHeadlines: creative.googleRsaHeadlines,
    googleRsaDescriptions: creative.googleRsaDescriptions,
    googleKeywords: creative.googleKeywords,
  };
}

export function hasBlockingErrors(payload: PlatformPayload): boolean {
  return payload.issues.some(i => i.severity === 'error');
}

// ---------------------------------------------------------------------------
// 2. Platform adapters (pluggable). Real network calls go here per platform.
// ---------------------------------------------------------------------------

export interface DispatchResult {
  platform: PlatformType;
  outcome: 'LIVE' | 'FAILED' | 'ROLLED_BACK' | 'SKIPPED_VALIDATION';
  externalId?: string;
  error?: string;
  compensated?: boolean;
  mode?: 'LIVE' | 'DRY_RUN';
}

/**
 * Decrypted, structured credential handed to an adapter at dispatch time.
 * `secret` is the primary decrypted token/bearer credential; `extra` carries
 * any additional decrypted fields a given platform needs (e.g. Google's
 * developer token, LinkedIn's company URN) without every adapter needing a
 * bespoke resolver signature.
 */
export interface ResolvedCredential {
  accountId: string;
  secret: string;
  extra?: Record<string, string>;
}

export interface PlatformPerformanceMetrics {
  externalId: string;
  platform: PlatformType;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  dateRange: { start: string; end: string };
  mode: 'LIVE' | 'DRY_RUN';
}

export interface PlatformAdapter {
  platform: PlatformType;
  /** Returns an external campaign/ad ID on success, or throws on failure. */
  publish(payload: PlatformPayload, credential: ResolvedCredential | null): Promise<{ externalId: string; mode: 'LIVE' | 'DRY_RUN' }>;
  /** Compensating action if a sibling channel fails after this one went live. */
  rollback(externalId: string, credential: ResolvedCredential | null): Promise<void>;
  /**
   * Pulls real performance metrics for a previously-published campaign from
   * the platform's own reporting API. Optional (not every adapter needs to
   * implement it immediately) so this doesn't force a breaking change on
   * every existing adapter/test at once -- but every one of the 7 built-in
   * adapters does implement it (see src/lib/adapters/*.ts). This is the
   * actual data source the budget optimizer and creative fatigue detector
   * need to stop deriving history from aggregate snapshots.
   */
  fetchPerformance?(
    externalId: string,
    credential: ResolvedCredential | null,
    dateRange: { start: string; end: string }
  ): Promise<PlatformPerformanceMetrics>;
}

/**
 * Adapter used when no real platform credential is configured. It is
 * explicitly labeled DRY_RUN and never claims to be "live" -- this replaces
 * the previous behavior of returning fabricated externalIds under a status
 * called SIMULATED_ACTIVE while implying a working integration.
 */
function makeDryRunAdapter(platform: PlatformType): PlatformAdapter {
  return {
    platform,
    async publish(payload) {
      if (hasBlockingErrors(payload)) {
        throw new Error(`Validation failed for ${platform}: ${payload.issues.map(i => i.issue).join('; ')}`);
      }
      return { externalId: `DRYRUN_${platform}_${Date.now()}`, mode: 'DRY_RUN' };
    },
    async rollback() {
      // no-op: nothing was actually created against a live account
    },
  };
}

/**
 * Registry of adapters, keyed by platform. This is the sole extension point
 * for adding a new ad channel: implement PlatformAdapter for the new
 * platform (see src/lib/adapters/*.ts for the pattern every existing channel
 * follows) and call registerAdapter(...) once at startup -- nothing in this
 * file, the transform logic, or the orchestrator below needs to change.
 * Every real adapter is expected to internally fall back to dry-run
 * behavior when handed a null credential (see src/lib/adapters/dryRun.ts),
 * so the SAME adapter instance safely serves both modes.
 */
const adapterRegistry: Partial<Record<PlatformType, PlatformAdapter>> = {};

export function registerAdapter(adapter: PlatformAdapter) {
  adapterRegistry[adapter.platform] = adapter;
}

export function listRegisteredPlatforms(): PlatformType[] {
  return Object.keys(adapterRegistry) as PlatformType[];
}

/**
 * Calls the given platform's fetchPerformance implementation. All 7
 * built-in adapters implement it; this throws a clear error for any custom
 * adapter that doesn't (rather than silently returning nothing), so a
 * missing implementation is loud in server logs instead of a quiet gap in
 * ingested history.
 */
export async function fetchChannelPerformance(
  platform: PlatformType,
  externalId: string,
  credential: ResolvedCredential | null,
  dateRange: { start: string; end: string }
): Promise<PlatformPerformanceMetrics> {
  const adapter = getAdapter(platform);
  if (!adapter.fetchPerformance) {
    throw new Error(`Adapter for ${platform} does not implement fetchPerformance.`);
  }
  return adapter.fetchPerformance(externalId, credential, dateRange);
}

function getAdapter(platform: PlatformType): PlatformAdapter {
  return adapterRegistry[platform] ?? makeDryRunAdapter(platform);
}

// ---------------------------------------------------------------------------
// 3. Orchestrator: saga-style dispatch with compensation on partial failure
// ---------------------------------------------------------------------------

export interface DispatchReport {
  campaignId: string;
  startedAt: string;
  finishedAt: string;
  overallStatus: 'ALL_LIVE' | 'PARTIAL' | 'ALL_FAILED';
  results: DispatchResult[];
}

/**
 * Publishes a campaign across every enabled channel. Channels are dispatched
 * concurrently; if one or more fail, every channel that already went live is
 * rolled back via its adapter's compensating action, UNLESS `partialAllowed`
 * is true (operator has explicitly opted into "best effort" mode). This gives
 * a campaign publish well-defined all-or-nothing semantics by default instead
 * of leaving some channels silently live and others silently dead.
 */
export async function dispatchCampaign(
  campaign: Campaign,
  credentialResolver: (platform: PlatformType) => ResolvedCredential | null | Promise<ResolvedCredential | null>,
  opts: { partialAllowed?: boolean } = {}
): Promise<DispatchReport> {
  const startedAt = new Date().toISOString();
  const enabledChannels = campaign.channels.filter(c => c.enabled);

  const transformed = enabledChannels.map(channel => ({
    channel,
    payload: transformForPlatform(campaign, channel),
  }));

  const results: DispatchResult[] = await Promise.all(
    transformed.map(async ({ channel, payload }) => {
      if (hasBlockingErrors(payload)) {
        return {
          platform: channel.platform,
          outcome: 'SKIPPED_VALIDATION' as const,
          error: payload.issues.filter(i => i.severity === 'error').map(i => i.issue).join('; '),
        };
      }
      const adapter = getAdapter(channel.platform);
      try {
        const credential = await credentialResolver(channel.platform);
        const { externalId, mode } = await adapter.publish(payload, credential);
        return { platform: channel.platform, outcome: 'LIVE' as const, externalId, mode };
      } catch (err: any) {
        return { platform: channel.platform, outcome: 'FAILED' as const, error: err.message };
      }
    })
  );

  const anyFailed = results.some(r => r.outcome === 'FAILED' || r.outcome === 'SKIPPED_VALIDATION');
  const anyLive = results.some(r => r.outcome === 'LIVE');

  if (anyFailed && anyLive && !opts.partialAllowed) {
    // Compensate: roll back every channel that went live, since the
    // publish as a whole did not fully succeed and the operator did not
    // opt into partial/best-effort publishing.
    await Promise.all(
      results
        .filter(r => r.outcome === 'LIVE' && r.externalId)
        .map(async r => {
          try {
            const credential = await credentialResolver(r.platform);
            await getAdapter(r.platform).rollback(r.externalId!, credential);
            r.outcome = 'ROLLED_BACK';
            r.compensated = true;
          } catch (err: any) {
            // Rollback itself failed -- surface this loudly; do not swallow it.
            r.error = `${r.error ?? ''} | ROLLBACK FAILED: ${err.message}`.trim();
          }
        })
    );
  }

  const anyRolledBack = results.some(r => r.outcome === 'ROLLED_BACK');
  const overallStatus: DispatchReport['overallStatus'] = results.every(r => r.outcome === 'LIVE')
    ? 'ALL_LIVE'
    : opts.partialAllowed && anyLive
    ? 'PARTIAL'
    : anyRolledBack
    ? 'ALL_FAILED' // every channel ended not-live: some rolled back to preserve all-or-nothing semantics
    : 'ALL_FAILED';

  return {
    campaignId: campaign.id,
    startedAt,
    finishedAt: new Date().toISOString(),
    overallStatus,
    results,
  };
}
