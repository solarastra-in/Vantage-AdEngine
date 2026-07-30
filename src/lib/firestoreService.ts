import { 
  collection, 
  collectionGroup,
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { Campaign, ChannelApiStatus, Invoice, PlatformType, ChannelCredentials } from '../types';
import { INITIAL_CAMPAIGNS, INITIAL_CHANNELS, INITIAL_INVOICES } from '../data/initialData';

// Initial Default Credentials Config for All 7 Platforms
export const DEFAULT_CHANNEL_CREDENTIALS: Record<PlatformType, ChannelCredentials> = {
  meta: {
    platform: 'meta',
    accountId: 'act_98230192',
    apiKeyOrToken: 'EAAG_live_simulated_token_meta_9912',
    pixelIdOrTag: 'pix_448201928',
    environment: 'SANDBOX_SIMULATED',
    lastValidatedAt: new Date().toISOString(),
    validationStatus: 'CONNECTED',
  },
  google: {
    platform: 'google',
    accountId: '883-201-12',
    apiKeyOrToken: 'goog_oauth_refresh_token_sim_8812',
    developerToken: 'goog_dev_tok_991283',
    environment: 'SANDBOX_SIMULATED',
    lastValidatedAt: new Date().toISOString(),
    validationStatus: 'CONNECTED',
  },
  linkedin: {
    platform: 'linkedin',
    accountId: 'urn:li:sponsoredAccount:554109',
    apiKeyOrToken: 'li_oauth2_access_tok_88102',
    merchantOrCompanyUrn: 'urn:li:organization:1029384',
    environment: 'SANDBOX_SIMULATED',
    lastValidatedAt: new Date().toISOString(),
    validationStatus: 'CONNECTED',
  },
  tiktok: {
    platform: 'tiktok',
    accountId: 'tt_adv_883210',
    apiKeyOrToken: 'tt_app_secret_tok_991029',
    apiSecret: 'spark_auth_771029381',
    environment: 'SANDBOX_SIMULATED',
    lastValidatedAt: new Date().toISOString(),
    validationStatus: 'CONNECTED',
  },
  pinterest: {
    platform: 'pinterest',
    accountId: '54982103',
    apiKeyOrToken: 'pina_access_tok_v5_99210',
    merchantOrCompanyUrn: 'urn:pin:catalog:883920',
    environment: 'SANDBOX_SIMULATED',
    lastValidatedAt: new Date().toISOString(),
    validationStatus: 'CONNECTED',
  },
  x: {
    platform: 'x',
    accountId: 'x_promoted_10293',
    apiKeyOrToken: 'x_bearer_tok_ads_v11_88102',
    environment: 'SANDBOX_SIMULATED',
    lastValidatedAt: new Date().toISOString(),
    validationStatus: 'CONNECTED',
  },
  programmatic: {
    platform: 'programmatic',
    accountId: 'ttd_seat_99210',
    apiKeyOrToken: 'dsp_openrtb_secret_99210',
    environment: 'SANDBOX_SIMULATED',
    lastValidatedAt: new Date().toISOString(),
    validationStatus: 'CONNECTED',
  },
};


export interface Organization {
  id: string;
  name: string;
  domain: string;
  plan: 'Starter' | 'Growth' | 'Enterprise';
  monthlyAdBudget: number;
  assignedSeats: number;
  status: 'Active' | 'Suspended' | 'Pending Approval' | 'Pending';
  adminEmail: string;
  createdAt: string;
  channelsConfigured: number;
  activeCampaignsCount?: number;
  /** ISO 4217 currency code (e.g. USD, EUR, INR) all monetary figures for this org are displayed in. Defaults to USD. */
  currency?: string;
  /** BCP 47 locale (e.g. en-US, en-IN, de-DE) driving number/date formatting conventions. Defaults to en-US. */
  locale?: string;
}

export interface ContactLead {
  id?: string;
  fullName: string;
  workEmail: string;
  companyName: string;
  monthlyAdSpend: string;
  message: string;
  submittedAt: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_USER';
  orgId: string;
  createdAt: string;
  /** Absent for SUPER_ADMIN (platform operators aren't scoped by these permissions -- they can do everything). */
  permissions?: EmployeePermissions;
}

export interface EmployeePermissions {
  canCreateCampaigns: boolean;
  canPublishCampaigns: boolean;
  canEditCredentials: boolean;
  canManageBilling: boolean;
  canManageTeam: boolean;
}

export const ADMIN_DEFAULT_PERMISSIONS: EmployeePermissions = {
  canCreateCampaigns: true,
  canPublishCampaigns: true,
  canEditCredentials: true,
  canManageBilling: true,
  canManageTeam: true,
};

export const MEMBER_DEFAULT_PERMISSIONS: EmployeePermissions = {
  canCreateCampaigns: true,
  canPublishCampaigns: false,
  canEditCredentials: false,
  canManageBilling: false,
  canManageTeam: false,
};

/**
 * An org-scoped allowlist entry authorizing a specific email address to
 * sign in as an employee of that organization. This is the actual
 * gatekeeping data for Google Auth -- a signed-in Google account is only
 * granted portal access if its email has a matching entry (in ANY org,
 * looked up via collectionGroup) with status ACCEPTED or PENDING.
 * PENDING means "invited but hasn't signed in yet"; the first successful
 * sign-in with that email flips it to ACCEPTED and creates the
 * corresponding users/{uid} profile.
 */
export interface InvitedEmployee {
  email: string;
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_USER';
  status: 'PENDING' | 'ACCEPTED';
  invitedBy: string;
  invitedAt: string;
  acceptedAt?: string;
  permissions?: EmployeePermissions;
}

/** Firestore document IDs can't contain '@' or '.', so emails are sanitized for use as IDs. */
function emailToDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[.@]/g, '_');
}

