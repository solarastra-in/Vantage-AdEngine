import React from 'react';
import { 
  LayoutDashboard, 
  Megaphone, 
  BarChart3, 
  Sparkles, 
  Network, 
  Receipt,
  Users,
  Layers,
  X,
  Menu
} from 'lucide-react';

export type NavTab = 'dashboard' | 'campaigns' | 'analytics' | 'ai-studio' | 'api-nexus' | 'financials' | 'team';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  activeNodesCount: number;
  isOpenOnMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeNodesCount,
  isOpenOnMobile,
  onCloseMobile,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Command Center', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'campaigns', label: 'Omni-Campaigns', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'analytics', label: 'Market Intelligence', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'ai-studio', label: 'AI Ad Studio', icon: <Sparkles className="w-4 h-4 text-amber-400" /> },
    { id: 'api-nexus', label: 'API Nexus', icon: <Network className="w-4 h-4" /> },
    { id: 'financials', label: 'Financial Ledger', icon: <Receipt className="w-4 h-4" /> },
    { id: 'team', label: 'Team & Access', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpenOnMobile && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 border-r border-stone-800 flex flex-col bg-[#0d0d0d] text-stone-200
        transition-transform duration-300 ease-in-out
        ${isOpenOnMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-stone-900 border border-stone-800 flex items-center justify-center text-amber-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-white uppercase tracking-[0.25em] text-xs font-bold leading-none">Vantage</div>
              <div className="text-[10px] text-stone-500 uppercase tracking-widest mt-1">AdEngine v4.2</div>
            </div>
          </div>

          <button 
            onClick={onCloseMobile}
            className="lg:hidden text-stone-400 hover:text-white p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 mt-6 space-y-1.5">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onCloseMobile();
                }}
                className={`
                  w-full flex items-center px-4 py-3 text-sm font-medium transition-all rounded-sm cursor-pointer
                  ${isActive 
                    ? 'bg-stone-800/60 text-white border-l-2 border-amber-400 shadow-md shadow-amber-400/5' 
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900/50'
                  }
                `}
              >
                <div className={`mr-3.5 ${isActive ? 'text-amber-400' : 'text-stone-500'}`}>
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* API Status Box at Bottom */}
        <div className="p-5 border-t border-stone-800 mt-auto">
          <div className="bg-stone-900/90 rounded-sm border border-stone-800/80 p-4">
            <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-2 font-semibold flex items-center justify-between">
              <span>API Gateway</span>
              <span className="font-mono text-[9px] text-amber-400/90">LIVE</span>
            </div>
            <div className="flex items-center space-x-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse" />
              <span className="text-xs text-stone-300 font-medium">{activeNodesCount} Nodes Synchronized</span>
            </div>
            <p className="text-[11px] text-stone-500 mt-2 leading-tight">
              Meta, Google, LinkedIn, TikTok, Pinterest, X, & DSP OpenRTB connected.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
