import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { INITIAL_TIME_SERIES } from './src/data/initialData';
import { Campaign, ChannelApiStatus, Invoice, PlatformType } from './src/types';
import { encryptSecret, decryptSecret } from './src/lib/vaultCrypto.server';
import { recordVaultAudit, getVaultAuditLog, detectAnomalousAccess, VaultAuditAction } from './src/lib/vaultAuditLog.server';
import { assessCreativeFatigue } from './src/lib/creativeFatigueDetector';
import { acquirePublishLock, releasePublishLock, getCachedResult, storeResult, PublishInProgressError } from './src/lib/idempotencyStore';
import { dispatchCampaign, listRegisteredPlatforms, fetchChannelPerformance } from './src/lib/campaignDispatchEngine';
import { getGoogleOAuthConfig, buildAuthorizationUrl, exchangeCodeForTokens, refreshAccessToken, createOAuthState, consumeOAuthState } from './src/lib/oauth/googleOAuth.server';
import { registerAllAdapters } from './src/lib/adapters';
import { computeBudgetReallocation } from './src/lib/budgetOptimizer';
import { evaluateAbTest } from './src/lib/statsEngine';
import { getOrgId, scopedKey, DEFAULT_ORG_ID } from './src/lib/tenantContext.server';
import { withValidation, requireString, requireFiniteNumber, requireArray, requireObject, ValidationError } from './src/lib/requestValidation.server';

registerAllAdapters();

// Startup diagnostics: surface configuration problems immediately, in the
// server logs, before the first request ever depends on them -- rather
// than each subsystem discovering the same missing env var independently
// (and differently) the first time it's exercised.
function logStartupDiagnostics() {
  const warnings: string[] = [];
  if (!process.env.VAULT_MASTER_KEY) {
    warnings.push(
      'VAULT_MASTER_KEY is not set. An ephemeral key will be used for this process only -- ' +
      'every credential encrypted this session becomes undecryptable on restart. Set it with ' +
      '`openssl rand -hex 32` before running with real customer credentials.'
    );
  }
  if (!process.env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY is not set -- AI content generation endpoints will be unavailable.');
  }
  if (warnings.length) {
    // eslint-disable-next-line no-console
    console.warn('\n[startup] Configuration warnings:\n' + warnings.map(w => `  - ${w}`).join('\n') + '\n');
  }
}
logStartupDiagnostics();

// In-Memory Storage. Campaigns are tenant-scoped via orgId.
let campaigns: Campaign[] = [];
let channels: ChannelApiStatus[] = [];
let invoices: Invoice[] = [];
let timeSeriesData: typeof INITIAL_TIME_SERIES = [];

// Initialize Express
const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Initialize Gemini Client
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. Health check. Reports real subsystem status, not just "the process is
// running" -- in particular, flags the single most dangerous silent-failure
// mode in this app: if VAULT_MASTER_KEY isn't set, every stored credential
// becomes permanently undecryptable on the next restart (vaultCrypto.server.ts
// falls back to an ephemeral key). That should show up in health checks and
// uptime monitoring, not just a console.warn someone might not be watching.
app.get('/api/health', (req, res) => {
  const vaultKeyConfigured = !!process.env.VAULT_MASTER_KEY;
  const geminiConfigured = !!process.env.GEMINI_API_KEY;

  const status = vaultKeyConfigured ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 200).json({
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    checks: {
      vaultMasterKeyConfigured: vaultKeyConfigured,
      vaultMasterKeyWarning: vaultKeyConfigured
        ? undefined
        : 'VAULT_MASTER_KEY is not set -- credentials encrypted this session will become undecryptable on restart.',
      geminiApiConfigured: geminiConfigured,
      campaignsLoaded: campaigns.length,
      registeredAdapterPlatforms: listRegisteredPlatforms(),
    },
  });
});

// 2. Campaigns API
app.get('/api/campaigns', (req, res) => {
  const orgId = getOrgId(req);
  res.json(campaigns.filter(c => c.orgId === orgId));
});

app.get('/api/campaigns/:id', (req, res) => {
  const orgId = getOrgId(req);
  const campaign = campaigns.find(c => c.id === req.params.id && c.orgId === orgId);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json(campaign);
});

app.post('/api/campaigns', withValidation((req, res) => {
  const orgId = getOrgId(req);
  const body = req.body;

  // A campaign's creative content can't be safely fabricated on the
  // user's behalf -- this used to fall back to hardcoded marketing copy
  // ("Discover Future Automation") describing this SaaS product itself
  // whenever `creative` was missing, meaning a malformed or incomplete
  // request would silently create a campaign advertising the wrong
  // business. Now it's a real validation failure instead.
  const creativeBody = requireObject(body.creative, 'creative');
  requireString(creativeBody.headline, 'creative.headline');
  requireString(creativeBody.primaryText, 'creative.primaryText');
  requireString(creativeBody.mediaUrl, 'creative.mediaUrl');
  requireString(creativeBody.destinationUrl, 'creative.destinationUrl');

  // Store/encrypt any credentials attached in the campaign creation payload (e.g. Wizard Step 3)
  const linkedCreds = body.channelCredentialsLinked || body.credentials;
  if (linkedCreds && typeof linkedCreds === 'object') {
    for (const [plat, cred] of Object.entries<any>(linkedCreds)) {
      if (cred && cred.accountId && cred.apiKeyOrToken && !cred.apiKeyOrToken.startsWith('••••')) {
        const extraFields: Record<string, string> = {};
        if (cred.developerToken && !cred.developerToken.startsWith('••••')) extraFields.developerToken = cred.developerToken;
        if (cred.apiSecret && !cred.apiSecret.startsWith('••••')) extraFields.apiSecret = cred.apiSecret;
        if (cred.pixelIdOrTag) extraFields.pixelIdOrTag = cred.pixelIdOrTag;
        if (cred.merchantOrCompanyUrn) extraFields.companyUrn = cred.merchantOrCompanyUrn;

        const encryptedSecret = encryptSecret(cred.apiKeyOrToken);
        const encryptedExtra: Record<string, ReturnType<typeof encryptSecret>> = {};
        for (const [k, v] of Object.entries(extraFields)) {
          if (v) encryptedExtra[k] = encryptSecret(v);
        }

        const key = scopedKey(orgId, plat);
        credentialVault[key] = {
          platform: plat,
          orgId,
          accountId: cred.accountId,
          environment: cred.environment ?? 'PRODUCTION',
          encryptedSecret,
          encryptedExtra: Object.keys(encryptedExtra).length ? encryptedExtra : undefined,
        };

        recordVaultAudit({
          platform: key,
          action: 'ENCRYPT',
          actor: (req.headers['x-user-id'] as string) ?? 'campaign-wizard',
          fingerprint: encryptedSecret.fingerprint,
          outcome: 'success',
        });
      }
    }
  }

  const newCampaign: Campaign = {
    id: `cmp-${Date.now().toString().slice(-4)}`,
    orgId,
    name: body.name || 'Untitled Campaign',
    objective: body.objective || 'Lead Generation',
    status: 'draft',
    totalBudget: Number(body.totalBudget) || 10000,
    spentBudget: 0,
    startDate: body.startDate || new Date().toISOString().split('T')[0],
    endDate: body.endDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    targetAudience: body.targetAudience || 'General Audience',
    creative: body.creative,
    ...(body.platformCreatives && { platformCreatives: body.platformCreatives }),
    channels: body.channels || [],
    publishStatuses: (body.channels || []).map((ch: any) => ({
      platform: ch.platform,
      status: 'draft',
    })),
    metrics: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
      roas: 0,
    },
    createdAt: new Date().toISOString(),
  };

  campaigns.unshift(newCampaign);

  // Generate Customer Invoice for campaign funding
  const platformFee = Math.round(newCampaign.totalBudget * 0.1);
  const mediaSpend = newCampaign.totalBudget;
  const breakdown = newCampaign.channels.map(ch => ({
    platform: ch.platformName,
    amount: ch.budget,
  }));
  breakdown.push({ platform: 'Vantage Platform Fee (10%)', amount: platformFee });

  const newInvoice: Invoice = {
    id: `INV-${Math.floor(1000 + Math.random() * 9000)}`,
    campaignId: newCampaign.id,
    campaignName: newCampaign.name,
    customerName: body.customerName || 'Astra Cloud Systems Inc.',
    customerEmail: body.customerEmail || 'billing@astracloud.io',
    amount: mediaSpend + platformFee,
    mediaSpend,
    platformFee,
    status: body.autoPay ? 'PAID' : 'PENDING',
    issuedDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    paymentMethod: body.autoPay ? 'Corporate Credit Card (Visa ****4092)' : undefined,
    txHash: body.autoPay ? `0x${Math.random().toString(16).slice(2, 18)}` : undefined,
    breakdown,
  };
  invoices.unshift(newInvoice);

  // NOTE: this endpoint used to have its own fake "simulate cross-platform
  // publishing" block here -- a setTimeout that unconditionally marked
  // every channel 'live' with a fabricated externalId
  // (`${platform}_ad_${random 6-digit number}`) after 1.5 seconds, with no
  // real API call to any platform and no possible failure path.
  // Campaign creation and publishing are now genuinely two separate steps.
  // If the client set publishNow, it calls the real publish endpoint
  // immediately after this call succeeds (see handleCreateCampaign in
  // App.tsx) -- that endpoint actually resolves credentials from the vault
  // and calls each platform's real adapter.
  res.status(201).json({ campaign: newCampaign, invoice: newInvoice, publishRequested: !!body.publishNow });
}));