// Super Admin Email Whitelist
export const SUPER_ADMIN_EMAILS = ['solarastra.in@gmail.com'];
export const isSuperAdminEmail = (email: string): boolean => 
  SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());

// Initial Sample Organizations for Multi-Tenant Demonstration
export const INITIAL_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-astracloud',
    name: 'Astra Cloud Systems Inc.',
    domain: 'astracloud.io',
    plan: 'Enterprise',
    monthlyAdBudget: 250000,
    assignedSeats: 25,
    status: 'Active',
    adminEmail: 'solarastra.in@gmail.com',
    createdAt: '2026-01-10T09:00:00Z',
    channelsConfigured: 6,
    activeCampaignsCount: 2,
  },
  {
    id: 'org-acmegrowth',
    name: 'Acme Growth Labs',
    domain: 'acmegrowth.com',
    plan: 'Growth',
    monthlyAdBudget: 85000,
    assignedSeats: 10,
    status: 'Active',
    adminEmail: 'alex@acmegrowth.com',
    createdAt: '2026-02-15T11:20:00Z',
    channelsConfigured: 4,
    activeCampaignsCount: 1,
  },
  {
    id: 'org-quantumtech',
    name: 'Quantum Tech Mobility',
    domain: 'quantumtech.ai',
    plan: 'Starter',
    monthlyAdBudget: 30000,
    assignedSeats: 3,
    status: 'Active',
    adminEmail: 'sarah@quantumtech.ai',
    createdAt: '2026-03-01T14:45:00Z',
    channelsConfigured: 3,
    activeCampaignsCount: 1,
  },
];

// -----------------------------------------------------------------
// FIRESTORE TENANT SERVICE
// -----------------------------------------------------------------

/** Strips undefined properties recursively to prevent Firestore setDoc/addDoc/updateDoc invalid data errors */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeForFirestore(value);
    }
  }
  return cleaned as T;
}

