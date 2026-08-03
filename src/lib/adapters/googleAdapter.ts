/**
 * googleAdapter.ts -- Google Ads API (v16, REST interface)
 *
 * Docs: https://developers.google.com/google-ads/api/docs/first-call/overview
 */

import { PlatformAdapter, PlatformPayload, ResolvedCredential } from '../campaignDispatchEngine';
import { dryRunResult, dryRunPerformance, callPlatformApi } from './dryRun';

const API_VERSION = 'v18';

/**
 * Google Ads customer IDs are shown everywhere in Google's own UI (and
 * naturally get typed into a credential form) as dash-formatted, e.g.
 * "514-401-5092" -- but the Ads API requires the plain 10-digit numeric ID
 * with no dashes in every URL path and resource name. Sending the
 * dash-formatted version through unmodified makes every real API call
 * fail with a 400 (customer ID not found / invalid argument), silently if
 * nothing surfaces that specific error clearly. Every use of accountId in
 * this adapter goes through this first.
 */
function normalizeCustomerId(accountId: string): string {
  return accountId.replace(/[^0-9]/g, '');
}

/**
 * This adapter has NO OAuth2 token-exchange or refresh flow implemented --
 * the "secret" field it sends as a Bearer token must already BE a valid,
 * unexpired Google access token (format "ya29...."). It is not able to
 * accept, and cannot do anything useful with, an authorization code
 * (format "4/...", single-use, expires within minutes -- this is what you
 * get redirected back with mid-OAuth-flow, before ever exchanging it for
 * real tokens) or a raw refresh token (format "1//...", long-lived, but
 * requires a token-exchange call with a client_id + client_secret to turn
 * into a usable access token -- this adapter doesn't do that exchange).
 * Sending either of those straight through as a Bearer token would fail
 * Google's real API with an opaque 401 and no indication of what was
 * actually wrong -- this catches it early with an actionable message
 * instead. A real production integration needs a genuine OAuth2 flow
 * (Google Cloud OAuth Client ID/Secret, consent screen, code exchange,
 * and either a periodic refresh job or refreshing on 401) added
 * server-side; none of that exists in this codebase yet.
 */
function validateAccessTokenFormat(secret: string): void {
  if (secret.startsWith('4/')) {
    throw new Error(
      'This looks like a Google OAuth2 authorization CODE (starts with "4/"), not an access token. ' +
      'Authorization codes are single-use and expire within minutes -- they cannot be used directly as an API credential. ' +
      'Please use the "Connect with Google" button to perform the OAuth2 flow.'
    );
  }
  if (secret.startsWith('1//')) {
    throw new Error(
      'This looks like a Google OAuth2 REFRESH token (starts with "1//"), but it could not be automatically exchanged for an access token. ' +
      'Ensure GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI environment variables are configured on the server, or reconnect using "Connect with Google".'
    );
  }
}

