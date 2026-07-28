import React, { useState, useEffect, useRef } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { SaaSHeader } from './components/SaaSHeader';
import { LandingPage } from './components/LandingPage';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { CommandCenter } from './components/CommandCenter';
import { CampaignManager } from './components/CampaignManager';
import { MarketIntelligence } from './components/MarketIntelligence';
import { AiAdStudio } from './components/AiAdStudio';
import { ApiNexus } from './components/ApiNexus';
import { FinancialLedger } from './components/FinancialLedger';
import { TeamManagement } from './components/TeamManagement';
import { PendingApprovalView } from './components/PendingApprovalView';
import { CampaignWizardModal } from './components/CampaignWizardModal';
import { InvoiceModal } from './components/InvoiceModal';
import { CampaignDetailModal } from './components/CampaignDetailModal';
import { DispatchReportBanner, DispatchReportUI } from './components/DispatchReportBanner';

import { Campaign, ChannelApiStatus, Invoice, InvoiceAuditLogEntry, PerformanceTimePoint, PlatformType } from './types';
import { 
  Organization, 
  INITIAL_ORGANIZATIONS, 
  fetchOrganizationsFromFirestore, 
  fetchCampaignsFromFirestore, 
  saveCampaignToFirestore, 
  fetchInvoicesFromFirestore, 
  updateInvoiceStatusInFirestore,
  fetchChannelsFromFirestore,
  saveInvoiceToFirestore,
  seedFirestoreIfEmpty,
  resolveAuthorizedOrgForUser,
  onboardNewOrganization
} from './lib/firestoreService';
import { auth, onAuthStateChanged, signOutUser, signInWithGoogle, User } from './lib/firebase';
import { Menu } from 'lucide-react';

