/**
 * pinterestAdapter.ts -- Pinterest Ads API v5
 *
 * Docs: https://developers.pinterest.com/docs/api/v5/
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, callPlatformApi } from './dryRun';

export const pinterestAdapter: PlatformAdapter = {
  platform: 'pinterest',

  async publish(payload: PlatformPayload, credential: ResolvedCredential | null) {
    if (!credential) return dryRunResult('pinterest', payload);

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
    if (!externalId) throw new Error('Pinterest API returned no campaign id.');
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
};
