import { 
  collection, 
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
  status: 'Active' | 'Suspended' | 'Pending';
  adminEmail: string;
  createdAt: string;
  channelsConfigured: number;
  activeCampaignsCount?: number;
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
}

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
    adminEmail: 'billing@astracloud.io',
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

// 1. Seed Firestore Data if empty
export const seedFirestoreIfEmpty = async (orgId: string = 'org-astracloud') => {
  try {
    // Check organizations
    const orgsRef = collection(db, 'organizations');
    const orgsSnap = await getDocs(orgsRef);

    if (orgsSnap.empty) {
      console.log('Seeding initial multi-tenant organizations to Firestore...');
      for (const org of INITIAL_ORGANIZATIONS) {
        await setDoc(doc(db, 'organizations', org.id), org);
      }
    }

    // Seed campaigns for the specified tenant if empty
    const campaignsRef = collection(db, `organizations/${orgId}/campaigns`);
    const cmpSnap = await getDocs(campaignsRef);

    if (cmpSnap.empty) {
      console.log(`Seeding initial campaigns for tenant ${orgId} to Firestore...`);
      for (const campaign of INITIAL_CAMPAIGNS) {
        await setDoc(doc(db, `organizations/${orgId}/campaigns`, campaign.id), campaign);
      }
    }

    // Seed channels for tenant if empty
    const channelsRef = collection(db, `organizations/${orgId}/channels`);
    const chSnap = await getDocs(channelsRef);

    if (chSnap.empty) {
      console.log(`Seeding initial channels for tenant ${orgId} to Firestore...`);
      for (const channel of INITIAL_CHANNELS) {
        await setDoc(doc(db, `organizations/${orgId}/channels`, channel.platform), channel);
      }
    }

    // Seed invoices for tenant if empty
    const invoicesRef = collection(db, `organizations/${orgId}/invoices`);
    const invSnap = await getDocs(invoicesRef);

    if (invSnap.empty) {
      console.log(`Seeding initial invoices for tenant ${orgId} to Firestore...`);
      for (const invoice of INITIAL_INVOICES) {
        await setDoc(doc(db, `organizations/${orgId}/invoices`, invoice.id), invoice);
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
    await setDoc(doc(db, 'organizations', newOrg.id), newOrg);
    // Seed default channels and initial sample campaign for new tenant
    await seedFirestoreIfEmpty(newOrg.id);
  } catch (error) {
    console.error('Error creating organization in Firestore:', error);
    throw error;
  }
};

// 3. Campaign Operations per Tenant
export const fetchCampaignsFromFirestore = async (orgId: string): Promise<Campaign[]> => {
  try {
    const ref = collection(db, `organizations/${orgId}/campaigns`);
    const snap = await getDocs(ref);

    if (snap.empty) {
      await seedFirestoreIfEmpty(orgId);
      return INITIAL_CAMPAIGNS;
    }

    const campaigns: Campaign[] = [];
    snap.forEach(d => {
      campaigns.push(d.data() as Campaign);
    });
    return campaigns;
  } catch (error) {
    console.warn(`Fallback to local campaigns for tenant ${orgId}:`, error);
    return INITIAL_CAMPAIGNS;
  }
};

export const saveCampaignToFirestore = async (orgId: string, campaign: Campaign) => {
  try {
    await setDoc(doc(db, `organizations/${orgId}/campaigns`, campaign.id), campaign);
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
    await updateDoc(campaignRef, { status });
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
      await seedFirestoreIfEmpty(orgId);
      return INITIAL_INVOICES;
    }

    const invoices: Invoice[] = [];
    snap.forEach(d => {
      invoices.push(d.data() as Invoice);
    });
    return invoices;
  } catch (error) {
    console.warn(`Fallback to local invoices for tenant ${orgId}:`, error);
    return INITIAL_INVOICES;
  }
};

export const saveInvoiceToFirestore = async (orgId: string, invoice: Invoice) => {
  try {
    await setDoc(doc(db, `organizations/${orgId}/invoices`, invoice.id), invoice);
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
    await updateDoc(invRef, {
      status,
      ...(paymentMethod && { paymentMethod }),
      ...(txHash && { txHash }),
    });
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
      await seedFirestoreIfEmpty(orgId);
      return INITIAL_CHANNELS;
    }

    const channels: ChannelApiStatus[] = [];
    snap.forEach(d => {
      channels.push(d.data() as ChannelApiStatus);
    });
    return channels;
  } catch (error) {
    console.warn(`Fallback to local channels:`, error);
    return INITIAL_CHANNELS;
  }
};

export const saveChannelToFirestore = async (orgId: string, channel: ChannelApiStatus) => {
  try {
    await setDoc(doc(db, `organizations/${orgId}/channels`, channel.platform), channel);
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
    const docRef = await addDoc(leadsRef, newLead);
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
        await setDoc(doc(db, `organizations/${orgId}/credentials`, platform), creds);
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
    await setDoc(doc(db, `organizations/${orgId}/credentials`, creds.platform), creds);
  } catch (error) {
    console.warn(`Error saving credentials for ${creds.platform}:`, error);
  }
};

