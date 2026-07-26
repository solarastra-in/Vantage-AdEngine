import { Campaign, ChannelBudget, PlatformType } from '../types';
import { validateChannelApiKeyFormat } from '../lib/encryption';

/**
 * Helper to validate campaign parameters and return validation errors
 */
export function validateCampaignCreation(campaignData: {
  name: string;
  totalBudget: number;
  startDate: string;
  endDate: string;
  channels: Partial<ChannelBudget>[];
  creative: { headline: string; primaryText: string; callToAction: string };
  credentialsMap?: Record<string, any>;
}): { isValid: boolean; errors: string[]; cujRef: string } {
  const errors: string[] = [];

  // CUJ-4: Omnichannel Assembly validation check
  if (!campaignData.name || campaignData.name.trim() === '') {
    errors.push('Campaign name is required');
  }

  if (campaignData.totalBudget <= 0) {
    errors.push('Total budget must be greater than zero');
  }

  const startMs = new Date(campaignData.startDate).getTime();
  const endMs = new Date(campaignData.endDate).getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    errors.push('End date must be strictly after start date');
  }

  if (!campaignData.creative?.headline || campaignData.creative.headline.trim() === '') {
    errors.push('Ad Headline creative is required');
  }

  if (!campaignData.creative?.primaryText || campaignData.creative.primaryText.trim() === '') {
    errors.push('Ad Primary Text creative is required');
  }

  // Active channel budget check
  const activeChannels = (campaignData.channels || []).filter(c => c.enabled !== false);
  if (activeChannels.length === 0) {
    errors.push('At least one advertising channel must be selected');
  }

  // Validate API keys for selected active channels (CUJ-2 / CUJ-5)
  if (campaignData.credentialsMap) {
    for (const ch of activeChannels) {
      if (ch.platform) {
        const cred = campaignData.credentialsMap[ch.platform];
        if (!cred) {
          errors.push(`Missing API credentials for channel ${ch.platform}`);
        } else {
          const val = validateChannelApiKeyFormat(ch.platform as PlatformType, cred.accountId, cred.apiKeyOrToken);
          if (!val.isValid) {
            errors.push(`Invalid API key format for channel ${ch.platform}: ${val.error}`);
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    cujRef: 'CUJ-4: Omnichannel Assembly & Dispatch',
  };
}

describe('CUJ-4 & CUJ-2: Campaign Creation & Validation Test Suite', () => {
  test('Edge Case 1: Fails when total budget is zero or negative', () => {
    const result = validateCampaignCreation({
      name: 'Zero Budget Test',
      totalBudget: 0,
      startDate: '2026-08-01',
      endDate: '2026-08-30',
      channels: [{ platform: 'meta', enabled: true, budget: 1000 }],
      creative: { headline: 'Test Headline', primaryText: 'Test Copy', callToAction: 'Learn More' },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Total budget must be greater than zero');
  });

  test('Edge Case 2: Fails when end date precedes or equals start date', () => {
    const result = validateCampaignCreation({
      name: 'Invalid Date Range Campaign',
      totalBudget: 5000,
      startDate: '2026-08-15',
      endDate: '2026-08-10',
      channels: [{ platform: 'google', enabled: true, budget: 5000 }],
      creative: { headline: 'Test Headline', primaryText: 'Test Copy', callToAction: 'Sign Up' },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('End date must be strictly after start date');
  });

  test('Edge Case 3: Fails when creative headline or primary text is empty', () => {
    const result = validateCampaignCreation({
      name: 'Missing Copy Campaign',
      totalBudget: 10000,
      startDate: '2026-08-01',
      endDate: '2026-08-30',
      channels: [{ platform: 'linkedin', enabled: true, budget: 10000 }],
      creative: { headline: '', primaryText: '', callToAction: 'Apply Now' },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Ad Headline creative is required');
    expect(result.errors).toContain('Ad Primary Text creative is required');
  });

  test('Edge Case 4: Blocks publishing when selected channel API keys fail format check', () => {
    const badCredentials = {
      meta: { accountId: 'act_123', apiKeyOrToken: 'short' }, // Meta key too short
    };

    const result = validateCampaignCreation({
      name: 'Bad Key Campaign',
      totalBudget: 15000,
      startDate: '2026-08-01',
      endDate: '2026-08-30',
      channels: [{ platform: 'meta', enabled: true, budget: 15000 }],
      creative: { headline: 'Valid Headline', primaryText: 'Valid Body', callToAction: 'Book Demo' },
      credentialsMap: badCredentials,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Invalid API key format for channel meta'))).toBe(true);
  });

  test('Success Case: Passes validation with valid campaign payload and valid credentials across 3 channels', () => {
    const validCredentials = {
      meta: { accountId: 'act_98230192', apiKeyOrToken: 'EAAG_valid_meta_token_long_string' },
      google: { accountId: '883-201-1234', apiKeyOrToken: '1//04_google_valid_refresh_token_long', developerToken: 'goog_dev_tok_valid' },
      linkedin: { accountId: 'urn:li:sponsoredAccount:554109', apiKeyOrToken: 'AQV_valid_linkedin_token' },
    };

    const result = validateCampaignCreation({
      name: 'Q3 Enterprise Scale Omnichannel Launch',
      totalBudget: 60000,
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      channels: [
        { platform: 'meta', enabled: true, budget: 20000 },
        { platform: 'google', enabled: true, budget: 25000 },
        { platform: 'linkedin', enabled: true, budget: 15000 },
      ],
      creative: { headline: 'Automate Paid Ads across 7 Platforms', primaryText: 'Vantage AdEngine streamlines multi-channel campaign publishing', callToAction: 'Get Started' },
      credentialsMap: validCredentials,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.cujRef).toContain('CUJ-4');
  });
});