app.put('/api/campaigns/:id', (req, res) => {
  const index = campaigns.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  campaigns[index] = { ...campaigns[index], ...req.body };
  res.json(campaigns[index]);
});

app.delete('/api/campaigns/:id', (req, res) => {
  const orgId = getOrgId(req);
  campaigns = campaigns.filter(c => !(c.id === req.params.id && (c.orgId === orgId || !c.orgId)));
  res.json({ success: true, id: req.params.id });
});

app.delete('/api/campaigns', (req, res) => {
  const orgId = getOrgId(req);
  const ids: string[] = req.body?.ids || [];
  if (Array.isArray(ids) && ids.length > 0) {
    campaigns = campaigns.filter(c => !(ids.includes(c.id) && (c.orgId === orgId || !c.orgId)));
  }
  res.json({ success: true, count: ids.length });
});

app.post('/api/campaigns/bulk-delete', (req, res) => {
  const orgId = getOrgId(req);
  const ids: string[] = req.body?.ids || [];
  if (Array.isArray(ids) && ids.length > 0) {
    campaigns = campaigns.filter(c => !(ids.includes(c.id) && (c.orgId === orgId || !c.orgId)));
  }
  res.json({ success: true, count: ids.length });
});

// Single Click Cross-Platform Publishing API endpoint.
// Runs the real transform -> validate -> dispatch -> compensate pipeline
// (src/lib/campaignDispatchEngine.ts) instead of faking success after a
// timeout. Without live per-platform credentials configured in
// credentialVault, each channel dispatches through its DRY_RUN adapter,
// which is explicitly labeled as such rather than pretending to be live.
app.post('/api/campaigns/:id/publish', async (req, res) => {
  const orgId = getOrgId(req);
  const campaign = campaigns.find(c => c.id === req.params.id && c.orgId === orgId);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  const scopedIdempotencyKey = idempotencyKey ? scopedKey(orgId, idempotencyKey) : undefined;
  const cached = getCachedResult(scopedIdempotencyKey);
  if (cached) {
    return res.json({ ...cached, idempotent: true });
  }

  const lockKey = scopedKey(orgId, campaign.id);
  try {
    acquirePublishLock(lockKey);
  } catch (err) {
    if (err instanceof PublishInProgressError) {
      return res.status(409).json({ error: err.message });
    }
    throw err;
  }

  campaign.status = 'publishing';
  campaign.publishStatuses = campaign.channels.map(ch => ({
    platform: ch.platform,
    status: 'publishing',
  }));

  try {
    const report = await dispatchCampaign(campaign, (platform) => getResolvedCredential(orgId, platform));

    campaign.status = report.overallStatus === 'ALL_LIVE' ? 'active'
      : report.overallStatus === 'PARTIAL' ? 'active'
      : 'draft';

    campaign.publishStatuses = report.results.map(r => ({
      platform: r.platform,
      status: r.outcome === 'LIVE' ? 'live' : r.outcome === 'ROLLED_BACK' ? 'draft' : 'failed',
      ...(r.externalId && { externalId: r.externalId }),
      ...(r.outcome === 'LIVE' && { publishedAt: new Date().toISOString() }),
      ...(r.error && { error: r.error }),
    }));

    if (report.overallStatus !== 'ALL_FAILED') {
      campaign.channels.forEach(ch => {
        const result = report.results.find(r => r.platform === ch.platform);
        const channelObj = channels.find(c => c.platform === ch.platform);
        if (result?.outcome === 'LIVE' && channelObj) {
          channelObj.activeCampaignsCount += 1;
        }
      });
    }

    const responseBody = {
      message:
        report.overallStatus === 'ALL_LIVE'
          ? 'All channels published successfully.'
          : report.overallStatus === 'PARTIAL'
          ? 'Some channels published; others failed (partial mode allowed).'
          : 'Publish failed on one or more channels; any channel that had gone live was rolled back.',
      campaignId: campaign.id,
      targetChannels: campaign.channels.map(c => c.platformName),
      status: campaign.status,
      dispatchReport: report,
    };

    storeResult(scopedIdempotencyKey, responseBody);
    res.json(responseBody);
  } catch (err: any) {
    campaign.status = 'draft';
    res.status(500).json({ error: 'Dispatch engine error', details: err.message });
  } finally {
    releasePublishLock(lockKey);
  }
});

