import React from 'react';
import { LayoutGrid, PieChart, CreditCard, ShoppingBag, Settings, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useFinancialDashboardStore } from '../../store/useFinancialDashboardStore';

interface DashboardHeaderProps {
  onOpenSecurity: () => void;
}

export function DashboardHeader({ onOpenSecurity }: DashboardHeaderProps) {
  const { isPrivacyMasked, togglePrivacyMask } = useFinancialDashboardStore();
  const [activeTab, setActiveTab] = React.useState<'grid' | 'pie' | 'card' | 'bag'>('grid');

  return (
    <header className="flex items-center justify-between w-full px-2 py-1 mb-6">
      {/* Brand Hexagon Logo */}
      <div className="flex items-center gap-3">
        <button 
          type="button"
          onClick={() => setActiveTab('grid')}
          aria-label="Dashboard Home"
          className="relative flex items-center justify-center w-10 h-10 transition-transform duration-200 active:scale-95 group"
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-slate-900 drop-shadow-sm"
          >
            {/* Outer Hexagon */}
            <path
              d="M18 3L31 10.5V25.5L18 33L5 25.5V10.5L18 3Z"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Inner Concentric Shape */}
            <path
              d="M18 9.5L25 13.5V22.5L18 26.5L11 22.5V13.5L18 9.5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              className="opacity-80"
            />
            {/* Center Core */}
            <circle cx="18" cy="18" r="2.2" fill="currentColor" />
          </svg>
        </button>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-4 ml-2" aria-label="Main navigation">
          {/* Grid Tab (Gold / Yellow Active State) */}
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            aria-label="Overview Grid"
            className={`p-2 transition-all duration-200 rounded-xl ${
              activeTab === 'grid'
                ? 'text-amber-500 bg-amber-500/10'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="grid grid-cols-2 gap-[2.5px] w-4 h-4">
              <span className={`w-1.5 h-1.5 rounded-[1.5px] ${activeTab === 'grid' ? 'bg-[#E5A83B]' : 'bg-slate-400'}`} />
              <span className={`w-1.5 h-1.5 rounded-[1.5px] ${activeTab === 'grid' ? 'bg-[#E5A83B]' : 'bg-slate-400'}`} />
              <span className={`w-1.5 h-1.5 rounded-[1.5px] ${activeTab === 'grid' ? 'bg-[#E5A83B]' : 'bg-slate-400'}`} />
              <span className={`w-1.5 h-1.5 rounded-[1.5px] ${activeTab === 'grid' ? 'bg-[#E5A83B]' : 'bg-slate-400'}`} />
            </div>
          </button>

          {/* Analytics Pie Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('pie')}
            aria-label="Analytics"
            className={`p-1.5 transition-colors duration-200 rounded-xl ${
              activeTab === 'pie' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <PieChart className="w-[19px] h-[19px]" strokeWidth={1.8} />
          </button>

          {/* Cards Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            aria-label="Cards"
            className={`p-1.5 transition-colors duration-200 rounded-xl ${
              activeTab === 'card' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CreditCard className="w-[19px] h-[19px]" strokeWidth={1.8} />
          </button>

          {/* Shopping / Assets Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('bag')}
            aria-label="Assets"
            className={`p-1.5 transition-colors duration-200 rounded-xl ${
              activeTab === 'bag' ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ShoppingBag className="w-[19px] h-[19px]" strokeWidth={1.8} />
          </button>
        </nav>
      </div>

      {/* Right Controls: Privacy Toggle & Settings Gear */}
      <div className="flex items-center gap-2">
        {/* Quick Privacy Mask Toggle */}
        <button
          type="button"
          onClick={togglePrivacyMask}
          title={isPrivacyMasked ? 'Show Balances' : 'Mask Balances (Privacy Shield)'}
          className={`p-2 transition-colors duration-200 rounded-xl border border-transparent ${
            isPrivacyMasked 
              ? 'text-indigo-600 bg-indigo-50 border-indigo-200' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
          }`}
        >
          {isPrivacyMasked ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
        </button>

        {/* Security & Settings Button */}
        <button
          type="button"
          onClick={onOpenSecurity}
          aria-label="Settings and Security Vault"
          className="p-2 transition-transform duration-150 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95"
        >
          <Settings className="w-5 h-5" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  );
}
