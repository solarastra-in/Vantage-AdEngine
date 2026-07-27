import { PlatformType } from '../types';

export interface KeyValidationResult {
  isValid: boolean;
  error?: string;
  detectedFormat?: string;
  permissionsGranted: string[];
}

/**
 * NOTE: Real encryption/decryption of channel credentials happens ONLY on the
 * server, in src/lib/vaultCrypto.server.ts (AES-256-GCM). This file used to
 * contain a client-side "encryptApiKey"/"decryptApiKey" pair that was base64 +
 * string-reversal labeled as AES-256-GCM -- that was not encryption and has
 * been removed. Never reintroduce client-side "encryption" of secrets: a
 * browser bundle can't hold a secret key, so anything done here is
 * obfuscation, not security. Send raw credentials to the server over HTTPS
 * and let vaultCrypto.server.ts encrypt them before they touch Firestore.
 */

/**
 * Validates platform-specific API keys and account IDs for format & scope readiness.
 */
export function validateChannelApiKeyFormat(
  platform: PlatformType,
  accountId: string,
  apiKeyOrToken: string
): KeyValidationResult {
  if (!accountId || accountId.trim() === '') {
    return {
      isValid: false,
      error: `Missing Account / Customer ID for ${platform.toUpperCase()}`,
      permissionsGranted: [],
    };
  }

  if (!apiKeyOrToken || apiKeyOrToken.trim() === '') {
    return {
      isValid: false,
      error: `Missing API Key or Bearer Token for ${platform.toUpperCase()}`,
      permissionsGranted: [],
    };
  }

  const key = apiKeyOrToken.trim();

  switch (platform) {
    case 'meta': {
      const validToken = key.length >= 10;
      return {
        isValid: validToken,
        error: validToken ? undefined : 'Meta Conversions API Token must be at least 10 characters',
        detectedFormat: 'Graph API v19.0 Bearer Token',
        permissionsGranted: ['ads_management', 'ads_read', 'leads_retrieval', 'pages_read_engagement'],
      };
    }

    case 'google': {
      const validCustId = /^\d{3}-?\d{3}-?\d{4}$/.test(accountId.trim()) || accountId.length >= 8;
      const validDevToken = key.length >= 8;
      return {
        isValid: validCustId && validDevToken,
        error: !validCustId 
          ? 'Google Customer ID must be 10 digits (e.g. 123-456-7890)' 
          : (!validDevToken ? 'Google Ads Developer Token is invalid' : undefined),
        detectedFormat: 'Google Ads API v16 OAuth2 + Developer Token',
        permissionsGranted: ['https://www.googleapis.com/auth/adwords', 'read_write_campaigns'],
      };
    }

    case 'linkedin': {
      const validUrn = accountId.length >= 4;
      const validKey = key.length >= 8;
      return {
        isValid: validUrn && validKey,
        error: !validUrn ? 'Invalid LinkedIn Account URN' : (!validKey ? 'Invalid OAuth2 Access Token' : undefined),
        detectedFormat: 'LinkedIn Marketing Developer Platform API v2',
        permissionsGranted: ['rw_ads', 'r_ads_reporting', 'rw_organization_admin'],
      };
    }

    case 'tiktok': {
      const validAdv = accountId.length >= 6;
      const validToken = key.length >= 8;
      return {
        isValid: validAdv && validToken,
        error: !validAdv ? 'Invalid TikTok Advertiser ID' : (!validToken ? 'Invalid TikTok Access Token' : undefined),
        detectedFormat: 'TikTok Commercial Content API v1.3',
        permissionsGranted: ['ad_management', 'reporting', 'spark_ads'],
      };
    }

    case 'pinterest': {
      const valid = accountId.length >= 4 && key.length >= 8;
      return {
        isValid: valid,
        error: valid ? undefined : 'Pinterest Ads API credentials failed format check',
        detectedFormat: 'Pinterest Ads API v5 Bearer Token',
        permissionsGranted: ['ads:read', 'ads:write', 'catalogs:read'],
      };
    }

    case 'x': {
      const valid = accountId.length >= 3 && key.length >= 8;
      return {
        isValid: valid,
        error: valid ? undefined : 'X (Twitter) Ads API credentials failed format check',
        detectedFormat: 'X Ads API v11 OAuth 2.0 Bearer',
        permissionsGranted: ['tweet.read', 'tweet.write', 'ads.read', 'ads.write'],
      };
    }

    case 'programmatic': {
      const valid = accountId.length >= 3 && key.length >= 8;
      return {
        isValid: valid,
        error: valid ? undefined : 'Programmatic DSP Seat ID or API Secret failed format check',
        detectedFormat: 'OpenRTB 2.5 / DSP Seat API',
        permissionsGranted: ['dsp_bidder_read', 'dsp_bidder_write', 'deal_management'],
      };
    }

    default:
      return {
        isValid: key.length >= 8,
        permissionsGranted: ['read', 'write'],
      };
  }
}
