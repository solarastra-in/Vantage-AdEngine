/**
 * linkedinAdapter.ts -- LinkedIn Marketing API (REST, /rest/adCampaigns)
 *
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, callPlatformApi } from './dryRun';

const LI_API_VERSION = '202405';

export const linkedinAdapter: PlatformAdapter = {
  platform: 'linkedin',

  async publish(payload: PlatformPayload, credential: ResolvedCredential | null) {
    if (!credential) return dryRunResult('linkedin', payload);

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
    if (!externalId) throw new Error('LinkedIn API returned no campaign id.');
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
};
