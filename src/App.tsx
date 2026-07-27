import React, { useState, useEffect } from 'react';
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
  seedFirestoreIfEmpty
} from './lib/firestoreService';
import { auth, onAuthStateChanged, signOutUser, User } from './lib/firebase';
import { Menu } from 'lucide-react';

export function App() {
  // Top Level View Navigation: 'landing' | 'portal' | 'super-admin'
  const [viewState, setViewState] = useState<'landing' | 'portal' | 'super-admin'>('landing');

  // Tenant Workspace State
  const [organizations, setOrganizations] = useState<Organization[]>(INITIAL_ORGANIZATIONS);
  const [currentOrgId, setCurrentOrgId] = useState<string>('org-astracloud');
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_USER'>('SUPER_ADMIN');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

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
    } fontFinally: {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTenantData(currentOrgId);
  }, [currentOrgId]);

  // Handle Organization Selection / Switch Workspace
  const handleSelectOrganization = (orgId: string) => {
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

      setCampaigns(prev =>
        prev.map(c => {
          if (c.id !== campaignId) return c;
          const updated: Campaign = {
            ...c,
            status: data.status ?? c.status,
            publishStatuses: data.dispatchReport
              ? data.dispatchReport.results.map((r: any) => ({
                  platform: r.platform,
                  status:
                    r.outcome === 'LIVE' ? 'live' : r.outcome === 'ROLLED_BACK' ? 'draft' : 'failed',
                  externalId: r.externalId,
                  publishedAt: r.outcome === 'LIVE' ? new Date().toISOString() : undefined,
                  error: r.error,
                }))
              : c.publishStatuses,
          };
          saveCampaignToFirestore(currentOrgId, updated);
          return updated;
        })
      );
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

      setCampaigns(prev =>
        prev.map(c => {
          if (c.id === campaignId) {
            const updated = { ...c, status: newStatus as any };
            saveCampaignToFirestore(currentOrgId, updated);
            return updated;
          }
          return c;
        })
      );
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  // Bulk Pause Campaigns
  const handleBulkPause = (campaignIds: string[]) => {
    setCampaigns(prev =>
      prev.map(c => {
        if (campaignIds.includes(c.id)) {
          const updated = { ...c, status: 'paused' as const };
          saveCampaignToFirestore(currentOrgId, updated);
          return updated;
        }
        return c;
      })
    );
  };

  // Bulk Resume Campaigns
  const handleBulkResume = (campaignIds: string[]) => {
    setCampaigns(prev =>
      prev.map(c => {
        if (campaignIds.includes(c.id)) {
          const updated = { ...c, status: 'active' as const };
          saveCampaignToFirestore(currentOrgId, updated);
          return updated;
        }
        return c;
      })
    );
  };

  // Bulk Duplicate Campaigns
  const handleBulkDuplicate = (campaignIds: string[]) => {
    const toDuplicate = campaigns.filter(c => campaignIds.includes(c.id));
    const newCampaigns: Campaign[] = toDuplicate.map((source, index) => {
      const dup: Campaign = {
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
      };
      saveCampaignToFirestore(currentOrgId, dup);
      return dup;
    });

    setCampaigns(prev => [...newCampaigns, ...prev]);
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

      setInvoices(prev =>
        prev.map(inv => {
          if (inv.id === invoiceId) {
            const nowFormatted = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
            const newAuditEntry: InvoiceAuditLogEntry = {
              id: `aud-${Date.now()}`,
              timestamp: nowFormatted,
              previousStatus: inv.status,
              newStatus: 'PAID',
              action: 'Payment Cleared & Settled',
              paymentMethod: method,
              txHash: hash,
              actor: 'Finance Admin',
              notes: 'Settled via Financial Ledger instant payout gateway',
            };
            const updated: Invoice = {
              ...inv,
              status: 'PAID' as const,
              paymentMethod: method,
              txHash: hash,
              auditLog: [...(inv.auditLog || []), newAuditEntry],
            };
            updateInvoiceStatusInFirestore(currentOrgId, invoiceId, 'PAID', method, hash);
            return updated;
          }
          return inv;
        })
      );
    } catch (err) {
      console.error('Pay invoice error:', err);
    }
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
          onNavigateToPortal={() => setViewState('portal')}
          onLoginSuperAdminDemo={() => {
            setUserRole('SUPER_ADMIN');
            setViewState('super-admin');
          }}
          onLoginTenantAdminDemo={() => {
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
                organizations={organizations}
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
                  setViewState('landing');
                }}
                currentUserEmail={currentUser?.email || undefined}
              />
            </div>

            {/* Active Tab View */}
            <main className="flex-1">
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
                />
              )}
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