// 1. Seed Firestore Data if empty
export const seedFirestoreIfEmpty = async (orgId: string = 'org-astracloud') => {
  try {
    // Check organizations
    const orgsRef = collection(db, 'organizations');
    const orgsSnap = await getDocs(orgsRef);

    if (orgsSnap.empty) {
      console.log('Seeding initial multi-tenant organizations to Firestore...');
      for (const org of INITIAL_ORGANIZATIONS) {
        await setDoc(doc(db, 'organizations', org.id), sanitizeForFirestore(org));
      }
    }

    // ONLY seed sample campaigns/channels/invoices for the primary demo org (org-astracloud)
    if (orgId === 'org-astracloud') {
      const campaignsRef = collection(db, `organizations/${orgId}/campaigns`);
      const cmpSnap = await getDocs(campaignsRef);

      if (cmpSnap.empty) {
        console.log(`Seeding initial campaigns for tenant ${orgId} to Firestore...`);
        for (const campaign of INITIAL_CAMPAIGNS) {
          await setDoc(doc(db, `organizations/${orgId}/campaigns`, campaign.id), sanitizeForFirestore(campaign));
        }
      }

      const channelsRef = collection(db, `organizations/${orgId}/channels`);
      const chSnap = await getDocs(channelsRef);

      if (chSnap.empty) {
        console.log(`Seeding initial channels for tenant ${orgId} to Firestore...`);
        for (const channel of INITIAL_CHANNELS) {
          await setDoc(doc(db, `organizations/${orgId}/channels`, channel.platform), sanitizeForFirestore(channel));
        }
      }

      const invoicesRef = collection(db, `organizations/${orgId}/invoices`);
      const invSnap = await getDocs(invoicesRef);

      if (invSnap.empty) {
        console.log(`Seeding initial invoices for tenant ${orgId} to Firestore...`);
        for (const invoice of INITIAL_INVOICES) {
          await setDoc(doc(db, `organizations/${orgId}/invoices`, invoice.id), sanitizeForFirestore(invoice));
        }
      }
    }
  } catch (error) {
    console.error('Firestore auto-seed error:', error);
  }
};

// 2. Organization Management
export const fetchOrganizationsFromFirestore = async (): Promise<Organization[]> => {
  try {
    const orgsRef = collection(db, 'organizations');
    const snap = await getDocs(orgsRef);

    if (snap.empty) {
      await seedFirestoreIfEmpty();
      return INITIAL_ORGANIZATIONS;
    }

    const orgs: Organization[] = [];
    snap.forEach(docSnap => {
      orgs.push(docSnap.data() as Organization);
    });
    return orgs;
  } catch (error) {
    console.warn('Fallback to local organizations due to Firestore read:', error);
    return INITIAL_ORGANIZATIONS;
  }
};

export const createOrganizationInFirestore = async (newOrg: Organization) => {
  try {
    await setDoc(doc(db, 'organizations', newOrg.id), sanitizeForFirestore(newOrg));
    if (newOrg.id === 'org-astracloud') {
      await seedFirestoreIfEmpty(newOrg.id);
    }
  } catch (error) {
    console.error('Error creating organization in Firestore:', error);
    throw error;
  }
};

export const updateOrganizationStatusInFirestore = async (
  orgId: string,
  status: 'Active' | 'Pending Approval' | 'Suspended'
) => {
  try {
    await updateDoc(doc(db, 'organizations', orgId), sanitizeForFirestore({ status }));
  } catch (error) {
    console.error(`Error updating status for org ${orgId}:`, error);
    throw error;
  }
};

// 3. Campaign Operations per Tenant
export const fetchCampaignsFromFirestore = async (orgId: string): Promise<Campaign[]> => {
  try {
    const ref = collection(db, `organizations/${orgId}/campaigns`);
    const snap = await getDocs(ref);

    if (snap.empty) {
      if (orgId === 'org-astracloud') {
        await seedFirestoreIfEmpty(orgId);
        return INITIAL_CAMPAIGNS;
      }
      return [];
    }

    const campaigns: Campaign[] = [];
    snap.forEach(d => {
      campaigns.push(d.data() as Campaign);
    });
    return campaigns;
  } catch (error) {
    console.warn(`Fallback for campaigns for tenant ${orgId}:`, error);
    return orgId === 'org-astracloud' ? INITIAL_CAMPAIGNS : [];
  }
};

