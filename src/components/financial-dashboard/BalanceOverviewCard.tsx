import React from 'react';
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';
import { useFinancialDashboardStore } from '../../store/useFinancialDashboardStore';
import { CurrencyMath } from '../../lib/currency-math';

interface BalanceOverviewCardProps {
  onSend: () => void;
  onReceive: () => void;
  onMore: () => void;
}

export function BalanceOverviewCard({ onSend, onReceive, onMore }: BalanceOverviewCardProps) {
  const { overallBalanceScaled, isPrivacyMasked } = useFinancialDashboardStore();

  const formattedBalance = React.useMemo(() => {
    return CurrencyMath.format(BigInt(overallBalanceScaled), '$', 2);
  }, [overallBalanceScaled]);

  return (
    <section className="flex flex-col mb-7" aria-label="Overall Balance Section">
      {/* Label */}
      <span className="text-[13px] font-medium tracking-wide text-slate-500 mb-1">
        Overall Balance
      </span>

      {/* Main Big Balance */}
      <div className="flex items-baseline gap-2 mb-6">
        <h1 
          className={`text-4xl sm:text-[42px] font-bold text-slate-900 tracking-tight select-none transition-all duration-300 ${
            isPrivacyMasked ? 'blur-md select-none opacity-60' : ''
          }`}
        >
          {isPrivacyMasked ? '$••,•••.••' : formattedBalance}
        </h1>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-3">
        {/* Send Button */}
        <button
          type="button"
          onClick={onSend}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-white text-slate-800 text-sm font-semibold 
            shadow-[5px_5px_12px_rgba(180,195,215,0.4),_-5px_-5px_12px_rgba(255,255,255,0.95)] 
            hover:shadow-[2px_2px_6px_rgba(180,195,215,0.35),_-2px_-2px_6px_rgba(255,255,255,0.9)] 
            active:shadow-[inset_2px_2px_5px_rgba(180,195,215,0.4),_inset_-2px_-2px_5px_rgba(255,255,255,0.95)] 
            transition-all duration-150 active:scale-[0.98]"
        >
          <ArrowUpRight className="w-4 h-4 text-slate-700 stroke-[2.2]" />
          <span>Send</span>
        </button>

        {/* Receive Button */}
        <button
          type="button"
          onClick={onReceive}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-white text-slate-800 text-sm font-semibold 
            shadow-[5px_5px_12px_rgba(180,195,215,0.4),_-5px_-5px_12px_rgba(255,255,255,0.95)] 
            hover:shadow-[2px_2px_6px_rgba(180,195,215,0.35),_-2px_-2px_6px_rgba(255,255,255,0.9)] 
            active:shadow-[inset_2px_2px_5px_rgba(180,195,215,0.4),_inset_-2px_-2px_5px_rgba(255,255,255,0.95)] 
            transition-all duration-150 active:scale-[0.98]"
        >
          <ArrowDownRight className="w-4 h-4 text-slate-700 stroke-[2.2]" />
          <span>Receive</span>
        </button>

        {/* More Options Button */}
        <button
          type="button"
          onClick={onMore}
          aria-label="More options"
          className="flex items-center justify-center w-11 h-10 rounded-2xl bg-white text-slate-700 
            shadow-[5px_5px_12px_rgba(180,195,215,0.4),_-5px_-5px_12px_rgba(255,255,255,0.95)] 
            hover:shadow-[2px_2px_6px_rgba(180,195,215,0.35),_-2px_-2px_6px_rgba(255,255,255,0.9)] 
            active:shadow-[inset_2px_2px_5px_rgba(180,195,215,0.4),_inset_-2px_-2px_5px_rgba(255,255,255,0.95)] 
            transition-all duration-150 active:scale-[0.98]"
        >
          <MoreHorizontal className="w-4 h-4 stroke-[2.2]" />
        </button>
      </div>
    </section>
  );
}