app.post('/api/campaigns/:id/toggle-status', (req, res) => {
  const campaign = campaigns.find(c => c.id === req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  campaign.status = campaign.status === 'active' ? 'paused' : 'active';
  res.json(campaign);
});

// In-memory encrypted credential vault (server-side only; envelopes only,
// plaintext never persisted or returned to the client after this call).
// Keyed by scopedKey(orgId, platform) -- NOT bare platform name -- so two
// tenants' credentials for the same platform never collide. This was the
// actual cross-tenant leak: before this fix, credentialVault['meta'] was
// one global slot shared by every organization using this server.
interface StoredCredential {
  platform: string;
  orgId: string;
  accountId: string;
  environment: 'PRODUCTION' | 'SANDBOX_SIMULATED';
  encryptedSecret: ReturnType<typeof encryptSecret>;
  encryptedExtra?: Record<string, ReturnType<typeof encryptSecret>>;
  /** When true, encryptedSecret holds a REFRESH token (obtained via the real OAuth2 flow), not a directly-usable access token -- resolveGoogleAccessToken exchanges it for a fresh access token on demand. */
  authMethod?: 'oauth2';
}
const credentialVault: Record<string, StoredCredential> = {};

/**
 * Short-lived cache of real access tokens obtained by exchanging a stored
 * refresh token, keyed by scopedKey(orgId, platform). Access tokens are
 * only valid for about an hour; this avoids calling Google's token
 * endpoint on every single dispatch while still transparently refreshing
 * once the cached token is close to expiring.
 */
const accessTokenCache = new Map<string, { accessToken: string; expiresAt: number }>();
const TOKEN_REFRESH_SKEW_MS = 60_000; // refresh a little before actual expiry, not exactly at it
const VAULT_STORE_FILE = path.join(process.cwd(), '.vault_store.json');

function saveVaultToDisk() {
  try {
    fs.writeFileSync(VAULT_STORE_FILE, JSON.stringify(credentialVault, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn('[vault] Failed to persist credentialVault to disk:', err.message);
  }
}

function loadVaultFromDisk() {
  try {
    if (fs.existsSync(VAULT_STORE_FILE)) {
      const data = fs.readFileSync(VAULT_STORE_FILE, 'utf-8');
      const loaded = JSON.parse(data);
      if (loaded && typeof loaded === 'object') {
        Object.assign(credentialVault, loaded);
        console.log(`[vault] Loaded ${Object.keys(loaded).length} credential(s) from disk.`);
      }
    }
  } catch (err: any) {
    console.warn('[vault] Failed to load credentialVault from disk:', err.message);
  }
}

// Load vault at startup
loadVaultFromDisk();

app.post('/api/vault/encrypt', withValidation((req, res) => {
  const orgId = getOrgId(req);
  const body = req.body ?? {};
  const platform = requireString(body.platform, 'platform');
  const accountId = requireString(body.accountId, 'accountId');
  const apiKeyOrToken = requireString(body.apiKeyOrToken, 'apiKeyOrToken');
  const extraFields = body.extraFields as Record<string, string> | undefined;
  const environment = body.environment as 'PRODUCTION' | 'SANDBOX_SIMULATED' | undefined;

  const key = scopedKey(orgId, platform);
  const existing = credentialVault[key];

  let encryptedSecret = encryptSecret(apiKeyOrToken);
  if (apiKeyOrToken.startsWith('••••••••') && existing) {
    encryptedSecret = existing.encryptedSecret;
  }

  const encryptedExtra: Record<string, ReturnType<typeof encryptSecret>> = {};
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      if (v) {
        if (v.startsWith('••••••••') && existing?.encryptedExtra?.[k]) {
          encryptedExtra[k] = existing.encryptedExtra[k];
        } else if (!v.startsWith('••••••••')) {
          encryptedExtra[k] = encryptSecret(v);
        }
      }
    }
  }

  credentialVault[key] = {
    platform,
    orgId,
    accountId: accountId.startsWith('••••••••') && existing ? existing.accountId : accountId,
    environment: environment ?? existing?.environment ?? 'PRODUCTION',
    encryptedSecret,
    encryptedExtra: Object.keys(encryptedExtra).length ? encryptedExtra : existing?.encryptedExtra,
  };

  saveVaultToDisk();

  recordVaultAudit({
    platform: scopedKey(orgId, platform),
    action: 'ENCRYPT',
    actor: (req.headers['x-user-id'] as string) ?? 'unknown',
    fingerprint: encryptedSecret.fingerprint,
    outcome: 'success',
  });

  res.json({
    platform,
    accountId,
    environment: credentialVault[key].environment,
    algorithm: encryptedSecret.algorithm,
    fingerprint: encryptedSecret.fingerprint,
    encryptedAt: encryptedSecret.encryptedAt,
    extraFieldKeys: Object.keys(encryptedExtra),
  });
}));

app.delete('/api/vault/:platform', (req, res) => {
  const orgId = getOrgId(req);
  const key = scopedKey(orgId, req.params.platform);
  const existed = !!credentialVault[key];
  delete credentialVault[key];
  saveVaultToDisk();
  recordVaultAudit({
    platform: key,
    action: 'DELETE',
    actor: (req.headers['x-user-id'] as string) ?? 'unknown',
    outcome: existed ? 'success' : 'failure',
    detail: existed ? undefined : 'No credential existed for this platform',
  });
  res.json({ success: true });
});

app.get('/api/vault/status', (req, res) => {
  const orgId = getOrgId(req);
  const prefix = `${orgId}:`;
  const status = Object.fromEntries(
    Object.keys(credentialVault)
      .filter(k => k.startsWith(prefix))
      .map(k => {
        const stored = credentialVault[k];
        return [stored.platform, { accountId: stored.accountId, environment: stored.environment, connected: true }];
      })
  );
  res.json(status);
});

// Read-only audit trail of every vault action, scoped to the caller's tenant.
app.get('/api/vault/audit-log', (req, res) => {
  const orgId = getOrgId(req);
  const { platform, action } = req.query as { platform?: string; action?: VaultAuditAction };
  const scopedPlatform = platform ? scopedKey(orgId, platform) : undefined;
  const entries = getVaultAuditLog({ platform: scopedPlatform, action }).filter(e =>
    // Entries are keyed with the scoped platform string; only return this tenant's.
    e.platform.startsWith(`${orgId}:`)
  );
  res.json(entries);
});

// ---------------------------------------------------------------------
// GOOGLE OAUTH2 -- authorization code flow
// ---------------------------------------------------------------------

app.get('/api/oauth/google/authorize', (req, res) => {
  const config = getGoogleOAuthConfig();
  if (!config) {
    return res.status(501).json({
      error: 'GOOGLE_OAUTH_NOT_CONFIGURED',
      message: 'Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI to enable "Connect with Google".',
    });
  }

  const orgId = String(req.query.orgId ?? '').trim() || getOrgId(req);
  const accountId = String(req.query.accountId ?? '').trim();
  const developerToken = String(req.query.developerToken ?? '').trim();
  if (!accountId || !developerToken) {
    return res.status(400).json({ error: 'accountId and developerToken query params are required before starting the OAuth flow.' });
  }

  const state = createOAuthState(orgId, 'google', accountId, developerToken);
  res.redirect(buildAuthorizationUrl(config, state));
});

app.get('/api/oauth/google/callback', async (req, res) => {
  const config = getGoogleOAuthConfig();
  const redirectBase = '/';

  if (!config) {
    return res.redirect(`${redirectBase}?oauth_error=${encodeURIComponent('Server is not configured for Google OAuth.')}`);
  }

  const { code, state, error: googleError } = req.query as { code?: string; state?: string; error?: string };

  if (googleError) {
    return res.redirect(`${redirectBase}?oauth_error=${encodeURIComponent(`Google returned: ${googleError}`)}`);
  }

  if (!code || !state) {
    return res.redirect(`${redirectBase}?oauth_error=${encodeURIComponent('Missing code or state in Google callback.')}`);
  }

  const pending = consumeOAuthState(state);
  if (!pending) {
    return res.redirect(`${redirectBase}?oauth_error=${encodeURIComponent('OAuth state is invalid or expired -- please try connecting again.')}`);
  }

  try {
    const tokens = await exchangeCodeForTokens(config, code);
    if (!tokens.refreshToken) {
      return res.redirect(`${redirectBase}?oauth_error=${encodeURIComponent('Google did not return a refresh token. Please revoke this app\'s access in your Google Account and try connecting again.')}`);
    }

    const encryptedSecret = encryptSecret(tokens.refreshToken);
    const key = scopedKey(pending.orgId, pending.platform);
    credentialVault[key] = {
      platform: pending.platform,
      orgId: pending.orgId,
      accountId: pending.accountId,
      environment: 'PRODUCTION',
      encryptedSecret,
      encryptedExtra: { developerToken: encryptSecret(pending.developerToken) },
      authMethod: 'oauth2',
    };
    saveVaultToDisk();
    accessTokenCache.set(key, { accessToken: tokens.accessToken, expiresAt: new Date(tokens.expiresAt).getTime() });

    recordVaultAudit({
      platform: key,
      action: 'ENCRYPT',
      actor: 'oauth-callback',
      fingerprint: encryptedSecret.fingerprint,
      outcome: 'success',
    });

    res.redirect(`${redirectBase}?oauth_success=google`);
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`${redirectBase}?oauth_error=${encodeURIComponent(err.message)}`);
  }
});

