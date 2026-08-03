/**
 * pinterestAdapter.ts -- Pinterest Ads API v5
 *
 * Docs: https://developers.pinterest.com/docs/api/v5/
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, dryRunPerformance, callPlatformApi } from './dryRun';

export const pinterestAdapter: PlatformAdapter = {
  platform: 'pinterest',

  async publish(payload: PlatformPayload, credential: ResolvedCredential | null) {
    if (!credential) throw new Error('Pinterest Ads API credentials not configured in Vault. To publish to production Pinterest, enter Ad Account ID and Access Token in API Nexus, or enable the Dry-Run Mode toggle.');

    const { accountId, secret } = credential; // accountId = ad_account_id

    const url = `https://api.pinterest.com/v5/ad_accounts/${accountId}/campaigns`;

    const body = await callPlatformApi(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
        body: JSON.stringify({
          name: payload.headline,
          objective_type: 'WEB_CONVERSION',
          status: 'PAUSED',
          daily_spend_cap: Math.round(payload.budget * 1_000_000), // Pinterest budgets are in micro-currency
        }),
      },
      'Pinterest Ads API'
    );

    const externalId = body?.id ?? body?.campaign_id;
    if (!externalId) {
      throw new Error('Pinterest Ads API did not return a campaign ID.');
    }
    return { externalId: String(externalId), mode: 'LIVE' as const };
  },

  async rollback(externalId: string, credential: ResolvedCredential | null) {
    if (!credential) return;
    const url = `https://api.pinterest.com/v5/ad_accounts/${credential.accountId}/campaigns`;
    await callPlatformApi(
      url,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credential.secret}` },
        body: JSON.stringify([{ id: externalId, status: 'ARCHIVED' }]),
      },
      'Pinterest Ads API (rollback)'
    );
  },

  async fetchPerformance(externalId, credential, dateRange) {
    if (!credential) return dryRunPerformance('pinterest', externalId, dateRange);

    const params = new URLSearchParams({
      start_date: dateRange.start,
      end_date: dateRange.end,
      campaign_ids: externalId,
      columns: 'IMPRESSION_2,CLICKTHROUGH_2,TOTAL_CONVERSIONS,SPEND_IN_DOLLAR',
      granularity: 'TOTAL',
    });

    const body = await callPlatformApi(
      `https://api.pinterest.com/v5/ad_accounts/${credential.accountId}/campaigns/analytics?${params.toString()}`,
      { method: 'GET', headers: { Authorization: `Bearer ${credential.secret}` } },
      'Pinterest Ads API (analytics)'
    );

    const row = Array.isArray(body) ? body[0] : body;

    return {
      externalId,
      platform: 'pinterest',
      impressions: Number(row?.IMPRESSION_2 ?? 0),
      clicks: Number(row?.CLICKTHROUGH_2 ?? 0),
      conversions: Number(row?.TOTAL_CONVERSIONS ?? 0),
      spend: Number(row?.SPEND_IN_DOLLAR ?? 0),
      dateRange,
      mode: 'LIVE',
    };
  },
};