export const saveCampaignToFirestore = async (orgId: string, campaign: Campaign) => {
  try {
    await setDoc(doc(db, `organizations/${orgId}/campaigns`, campaign.id), sanitizeForFirestore(campaign));
  } catch (error) {
    console.error(`Error saving campaign ${campaign.id} to Firestore:`, error);
    throw error;
  }
};

export const updateCampaignStatusInFirestore = async (
  orgId: string, 
  campaignId: string, 
  status: Campaign['status']
) => {
  try {
    const campaignRef = doc(db, `organizations/${orgId}/campaigns`, campaignId);
    await updateDoc(campaignRef, sanitizeForFirestore({ status }));
  } catch (error) {
    console.error(`Error updating campaign status:`, error);
  }
};

// 4. Invoices Operations per Tenant
export const fetchInvoicesFromFirestore = async (orgId: string): Promise<Invoice[]> => {
  try {
    const ref = collection(db, `organizations/${orgId}/invoices`);
    const snap = await getDocs(ref);

    if (snap.empty) {
      if (orgId === 'org-astracloud') {
        await seedFirestoreIfEmpty(orgId);
        return INITIAL_INVOICES;
      }
      return [];
    }

    const invoices: Invoice[] = [];
    snap.forEach(d => {
      invoices.push(d.data() as Invoice);
    });
    return invoices;
  } catch (error) {
    console.warn(`Fallback for invoices for tenant ${orgId}:`, error);
    return orgId === 'org-astracloud' ? INITIAL_INVOICES : [];
  }
};

export const saveInvoiceToFirestore = async (orgId: string, invoice: Invoice) => {
  try {
    await setDoc(doc(db, `organizations/${orgId}/invoices`, invoice.id), sanitizeForFirestore(invoice));
  } catch (error) {
    console.error(`Error saving invoice:`, error);
  }
};

export const updateInvoiceStatusInFirestore = async (
  orgId: string, 
  invoiceId: string, 
  status: 'PAID' | 'PENDING' | 'OVERDUE',
  paymentMethod?: string,
  txHash?: string
) => {
  try {
    const invRef = doc(db, `organizations/${orgId}/invoices`, invoiceId);
    await updateDoc(invRef, sanitizeForFirestore({
      status,
      ...(paymentMethod && { paymentMethod }),
      ...(txHash && { txHash }),
    }));
  } catch (error) {
    console.error('Error updating invoice status in Firestore:', error);
  }
};

// 5. Channels Operations per Tenant
export const fetchChannelsFromFirestore = async (orgId: string): Promise<ChannelApiStatus[]> => {
  try {
    const ref = collection(db, `organizations/${orgId}/channels`);
    const snap = await getDocs(ref);

    if (snap.empty) {
      if (orgId === 'org-astracloud') {
        await seedFirestoreIfEmpty(orgId);
        return INITIAL_CHANNELS;
      }
      // Clean default channels for new tenant
      const defaultChannels: ChannelApiStatus[] = INITIAL_CHANNELS.map(ch => ({
        ...ch,
        status: 'DISCONNECTED',
        connectedAccountsCount: 0,
        activeCampaignsCount: 0,
        spendThisMonth: 0,
        latencyMs: 0,
      }));
      return defaultChannels;
    }

    const channels: ChannelApiStatus[] = [];
    snap.forEach(d => {
      channels.push(d.data() as ChannelApiStatus);
    });
    return channels;
  } catch (error) {
    console.warn(`Fallback to local channels:`, error);
    return orgId === 'org-astracloud' ? INITIAL_CHANNELS : [];
  }
};

export const saveChannelToFirestore = async (orgId: string, channel: ChannelApiStatus) => {
  try {
    await setDoc(doc(db, `organizations/${orgId}/channels`, channel.platform), sanitizeForFirestore(channel));
  } catch (error) {
    console.error('Error saving channel to Firestore:', error);
  }
};

