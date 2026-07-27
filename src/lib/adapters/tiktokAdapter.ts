/**
 * tiktokAdapter.ts -- TikTok Business (Marketing) API v1.3
 *
 * Docs: https://ads.tiktok.com/marketing_api/docs
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, callPlatformApi } from './dryRun';

export const tiktokAdapter: PlatformAdapter = {
  platform: 'tiktok',

  async publish(payload: PlatformPayload, credential: ResolvedCredential | null) {
    if (!credential) return dryRunResult('tiktok', payload);

    const { accountId, secret } = credential; // accountId = advertiser_id
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

    if (body.code !== 0) {
      throw new Error(`TikTok Business API error (code ${body.code}): ${body.message}`);
    }
    const externalId = body?.data?.campaign_id;
    if (!externalId) throw new Error('TikTok API returned no campaign_id.');
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
};
