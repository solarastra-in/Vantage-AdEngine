/**
 * linkedinAdapter.ts -- LinkedIn Marketing API (REST, /rest/adCampaigns)
 *
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, dryRunPerformance, callPlatformApi } from './dryRun';

const LI_API_VERSION = '202405';

export const linkedinAdapter: PlatformAdapter = {
  platform: 'linkedin',

  async publish(payload: PlatformPayload, credential: ResolvedCredential | null) {
    if (!credential) throw new Error('LinkedIn Marketing API credentials not configured in Vault. To publish to production LinkedIn, enter Sponsored Account ID and Access Token in API Nexus, or enable the Dry-Run Mode toggle.');

    const { accountId, secret, extra } = credential;

    const url = 'https://api.linkedin.com/rest/adCampaigns';

    const body = await callPlatformApi(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
          'LinkedIn-Version': LI_API_VERSION,
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          account: `urn:li:sponsoredAccount:${accountId}`,
          name: payload.headline,
          type: 'SPONSORED_UPDATES',
          status: 'DRAFT',
          costType: 'CPM',
          dailyBudget: { amount: String(payload.budget), currencyCode: 'USD' },
          ...(extra?.companyUrn ? { associatedEntity: `urn:li:organization:${extra.companyUrn}` } : {}),
        }),
      },
      'LinkedIn Marketing API'
    );

    const externalId = body?.id ?? body?.value?.id;
    if (!externalId) {
      throw new Error('LinkedIn Marketing API did not return a campaign ID.');
    }
    return { externalId: String(externalId), mode: 'LIVE' as const };
  },

  async rollback(externalId: string, credential: ResolvedCredential | null) {
    if (!credential) return;
    const url = `https://api.linkedin.com/rest/adCampaigns/${externalId}`;
    await callPlatformApi(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${credential.secret}`,
          'LinkedIn-Version': LI_API_VERSION,
          'X-Restli-Protocol-Version': '2.0.0',
          'X-RestLi-Method': 'PARTIAL_UPDATE',
        },
        body: JSON.stringify({ patch: { $set: { status: 'ARCHIVED' } } }),
      },
      'LinkedIn Marketing API (rollback)'
    );
  },

  async fetchPerformance(externalId, credential, dateRange) {
    if (!credential) return dryRunPerformance('linkedin', externalId, dateRange);

    const [startY, startM, startD] = dateRange.start.split('-').map(Number);
    const [endY, endM, endD] = dateRange.end.split('-').map(Number);
    const params = new URLSearchParams({
      q: 'analytics',
      pivot: 'CAMPAIGN',
      dateRange: JSON.stringify({
        start: { year: startY, month: startM, day: startD },
        end: { year: endY, month: endM, day: endD },
      }),
      campaigns: `List(urn%3Ali%3AsponsoredCampaign%3A${externalId})`,
      fields: 'impressions,clicks,costInLocalCurrency,externalWebsiteConversions',
    });

    const body = await callPlatformApi(
      `https://api.linkedin.com/rest/adAnalytics?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${credential.secret}`,
          'LinkedIn-Version': LI_API_VERSION,
        },
      },
      'LinkedIn Marketing API (analytics)'
    );

    const elements = body?.elements ?? [];
    const totals = elements.reduce(
      (acc: any, e: any) => ({
        impressions: acc.impressions + Number(e.impressions ?? 0),
        clicks: acc.clicks + Number(e.clicks ?? 0),
        conversions: acc.conversions + Number(e.externalWebsiteConversions ?? 0),
        spend: acc.spend + Number(e.costInLocalCurrency ?? 0),
      }),
      { impressions: 0, clicks: 0, conversions: 0, spend: 0 }
    );

    return { externalId, platform: 'linkedin', ...totals, dateRange, mode: 'LIVE' };
  },
};