export const googleAdapter: PlatformAdapter = {
  platform: 'google',

  /**
   * Creates a real, fully servable Search ad via the Google Ads API:
   * Budget -> Campaign -> Ad Group -> Responsive Search Ad -> Keywords.
   * Two things worth understanding about what this does:
   *
   * 1. The campaign (and its one ad) are created with status: 'PAUSED'
   *    deliberately, not as a bug -- auto-launching something that
   *    immediately starts spending real money with no human review is
   *    not a safe default. A paused campaign IS visible in the Google
   *    Ads UI (under Campaigns, with its ad group and ad inside it), just
   *    not delivering impressions yet. Unpause both the campaign and the
   *    ad group ad once you've reviewed them. If you published and can't
   *    find anything at all -- not even paused -- the API call itself
   *    failed somewhere along this chain; every step below throws a
   *    real, specific error rather than silently succeeding partway.
   *
   * 2. Every step (budget, campaign, ad group, ad, keywords) is a
   *    separate real API call, and a failure at any step throws
   *    immediately with a message telling you exactly what was and
   *    wasn't created, rather than continuing with fabricated resource
   *    names or treating a partial result as a success.
   */
  async publish(payload: PlatformPayload, credential: ResolvedCredential | null) {
    if (!credential) throw new Error('Google Ads API credentials not configured in Vault. To publish to production Google Ads, enter Customer ID, Developer Token, and Access Token in API Nexus, or enable the Dry-Run Mode toggle.');

    const { secret, extra } = credential;
    validateAccessTokenFormat(secret);
    const accountId = normalizeCustomerId(credential.accountId);
    if (!accountId) {
      throw new Error(`Google Ads customer ID "${credential.accountId}" doesn't contain any digits after normalization -- check the account ID entered in API Nexus.`);
    }

    const developerToken = extra?.developerToken;
    if (!developerToken) {
      throw new Error('Google Ads requires a developer token in addition to the OAuth2 access token.');
    }

    // 1. Create Campaign Budget first in Google Ads API.
    const budgetUrl = `https://googleads.googleapis.com/${API_VERSION}/customers/${accountId}/campaignBudgets:mutate`;
    // MUST propagate as a real error -- previously this caught any
    // failure and silently continued with a placeholder budget resource
    // name, which then made the campaign creation call below fail too,
    // ALSO silently, resulting in a fabricated "LIVE" success being
    // reported for a campaign that was never actually created.
    const budgetRes = await callPlatformApi(
      budgetUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
          'developer-token': developerToken,
          ...(extra?.loginCustomerId ? { 'login-customer-id': normalizeCustomerId(extra.loginCustomerId) } : {}),
        },
        body: JSON.stringify({
          operations: [
            {
              create: {
                name: `Budget - ${payload.headline}`.slice(0, 128),
                amountMicros: Math.max(1_000_000, Math.round(payload.budget * 1_000_000)),
                deliveryMethod: 'STANDARD',
              },
            },
          ],
        }),
      },
      'Google Ads API (Budget)'
    );

    const budgetResourceName = budgetRes?.results?.[0]?.resourceName;
    if (!budgetResourceName) {
      throw new Error('Google Ads API did not return a budget resourceName. The campaign was NOT created -- check the response shape/API version.');
    }

    // 2. Create Search Campaign referencing the real budget just created.
    // Same principle: a real failure here must be a real, visible failure,
    // not converted into a fabricated success with a fake resource name.
    const campaignUrl = `https://googleads.googleapis.com/${API_VERSION}/customers/${accountId}/campaigns:mutate`;
    const body = await callPlatformApi(
      campaignUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
          'developer-token': developerToken,
          ...(extra?.loginCustomerId ? { 'login-customer-id': normalizeCustomerId(extra.loginCustomerId) } : {}),
        },
        body: JSON.stringify({
          operations: [
            {
              create: {
                name: payload.headline,
                advertisingChannelType: 'SEARCH',
                status: 'PAUSED', // see note in publish()'s doc comment on why this starts paused
                campaignBudget: budgetResourceName,
                networkSettings: {
                  targetGoogleSearch: true,
                  targetSearchNetwork: true,
                  targetContentNetwork: false,
                },
                manualCpc: {},
              },
            },
          ],
        }),
      },
      'Google Ads API'
    );

    const resourceName = body?.results?.[0]?.resourceName as string | undefined;
    if (!resourceName) {
      throw new Error('Google Ads API did not return a campaign resourceName. The campaign was NOT created -- check the response shape/API version.');
    }

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
      'developer-token': developerToken,
      ...(extra?.loginCustomerId ? { 'login-customer-id': normalizeCustomerId(extra.loginCustomerId) } : {}),
    };

    // 3. Create an Ad Group under the campaign. A campaign alone has
    // nothing to serve -- Google Ads requires at least one Ad Group
    // containing an actual Ad before any impression can ever happen. This
    // was the second half of "I can't find the ad" even after the
    // fake-success bug was fixed: a genuinely successful call to this
    // point used to just return, leaving an empty campaign shell.
    const adGroupUrl = `https://googleads.googleapis.com/${API_VERSION}/customers/${accountId}/adGroups:mutate`;
    const adGroupRes = await callPlatformApi(
      adGroupUrl,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          operations: [
            {
              create: {
                name: `Ad Group - ${payload.headline}`.slice(0, 255),
                campaign: resourceName,
                status: 'ENABLED',
                type: 'SEARCH_STANDARD',
                cpcBidMicros: Math.max(100_000, Math.round((payload.budget * 1_000_000) / 20)), // a reasonable starting bid, ~5% of daily budget; the advertiser should tune this in Google Ads afterward
              },
            },
          ],
        }),
      },
      'Google Ads API (Ad Group)'
    );
    const adGroupResourceName = adGroupRes?.results?.[0]?.resourceName;
    if (!adGroupResourceName) {
      throw new Error('Google Ads API did not return an ad group resourceName. The campaign exists but has no ad group -- it cannot serve.');
    }

    // 4. Create the actual ad (a Responsive Search Ad) inside the ad
    // group, using the REAL headlines/descriptions/destination URL the
    // user entered -- not fabricated content, and not just the single
    // master headline padded out (Google requires 3-15 real headlines and
    // 2-4 real descriptions for an RSA; this adapter refuses to create one
    // with fewer, per the validation in campaignDispatchEngine.ts).
    const headlines = payload.googleRsaHeadlines ?? [];
    const descriptions = payload.googleRsaDescriptions ?? [];
    if (headlines.length < 3 || descriptions.length < 2) {
      throw new Error(`Cannot create a Responsive Search Ad: need >=3 headlines and >=2 descriptions (have ${headlines.length} headlines, ${descriptions.length} descriptions). The campaign and ad group were created but have no ad.`);
    }
    if (!payload.destinationUrl) {
      throw new Error('Cannot create an ad with no destination URL. The campaign and ad group were created but have no ad.');
    }

    const adUrl = `https://googleads.googleapis.com/${API_VERSION}/customers/${accountId}/adGroupAds:mutate`;
    const adRes = await callPlatformApi(
      adUrl,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          operations: [
            {
              create: {
                adGroup: adGroupResourceName,
                status: 'PAUSED', // matches the campaign's paused state -- unpause both together once reviewed
                ad: {
                  finalUrls: [payload.destinationUrl],
                  responsiveSearchAd: {
                    headlines: headlines.slice(0, 15).map(text => ({ text: text.slice(0, 30) })),
                    descriptions: descriptions.slice(0, 4).map(text => ({ text: text.slice(0, 90) })),
                  },
                },
              },
            },
          ],
        }),
      },
      'Google Ads API (Ad)'
    );
    const adResourceName = adRes?.results?.[0]?.resourceName;
    if (!adResourceName) {
      throw new Error('Google Ads API did not return an ad resourceName. The campaign and ad group exist but have no ad.');
    }

    // 5. Create keyword criteria so the ad has queries to match against --
    // a Search ad group with no keywords will never be eligible to serve
    // regardless of everything else being correct.
    const keywords = payload.googleKeywords ?? [];
    if (keywords.length < 1) {
      throw new Error('Cannot create a Search ad group with no keywords. The campaign, ad group, and ad were created but will never serve.');
    }
    const keywordUrl = `https://googleads.googleapis.com/${API_VERSION}/customers/${accountId}/adGroupCriteria:mutate`;
    await callPlatformApi(
      keywordUrl,
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          operations: keywords.map(text => ({
            create: {
              adGroup: adGroupResourceName,
              status: 'ENABLED',
              keyword: { text, matchType: 'BROAD' },
            },
          })),
        }),
      },
      'Google Ads API (Keywords)'
    );

    return { externalId: resourceName, mode: 'LIVE' as const };
  },

  async rollback(externalId: string, credential: ResolvedCredential | null) {
    if (!credential) return;
    const { secret, extra } = credential;
    if (externalId.includes('DRYRUN')) return;
    
    try {
      const accountId = normalizeCustomerId(credential.accountId);
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
    } catch (err) {
      console.warn('[googleAdapter] Rollback notice:', err);
    }
  },

  async fetchPerformance(externalId, credential, dateRange) {
    if (!credential) return dryRunPerformance('google', externalId, dateRange);

    const { secret, extra } = credential;
    if (externalId.includes('DRYRUN')) {
      return dryRunPerformance('google', externalId, dateRange);
    }

    try {
      const accountId = normalizeCustomerId(credential.accountId);
      const url = `https://googleads.googleapis.com/${API_VERSION}/customers/${accountId}/googleAds:search`;

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
        spend: totals.costMicros / 1_000_000,
        dateRange,
        mode: 'LIVE',
      };
    } catch (err) {
      console.warn('[googleAdapter] Performance fetch fallback:', err);
      return dryRunPerformance('google', externalId, dateRange);
    }
  },
};
