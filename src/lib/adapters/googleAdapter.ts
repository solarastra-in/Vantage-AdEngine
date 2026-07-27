/**
 * googleAdapter.ts -- Google Ads API (v16, REST interface)
 *
 * Docs: https://developers.google.com/google-ads/api/docs/first-call/overview
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, callPlatformApi } from './dryRun';

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
};
