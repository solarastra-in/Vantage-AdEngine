import React from 'react';
import { Sparkles, Plus, RefreshCw, Building2, ChevronDown, Globe, ShieldAlert, User, LogOut } from 'lucide-react';
import { Organization } from '../lib/firestoreService';

interface SaaSHeaderProps {
  totalReach: number;
  totalSpend: number;
  avgRoi: number;
  activeNodesCount: number;
  organizations: Organization[];
  currentOrgId: string;
  userRole: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_USER';
  onSelectOrganization: (orgId: string) => void;
  onOpenWizard: () => void;
  onRefreshData?: () => void;
  isRefreshing?: boolean;
  onOpenLandingPage?: () => void;
  onOpenSuperAdminPanel?: () => void;
  onSignOut?: () => void;
  currentUserEmail?: string;
}

export const SaaSHeader: React.FC<SaaSHeaderProps> = ({
  totalReach,
  totalSpend,
  avgRoi,
  activeNodesCount,
  organizations,
  currentOrgId,
  userRole,
  onSelectOrganization,
  onOpenWizard,
  onRefreshData,
  isRefreshing,
  onOpenLandingPage,
  onOpenSuperAdminPanel,
  onSignOut,
  currentUserEmail,
}) => {
  const visibleOrganizations = userRole === 'SUPER_ADMIN' 
    ? organizations 
    : organizations.filter(o => o.id === currentOrgId);
  
  const currentOrg = visibleOrganizations.find(o => o.id === currentOrgId) || visibleOrganizations[0] || organizations.find(o => o.id === currentOrgId);

  const isPendingApproval = currentOrg?.status === 'Pending Approval' && userRole !== 'SUPER_ADMIN';

  return (
    <header className="h-20 border-b border-stone-800 flex items-center justify-between px-4 sm:px-8 bg-[#0a0a0a] text-stone-200 sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
      {/* Left Area: Organization Switcher & Context */}
      <div className="flex items-center space-x-4 shrink-0">
        <div className="relative group">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded bg-stone-900 border border-stone-800 cursor-pointer hover:border-amber-400/50 transition-colors">
            <Building2 className="w-4 h-4 text-amber-400" />
            <div className="text-left">
              <span className="block text-[10px] text-stone-500 font-mono uppercase leading-tight">Workspace Tenant</span>
              <span className="block text-xs font-bold text-white font-sans max-w-[150px] sm:max-w-[200px] truncate">
                {currentOrg?.name || 'Customer Workspace'}
              </span>
            </div>
            {userRole === 'SUPER_ADMIN' && <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
          </div>

          {/* Tenant Switcher Dropdown */}
          <div className="absolute left-0 top-full mt-1 w-64 bg-stone-900 border border-stone-800 rounded shadow-2xl py-2 hidden group-hover:block z-50">
            <div className="px-3 py-1 text-[10px] uppercase font-mono text-stone-500 font-semibold border-b border-stone-800 mb-1">
              {userRole === 'SUPER_ADMIN' ? 'Switch Customer Tenant' : 'Your Active Workspace'}
            </div>
            {visibleOrganizations.map(org => (
              <button
                key={org.id}
                onClick={() => onSelectOrganization(org.id)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-800 flex items-center justify-between cursor-pointer ${
                  org.id === currentOrgId ? 'bg-amber-400/10 text-amber-400 font-bold' : 'text-stone-300'
                }`}
              >
                <div className="truncate">
                  <span className="block font-sans">{org.name}</span>
                  <span className="block text-[10px] text-stone-500 font-mono">{org.plan} Plan &bull; ${org.monthlyAdBudget.toLocaleString()}/mo</span>
                </div>
                {org.id === currentOrgId && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
              </button>
            ))}

            {userRole === 'SUPER_ADMIN' && onOpenSuperAdminPanel && (
              <div className="border-t border-stone-800 mt-1 pt-1">
                <button
                  onClick={onOpenSuperAdminPanel}
                  className="w-full text-left px-3 py-2 text-xs text-amber-400 hover:bg-stone-800 font-mono font-bold flex items-center gap-2 cursor-pointer"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Super Admin Control Panel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Role Badge */}
        <span className={`hidden xl:inline-block text-[10px] font-mono px-2 py-1 rounded border ${
          userRole === 'SUPER_ADMIN' ? 'bg-amber-400/10 text-amber-400 border-amber-400/30' : isPendingApproval ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold' : 'bg-stone-900 text-stone-400 border-stone-800'
        }`}>
          {userRole === 'SUPER_ADMIN' ? '[SaaS Owner]' : isPendingApproval ? '[Awaiting Admin Approval]' : `[Tenant Admin: ${currentOrg?.plan}]`}
        </span>
      </div>

      {/* Center Metrics Section */}
      <div className="hidden lg:flex items-center space-x-8 overflow-x-auto no-scrollbar py-1">
        <div className="flex flex-col shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Total Reach</span>
          <span className="text-xl font-serif text-white tracking-tight italic">
            {isPendingApproval ? '0' : totalReach.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Ad Spend</span>
          <span className="text-xl font-serif text-white tracking-tight italic">
            ${isPendingApproval ? '0.00' : totalSpend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex flex-col shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">Avg ROI</span>
          <span className="text-xl font-serif text-amber-400 tracking-tight italic">
            {isPendingApproval ? '0.00x' : `${avgRoi.toFixed(2)}x`}
          </span>
        </div>

        <div className="flex flex-col shrink-0">
          <span className="text-[10px] uppercase tracking-wider text-stone-500 font-semibold">API Sync Status</span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${isPendingApproval ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse'}`} />
            <span className="text-xs font-mono text-stone-300">
              {isPendingApproval ? 'Pending Approval' : `${activeNodesCount} Platform Nodes`}
            </span>
          </div>
        </div>
      </div>

      {/* Right Action Area */}
      <div className="flex items-center space-x-3 shrink-0">
        {onOpenLandingPage && (
          <button
            onClick={onOpenLandingPage}
            title="View SaaS Landing Page"
            className="p-2.5 rounded bg-stone-900 border border-stone-800 text-stone-400 hover:text-white hover:border-stone-700 transition-colors cursor-pointer text-xs font-mono flex items-center gap-1.5"
          >
            <Globe className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">SaaS Web Site</span>
          </button>
        )}

        {onRefreshData && !isPendingApproval && (
          <button
            onClick={onRefreshData}
            disabled={isRefreshing}
            title="Sync Platform APIs"
            className="p-2.5 rounded bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        )}

        {isPendingApproval ? (
          <div className="bg-amber-400/10 border border-amber-400/40 text-amber-400 px-3 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Locked &bull; Approval Needed</span>
          </div>
        ) : (
          <button
            onClick={onOpenWizard}
            className="bg-amber-400 text-black px-4 sm:px-5 py-2.5 text-xs font-extrabold uppercase tracking-widest cursor-pointer hover:bg-amber-300 transition-colors flex items-center gap-2 shadow-lg shadow-amber-400/10 rounded-sm"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Deploy Campaign</span>
          </button>
        )}

        {onSignOut && (
          <button
            onClick={onSignOut}
            title="Sign Out"
            className="p-2.5 rounded bg-stone-900 border border-stone-800 text-stone-400 hover:text-red-400 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
