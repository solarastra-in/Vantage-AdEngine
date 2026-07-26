import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  DollarSign, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  ExternalLink, 
  Search, 
  Filter, 
  X, 
  Layers, 
  Mail, 
  Calendar,
  Sparkles,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { Organization, ContactLead, createOrganizationInFirestore, fetchLeadsFromFirestore } from '../lib/firestoreService';

interface SuperAdminPanelProps {
  organizations: Organization[];
  onSelectOrganization: (orgId: string) => void;
  onRefreshOrganizations: () => void;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  organizations,
  onSelectOrganization,
  onRefreshOrganizations,
}) => {
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('ALL');

  // Onboard New Company Modal State
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDomain, setNewOrgDomain] = useState('');
  const [newOrgPlan, setNewOrgPlan] = useState<'Starter' | 'Growth' | 'Enterprise'>('Growth');
  const [newOrgBudget, setNewOrgBudget] = useState<number>(50000);
  const [newOrgSeats, setNewOrgSeats] = useState<number>(10);
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState('');
  const [isSubmittingNewOrg, setIsSubmittingNewOrg] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    setIsLoadingLeads(true);
    try {
      const fetched = await fetchLeadsFromFirestore();
      setLeads(fetched);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setIsLoadingLeads(false);
    }
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName || !newOrgAdminEmail) return;

    setIsSubmittingNewOrg(true);
    try {
      const id = `org-${newOrgName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
      const newOrg: Organization = {
        id,
        name: newOrgName,
        domain: newOrgDomain || `${newOrgName.toLowerCase().replace(/\s+/g, '')}.com`,
        plan: newOrgPlan,
        monthlyAdBudget: newOrgBudget,
        assignedSeats: newOrgSeats,
        status: 'Active',
        adminEmail: newOrgAdminEmail,
        createdAt: new Date().toISOString(),
        channelsConfigured: 6,
        activeCampaignsCount: 1,
      };

      await createOrganizationInFirestore(newOrg);
      onRefreshOrganizations();
      setShowOnboardModal(false);
      setNewOrgName('');
      setNewOrgDomain('');
      setNewOrgAdminEmail('');
    } catch (err) {
      console.error('Onboard customer error:', err);
    } finally {
      setIsSubmittingNewOrg(false);
    }
  };

  // Filtered Orgs
  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          org.adminEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'ALL' || org.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  // Calculate SaaS Financial KPIs
  const totalMrr = organizations.reduce((acc, org) => {
    const feeMap = { Starter: 299, Growth: 999, Enterprise: 2499 };
    return acc + (feeMap[org.plan] || 999);
  }, 0);

  const totalManagedAdBudget = organizations.reduce((acc, org) => acc + org.monthlyAdBudget, 0);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 bg-[#090909] text-stone-200 min-h-screen">
      {/* SaaS Admin Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-stone-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[10px] font-mono mb-2 uppercase">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SaaS Platform Owner Control Panel</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif italic text-white font-normal">
            Customer Onboarding & Tenant Directory
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 font-light mt-1">
            Provision, monitor, and switch customer company ad workspaces stored in Firebase Firestore.
          </p>
        </div>

        <button
          onClick={() => setShowOnboardModal(true)}
          className="bg-amber-400 text-black px-6 py-3 text-xs font-extrabold uppercase tracking-widest hover:bg-amber-300 transition-colors cursor-pointer rounded-sm flex items-center gap-2 shadow-lg shadow-amber-400/10 shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Onboard New Customer</span>
        </button>
      </div>

      {/* SaaS Business Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded bg-stone-900/80 border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Monthly Recurring Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif italic text-emerald-400 font-bold">
            ${totalMrr.toLocaleString()} <span className="text-xs font-sans text-stone-500 font-normal">/ mo</span>
          </div>
          <p className="text-[10px] text-stone-500 font-mono mt-1">ARR Run Rate: ${(totalMrr * 12).toLocaleString()}</p>
        </div>

        <div className="p-5 rounded bg-stone-900/80 border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Onboarded Tenant Companies</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif italic text-white font-bold">
            {organizations.length} <span className="text-xs font-sans text-stone-500 font-normal">Companies</span>
          </div>
          <p className="text-[10px] text-stone-500 font-mono mt-1">Active Multi-Tenant Workspaces</p>
        </div>

        <div className="p-5 rounded bg-stone-900/80 border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Total Managed Ad Budget</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif italic text-white font-bold">
            ${totalManagedAdBudget.toLocaleString()} <span className="text-xs font-sans text-stone-500 font-normal">/ mo</span>
          </div>
          <p className="text-[10px] text-stone-500 font-mono mt-1">Combined Customer Media Volume</p>
        </div>

        <div className="p-5 rounded bg-stone-900/80 border border-stone-800">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">Platform API Gateway</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-serif italic text-emerald-400 font-bold">
            99.98%
          </div>
          <p className="text-[10px] text-stone-500 font-mono mt-1">7 Channel Gateways Operational</p>
        </div>
      </div>

      {/* Customer Organizations Management Table */}
      <div className="bg-stone-900/60 border border-stone-800 rounded p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Customer Tenant Directory</h2>
            <p className="text-xs text-stone-400">Click "Open Portal" to inspect or switch into that tenant workspace.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 w-48"
              />
            </div>

            {/* Plan filter */}
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded px-3 py-1.5 text-xs text-stone-300 focus:outline-none focus:border-amber-400"
            >
              <option value="ALL">All SaaS Plans</option>
              <option value="Starter">Starter ($299)</option>
              <option value="Growth">Growth ($999)</option>
              <option value="Enterprise">Enterprise ($2,499)</option>
            </select>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950 text-stone-400 uppercase font-mono text-[10px] tracking-wider border-b border-stone-800">
              <tr>
                <th className="p-3">Company Name</th>
                <th className="p-3">SaaS Plan</th>
                <th className="p-3">Monthly Ad Quota</th>
                <th className="p-3">Assigned Seats</th>
                <th className="p-3">Admin Email</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Workspace Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-mono">
              {filteredOrgs.map(org => (
                <tr key={org.id} className="hover:bg-stone-800/40 transition-colors">
                  <td className="p-3 font-sans font-bold text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-stone-800 flex items-center justify-center text-amber-400 text-xs">
                        {org.name.charAt(0)}
                      </div>
                      <div>
                        <span>{org.name}</span>
                        <span className="block text-[10px] text-stone-500 font-mono">{org.domain}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      org.plan === 'Enterprise' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30' :
                      org.plan === 'Growth' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/30' :
                      'bg-stone-800 text-stone-300'
                    }`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="p-3 text-stone-300">
                    ${org.monthlyAdBudget.toLocaleString()} / mo
                  </td>
                  <td className="p-3 text-stone-300">
                    {org.assignedSeats} Seats
                  </td>
                  <td className="p-3 text-stone-400">
                    {org.adminEmail}
                  </td>
                  <td className="p-3">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{org.status}</span>
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onSelectOrganization(org.id)}
                      className="px-3 py-1.5 bg-amber-400/10 border border-amber-400/40 text-amber-400 hover:bg-amber-400 hover:text-black transition-all rounded font-bold cursor-pointer text-[11px] inline-flex items-center gap-1"
                    >
                      <span>Open Workspace</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inbound Public Contact Leads Section */}
      <div className="bg-stone-900/60 border border-stone-800 rounded p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Landing Page Inquiries & Leads</h2>
            <p className="text-xs text-stone-400">Real-time contact submissions saved to Firestore `leads` collection.</p>
          </div>
          <button 
            onClick={loadLeads}
            className="text-xs font-mono text-amber-400 hover:underline cursor-pointer"
          >
            Refresh Leads List
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {leads.map((lead, idx) => (
            <div key={idx} className="p-4 bg-stone-950 border border-stone-800 rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{lead.fullName}</span>
                <span className="text-[10px] font-mono text-amber-400 px-2 py-0.5 bg-amber-400/10 rounded">
                  {lead.monthlyAdSpend}
                </span>
              </div>
              <div className="text-xs text-stone-400 flex items-center gap-2 font-mono">
                <Mail className="w-3 h-3 text-stone-500" />
                <span>{lead.workEmail}</span>
                <span className="text-stone-600 font-bold">&bull; {lead.companyName}</span>
              </div>
              <p className="text-xs text-stone-300 italic bg-stone-900/60 p-2 rounded border border-stone-800/80">
                "{lead.message || 'No additional notes provided.'}"
              </p>
              <div className="text-[10px] text-stone-500 font-mono text-right">
                Submitted: {new Date(lead.submittedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Onboard Customer Company Modal */}
      {showOnboardModal && (
        <div className="fixed inset-0 bg-black/80 z-50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded max-w-lg w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setShowOnboardModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="w-10 h-10 rounded bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-white uppercase tracking-wide">Onboard Customer Company</h3>
              <p className="text-xs text-stone-400 mt-1">
                Provision a dedicated multi-tenant workspace with isolated campaigns, channels, and invoices in Firestore.
              </p>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1">Company / Brand Name *</label>
                <input 
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Acme Media Systems"
                  className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-1">Company Domain</label>
                  <input 
                    type="text"
                    value={newOrgDomain}
                    onChange={(e) => setNewOrgDomain(e.target.value)}
                    placeholder="acmemedia.com"
                    className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-1">SaaS Plan</label>
                  <select
                    value={newOrgPlan}
                    onChange={(e) => setNewOrgPlan(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Starter">Starter ($299/mo)</option>
                    <option value="Growth">Growth ($999/mo)</option>
                    <option value="Enterprise">Enterprise ($2,499/mo)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-1">Monthly Ad Budget Quota ($)</label>
                  <input 
                    type="number"
                    value={newOrgBudget}
                    onChange={(e) => setNewOrgBudget(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-stone-400 mb-1">Assigned Seats</label>
                  <input 
                    type="number"
                    value={newOrgSeats}
                    onChange={(e) => setNewOrgSeats(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1">Customer Admin Email *</label>
                <input 
                  type="email"
                  required
                  value={newOrgAdminEmail}
                  onChange={(e) => setNewOrgAdminEmail(e.target.value)}
                  placeholder="admin@acmemedia.com"
                  className="w-full bg-stone-950 border border-stone-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingNewOrg}
                className="w-full bg-amber-400 text-black py-3 text-xs font-extrabold uppercase tracking-widest hover:bg-amber-300 transition-colors cursor-pointer rounded-sm shadow-md mt-4"
              >
                {isSubmittingNewOrg ? 'Provisioning Tenant...' : 'Provision Company Workspace'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
