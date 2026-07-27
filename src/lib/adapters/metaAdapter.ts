/**
 * metaAdapter.ts -- Meta Marketing API (Graph API v19.0)
 *
 * Docs: https://developers.facebook.com/docs/marketing-apis/
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, callPlatformApi } from './dryRun';

const GRAPH_VERSION = 'v19.0';

function objectiveForCta(): string {
  return 'OUTCOME_LEADS';
}

export const metaAdapter: PlatformAdapter = {
  platform: 'meta',

  async publish(payload: PlatformPayload, credential: ResolvedCredential | null) {
    if (!credential) return dryRunResult('meta', payload);

    const { accountId, secret } = credential;
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/campaigns`;

    const body = await callPlatformApi(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.headline,
          objective: objectiveForCta(),
          status: 'PAUSED',
          special_ad_categories: [],
          access_token: secret,
        }),
      },
      'Meta Marketing API'
    );

    return { externalId: body.id as string, mode: 'LIVE' as const };
  },

  async rollback(externalId: string, credential: ResolvedCredential | null) {
    if (!credential) return;
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${externalId}?access_token=${encodeURIComponent(credential.secret)}`;
    await callPlatformApi(url, { method: 'DELETE' }, 'Meta Marketing API (rollback)');
  },
};
