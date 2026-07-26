import { UserRole, UserPermissions } from '../types';

export function getRolePermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'SUPER_ADMIN':
      return {
        canCreateCampaigns: true,
        canPublishCampaigns: true,
        canEditCredentials: true,
        canManageBilling: true,
        canManageOrganizations: true,
      };

    case 'CAMPAIGN_MANAGER':
      return {
        canCreateCampaigns: true,
        canPublishCampaigns: true,
        canEditCredentials: true,
        canManageBilling: false,
        canManageOrganizations: false,
      };

    case 'FINANCE_ADMIN':
      return {
        canCreateCampaigns: false,
        canPublishCampaigns: false,
        canEditCredentials: false,
        canManageBilling: true,
        canManageOrganizations: false,
      };

    case 'READ_ONLY_ANALYST':
      return {
        canCreateCampaigns: false,
        canPublishCampaigns: false,
        canEditCredentials: false,
        canManageBilling: false,
        canManageOrganizations: false,
      };

    default:
      return {
        canCreateCampaigns: false,
        canPublishCampaigns: false,
        canEditCredentials: false,
        canManageBilling: false,
        canManageOrganizations: false,
      };
  }
}

export function authorizeAction(
  role: UserRole,
  action: 'CREATE_CAMPAIGN' | 'PUBLISH_CAMPAIGN' | 'EDIT_CREDENTIALS' | 'MANAGE_BILLING' | 'MANAGE_ORGS'
): { permitted: boolean; reason?: string; cujRef: string } {
  const perm = getRolePermissions(role);

  switch (action) {
    case 'CREATE_CAMPAIGN':
      return {
        permitted: perm.canCreateCampaigns,
        reason: perm.canCreateCampaigns ? undefined : `Role ${role} is not authorized to create campaigns`,
        cujRef: 'CUJ-1: Workspace Onboarding & RBAC',
      };

    case 'PUBLISH_CAMPAIGN':
      return {
        permitted: perm.canPublishCampaigns,
        reason: perm.canPublishCampaigns ? undefined : `Role ${role} is not authorized to publish campaigns to live channels`,
        cujRef: 'CUJ-4: Omnichannel Assembly & Dispatch',
      };

    case 'EDIT_CREDENTIALS':
      return {
        permitted: perm.canEditCredentials,
        reason: perm.canEditCredentials ? undefined : `Role ${role} cannot edit channel API credentials`,
        cujRef: 'CUJ-2: API Credentials & Handshake',
      };

    case 'MANAGE_BILLING':
      return {
        permitted: perm.canManageBilling,
        reason: perm.canManageBilling ? undefined : `Role ${role} is not authorized to manage invoices or auto-pay`,
        cujRef: 'CUJ-6: Financial Telemetry & Invoicing',
      };

    case 'MANAGE_ORGS':
      return {
        permitted: perm.canManageOrganizations,
        reason: perm.canManageOrganizations ? undefined : `Role ${role} cannot manage multi-tenant organization settings`,
        cujRef: 'CUJ-1: Workspace Onboarding & RBAC',
      };
  }
}

describe('CUJ-1 & CUJ-6: User Role-Based Access Control (RBAC) Test Suite', () => {
  test('SUPER_ADMIN possesses full platform governance permissions', () => {
    const role: UserRole = 'SUPER_ADMIN';
    expect(authorizeAction(role, 'CREATE_CAMPAIGN').permitted).toBe(true);
    expect(authorizeAction(role, 'PUBLISH_CAMPAIGN').permitted).toBe(true);
    expect(authorizeAction(role, 'EDIT_CREDENTIALS').permitted).toBe(true);
    expect(authorizeAction(role, 'MANAGE_BILLING').permitted).toBe(true);
    expect(authorizeAction(role, 'MANAGE_ORGS').permitted).toBe(true);
  });

  test('CAMPAIGN_MANAGER can create and publish campaigns, but cannot manage billing or organization plans', () => {
    const role: UserRole = 'CAMPAIGN_MANAGER';
    expect(authorizeAction(role, 'CREATE_CAMPAIGN').permitted).toBe(true);
    expect(authorizeAction(role, 'PUBLISH_CAMPAIGN').permitted).toBe(true);
    expect(authorizeAction(role, 'EDIT_CREDENTIALS').permitted).toBe(true);
    
    const billingAuth = authorizeAction(role, 'MANAGE_BILLING');
    expect(billingAuth.permitted).toBe(false);
    expect(billingAuth.reason).toContain('not authorized to manage invoices');

    const orgAuth = authorizeAction(role, 'MANAGE_ORGS');
    expect(orgAuth.permitted).toBe(false);
  });

  test('FINANCE_ADMIN can manage billing, but cannot publish campaigns or edit API keys', () => {
    const role: UserRole = 'FINANCE_ADMIN';
    expect(authorizeAction(role, 'MANAGE_BILLING').permitted).toBe(true);

    const publishAuth = authorizeAction(role, 'PUBLISH_CAMPAIGN');
    expect(publishAuth.permitted).toBe(false);
    expect(publishAuth.reason).toContain('not authorized to publish');

    const credAuth = authorizeAction(role, 'EDIT_CREDENTIALS');
    expect(credAuth.permitted).toBe(false);
  });

  test('READ_ONLY_ANALYST is restricted from modifying any state or publishing campaigns', () => {
    const role: UserRole = 'READ_ONLY_ANALYST';
    expect(authorizeAction(role, 'CREATE_CAMPAIGN').permitted).toBe(false);
    expect(authorizeAction(role, 'PUBLISH_CAMPAIGN').permitted).toBe(false);
    expect(authorizeAction(role, 'EDIT_CREDENTIALS').permitted).toBe(false);
    expect(authorizeAction(role, 'MANAGE_BILLING').permitted).toBe(false);
  });
});
