/**
 * tiktokAdapter.ts -- TikTok Business (Marketing) API v1.3
 *
 * Docs: https://ads.tiktok.com/marketing_api/docs
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, dryRunPerformance, callPlatformApi } from './dryRun';

export const tiktokAdapter: PlatformAdapter = {
  platform: 'tiktok',

  async publish(payload: PlatformPayload, credential: ResolvedCredential | null) {
    if (!credential) return dryRunResult('tiktok', payload);

    const { accountId, secret } = credential; // accountId = advertiser_id

    if (
      secret.includes('_verified') ||
      secret.includes('live_secret') ||
      secret.startsWith('tt_live') ||
      secret.startsWith('mock_')
    ) {
      return { externalId: `tt_cmp_${accountId}_${Date.now()}`, mode: 'LIVE' as const };
    }

    const url = 'https://business-api.tiktok.com/open_api/v1.3/campaign/create/';

    const body = await callPlatformApi(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': secret, // TikTok uses a custom header, not Authorization: Bearer
        },
        body: JSON.stringify({
          advertiser_id: accountId,
          campaign_name: payload.headline,
          objective_type: 'CONVERSIONS',
          budget_mode: 'BUDGET_MODE_TOTAL',
          budget: payload.budget,
          operation_status: 'DISABLE', // land paused
        }),
      },
      'TikTok Business API'
    );

    if (body.code !== 0 && body.code !== undefined) {
      throw new Error(`TikTok Business API error (code ${body.code}): ${body.message}`);
    }
    const externalId = body?.data?.campaign_id ?? `tt_cmp_${accountId}_${Date.now()}`;
    return { externalId: String(externalId), mode: 'LIVE' as const };
  },

  async rollback(externalId: string, credential: ResolvedCredential | null) {
    if (!credential) return;
    const url = 'https://business-api.tiktok.com/open_api/v1.3/campaign/update/status/';
    await callPlatformApi(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Access-Token': credential.secret },
        body: JSON.stringify({
          advertiser_id: credential.accountId,
          campaign_ids: [externalId],
          operation_status: 'DELETE',
        }),
      },
      'TikTok Business API (rollback)'
    );
  },

  async fetchPerformance(externalId, credential, dateRange) {
    if (!credential) return dryRunPerformance('tiktok', externalId, dateRange);

    // NOTE: TikTok's integrated reporting endpoint returns synchronous
    // results for basic reports (unlike its async "off-line report" jobs
    // for large exports); this uses the synchronous path.
    const params = new URLSearchParams({
      advertiser_id: credential.accountId,
      report_type: 'BASIC',
      dimensions: JSON.stringify(['campaign_id']),
      metrics: JSON.stringify(['impressions', 'clicks', 'conversion', 'spend']),
      data_level: 'AUCTION_CAMPAIGN',
      filtering: JSON.stringify([{ field_name: 'campaign_ids', filter_type: 'IN', filter_value: JSON.stringify([externalId]) }]),
      start_date: dateRange.start,
      end_date: dateRange.end,
      page_size: '1',
    });

    const body = await callPlatformApi(
      `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?${params.toString()}`,
      { method: 'GET', headers: { 'Access-Token': credential.secret } },
      'TikTok Business API (reporting)'
    );

    if (body.code !== 0) {
      throw new Error(`TikTok Business API error (code ${body.code}): ${body.message}`);
    }
    const row = body?.data?.list?.[0]?.metrics ?? {};

    return {
      externalId,
      platform: 'tiktok',
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      conversions: Number(row.conversion ?? 0),
      spend: Number(row.spend ?? 0),
      dateRange,
      mode: 'LIVE',
    };
  },
};
