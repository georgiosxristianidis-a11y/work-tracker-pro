import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useFinancialDashboardStore } from '../../store/useFinancialDashboardStore';
import { CurrencyMath } from '../../lib/currency-math';

export function CapabilitiesDonutCard() {
  const {
    capabilitiesTotalScaled,
    netGrowthPct,
    nftPercent,
    stocksPercent,
    cryptoPercent,
    isPrivacyMasked
  } = useFinancialDashboardStore();

  const formattedTotal = React.useMemo(() => {
    return CurrencyMath.format(BigInt(capabilitiesTotalScaled), '$', 0);
  }, [capabilitiesTotalScaled]);

  return (
    <div className="flex flex-col">
      {/* Header with Title and BarChart Badge */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[17px] font-bold text-slate-800 tracking-tight">Capabilities</h2>
          <p className="text-[12px] font-medium text-slate-400">
            Total Net Growth of {netGrowthPct}%
          </p>
        </div>

        {/* Small Analytics Icon Button */}
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-white shadow-[3px_3px_8px_rgba(180,195,215,0.35),_-3px_-3px_8px_rgba(255,255,255,0.95)] text-slate-600">
          <BarChart3 className="w-4 h-4 stroke-[2]" />
        </div>
      </div>

      {/* Donut and Breakdown Row */}
      <div className="flex items-center gap-6">
        {/* Rainbow Conic Donut Chart */}
        <div className="relative flex items-center justify-center w-[130px] h-[130px] flex-shrink-0">
          {/* Glowing Ambient Halo */}
          <div 
            className="absolute inset-0 rounded-full blur-md opacity-35"
            style={{
              background: 'conic-gradient(from 180deg at 50% 50%, #4ADE80, #06B6D4, #8B5CF6, #EC4899, #FACC15, #4ADE80)'
            }}
          />

          {/* Conic Ring */}
          <div
            className="relative w-full h-full rounded-full p-[18px] flex items-center justify-center"
            style={{
              background: 'conic-gradient(from 190deg at 50% 50%, #4ADE80 0%, #22D3EE 28%, #A855F7 52%, #EC4899 74%, #FACC15 90%, #4ADE80 100%)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.08)'
            }}
          >
            {/* Center Elevated Cutout Circle */}
            <div className="flex flex-col items-center justify-center w-full h-full bg-white rounded-full shadow-[2px_2px_8px_rgba(180,195,215,0.35),_-2px_-2px_8px_rgba(255,255,255,1)]">
              <span className="text-[8.5px] font-bold tracking-wider text-slate-400 uppercase">
                TOTAL
              </span>
              <span 
                className={`text-[15px] font-extrabold text-slate-900 leading-tight transition-all duration-300 ${
                  isPrivacyMasked ? 'blur-sm select-none opacity-60' : ''
                }`}
              >
                {isPrivacyMasked ? '••••' : formattedTotal}
              </span>
            </div>
          </div>
        </div>

        {/* Breakdown Level Bars */}
        <div className="flex flex-col justify-center flex-1 gap-2.5">
          {/* NFT Assets */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-medium text-slate-400">NFT Assets</span>
              <span className="font-bold text-slate-800">{nftPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-slate-400/80 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${Math.min(100, Math.max(0, nftPercent))}%` }} 
              />
            </div>
          </div>

          {/* Stocks */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-medium text-slate-400">Stocks</span>
              <span className="font-bold text-slate-800">{stocksPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-slate-500 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${Math.min(100, Math.max(0, stocksPercent))}%` }} 
              />
            </div>
          </div>

          {/* Crypto */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-medium text-slate-400">Crypto</span>
              <span className="font-bold text-slate-800">{cryptoPercent}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-slate-800 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${Math.min(100, Math.max(0, cryptoPercent))}%` }} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