// 6. Contact Form Submissions (Leads)
export const submitContactLeadToFirestore = async (lead: Omit<ContactLead, 'submittedAt' | 'status'>) => {
  try {
    const leadsRef = collection(db, 'leads');
    const newLead: ContactLead = {
      ...lead,
      submittedAt: new Date().toISOString(),
      status: 'NEW',
    };
    const docRef = await addDoc(leadsRef, sanitizeForFirestore(newLead));
    return docRef.id;
  } catch (error) {
    console.error('Error submitting contact lead:', error);
    throw error;
  }
};

export const fetchLeadsFromFirestore = async (): Promise<ContactLead[]> => {
  try {
    const leadsRef = collection(db, 'leads');
    const snap = await getDocs(leadsRef);
    if (snap.empty) {
      return [];
    }
    const leads: ContactLead[] = [];
    snap.forEach(d => {
      leads.push(d.data() as ContactLead);
    });
    return leads;
  } catch (error) {
    console.warn('Fallback empty leads list:', error);
    return [];
  }
};

// 7. Channel Credentials Persistence per Tenant
export const fetchChannelCredentialsFromFirestore = async (orgId: string): Promise<Record<string, ChannelCredentials>> => {
  try {
    const ref = collection(db, `organizations/${orgId}/credentials`);
    const snap = await getDocs(ref);

    if (snap.empty) {
      // Seed default initial credentials
      for (const [platform, creds] of Object.entries(DEFAULT_CHANNEL_CREDENTIALS)) {
        await setDoc(doc(db, `organizations/${orgId}/credentials`, platform), sanitizeForFirestore(creds));
      }
      return DEFAULT_CHANNEL_CREDENTIALS;
    }

    const credentials: Record<string, ChannelCredentials> = { ...DEFAULT_CHANNEL_CREDENTIALS };
    snap.forEach(d => {
      credentials[d.id] = d.data() as ChannelCredentials;
    });
    return credentials;
  } catch (error) {
    console.warn(`Fallback to default channel credentials for tenant ${orgId}:`, error);
    return DEFAULT_CHANNEL_CREDENTIALS;
  }
};

export const saveChannelCredentialsToFirestore = async (orgId: string, creds: ChannelCredentials) => {
  try {
    await setDoc(doc(db, `organizations/${orgId}/credentials`, creds.platform), sanitizeForFirestore(creds));
  } catch (error) {
    console.warn(`Error saving credentials for ${creds.platform}:`, error);
  }
};

// -----------------------------------------------------------------
// 8. EMPLOYEE AUTHENTICATION & CUSTOMER ONBOARDING
//
// This is the actual gate a signed-in Google account has to clear before
// reaching the portal. Previously, "Launch App" navigated directly into
// the dashboard with no check at all, and "Continue with Google" signed a
// user in and navigated to the portal regardless of whether that email
// belonged to any customer of the platform. Both bypassed this entirely.
// -----------------------------------------------------------------

/**
 * Looks up whether a signed-in user is already a known member of an
 * organization (fast path for returning users -- one direct doc read by uid).
 */
export const fetchUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

/**
 * Searches every organization's invitedEmployees subcollection for a
 * PENDING or ACCEPTED entry matching this email, via a Firestore
 * collectionGroup query (requires no server-side index beyond the default
 * single-field index Firestore creates automatically for collectionGroup
 * queries on a field). Returns null if no organization has authorized
 * this email -- the caller must treat that as "not a customer," not as an
 * error to route around.
 */
