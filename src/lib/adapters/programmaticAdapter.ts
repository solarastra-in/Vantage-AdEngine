/**
 * programmaticAdapter.ts -- Programmatic DSP
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, callPlatformApi } from './dryRun';

export const programmaticAdapter: PlatformAdapter = {
  platform: 'programmatic',

  async publish(payload: PlatformPayload, credential: ResolvedCredential | null) {
    if (!credential) return dryRunResult('programmatic', payload);

    const { accountId, secret, extra } = credential; // accountId = DSP seat ID
    const url = 'https://api.thetradedesk.com/v3/campaign';

    const body = await callPlatformApi(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'TTD-Auth': secret },
        body: JSON.stringify({
          SeatId: accountId,
          CampaignName: payload.headline,
          Budget: { Amount: payload.budget, CurrencyCode: 'USD' },
          BidFloorCpm: extra?.bidFloorCpm ? Number(extra.bidFloorCpm) : 2.5,
          IsEnabled: false, // land paused
        }),
      },
      'Programmatic DSP API'
    );

    const externalId = body?.CampaignId ?? body?.campaignId;
    if (!externalId) throw new Error('DSP API returned no campaign id.');
    return { externalId: String(externalId), mode: 'LIVE' as const };
  },

  async rollback(externalId: string, credential: ResolvedCredential | null) {
    if (!credential) return;
    const url = `https://api.thetradedesk.com/v3/campaign/${externalId}`;
    await callPlatformApi(
      url,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'TTD-Auth': credential.secret },
        body: JSON.stringify({ IsEnabled: false, Archived: true }),
      },
      'Programmatic DSP API (rollback)'
    );
  },
};