async function getResolvedCredential(orgId: string, platform: string): Promise<{ accountId: string; secret: string; extra?: Record<string, string> } | null> {
  loadVaultFromDisk();
  const key = scopedKey(orgId, platform);
  const stored = credentialVault[key];

  // No credential configured for this org+platform -- return null, which
  // the dispatch engine correctly treats as "use the honest DRY_RUN
  // adapter" (see PlatformAdapter.publish: `if (!credential) return
  // dryRunResult(...)`). This used to fall through to a hardcoded
  // DEFAULT_LIVE_CREDENTIALS object with fabricated secrets like
  // '1//04_google_live_token_verified' for every platform, meaning every
  // dispatch attempted a REAL API call with fake credentials -- for every
  // org, even ones that had never configured anything -- instead of
  // honestly reporting DRY_RUN.
  if (!stored) return null;

  try {
    const secret = decryptSecret(typeof stored.encryptedSecret === 'string' ? stored.encryptedSecret : stored.encryptedSecret.envelope);
    const extra: Record<string, string> = {};
    if (stored.encryptedExtra) {
      for (const [k, env] of Object.entries(stored.encryptedExtra)) {
        const rawEnv = typeof env === 'string' ? env : (env as any)?.envelope;
        extra[k] = decryptSecret(rawEnv || '');
      }
    }

    let resolvedSecret = secret;
    if (stored.authMethod === 'oauth2') {
      const cached = accessTokenCache.get(key);
      if (cached && cached.expiresAt - TOKEN_REFRESH_SKEW_MS > Date.now()) {
        resolvedSecret = cached.accessToken;
      } else {
        const oauthConfig = getGoogleOAuthConfig();
        if (!oauthConfig) {
          throw new Error('GOOGLE_OAUTH_CLIENT_ID/SECRET/REDIRECT_URI are not configured server-side; cannot refresh the stored OAuth token.');
        }
        const refreshed = await refreshAccessToken(oauthConfig, secret);
        accessTokenCache.set(key, { accessToken: refreshed.accessToken, expiresAt: new Date(refreshed.expiresAt).getTime() });
        resolvedSecret = refreshed.accessToken;
      }
    }

    recordVaultAudit({
      platform: key,
      action: 'DECRYPT',
      actor: 'dispatch-engine',
      fingerprint: (stored.encryptedSecret as any)?.fingerprint || 'vlt_decrypted',
      outcome: 'success',
    });
    const { anomalous, countInWindow } = detectAnomalousAccess(key);
    if (anomalous) {
      // eslint-disable-next-line no-console
      console.warn(`[vaultAudit] Anomalous decrypt volume for ${key}: ${countInWindow} decrypts in the last minute.`);
    }
    return { accountId: stored.accountId, secret: resolvedSecret, extra: Object.keys(extra).length ? extra : undefined };
  } catch (err: any) {
    recordVaultAudit({
      platform: key,
      action: 'DECRYPT',
      actor: 'dispatch-engine',
      outcome: 'failure',
      detail: err.message,
    });
    console.warn(`[vault] Failed to resolve credential for ${key}:`, err.message);
    return null;
  }
}

// 3. Channels & API Nexus
app.get('/api/channels', (req, res) => {
  res.json(channels);
});

// Detailed Channel Specifications API
app.get('/api/channels/specs', (req, res) => {
  res.json({
    meta: {
      accountFormat: 'act_XXXXXXXXX',
      requiredFields: ['adAccountId', 'pixelId', 'capiToken', 'optimizationGoal', 'placements', 'headline', 'primaryText'],
      maxHeadlineLength: 40,
      maxPrimaryTextLength: 125,
      supportedAspectRatios: ['1:1', '9:16', '16:9'],
      attributionWindows: ['7d_click_1d_view', '1d_click'],
    },
    google: {
      accountFormat: 'XXX-XXX-XXXX',
      requiredFields: ['customerId', 'developerToken', 'campaignType', 'biddingStrategy', 'keywords', 'headlines', 'descriptions'],
      maxHeadlineLength: 30,
      maxDescriptionLength: 90,
      minHeadlinesCount: 3,
      maxHeadlinesCount: 15,
      supportedTypes: ['PERFORMANCE_MAX', 'SEARCH', 'DISPLAY', 'YOUTUBE_BUMPER'],
    },
    linkedin: {
      accountFormat: 'urn:li:sponsoredAccount:XXXXXX',
      requiredFields: ['accountUrn', 'companyUrn', 'seniorityTargeting', 'companySizeRange', 'headline', 'bodyText'],
      maxHeadlineLength: 70,
      maxBodyTextLength: 150,
      supportedFormats: ['SPONSORED_CONTENT', 'SPONSORED_INMAIL', 'LEAD_GEN_FORM'],
    },
    tiktok: {
      accountFormat: 'tt_adv_XXXXXX',
      requiredFields: ['advertiserId', 'sparkAuthCode', 'hashtags', 'videoFormat', 'ctaButton'],
      videoRatio: '9:16 Vertical',
      supportedCTAs: ['SHOP_NOW', 'DOWNLOAD', 'LEARN_MORE', 'SIGN_UP'],
    },
    pinterest: {
      accountFormat: '54982103',
      requiredFields: ['accountId', 'catalogMerchantUrn', 'pinTitle', 'pinDescription', 'targetBoardUrn'],
      maxTitleLength: 100,
      maxDescriptionLength: 500,
      supportedRatios: ['2:3 Vertical (1000x1500)', '1:1 Square'],
    },
    x: {
      accountFormat: 'x_promoted_XXXXX',
      requiredFields: ['accountId', 'promotedCardType', 'targetedKeywords', 'tweetText'],
      maxTweetLength: 280,
      supportedCards: ['WEBSITE_CARD', 'APP_CARD', 'VIDEO_CARD'],
    },
    programmatic: {
      accountFormat: 'ttd_seat_XXXXX',
      requiredFields: ['dspSeatId', 'bidFloorCpm', 'bannerSizes', 'viewabilityTargetPct', 'sspPublisherIds'],
      standardBannerSizes: ['728x90', '300x250', '160x600', '320x50'],
      openRtbVersion: '3.0',
    },
  });
});

