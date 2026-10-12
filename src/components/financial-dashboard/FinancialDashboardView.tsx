import React from 'react';
import { DashboardHeader } from './DashboardHeader';
import { BalanceOverviewCard } from './BalanceOverviewCard';
import { CapabilitiesDonutCard } from './CapabilitiesDonutCard';
import { FloatingProfitCard } from './FloatingProfitCard';
import { BenefitsAreaChartCard } from './BenefitsAreaChartCard';
import { ActionSidebar } from './ActionSidebar';
import { FinancialActionModal } from './FinancialActionModal';
import { SecurityControlsModal } from './SecurityControlsModal';
import { QuickDataPasteModal } from './QuickDataPasteModal';
import { useFinancialDashboardStore } from '../../store/useFinancialDashboardStore';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';

interface FinancialDashboardViewProps {
  onBackToTracker?: () => void;
}

export function FinancialDashboardView({ onBackToTracker }: FinancialDashboardViewProps) {
  const { setActiveModal, loadFromVault } = useFinancialDashboardStore();
  const [isFullPresentation, setIsFullPresentation] = React.useState<boolean>(true);

  React.useEffect(() => {
    loadFromVault().catch(console.error);
  }, [loadFromVault]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-['Epilogue_Variable',sans-serif] overflow-x-hidden selection:bg-slate-900 selection:text-white">
      {/* Split presentation background mirroring Behance/Dribbble reference showcase */}
      <div className="fixed inset-0 pointer-events-none flex z-0">
        <div className="w-1/2 h-full bg-[#141518]" />
        <div className="w-1/2 h-full bg-[#E5E9EE]" />
      </div>

      {/* Floating View Controls (Top Navigation pill) */}
      <div className="fixed top-4 left-4 z-40 flex items-center gap-2">
        {onBackToTracker && (
          <button
            type="button"
            onClick={onBackToTracker}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/90 hover:bg-white text-slate-800 text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
            <span>Work Tracker</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsFullPresentation(!isFullPresentation)}
          aria-label="Toggle Fullscreen"
          className="p-2 rounded-2xl bg-white/90 hover:bg-white text-slate-800 shadow-lg backdrop-blur-md transition-all active:scale-95"
        >
          {isFullPresentation ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Neumorphic Tablet Shell matching Reference Mockup */}
      <main 
        className="relative z-10 w-full max-w-[1040px] my-6 mx-4 sm:mx-6 p-6 sm:p-8 rounded-[38px] 
          bg-[#F0F3F7] shadow-[0_30px_70px_rgba(0,0,0,0.35),_inset_0_1px_2px_rgba(255,255,255,0.8)] 
          border border-white/60 transition-all duration-300"
      >
        {/* Top Header */}
        <DashboardHeader 
          onOpenSecurity={() => setActiveModal('security')} 
          onOpenPaste={() => setActiveModal('paste')}
        />

        {/* Dashboard 3-Column Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Left Column: Overall Balance + Capabilities (Span 4) */}
          <div className="lg:col-span-4 flex flex-col justify-between h-full pt-1">
            <BalanceOverviewCard
              onSend={() => setActiveModal('send')}
              onReceive={() => setActiveModal('receive')}
              onMore={() => setActiveModal('security')}
            />

            <div className="pt-2 border-t border-slate-200/60 lg:border-t-0">
              <CapabilitiesDonutCard />
            </div>
          </div>

          {/* Center Column: Floating Profit Card + Benefits Area Chart (Span 7) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <FloatingProfitCard
              onSelectAsset={() => setActiveModal('send')}
            />

            <BenefitsAreaChartCard />
          </div>

          {/* Right Column: User Profile & Action Sidebar (Span 1) */}
          <div className="lg:col-span-1 flex justify-center border-t border-slate-200/60 lg:border-t-0 pt-4 lg:pt-0">
            <ActionSidebar
              onTopUp={() => setActiveModal('top_up')}
              onTransfer={() => setActiveModal('transfer')}
              onOpenAction={(action) => {
                if (action === 'More') {
                  setActiveModal('security');
                } else {
                  setActiveModal('transfer');
                }
              }}
            />
          </div>
        </div>
      </main>

      {/* Interactive Transaction, Security, and Data Import Modals */}
      <FinancialActionModal />
      <SecurityControlsModal />
      <QuickDataPasteModal />
    </div>
  );
}
