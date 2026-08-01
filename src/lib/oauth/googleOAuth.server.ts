/**
 * googleOAuth.server.ts
 *
 * Real Google OAuth2 "web server" flow -- the piece that was entirely
 * missing before. googleAdapter.ts always required an already-valid
 * access token handed to it directly; there was no code anywhere that
 * could take a real authorization code or refresh token and turn it into
 * one. This module is that code: it exchanges an authorization code for
 * an access + refresh token pair, and later exchanges a stored refresh
 * token for a fresh access token whenever the cached one has expired.
 *
 * Requires a Google Cloud OAuth 2.0 Client (Console -> APIs & Services ->
 * Credentials -> Create OAuth client ID -> Web application), with this
 * server's callback URL added to its Authorized redirect URIs. Configured
 * via:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_REDIRECT_URI   (e.g. https://your-domain.com/api/oauth/google/callback)
 *
 * Docs: https://developers.google.com/identity/protocols/oauth2/web-server
 */

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

// Google Ads API access requires this scope specifically.
const GOOGLE_ADS_SCOPE = 'https://www.googleapis.com/auth/adwords';

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

/**
 * Builds the URL to send the user's browser to for Google's consent
 * screen. `state` should be an opaque, server-verifiable token (see
 * oauthStateStore below) carrying which org/platform this authorization
 * is for, and preventing CSRF -- Google echoes it back unchanged on the
 * callback redirect, but anyone could construct their own callback
 * request with an arbitrary state value, so the state itself must be
 * validated server-side, not merely trusted because it round-tripped.
 */
export function buildAuthorizationUrl(config: GoogleOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: GOOGLE_ADS_SCOPE,
    access_type: 'offline', // required to receive a refresh_token at all
    prompt: 'consent', // forces a refresh_token even if the user has authorized before (Google otherwise omits it on repeat consent)
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken: string | null; // null if Google didn't issue one this time (e.g. prompt=consent was somehow bypassed) -- caller must handle this
  expiresAt: string; // ISO timestamp
}

/**
 * Exchanges a one-time authorization code (from the callback's ?code=)
 * for a real access token + refresh token pair. The code is single-use
 * and expires within minutes -- this must be called immediately in the
 * callback handler, never deferred or retried with a stale code.
 */
export async function exchangeCodeForTokens(config: GoogleOAuthConfig, code: string): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const rawBody = await res.text();
  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(`Google token exchange returned a non-JSON response (HTTP ${res.status}): ${rawBody.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${data.error_description || data.error || res.status}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
  };
}

/**
 * Exchanges a previously-stored refresh token for a fresh access token.
 * Called whenever the cached access token has expired (or is missing) --
 * see resolveGoogleAccessToken in server.ts, which caches the result by
 * expiry so this isn't called on every single dispatch.
 */
export async function refreshAccessToken(config: GoogleOAuthConfig, refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const rawBody = await res.text();
  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch {
    throw new Error(`Google token refresh returned a non-JSON response (HTTP ${res.status}): ${rawBody.slice(0, 200)}`);
  }
  if (!res.ok) {
    // A refresh token can itself become invalid (revoked by the user,
    // expired from disuse, or the OAuth client was deleted/changed) --
    // surfacing Google's actual error_description is important here
    // rather than a generic "refresh failed", since the fix differs
    // (re-authorize vs. check client config).
    throw new Error(`Google token refresh failed: ${data.error_description || data.error || res.status}. The stored refresh token may need to be re-authorized.`);
  }

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000).toISOString(),
  };
}

// ---------------------------------------------------------------------
// CSRF state store -- short-lived, single-use tokens binding an
// authorize-flow redirect to a specific org, so a callback request can't
// be replayed or forged for a different org than the one that actually
// initiated it.
// ---------------------------------------------------------------------
interface PendingOAuthState {
  orgId: string;
  platform: string;
  accountId: string;
  developerToken: string;
  createdAt: number;
}
const pendingStates = new Map<string, PendingOAuthState>();
const STATE_TTL_MS = 10 * 60_000; // 10 minutes -- generous for a user to complete the consent screen

export function createOAuthState(orgId: string, platform: string, accountId: string, developerToken: string): string {
  const token = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  pendingStates.set(token, { orgId, platform, accountId, developerToken, createdAt: Date.now() });
  return token;
}

/** Validates and consumes a state token -- each one is usable exactly once, and expires after STATE_TTL_MS. */
export function consumeOAuthState(state: string): PendingOAuthState | null {
  const entry = pendingStates.get(state);
  pendingStates.delete(state); // single-use regardless of outcome
  if (!entry) return null;
  if (Date.now() - entry.createdAt > STATE_TTL_MS) return null;
  return entry;
}