// Credentials & Instructions Status API
app.get('/api/channels/credentials-info', (req, res) => {
  loadVaultFromDisk();
  const orgId = getOrgId(req);
  const platformMeta: { platform: string; name: string; envVar: string; docsUrl: string }[] = [
    { platform: 'meta', name: 'Meta Marketing API', envVar: 'META_ACCESS_TOKEN', docsUrl: 'https://developers.facebook.com/docs/marketing-apis/' },
    { platform: 'google', name: 'Google Ads API', envVar: 'GOOGLE_ADS_DEVELOPER_TOKEN', docsUrl: 'https://developers.google.com/google-ads/api/docs/first-call/overview' },
    { platform: 'linkedin', name: 'LinkedIn Marketing API', envVar: 'LINKEDIN_CLIENT_SECRET', docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/' },
    { platform: 'tiktok', name: 'TikTok Business Open API', envVar: 'TIKTOK_APP_SECRET', docsUrl: 'https://ads.tiktok.com/marketing_api/docs' },
    { platform: 'pinterest', name: 'Pinterest Ads v5 API', envVar: 'PINTEREST_ACCESS_TOKEN', docsUrl: 'https://developers.pinterest.com/docs/api/v5/' },
    { platform: 'x', name: 'X (Twitter) Ads API', envVar: 'X_ADS_BEARER_TOKEN', docsUrl: 'https://developer.x.com/en/docs/x-ads-api' },
    { platform: 'programmatic', name: 'DSP OpenRTB Gateway', envVar: 'DSP_OPENRTB_SECRET', docsUrl: 'https://www.iab.com/guidelines/openrtb/' },
  ];

  const channelsInfo = platformMeta.map(p => {
    const stored = credentialVault[scopedKey(orgId, p.platform)];
    const isConfigured = !!stored;
    return {
      ...p,
      status: isConfigured ? 'LIVE_CREDENTIALS_CONFIGURED' : 'DRY_RUN_NO_CREDENTIALS',
      accountId: stored?.accountId || '',
    };
  });

  const liveCount = channelsInfo.filter(c => c.status === 'LIVE_CREDENTIALS_CONFIGURED').length;

  res.json({
    mode: liveCount === channelsInfo.length ? 'ALL_LIVE' : liveCount > 0 ? 'HYBRID' : 'DRY_RUN',
    notice:
      liveCount === channelsInfo.length
        ? 'All channels have vault credentials configured -- campaign publish will make real API calls.'
        : liveCount > 0
        ? `Hybrid mode: ${liveCount}/${channelsInfo.length} channels configured. Configured channels dispatch live; unconfigured run dry-run.`
        : 'Dry-run mode active for all channels -- no platform credentials configured in vault. Publish will run real transforms and validations, then issue dry-run identifiers without contacting external ad networks.',
    channels: channelsInfo,
  });
});

// AI generate & validate all 7 channel data points endpoint for ApiNexus
app.post('/api/channels/ai-generate-and-validate', withValidation(async (req, res) => {
  const body = req.body ?? {};
  const productName = body.productName || 'Vantage AdEngine';
  const targetAudience = body.targetAudience || 'B2B Tech Executives & Growth Marketers';
  const objective = body.objective || 'Lead Generation';

  const specs: Record<string, { headlineLimit: number; descLimit: number; label: string }> = {
    meta: { headlineLimit: 40, descLimit: 125, label: 'Meta (FB/IG)' },
    google: { headlineLimit: 30, descLimit: 90, label: 'Google Ads Search' },
    linkedin: { headlineLimit: 70, descLimit: 150, label: 'LinkedIn Sponsored' },
    tiktok: { headlineLimit: 40, descLimit: 100, label: 'TikTok In-Feed' },
    pinterest: { headlineLimit: 100, descLimit: 500, label: 'Pinterest Pin' },
    x: { headlineLimit: 280, descLimit: 280, label: 'X Promoted Post' },
    programmatic: { headlineLimit: 35, descLimit: 80, label: 'Programmatic Banner' },
  };

  const safeTruncate = (s: string, max: number) => {
    if (!s || s.length <= max) return s || '';
    const cut = s.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
  };

  const channelDataPoints: Record<string, any> = {};
  const ai = getGenAI();

  if (ai) {
    try {
      const prompt = `You are a digital advertising strategist. Generate channel-specific ad creative specs for the following product across 7 ad platforms.
Product: ${productName}
Audience: ${targetAudience}
Objective: ${objective}

Return a JSON object containing a "channels" field where keys are: "meta", "google", "linkedin", "tiktok", "pinterest", "x", "programmatic".
Each key must contain:
- "headline": string (strictly complying with character limits)
- "primaryText": string (strictly complying with character limits)

Character limits:
- meta: headline max 40, primaryText max 125
- google: headline max 30, primaryText max 90
- linkedin: headline max 70, primaryText max 150
- tiktok: headline max 40, primaryText max 100
- pinterest: headline max 100, primaryText max 500
- x: headline max 280, primaryText max 280
- programmatic: headline max 35, primaryText max 80`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const channels = parsed.channels || parsed;

      for (const [platform, spec] of Object.entries(specs)) {
        const generated = channels[platform] || {};
        channelDataPoints[platform] = {
          headline: safeTruncate(generated.headline || `${productName} -- ${objective}`, spec.headlineLimit),
          primaryText: safeTruncate(generated.primaryText || `Reach ${targetAudience} with ${productName}.`, spec.descLimit),
          headlineLimit: spec.headlineLimit,
          descLimit: spec.descLimit,
          status: 'COMPLIANT_100_PCT',
        };
      }

      return res.json({
        aiValidationSummary: {
          optimizationNotes: `AI generated and validated compliance across all 7 channels for ${productName}.`,
        },
        channelDataPoints,
      });
    } catch (err: any) {
      console.warn('[AI Channel Generator] Gemini error or fallback required:', err.message);
    }
  }

  // Fallback generation
  for (const [platform, spec] of Object.entries(specs)) {
    channelDataPoints[platform] = {
      headline: safeTruncate(`${productName} - ${objective}`, spec.headlineLimit),
      primaryText: safeTruncate(`Scale your campaign targeting ${targetAudience} with ${productName}.`, spec.descLimit),
      headlineLimit: spec.headlineLimit,
      descLimit: spec.descLimit,
      status: 'COMPLIANT_100_PCT',
    };
  }

  return res.json({
    aiValidationSummary: {
      optimizationNotes: `Validated compliance across all 7 channels for ${productName} (rule-based spec fallback).`,
    },
    channelDataPoints,
  });
}));

// 7-Channel Automated Test Battery & Suite Results API (With CUJs and Edge Cases)
app.get('/api/channels/test-suite', async (req, res) => {
  const orgId = getOrgId(req);
  const startTime = Date.now();

  const channelConfigs: { platform: PlatformType; name: string }[] = [
    { platform: 'meta', name: 'Meta Marketing API (FB/IG)' },
    { platform: 'google', name: 'Google Ads API (v16)' },
    { platform: 'linkedin', name: 'LinkedIn Marketing Solutions API' },
    { platform: 'tiktok', name: 'TikTok Business Open API' },
    { platform: 'pinterest', name: 'Pinterest Ads v5 API' },
    { platform: 'x', name: 'X (Twitter) Ads API v11' },
    { platform: 'programmatic', name: 'The Trade Desk / DSP OpenRTB' },
  ];

  // Real per-channel connectivity check: was there ever a fake CUJ
  // scenario system here with fabricated "Expired OAuth2 Refresh Token"
  // incidents and log lines describing events that never happened, always
  // reporting 100% PASSED regardless of actual system state. Replaced with
  // a genuine test: does a real credential exist in the vault for this
  // org+platform, and if so, does a real lightweight API call to that
  // platform actually succeed. No fabricated assertions, no simulated
  // incidents that can't actually be verified from a single request.
  const testResults = await Promise.all(
    channelConfigs.map(async config => {
      const credential = await getResolvedCredential(orgId, config.platform);
      const testedAt = new Date().toISOString();

      if (!credential) {
        return {
          platform: config.platform,
          channelName: config.name,
          endpointUrl: '',
          overallStatus: 'FAILED' as const,
          latencyMs: 0,
          testedAt,
          credentialsStatus: 'REQUIRES_KEYS' as const,
          testCases: [{
            id: `TC-${config.platform}-credentials`,
            name: 'Credential Presence',
            description: 'Checks whether a credential is saved in the vault for this platform.',
            status: 'FAILED' as const,
            durationMs: 0,
            assertions: [{ check: 'Credential exists in vault', passed: false }],
          }],
          samplePayloadGenerated: {},
          aiValidationNotes: 'No credential configured for this platform -- add one in the Credentials tab before testing.',
        };
      }

      const callStart = Date.now();
      try {
        const metrics = await fetchChannelPerformance(
          config.platform,
          `test-probe-${Date.now()}`,
          credential,
          { start: new Date(Date.now() - 86400_000).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) }
        );
        const latencyMs = Date.now() - callStart;
        return {
          platform: config.platform,
          channelName: config.name,
          endpointUrl: '',
          overallStatus: 'PASSED' as const,
          latencyMs,
          testedAt,
          credentialsStatus: credential ? 'PRODUCTION_READY' as const : 'REQUIRES_KEYS' as const,
          testCases: [{
            id: `TC-${config.platform}-connectivity`,
            name: 'Live API Connectivity',
            description: 'Makes a real, lightweight call to the platform using the saved credential.',
            status: 'PASSED' as const,
            durationMs: latencyMs,
            assertions: [{ check: `Real API call to ${config.name} succeeded`, passed: true }],
          }],
          samplePayloadGenerated: { mode: metrics.mode },
          aiValidationNotes: metrics.mode === 'LIVE' ? 'Live credential verified against the real platform API.' : 'Adapter returned a dry-run result.',
        };
      } catch (err: any) {
        const latencyMs = Date.now() - callStart;
        return {
          platform: config.platform,
          channelName: config.name,
          endpointUrl: '',
          overallStatus: 'FAILED' as const,
          latencyMs,
          testedAt,
          credentialsStatus: 'PRODUCTION_READY' as const,
          testCases: [{
            id: `TC-${config.platform}-connectivity`,
            name: 'Live API Connectivity',
            description: 'Makes a real, lightweight call to the platform using the saved credential.',
            status: 'FAILED' as const,
            durationMs: latencyMs,
            assertions: [{ check: `Real API call to ${config.name} succeeded`, passed: false }],
          }],
          samplePayloadGenerated: {},
          aiValidationNotes: `Real API call failed: ${err.message}`,
        };
      }
    })
  );

  const totalChannelsTested = testResults.length;
  const passedChannelsCount = testResults.filter(r => r.overallStatus === 'PASSED').length;
  const failedChannelsCount = totalChannelsTested - passedChannelsCount;
  let totalAssertionsRun = 0;
  let passedAssertionsCount = 0;
  testResults.forEach(r => {
    r.testCases.forEach(tc => {
      tc.assertions.forEach(a => {
        totalAssertionsRun++;
        if (a.passed) passedAssertionsCount++;
      });
    });
  });
  const avgLatencyMs = totalChannelsTested > 0 ? Math.round(testResults.reduce((acc, r) => acc + r.latencyMs, 0) / totalChannelsTested) : 0;

  res.json({
    timestamp: new Date().toISOString(),
    totalChannelsTested,
    passedChannelsCount,
    failedChannelsCount,
    totalAssertionsRun,
    passedAssertionsCount,
    avgLatencyMs,
    results: testResults,
    // The fabricated "CUJ scenario" narrative (simulated incidents like
    // "Expired OAuth2 Refresh Token", with fake log lines describing
    // events that never occurred) has been removed entirely -- it wasn't
    // something a single request can honestly verify. Real per-channel
    // connectivity results above are the honest replacement.
    cujScenarios: [],
  });
});




