/**
 * programmaticAdapter.ts -- Programmatic DSP
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, dryRunPerformance, callPlatformApi } from './dryRun';

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

  /**
   * SIMPLIFIED: most DSPs (including The Trade Desk) expose reporting as an
   * ASYNC job -- submit a report request, poll for completion, download a
   * generated file/URL -- not a single synchronous call. This implements a
   * representative lightweight "campaign summary" endpoint some DSP seats
   * expose for quick stats; a production integration needs the full
   * submit-poll-download flow for anything beyond a rough same-day summary.
   */
  async fetchPerformance(externalId, credential, dateRange) {
    if (!credential) return dryRunPerformance('programmatic', externalId, dateRange);

    const params = new URLSearchParams({ StartDate: dateRange.start, EndDate: dateRange.end });
    const body = await callPlatformApi(
      `https://api.thetradedesk.com/v3/campaign/${externalId}/summary?${params.toString()}`,
      { method: 'GET', headers: { 'TTD-Auth': credential.secret } },
      'Programmatic DSP API (summary)'
    );

    return {
      externalId,
      platform: 'programmatic',
      impressions: Number(body?.Impressions ?? 0),
      clicks: Number(body?.Clicks ?? 0),
      conversions: Number(body?.Conversions ?? 0),
      spend: Number(body?.SpendInUsd ?? 0),
      dateRange,
      mode: 'LIVE',
    };
  },
};