export function App() {
  // Top Level View Navigation: 'landing' | 'portal' | 'super-admin'
  const [viewState, setViewState] = useState<'landing' | 'portal' | 'super-admin'>('landing');

  // Tenant Workspace State
  const [organizations, setOrganizations] = useState<Organization[]>(INITIAL_ORGANIZATIONS);
  const [currentOrgId, setCurrentOrgId] = useState<string>('org-astracloud');
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_USER'>('SUPER_ADMIN');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  /**
   * Real authentication gate. A signed-in Firebase user alone is NOT
   * sufficient to reach the portal -- their email must be authorized as an
   * employee of some organization (resolveAuthorizedOrgForUser in
   * firestoreService.ts). Previously, "Launch App" skipped this check
   * entirely (bare setViewState('portal')) and "Continue with Google"
   * navigated to the portal the instant sign-in succeeded, regardless of
   * whether that account belonged to any customer of the platform.
   */
  const [authStatus, setAuthStatus] = useState<'checking' | 'unauthenticated' | 'not_authorized' | 'authorized'>('checking');
  const [authDeniedMessage, setAuthDeniedMessage] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false); // true only for the dev-only "Instant Demo" shortcuts

  /**
   * When a "Create Organization" onboarding flow triggers signInWithGoogle,
   * this ref is set BEFORE the sign-in call so the onAuthStateChanged
   * effect below knows to run onboardNewOrganization instead of the normal
   * "is this email already authorized somewhere" resolution. Without this,
   * there's a real race: the effect could fire first, find no org and no
   * invite yet (since the org doesn't exist until onboarding creates it),
   * and sign the brand-new user back out before onboarding gets a chance
   * to run.
   */
  const pendingOnboardingOrgNameRef = useRef<string | null>(null);

  // Portal Nav State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [aiWizardInitialData, setAiWizardInitialData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected Item Modals
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Main Data States for Active Tenant
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [channels, setChannels] = useState<ChannelApiStatus[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [timeSeries, setTimeSeries] = useState<PerformanceTimePoint[]>([]);
  const [activeDispatchReport, setActiveDispatchReport] = useState<DispatchReportUI | null>(null);

  // Monitor Firebase Auth State AND resolve real employee authorization.
  // This replaces the old handler, which only ever set currentUser and let
  // the caller navigate unconditionally.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (demoMode) return; // demo shortcuts manage their own state directly

      if (!user) {
        setAuthStatus('unauthenticated');
        return;
      }

      setAuthStatus('checking');

      // Onboarding path: this sign-in was triggered by "Create Organization",
      // not a normal login -- create the org instead of looking one up.
      if (pendingOnboardingOrgNameRef.current) {
        const orgName = pendingOnboardingOrgNameRef.current;
        pendingOnboardingOrgNameRef.current = null;
        try {
          const profile = await onboardNewOrganization(orgName, user.uid, user.email ?? '', user.displayName ?? '');
          setAuthDeniedMessage(null);
          setCurrentOrgId(profile.orgId);
          setUserRole(profile.role);
          setAuthStatus('authorized');
          setViewState('portal');
        } catch (err) {
          console.error('Organization onboarding error:', err);
          await signOutUser();
          setCurrentUser(null);
          setAuthStatus('unauthenticated');
          setAuthDeniedMessage('Something went wrong creating your organization. Please try again.');
        }
        return;
      }

      const result = await resolveAuthorizedOrgForUser(user.uid, user.email ?? '', user.displayName ?? '');

      if (result.status === 'AUTHORIZED') {
        setAuthDeniedMessage(null);
        setCurrentOrgId(result.profile.orgId);
        setUserRole(result.profile.role);
        setAuthStatus('authorized');
        // A returning, already-authorized user reloading the page (or
        // completing sign-in from the landing page) should land straight
        // in the portal rather than back at the marketing page.
        setViewState(prev => (prev === 'landing' ? 'portal' : prev));
      } else {
        // This Google account isn't an authorized employee of any
        // organization on this platform. Do not grant portal access --
        // revoke the session immediately rather than leaving a
        // signed-in-but-unauthorized state hanging around.
        await signOutUser();
        setCurrentUser(null);
        setAuthStatus('not_authorized');
        setAuthDeniedMessage(
          `${user.email} isn't associated with any Vantage AdEngine organization. Ask your admin to invite you, or create a new organization.`
        );
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode]);

  /** Normal sign-in: resolution happens in the effect above. */
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Google sign-in error:', err);
    }
  };

  /** Onboarding sign-in: sets the guard ref first so the effect above creates a new org instead of looking one up. */
  const handleGoogleSignInForOnboarding = async (orgName: string) => {
    pendingOnboardingOrgNameRef.current = orgName;
    try {
      await signInWithGoogle();
    } catch (err) {
      pendingOnboardingOrgNameRef.current = null;
      console.error('Google sign-in (onboarding) error:', err);
      throw err;
    }
  };

  // Fetch Organizations & Initial Seed
  const loadOrganizations = async () => {
    try {
      const orgs = await fetchOrganizationsFromFirestore();
      setOrganizations(orgs);
    } catch (err) {
      console.error('Error loading organizations:', err);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  // Fetch Data Scoped to Active Tenant Company
  const fetchTenantData = async (orgId: string) => {
    setIsRefreshing(true);
    try {
      // Load Firestore persisted data for tenant
      const [cmpList, invList, chList] = await Promise.all([
        fetchCampaignsFromFirestore(orgId),
        fetchInvoicesFromFirestore(orgId),
        fetchChannelsFromFirestore(orgId),
      ]);

      setCampaigns(cmpList);
      setInvoices(invList);
      setChannels(chList);

      // Fetch analytics time series
      const anaRes = await fetch('/api/analytics').then(r => r.json()).catch(() => null);
      if (anaRes && anaRes.timeSeries) {
        setTimeSeries(anaRes.timeSeries);
      }
    } catch (err) {
      console.error('Error fetching tenant data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTenantData(currentOrgId);
  }, [currentOrgId]);

  // Handle Organization Selection / Switch Workspace
  const handleSelectOrganization = (orgId: string) => {
    if (userRole !== 'SUPER_ADMIN' && orgId !== currentOrgId) {
      console.warn('Unauthorized tenant workspace switch prevented');
      return;
    }
    setCurrentOrgId(orgId);
    setViewState('portal');
  };

  // Submit New Campaign
  const handleCreateCampaign = async (payload: any) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.campaign) {
        setCampaigns(prev => [data.campaign, ...prev]);
        // Persist to Firestore for tenant
        await saveCampaignToFirestore(currentOrgId, data.campaign);
      }

      if (data.invoice) {
        setInvoices(prev => [data.invoice, ...prev]);
        // Persist invoice to Firestore
        await saveInvoiceToFirestore(currentOrgId, data.invoice);
      }
    } catch (err) {
      console.error('Create campaign error:', err);
    }
  };

  // Single-Click Cross-Platform API Dispatch
  const handlePublishCampaign = async (campaignId: string) => {
    try {
      setCampaigns(prev =>
        prev.map(c =>
          c.id === campaignId
            ? { ...c, status: 'publishing' as const, publishStatuses: c.channels.map(ch => ({ platform: ch.platform, status: 'publishing' as const })) }
            : c
        )
      );

      const idempotencyKey = `pub_${campaignId}_${crypto.randomUUID()}`;
      const res = await fetch(`/api/campaigns/${campaignId}/publish`, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey, 'X-Org-Id': currentOrgId },
      });
      const data = await res.json();

      if (res.status === 409) {
        console.warn('Publish already in progress for this campaign:', data.error);
        return;
      }

      if (data.dispatchReport) {
        setActiveDispatchReport(data.dispatchReport as DispatchReportUI);
      }

      const targetCmp = campaigns.find(c => c.id === campaignId);
      if (targetCmp) {
        const updatedCampaignToSave: Campaign = {
          ...targetCmp,
          status: data.status ?? targetCmp.status,
          publishStatuses: data.dispatchReport
            ? data.dispatchReport.results.map((r: any) => ({
                platform: r.platform,
                status:
                  r.outcome === 'LIVE' ? 'live' : r.outcome === 'ROLLED_BACK' ? 'draft' : 'failed',
                externalId: r.externalId,
                publishedAt: r.outcome === 'LIVE' ? new Date().toISOString() : undefined,
                error: r.error,
              }))
            : targetCmp.publishStatuses,
        };

        setCampaigns(prev =>
          prev.map(c => (c.id === campaignId ? updatedCampaignToSave : c))
        );

        await saveCampaignToFirestore(currentOrgId, updatedCampaignToSave);
      }
    } catch (err) {
      console.error('Publish campaign error:', err);
    }
  };

  // Toggle Campaign Pause / Active
  const handleToggleCampaignStatus = async (campaignId: string) => {
    try {
      const target = campaigns.find(c => c.id === campaignId);
      if (!target) return;
      const newStatus = target.status === 'active' ? 'paused' : 'active';
      const updated = { ...target, status: newStatus as any };

      setCampaigns(prev =>
        prev.map(c => (c.id === campaignId ? updated : c))
      );

      await saveCampaignToFirestore(currentOrgId, updated);
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  // Bulk Pause Campaigns
  const handleBulkPause = async (campaignIds: string[]) => {
    const targetCampaigns = campaigns.filter(c => campaignIds.includes(c.id));
    const updatedCampaigns = targetCampaigns.map(c => ({ ...c, status: 'paused' as const }));

    setCampaigns(prev =>
      prev.map(c => (campaignIds.includes(c.id) ? { ...c, status: 'paused' as const } : c))
    );

    for (const cmp of updatedCampaigns) {
      await saveCampaignToFirestore(currentOrgId, cmp);
    }
  };

  // Bulk Resume Campaigns
  const handleBulkResume = async (campaignIds: string[]) => {
    const targetCampaigns = campaigns.filter(c => campaignIds.includes(c.id));
    const updatedCampaigns = targetCampaigns.map(c => ({ ...c, status: 'active' as const }));

    setCampaigns(prev =>
      prev.map(c => (campaignIds.includes(c.id) ? { ...c, status: 'active' as const } : c))
    );

    for (const cmp of updatedCampaigns) {
      await saveCampaignToFirestore(currentOrgId, cmp);
    }
  };

  // Bulk Duplicate Campaigns
  const handleBulkDuplicate = async (campaignIds: string[]) => {
    const toDuplicate = campaigns.filter(c => campaignIds.includes(c.id));
    const newCampaigns: Campaign[] = toDuplicate.map((source, index) => ({
      ...source,
      id: `cmp-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${source.name} (Copy)`,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      spentBudget: 0,
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cpc: 0,
        roas: 0,
      },
      publishStatuses: source.channels.map(ch => ({
        platform: ch.platform,
        status: 'draft',
      })),
    }));

    setCampaigns(prev => [...newCampaigns, ...prev]);

    for (const dup of newCampaigns) {
      await saveCampaignToFirestore(currentOrgId, dup);
    }
  };

  // Test Channel API Gateway
  const handleTestChannel = async (platform: PlatformType) => {
    const res = await fetch(`/api/channels/${platform}/test`, {
      method: 'POST',
    });
    const data = await res.json();

    setChannels(prev =>
      prev.map(c => (c.platform === platform ? { ...c, latencyMs: data.latencyMs } : c))
    );

    return data;
  };

  // Pay Invoice
  const handlePayInvoice = async (invoiceId: string) => {
    try {
      const method = 'Corporate Credit Card (Visa ****4092)';
      const hash = `0x${Math.random().toString(16).slice(2, 18)}`;
      const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

      const targetInvoice = invoices.find(i => i.id === invoiceId);
      const newAuditEntry: InvoiceAuditLogEntry = {
        id: `aud-${Date.now()}`,
        timestamp: nowFormatted,
        previousStatus: targetInvoice?.status || 'PENDING',
        newStatus: 'PAID',
        action: 'Payment Cleared & Settled',
        paymentMethod: method,
        txHash: hash,
        actor: 'Finance Admin',
        notes: 'Settled via Financial Ledger instant payout gateway',
      };

      setInvoices(prev =>
        prev.map(inv => {
          if (inv.id === invoiceId) {
            return {
              ...inv,
              status: 'PAID' as const,
              paymentMethod: method,
              txHash: hash,
              auditLog: [...(inv.auditLog || []), newAuditEntry],
            };
          }
          return inv;
        })
      );

      await updateInvoiceStatusInFirestore(currentOrgId, invoiceId, 'PAID', method, hash);
    } catch (err) {
      console.error('Pay invoice error:', err);
    }
  };

  const handleAddAuditLogEntry = (invoiceId: string, entry: Omit<InvoiceAuditLogEntry, 'id'>) => {
    const newEntry: InvoiceAuditLogEntry = {
      ...entry,
      id: `aud-${Date.now()}`,
    };

    setInvoices(prev =>
      prev.map(inv => {
        if (inv.id === invoiceId) {
          return {
            ...inv,
            auditLog: [...(inv.auditLog || []), newEntry],
          };
        }
        return inv;
      })
    );
  };

  // Gemini AI Helper
  const handleOptimizeWithAi = async (promptData: any) => {
    const res = await fetch('/api/ai/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promptData),
    });
    return await res.json();
  };

  const handleOpenWizardWithAiData = (aiData: any) => {
    setAiWizardInitialData(aiData);
    setIsWizardOpen(true);
  };

  // KPI Calculations
  const totalReach = campaigns.reduce((acc, c) => acc + c.metrics.impressions, 0);
  const totalSpend = campaigns.reduce((acc, c) => acc + c.spentBudget, 0);
  const activeNodesCount = channels.length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-stone-200 font-sans flex flex-col selection:bg-amber-400 selection:text-black">
      
      {activeDispatchReport && (
        <DispatchReportBanner report={activeDispatchReport} onDismiss={() => setActiveDispatchReport(null)} />
      )}
      {/* 1. PUBLIC SAAS LANDING PAGE */}
      {viewState === 'landing' && (
        <LandingPage
          isAuthorized={authStatus === 'authorized' || demoMode}
          authDeniedMessage={authDeniedMessage}
          onDismissAuthDenied={() => setAuthDeniedMessage(null)}
          onNavigateToPortal={() => {
            // Only reachable when isAuthorized is true (LandingPage gates
            // this itself), but double-checked here as well -- this is
            // the function that was previously called unconditionally by
            // "Launch App" with no auth check at all.
            if (authStatus === 'authorized' || demoMode) setViewState('portal');
          }}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleSignInForOnboarding={handleGoogleSignInForOnboarding}
          onLoginSuperAdminDemo={() => {
            setDemoMode(true);
            setUserRole('SUPER_ADMIN');
            setViewState('super-admin');
          }}
          onLoginTenantAdminDemo={() => {
            setDemoMode(true);
            setUserRole('TENANT_ADMIN');
            setCurrentOrgId('org-astracloud');
            setViewState('portal');
          }}
        />
      )}

      {/* 2. SUPER ADMIN CONTROL PANEL */}
      {viewState === 'super-admin' && (
        <div className="min-h-screen bg-[#090909]">
          <div className="bg-[#0c0c0c] border-b border-stone-800 px-6 py-3 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-bold uppercase tracking-widest">[SaaS Super Admin View]</span>
              <span className="text-stone-500">Managing Platform Tenants</span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setViewState('portal')}
                className="text-stone-300 hover:text-white underline cursor-pointer"
              >
                Go to Tenant Workspace &rarr;
              </button>
              <button
                onClick={() => setViewState('landing')}
                className="text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                View SaaS Website
              </button>
            </div>
          </div>

          <SuperAdminPanel
            organizations={organizations}
            onSelectOrganization={handleSelectOrganization}
            onRefreshOrganizations={loadOrganizations}
          />
        </div>
      )}

      {/* 3. MULTI-TENANT AD MANAGER PORTAL */}
      {viewState === 'portal' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activeNodesCount={activeNodesCount}
            isOpenOnMobile={isMobileMenuOpen}
            onCloseMobile={() => setIsMobileMenuOpen(false)}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {/* Top Multi-Tenant SaaS Header */}
            <div className="relative">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden absolute left-4 top-5 z-50 text-stone-300 p-2 bg-stone-900 border border-stone-800 rounded cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <SaaSHeader
                totalReach={totalReach}
                totalSpend={totalSpend}
                avgRoi={3.84}
                activeNodesCount={activeNodesCount}
                organizations={userRole === 'SUPER_ADMIN' ? organizations : organizations.filter(o => o.id === currentOrgId)}
                currentOrgId={currentOrgId}
                userRole={userRole}
                onSelectOrganization={handleSelectOrganization}
                onOpenWizard={() => {
                  setAiWizardInitialData(null);
                  setIsWizardOpen(true);
                }}
                onRefreshData={() => fetchTenantData(currentOrgId)}
                isRefreshing={isRefreshing}
                onOpenLandingPage={() => setViewState('landing')}
                onOpenSuperAdminPanel={() => setViewState('super-admin')}
                onSignOut={async () => {
                  await signOutUser();
                  setDemoMode(false);
                  setAuthStatus('unauthenticated');
                  setViewState('landing');
                }}
                currentUserEmail={currentUser?.email || undefined}
              />
            </div>

            {/* Active Tab View */}
            <main className="flex-1">
              {(() => {
                const currentOrg = organizations.find(o => o.id === currentOrgId) || organizations[0];
                const isPendingApproval = currentOrg?.status === 'Pending Approval' && userRole !== 'SUPER_ADMIN';

                if (isPendingApproval) {
                  return (
                    <PendingApprovalView 
                      organization={currentOrg} 
                      currentUserEmail={currentUser?.email || undefined} 
                    />
                  );
                }

                return (
                  <>
                    {activeTab === 'dashboard' && (
                      <CommandCenter
                        campaigns={campaigns}
                        channels={channels}
                        invoices={invoices}
                        timeSeries={timeSeries}
                        onOpenWizard={() => {
                          setAiWizardInitialData(null);
                          setIsWizardOpen(true);
                        }}
                        onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
                        onSelectCampaign={(c) => setSelectedCampaign(c)}
                      />
                    )}

                    {activeTab === 'campaigns' && (
                      <CampaignManager
                        campaigns={campaigns}
                        onOpenWizard={() => {
                          setAiWizardInitialData(null);
                          setIsWizardOpen(true);
                        }}
                        onSelectCampaign={(c) => setSelectedCampaign(c)}
                        onToggleStatus={handleToggleCampaignStatus}
                        onPublishCampaign={handlePublishCampaign}
                        onBulkPause={handleBulkPause}
                        onBulkResume={handleBulkResume}
                        onBulkDuplicate={handleBulkDuplicate}
                      />
                    )}

                    {activeTab === 'analytics' && (
                      <CommandCenter
                        campaigns={campaigns}
                        channels={channels}
                        invoices={invoices}
                        timeSeries={timeSeries}
                        onOpenWizard={() => {
                          setAiWizardInitialData(null);
                          setIsWizardOpen(true);
                        }}
                        onNavigateTab={(tab) => setActiveTab(tab as NavTab)}
                        onSelectCampaign={(c) => setSelectedCampaign(c)}
                      />
                    )}

                    {activeTab === 'ai-studio' && (
                      <AiAdStudio
                        onOpenWizardWithAiData={handleOpenWizardWithAiData}
                      />
                    )}

                    {activeTab === 'api-nexus' && (
                      <ApiNexus
                        channels={channels}
                        onTestChannel={handleTestChannel}
                        orgId={currentOrgId}
                      />
                    )}

                    {activeTab === 'financials' && (
                      <FinancialLedger
                        invoices={invoices}
                        onSelectInvoice={(inv) => setSelectedInvoice(inv)}
                        onPayInvoice={handlePayInvoice}
                        onAddAuditLogEntry={handleAddAuditLogEntry}
                      />
                    )}

                    {activeTab === 'team' && (
                      <TeamManagement
                        orgId={currentOrgId}
                        currentUserEmail={currentUser?.email || undefined}
                        currentUserRole={userRole}
                        currentUserPermissions={null}
                      />
                    )}
                  </>
                );
              })()}
            </main>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <CampaignWizardModal
        isOpen={isWizardOpen}
        initialAiData={aiWizardInitialData}
        onClose={() => {
          setIsWizardOpen(false);
          setAiWizardInitialData(null);
        }}
        onSubmitCampaign={handleCreateCampaign}
        onOptimizeWithAi={handleOptimizeWithAi}
      />

      <InvoiceModal
        invoice={selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        onPayInvoice={handlePayInvoice}
      />

      <CampaignDetailModal
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        onToggleStatus={handleToggleCampaignStatus}
        onPublish={handlePublishCampaign}
      />

    </div>
  );
}

export default App;