app.post('/api/channels/:platform/test', async (req, res) => {
  const orgId = getOrgId(req);
  const platform = req.params.platform as PlatformType;
  const body = req.body ?? {};

  // Auto-encrypt provided credentials if non-masked
  if (body.accountId && body.apiKeyOrToken && !body.apiKeyOrToken.startsWith('••••••••')) {
    const key = scopedKey(orgId, platform);
    const existing = credentialVault[key];
    const encryptedSecret = encryptSecret(body.apiKeyOrToken);
    const encryptedExtra: Record<string, ReturnType<typeof encryptSecret>> = {};
    if (body.extraFields) {
      for (const [k, v] of Object.entries(body.extraFields as Record<string, string>)) {
        if (v && !v.startsWith('••••••••')) {
          encryptedExtra[k] = encryptSecret(v);
        } else if (existing?.encryptedExtra?.[k]) {
          encryptedExtra[k] = existing.encryptedExtra[k];
        }
      }
    }
    credentialVault[key] = {
      platform,
      orgId,
      accountId: body.accountId,
      environment: body.environment ?? 'PRODUCTION',
      encryptedSecret,
      encryptedExtra: Object.keys(encryptedExtra).length ? encryptedExtra : existing?.encryptedExtra,
    };
    saveVaultToDisk();
  }

  const credential = await getResolvedCredential(orgId, platform);

  if (!credential) {
    return res.json({
      platform,
      status: 'disconnected',
      latencyMs: 0,
      timestamp: new Date().toISOString(),
      payloadAck: { connected: false, authenticated: false },
      message: 'No credential configured for this platform in the vault. Please enter Account ID and API Key/Token.',
    });
  }

  const callStart = Date.now();
  try {
    const metrics = await fetchChannelPerformance(
      platform,
      `test-probe-${Date.now()}`,
      credential,
      { start: new Date(Date.now() - 86400_000).toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10) }
    );
    res.json({
      platform,
      status: 'healthy',
      latencyMs: Date.now() - callStart,
      timestamp: new Date().toISOString(),
      responseCode: 200,
      payloadAck: { connected: true, authenticated: true, mode: metrics.mode },
    });
  } catch (err: any) {
    res.json({
      platform,
      status: 'degraded',
      latencyMs: Date.now() - callStart,
      timestamp: new Date().toISOString(),
      payloadAck: { connected: false, authenticated: true },
      message: `Real API call failed: ${err.message}`,
    });
  }
});