export const findEmployeeAuthorizationForEmail = async (
  email: string
): Promise<{ orgId: string; invite: InvitedEmployee } | null> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return null;

  // Platform Super Admin fast path
  if (isSuperAdminEmail(cleanEmail)) {
    return {
      orgId: 'org-astracloud',
      invite: {
        email: cleanEmail,
        role: 'SUPER_ADMIN',
        status: 'ACCEPTED',
        invitedBy: 'Platform System',
        invitedAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
      }
    };
  }

  try {
    const q = query(collectionGroup(db, 'invitedEmployees'), where('email', '==', cleanEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      const orgId = docSnap.ref.parent.parent?.id;
      if (orgId) {
        return { orgId, invite: docSnap.data() as InvitedEmployee };
      }
    }
  } catch (error) {
    console.warn('CollectionGroup query for invitedEmployees failed:', error);
  }

  // Fallback check: check if this email matches adminEmail for an organization
  try {
    const orgsRef = collection(db, 'organizations');
    const orgsSnap = await getDocs(query(orgsRef, where('adminEmail', '==', cleanEmail)));
    if (!orgsSnap.empty) {
      const matchedOrg = orgsSnap.docs[0];
      return {
        orgId: matchedOrg.id,
        invite: {
          email: cleanEmail,
          role: 'TENANT_ADMIN',
          status: 'ACCEPTED',
          invitedBy: cleanEmail,
          invitedAt: new Date().toISOString(),
          acceptedAt: new Date().toISOString(),
        }
      };
    }
  } catch (error) {
    console.warn('Organizations fallback lookup by adminEmail failed:', error);
  }

  return null;
};

/**
 * Called once, right after a Google sign-in succeeds, to determine whether
 * this person is allowed into the portal and which organization they
 * belong to.
 */
