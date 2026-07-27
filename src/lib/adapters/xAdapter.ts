/**
 * xAdapter.ts -- X (Twitter) Ads API v12
 *
 * Docs: https://developer.x.com/en/docs/x-ads-api
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, callPlatformApi } from './dryRun';

const API_VERSION = '12';

export const xAdapter: PlatformAdapter = {
  platform: 'x',

  async publish(payload: PlatformPayload, credential: ResolvedCredential | null) {
    if (!credential) return dryRunResult('x', payload);

    const { accountId, secret } = credential;
    const url = `https://ads-api.x.com/${API_VERSION}/accounts/${accountId}/campaigns`;

    const params = new URLSearchParams({
      name: payload.headline,
      funding_instrument_id: credential.extra?.fundingInstrumentId ?? '',
      daily_budget_amount_local_micro: String(Math.round(payload.budget * 1_000_000)),
      entity_status: 'PAUSED',
      standard_delivery: 'true',
    });

    const body = await callPlatformApi(
      `${url}?${params.toString()}`,
      { method: 'POST', headers: { Authorization: `Bearer ${secret}` } },
      'X Ads API'
    );

    const externalId = body?.data?.id;
    if (!externalId) throw new Error('X Ads API returned no campaign id.');
    return { externalId: String(externalId), mode: 'LIVE' as const };
  },

  async rollback(externalId: string, credential: ResolvedCredential | null) {
    if (!credential) return;
    const url = `https://ads-api.x.com/${API_VERSION}/accounts/${credential.accountId}/campaigns/${externalId}`;
    await callPlatformApi(url, { method: 'DELETE', headers: { Authorization: `Bearer ${credential.secret}` } }, 'X Ads API (rollback)');
  },
};