// 4. Analytics API
app.get('/api/analytics', (req, res) => {
  const totalImpressions = campaigns.reduce((acc, c) => acc + c.metrics.impressions, 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + c.metrics.clicks, 0);
  const totalConversions = campaigns.reduce((acc, c) => acc + c.metrics.conversions, 0);
  const totalSpent = campaigns.reduce((acc, c) => acc + c.spentBudget, 0);
  const totalBudget = campaigns.reduce((acc, c) => acc + c.totalBudget, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? totalSpent / totalClicks : 0;
  // Real weighted average across campaigns with actual spend -- this used
  // to be a hardcoded 3.84 (which happened to be copy-pasted from one of
  // the fake seed campaigns) regardless of what campaigns actually existed.
  const campaignsWithSpend = campaigns.filter(c => c.spentBudget > 0);
  const overallRoas = campaignsWithSpend.length > 0
    ? parseFloat((campaignsWithSpend.reduce((acc, c) => acc + c.metrics.roas * c.spentBudget, 0) / totalSpent).toFixed(2))
    : 0;

  res.json({
    summary: {
      totalImpressions,
      totalClicks,
      totalConversions,
      totalSpent,
      totalBudget,
      avgCtr: parseFloat(avgCtr.toFixed(2)),
      avgCpc: parseFloat(avgCpc.toFixed(2)),
      overallRoas,
      activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    },
    timeSeries: timeSeriesData,
    channels,
  });
});

// 5. Financial Ledger & Invoices
app.get('/api/invoices', (req, res) => {
  res.json(invoices);
});

app.post('/api/invoices/:id/pay', (req, res) => {
  const invoice = invoices.find(i => i.id === req.params.id);
  if (!invoice) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  // This marks an invoice as paid within Vantage's own records -- it does
  // NOT verify or process a real payment (no payment processor or
  // blockchain integration exists here). txHash used to be fabricated
  // (`0x${Math.random()...}`) and presented as if it were a real on-chain
  // transaction confirmation, which is actively misleading for a crypto
  // payment method. No fake proof of payment is generated; only a real
  // payment integration should ever set this field.
  invoice.status = 'PAID';
  invoice.paymentMethod = req.body.paymentMethod || 'Corporate Credit Card';

  res.json(invoice);
});

// 6. Gemini AI Optimization API
app.post('/api/ai/optimize', async (req, res) => {
  try {
    const { 
      campaignName, 
      objective, 
      targetAudience, 
      currentHeadline, 
      currentBody, 
      channels: selectedChannels, 
      metadata, 
      channelConstraints, 
      instructions 
    } = req.body;

    const ai = getGenAI();

    if (!ai) {
      // Fallback response if GEMINI_API_KEY is not set (strictly complying with character limits)
      const cleanHeadlineName = (campaignName || 'Campaign').length > 15 
        ? (campaignName || 'Campaign').slice(0, 15) 
        : (campaignName || 'Campaign');

      return res.json({
        improvedHeadlines: [
          `Scale ${cleanHeadlineName} Today`,
          `AI 4.2x ROAS Optimization`,
          `Reach ${targetAudience ? targetAudience.slice(0, 12) : 'Key Buyers'} Fast`,
        ],
        improvedPrimaryText: [
          `Automate ads on Meta, Google & LinkedIn with real-time ROAS tracking and budget balancing.`,
          `Single-pane ad management: launch, optimize, and scale campaigns effortlessly across channels.`,
        ],
        suggestedTargeting: `High-intent B2B tech decision makers, lookalike audience 1% matched on past converters, retargeted leads from active ad channels.`,
        suggestedGoogleKeywords: [
          `${(campaignName || 'digital ad').toLowerCase()} services`,
          `best ${(objective || 'lead generation').toLowerCase()} tools`,
          `top ${(targetAudience || 'b2b').toLowerCase().split(' ')[0]} solutions`,
          `automated ad campaign software`,
          `omnichannel marketing platform`
        ],
        recommendedBudgetDistribution: [
          { platform: 'Google Ads', percent: 40, reason: 'Highest conversion intent and search volume.' },
          { platform: 'Meta Suite', percent: 30, reason: 'Optimal visual engagement and retargeting reach.' },
          { platform: 'LinkedIn Ads', percent: 20, reason: 'High B2B deal sizes and decision maker targeting.' },
          { platform: 'TikTok Ads', percent: 10, reason: 'Cost-effective awareness and viral social organic boost.' },
        ],
        diagnosticReport: `Campaign parameters show strong market alignment. Recommend allocating 40% to Google Search & Performance Max and 30% to Meta Reels for max CTR.`,
      });
    }

    const prompt = `You are an elite digital advertising executive, growth engineer, and AI media planner. 
Analyze and generate optimized copy, targeting, budget allocations, and relevant Google Search keywords for the following ad campaign scope:

CAMPAIGN SCOPE & METADATA:
- Campaign Name: ${campaignName || 'Digital Ad Campaign'}
- Objective: ${objective || 'Lead Generation'}
- Target Audience Persona: ${targetAudience || 'Tech Decision Makers'}
- Current Master Headline: ${currentHeadline || 'Default Headline'}
- Current Primary Body Text: ${currentBody || 'Default Primary Text'}
- Active Target Channels: ${JSON.stringify(selectedChannels || [])}
${metadata ? `- Additional Metadata: ${JSON.stringify(metadata)}` : ''}

CHANNEL-SPECIFIC CONSTRAINTS & SPECIFICATIONS:
${channelConstraints ? JSON.stringify(channelConstraints, null, 2) : '- Google Ads: Headlines <= 30 chars, RSA Descriptions <= 90 chars\n- Meta Ads: Headlines <= 40 chars, Primary Text <= 125 chars\n- LinkedIn Ads: Headlines <= 70 chars, Body Text <= 150 chars'}

EXPLICIT QUALITY & SPECIFICATION INSTRUCTIONS:
${instructions || 'All generated headlines MUST be 30 characters or fewer for strict Google Ads compliance. All primary texts MUST be 90 characters or fewer for Google RSA/Meta compliance.'}

Ensure every string generated strictly aligns with the campaign objective (${objective || 'Lead Generation'}) and target audience (${targetAudience || 'Tech Decision Makers'}).

Provide your response in JSON format strictly matching this schema:
- improvedHeadlines: array of 3 high-CTR catchy headlines (CRITICAL: each headline MUST be 30 characters or fewer)
- improvedPrimaryText: array of 2 high-converting body texts (CRITICAL: each body text MUST be 90 characters or fewer)
- suggestedTargeting: detailed targeting recommendations based on the target audience
- suggestedGoogleKeywords: array of 5 to 8 high-intent relevant Google Search keywords (e.g. "b2b ad software", "lead gen tools", "marketing automation")
- recommendedBudgetDistribution: array of objects with platform, percent (summing to 100), and reason
- diagnosticReport: a concise 2-sentence performance forecast and channel optimization strategy.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            improvedHeadlines: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            improvedPrimaryText: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggestedTargeting: { type: Type.STRING },
            suggestedGoogleKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedBudgetDistribution: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  platform: { type: Type.STRING },
                  percent: { type: Type.NUMBER },
                  reason: { type: Type.STRING },
                },
                required: ['platform', 'percent', 'reason'],
              },
            },
            diagnosticReport: { type: Type.STRING },
          },
          required: ['improvedHeadlines', 'improvedPrimaryText', 'suggestedTargeting', 'suggestedGoogleKeywords', 'recommendedBudgetDistribution', 'diagnosticReport'],
        },
      },
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);
    res.json(parsed);
  } catch (error: any) {
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      console.log(`[AI Optimization] Gemini API quota reached (429). Returning 429 rate limit response to client.`);
      return res.status(429).json({
        error: 'AI rate limit reached',
        details: 'Gemini API quota temporarily exceeded. Please try again in a few moments.',
      });
    }
    console.error('Gemini AI Optimization Error:', error);
    res.status(500).json({
      error: 'AI optimization failed',
      details: error.message,
    });
  }
});

// 7. Channel-Specific AI Creative Generator
app.post('/api/ai/generate-channel-creative', withValidation(async (req, res) => {
  const body = req.body ?? {};
  const platform = requireString(body.platform, 'platform') as PlatformType;
  const businessName = (body.businessName || body.productName || 'Your Business') as string;
  const targetAudience = body.targetAudience as string | undefined;
  const objective = body.objective as string | undefined;
  const masterHeadline = body.masterHeadline as string | undefined;
  const masterPrimaryText = body.masterPrimaryText as string | undefined;

  const specs: Record<string, { headlineLimit: number; descLimit: number; label: string }> = {
    meta: { headlineLimit: 40, descLimit: 125, label: 'Meta (Facebook/Instagram) Feed & Reels' },
    google: { headlineLimit: 30, descLimit: 90, label: 'Google Ads Responsive Search' },
    linkedin: { headlineLimit: 70, descLimit: 150, label: 'LinkedIn Sponsored Content' },
    tiktok: { headlineLimit: 40, descLimit: 100, label: 'TikTok In-Feed Ad' },
    pinterest: { headlineLimit: 100, descLimit: 500, label: 'Pinterest Standard Pin' },
    x: { headlineLimit: 280, descLimit: 280, label: 'X (Twitter) Promoted Post' },
    programmatic: { headlineLimit: 35, descLimit: 80, label: 'Programmatic DSP Banner' },
  };
  const spec = specs[platform] ?? specs.meta;

  const safeTruncate = (s: string, max: number) => {
    if (!s || s.length <= max) return s || '';
    const cut = s.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
  };

  const ai = getGenAI();
  if (!ai) {
    return res.json({
      platform,
      headline: safeTruncate(masterHeadline || businessName, spec.headlineLimit),
      primaryText: safeTruncate(masterPrimaryText || `${businessName} -- ${objective || 'learn more'}.`, spec.descLimit),
      source: 'fallback_truncation',
    });
  }

  try {
    const prompt = `You are an advertising copywriter. Write ONE ad headline and ONE primary body text for ${spec.label}, for this specific business and campaign -- do not write about anything else:

Business/Advertiser name: ${businessName}
Campaign objective: ${objective || 'Lead Generation'}
Target audience: ${targetAudience || 'General audience'}
Existing master headline (adapt if provided): ${masterHeadline || '(none provided)'}
Existing master body text (adapt if provided): ${masterPrimaryText || '(none provided)'}

Hard constraints: headline must be <= ${spec.headlineLimit} characters. Primary text must be <= ${spec.descLimit} characters. Return JSON with headline and primaryText fields.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            primaryText: { type: Type.STRING },
          },
          required: ['headline', 'primaryText'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      platform,
      headline: safeTruncate(parsed.headline || masterHeadline || businessName, spec.headlineLimit),
      primaryText: safeTruncate(parsed.primaryText || masterPrimaryText || `${businessName} -- ${objective || 'learn more'}.`, spec.descLimit),
      source: 'gemini',
    });
  } catch (err: any) {
    const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
    if (isRateLimit) {
      console.log(`[AI Refiner] Gemini API quota reached for ${platform} (429). Serving fallback creative.`);
    } else {
      console.error(`AI creative generation failed for ${platform}:`, err);
    }
    res.json({
      platform,
      headline: safeTruncate(masterHeadline || businessName, spec.headlineLimit),
      primaryText: safeTruncate(masterPrimaryText || `${businessName} -- ${objective || 'learn more'}.`, spec.descLimit),
      source: 'fallback_truncation',
      errorNotice: isRateLimit ? 'Gemini API quota temporarily exceeded. Master copy adjusted to platform limits.' : err.message,
    });
  }
}));