export const resolveAuthorizedOrgForUser = async (
  uid: string,
  email: string,
  displayName: string
): Promise<{ status: 'AUTHORIZED'; profile: UserProfile } | { status: 'NOT_AUTHORIZED' }> => {
  const cleanEmail = email.trim().toLowerCase();

  if (isSuperAdminEmail(cleanEmail)) {
    const profile: UserProfile = {
      uid,
      email: cleanEmail,
      displayName: displayName || cleanEmail,
      role: 'SUPER_ADMIN',
      orgId: 'org-astracloud',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', uid), sanitizeForFirestore(profile), { merge: true });
    return { status: 'AUTHORIZED', profile };
  }

  const existingProfile = await fetchUserProfile(uid);
  if (existingProfile) {
    return { status: 'AUTHORIZED', profile: existingProfile };
  }

  const authorization = await findEmployeeAuthorizationForEmail(email);
  if (!authorization) {
    return { status: 'NOT_AUTHORIZED' };
  }

  const { orgId, invite } = authorization;
  const profile: UserProfile = {
    uid,
    email: cleanEmail,
    displayName: displayName || email,
    role: invite.role,
    orgId,
    createdAt: new Date().toISOString(),
    permissions: invite.permissions,
  };

  await setDoc(doc(db, 'users', uid), sanitizeForFirestore(profile));
  try {
    await updateDoc(doc(db, `organizations/${orgId}/invitedEmployees`, emailToDocId(email)), sanitizeForFirestore({
      status: 'ACCEPTED',
      acceptedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Could not update invitedEmployees status:', err);
  }

  return { status: 'AUTHORIZED', profile };
};

/**
 * Self-service customer onboarding: creates a brand-new organization and
 * makes the signed-in user its first TENANT_ADMIN in one step. This is
 * the actual "onboarding journey" -- distinct from SuperAdminPanel's
 * createOrganizationInFirestore, which is an internal SaaS-operator tool
 * for manually provisioning a tenant, not a self-service flow a customer
 * would go through themselves.
 */
export const onboardNewOrganization = async (
  orgName: string,
  uid: string,
  email: string,
  displayName: string,
  currency: string = 'USD',
  locale: string = 'en-US'
): Promise<UserProfile> => {
  const orgId = `org-${orgName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'new'}-${Date.now().toString(36)}`;

  const newOrg: Organization = {
    id: orgId,
    name: orgName.trim(),
    domain: email.split('@')[1] ?? '',
    plan: 'Starter',
    monthlyAdBudget: 0,
    assignedSeats: 1,
    status: 'Pending Approval',
    adminEmail: email,
    createdAt: new Date().toISOString(),
    channelsConfigured: 0,
    activeCampaignsCount: 0,
    currency,
    locale,
  };

  await setDoc(doc(db, 'organizations', orgId), sanitizeForFirestore(newOrg));
  await seedFirestoreIfEmpty(orgId);

  // The founder is auto-authorized as an ACCEPTED admin employee of their
  // own new org -- no invite step needed for the person creating it.
  await setDoc(doc(db, `organizations/${orgId}/invitedEmployees`, emailToDocId(email)), sanitizeForFirestore({
    email: email.trim().toLowerCase(),
    role: 'TENANT_ADMIN',
    status: 'ACCEPTED',
    invitedBy: email,
    invitedAt: new Date().toISOString(),
    acceptedAt: new Date().toISOString(),
  } as InvitedEmployee));

  const profile: UserProfile = {
    uid,
    email: email.trim().toLowerCase(),
    displayName: displayName || email,
    role: 'TENANT_ADMIN',
    orgId,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'users', uid), sanitizeForFirestore(profile));

  return profile;
};

/** Invites a new employee by email into an existing org. They become ACCEPTED on their first sign-in with that email. */
export const inviteEmployeeToOrg = async (
  orgId: string,
  email: string,
  role: 'TENANT_ADMIN' | 'TENANT_USER',
  invitedByEmail: string,
  permissions?: EmployeePermissions
): Promise<void> => {
  const invite: InvitedEmployee = {
    email: email.trim().toLowerCase(),
    role,
    status: 'PENDING',
    invitedBy: invitedByEmail,
    invitedAt: new Date().toISOString(),
    ...(permissions ? { permissions } : {}),
  };
  await setDoc(doc(db, `organizations/${orgId}/invitedEmployees`, emailToDocId(email)), sanitizeForFirestore(invite));
};

export const listInvitedEmployees = async (orgId: string): Promise<InvitedEmployee[]> => {
  try {
    const snap = await getDocs(collection(db, `organizations/${orgId}/invitedEmployees`));
    return snap.docs.map(d => d.data() as InvitedEmployee);
  } catch (error) {
    console.error('Error listing invited employees:', error);
    return [];
  }
};

export const removeInvitedEmployee = async (orgId: string, email: string): Promise<void> => {
  await deleteDoc(doc(db, `organizations/${orgId}/invitedEmployees`, emailToDocId(email)));
};

// 7. Omnichannel Campaign & Multi-Aspect Asset Wizard Step Persistence
export interface WizardDraft {
  id: string;
  step: number;
  updatedAt: string;
  lastSavedStepName: string;
  stepData: any;
}

export const saveWizardDraftToFirestore = async (orgId: string, draft: WizardDraft) => {
  try {
    const draftRef = doc(db, `organizations/${orgId}/wizardDrafts`, draft.id);
    await setDoc(draftRef, sanitizeForFirestore(draft));
  } catch (error) {
    console.error(`Error saving wizard draft to Firestore:`, error);
  }
};

export const fetchWizardDraftFromFirestore = async (orgId: string, draftId = 'active_wizard_draft'): Promise<WizardDraft | null> => {
  try {
    const draftRef = doc(db, `organizations/${orgId}/wizardDrafts`, draftId);
    const snap = await getDoc(draftRef);
    if (snap.exists()) {
      return snap.data() as WizardDraft;
    }
    return null;
  } catch (error) {
    console.warn(`Error fetching wizard draft from Firestore:`, error);
    return null;
  }
};

export const deleteWizardDraftFromFirestore = async (orgId: string, draftId = 'active_wizard_draft') => {
  try {
    const draftRef = doc(db, `organizations/${orgId}/wizardDrafts`, draftId);
    await deleteDoc(draftRef);
  } catch (error) {
    console.warn(`Error deleting wizard draft from Firestore:`, error);
  }
};

export const listWizardDraftsFromFirestore = async (orgId: string): Promise<WizardDraft[]> => {
  try {
    const snap = await getDocs(collection(db, `organizations/${orgId}/wizardDrafts`));
    return snap.docs.map(d => d.data() as WizardDraft);
  } catch (error) {
    console.warn(`Error listing wizard drafts from Firestore:`, error);
    return [];
  }
};


