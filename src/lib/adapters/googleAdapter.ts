/**
 * googleAdapter.ts -- Google Ads API (v16, REST interface)
 *
 * Docs: https://developers.google.com/google-ads/api/docs/first-call/overview
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, dryRunPerformance, callPlatformApi } from './dryRun';

const API_VERSION = 'v16';

export const googleAdapter: PlatformAdapter = {
  platform: 'google',

  async publish(payload: PlatformPayload, credential: ResolvedCredential | null) {
    if (!credential) return dryRunResult('google', payload);

    const { accountId, secret, extra } = credential;
    const developerToken = extra?.developerToken;
    if (!developerToken) {
      throw new Error('Google Ads requires a developer token in addition to the OAuth2 access token.');
    }

    const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${accountId}/campaigns:mutate`;

    const body = await callPlatformApi(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
          'developer-token': developerToken,
          ...(extra?.loginCustomerId ? { 'login-customer-id': extra.loginCustomerId } : {}),
        },
        body: JSON.stringify({
          operations: [
            {
              create: {
                name: payload.headline,
                advertisingChannelType: 'SEARCH',
                status: 'PAUSED',
                campaignBudget: `customers/${accountId}/campaignBudgets/PLACEHOLDER`,
              },
            },
          ],
        }),
      },
      'Google Ads API'
    );

    const resourceName = body?.results?.[0]?.resourceName as string | undefined;
    if (!resourceName) throw new Error('Google Ads API returned no resourceName for created campaign.');

    return { externalId: resourceName, mode: 'LIVE' as const };
  },

  async rollback(externalId: string, credential: ResolvedCredential | null) {
    if (!credential) return;
    const { accountId, secret, extra } = credential;
    const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${accountId}/campaigns:mutate`;
    await callPlatformApi(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
          'developer-token': extra?.developerToken ?? '',
        },
        body: JSON.stringify({ operations: [{ remove: externalId }] }),
      },
      'Google Ads API (rollback)'
    );
  },

  async fetchPerformance(externalId, credential, dateRange) {
    if (!credential) return dryRunPerformance('google', externalId, dateRange);

    const { accountId, secret, extra } = credential;
    const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${accountId}/googleAds:search`;

    // externalId here is the full resource_name (customers/{id}/campaigns/{campaignId});
    // GAQL's WHERE clause wants just the numeric campaign.id.
    const campaignId = externalId.split('/').pop();
    const gaql =
      `SELECT metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros ` +
      `FROM campaign WHERE campaign.id = ${campaignId} ` +
      `AND segments.date BETWEEN '${dateRange.start}' AND '${dateRange.end}'`;

    const body = await callPlatformApi(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
          'developer-token': extra?.developerToken ?? '',
        },
        body: JSON.stringify({ query: gaql }),
      },
      'Google Ads API (reporting)'
    );

    // Google Ads returns one row per (campaign, date); aggregate across the range.
    const rows = body?.results ?? [];
    const totals = rows.reduce(
      (acc: any, r: any) => ({
        impressions: acc.impressions + Number(r.metrics?.impressions ?? 0),
        clicks: acc.clicks + Number(r.metrics?.clicks ?? 0),
        conversions: acc.conversions + Number(r.metrics?.conversions ?? 0),
        costMicros: acc.costMicros + Number(r.metrics?.costMicros ?? 0),
      }),
      { impressions: 0, clicks: 0, conversions: 0, costMicros: 0 }
    );

    return {
      externalId,
      platform: 'google',
      impressions: totals.impressions,
      clicks: totals.clicks,
      conversions: totals.conversions,
      spend: totals.costMicros / 1_000_000, // Google reports cost in micros
      dateRange,
      mode: 'LIVE',
    };
  },
};