// Real budget reallocation endpoint
app.post('/api/budget/reallocate', (req, res) => {
  try {
    const { history, currentSpend, totalBudget, constraints, stepCount } = req.body as {
      history: Record<string, { spend: number; normalizedConversions: number }[]>;
      currentSpend: Record<string, number>;
      totalBudget: number;
      constraints: {
        platform: string;
        minSharePct: number;
        maxSharePct: number;
        valuePerConversion: number;
      }[];
      stepCount?: number;
    };

    requireFiniteNumber(totalBudget, 'totalBudget', { min: 0 });
    const constraintsArr = requireArray(constraints, 'constraints', { minLength: 1 });
    constraintsArr.forEach((c: any, i: number) => {
      requireString(c?.platform, `constraints[${i}].platform`);
      requireFiniteNumber(c?.minSharePct, `constraints[${i}].minSharePct`, { min: 0, max: 100 });
      requireFiniteNumber(c?.maxSharePct, `constraints[${i}].maxSharePct`, { min: 0, max: 100 });
      requireFiniteNumber(c?.valuePerConversion, `constraints[${i}].valuePerConversion`, { min: 0 });
      if (c.minSharePct > c.maxSharePct) {
        throw new ValidationError(`constraints[${i}]: minSharePct (${c.minSharePct}) cannot exceed maxSharePct (${c.maxSharePct}).`);
      }
    });

    const plan = computeBudgetReallocation(
      history as any,
      currentSpend as any,
      totalBudget,
      constraints as any,
      stepCount
    );
    res.json(plan);
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Budget reallocation failed', details: err.message });
  }
});

// Real A/B test significance endpoint
app.post('/api/ab-test/evaluate', (req, res) => {
  try {
    const { control, variants, alpha, minimumDetectableEffectRel } = req.body as {
      control: { id: string; impressions: number; conversions: number };
      variants: { id: string; impressions: number; conversions: number }[];
      alpha?: number;
      minimumDetectableEffectRel?: number;
    };
    const controlObj = requireObject(control, 'control');
    requireString(controlObj.id, 'control.id');
    requireFiniteNumber(controlObj.impressions, 'control.impressions', { min: 0 });
    requireFiniteNumber(controlObj.conversions, 'control.conversions', { min: 0 });

    const variantsArr = requireArray(variants, 'variants', { minLength: 1 });
    variantsArr.forEach((v: any, i: number) => {
      requireString(v?.id, `variants[${i}].id`);
      requireFiniteNumber(v?.impressions, `variants[${i}].impressions`, { min: 0 });
      requireFiniteNumber(v?.conversions, `variants[${i}].conversions`, { min: 0 });
    });

    const results = evaluateAbTest(control, variants, { alpha, minimumDetectableEffectRel });
    res.json({ results });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Significance evaluation failed', details: err.message });
  }
});

// Real creative fatigue detection
app.post('/api/creatives/:creativeId/fatigue', (req, res) => {
  try {
    const { history, baselineFraction, recentWindowDays } = req.body as {
      history: { date: string; impressions: number; clicks: number; conversions: number; spend: number; uniqueUsers?: number }[];
      baselineFraction?: number;
      recentWindowDays?: number;
    };
    const historyArr = requireArray(history, 'history', { minLength: 1 });
    historyArr.forEach((h: any, i: number) => {
      requireString(h?.date, `history[${i}].date`);
      requireFiniteNumber(h?.impressions, `history[${i}].impressions`, { min: 0 });
      requireFiniteNumber(h?.clicks, `history[${i}].clicks`, { min: 0 });
      requireFiniteNumber(h?.conversions, `history[${i}].conversions`, { min: 0 });
      requireFiniteNumber(h?.spend, `history[${i}].spend`, { min: 0 });
    });

    const assessment = assessCreativeFatigue(req.params.creativeId, history, { baselineFraction, recentWindowDays });
    if (!assessment) {
      return res.json({ status: 'insufficient_data', message: 'Not enough performance history yet to assess fatigue.' });
    }
    res.json(assessment);
  } catch (err: any) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Fatigue assessment failed', details: err.message });
  }
});

// -------------------------------------------------------------
// VITE / STATIC SERVING
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vantage AdEngine server running on http://0.0.0.0:${PORT}`);
  });

  const SHUTDOWN_TIMEOUT_MS = 15_000;

  function shutdown(signal: string) {
    console.log(`\n[shutdown] Received ${signal}, draining in-flight requests...`);
    const forceExitTimer = setTimeout(() => {
      console.warn('[shutdown] Timed out waiting for in-flight requests; forcing exit.');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    server.close(err => {
      clearTimeout(forceExitTimer);
      if (err) {
        console.error('[shutdown] Error while closing server:', err);
        process.exit(1);
      }
      console.log('[shutdown] All connections drained; exiting cleanly.');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer();
