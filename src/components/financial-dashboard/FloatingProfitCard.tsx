import React from 'react';
import { useFinancialDashboardStore } from '../../store/useFinancialDashboardStore';
import { CurrencyMath } from '../../lib/currency-math';

interface FloatingProfitCardProps {
  onSelectAsset?: (assetId: string) => void;
}

export function FloatingProfitCard({ onSelectAsset }: FloatingProfitCardProps) {
  const {
    profitScaled,
    profitGrowthPct,
    sharesScaled,
    sharesGrowthPct,
    cryptoAssets,
    isPrivacyMasked
  } = useFinancialDashboardStore();

  const formattedProfit = React.useMemo(() => {
    return CurrencyMath.format(BigInt(profitScaled), '$', 2);
  }, [profitScaled]);

  const formattedShares = React.useMemo(() => {
    return CurrencyMath.format(BigInt(sharesScaled), '$', 2);
  }, [sharesScaled]);

  return (
    <div 
      className="relative w-full rounded-[24px] bg-[#18191E] text-white p-5 sm:p-6 
        shadow-[0_24px_50px_-10px_rgba(0,0,0,0.55),_0_10px_20px_-5px_rgba(0,0,0,0.4)] 
        border border-white/5 transition-all duration-300"
    >
      {/* Top Row: Profit Stats & Shares with Sparklines */}
      <div className="flex items-start justify-between gap-4 mb-6">
        {/* Left: Profit */}
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-slate-400 tracking-wider">
            Profit
          </span>
          <div 
            className={`text-2xl sm:text-[28px] font-bold text-white tracking-tight my-0.5 transition-all duration-300 ${
              isPrivacyMasked ? 'blur-sm select-none opacity-60' : ''
            }`}
          >
            {isPrivacyMasked ? '$•,•••.••' : formattedProfit}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
            <span>▲</span>
            <span>{profitGrowthPct}% year over year</span>
          </div>
        </div>

        {/* Right: Shares & Multi-line Neon Sparklines */}
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-medium text-slate-400 tracking-wider">
            Shares
          </span>
          <div 
            className={`text-sm sm:text-base font-bold text-white tracking-tight mt-0.5 transition-all duration-300 ${
              isPrivacyMasked ? 'blur-sm select-none opacity-60' : ''
            }`}
          >
            {isPrivacyMasked ? '$•,•••.••' : formattedShares}
          </div>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mb-1.5">
            <span>▲</span>
            <span>{sharesGrowthPct}% year over year</span>
          </div>

          {/* Smooth Neon Multi-wave Sparklines */}
          <div className="relative w-28 h-6 overflow-visible">
            <svg 
              className="w-full h-full overflow-visible" 
              viewBox="0 0 100 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Green Wave Line */}
              <path
                d="M 0 16 C 15 10, 25 20, 40 14 C 55 8, 70 18, 85 10 C 92 6, 96 11, 100 8"
                stroke="#10B981"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="drop-shadow-[0_0_4px_rgba(16,185,129,0.7)]"
              />
              {/* Pink Wave Line */}
              <path
                d="M 0 19 C 18 22, 28 8, 42 16 C 58 24, 72 10, 84 16 C 92 20, 96 14, 100 13"
                stroke="#EC4899"
                strokeWidth="1.8"
                strokeLinecap="round"
                className="drop-shadow-[0_0_4px_rgba(236,72,153,0.7)]"
              />
              {/* Cyan Wave Line */}
              <path
                d="M 0 14 C 20 18, 30 14, 45 10 C 60 6, 75 16, 88 12 C 94 10, 97 7, 100 5"
                stroke="#06B6D4"
                strokeWidth="1.6"
                strokeLinecap="round"
                className="drop-shadow-[0_0_4px_rgba(6,182,212,0.7)]"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Row: 4 Crypto Asset Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {cryptoAssets.map(asset => {
          const val = CurrencyMath.format(BigInt(asset.balanceScaled), '$', 2);

          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => onSelectAsset?.(asset.id)}
              className="flex flex-col items-start p-2.5 rounded-xl bg-[#23242A] hover:bg-[#2A2B33] 
                transition-all duration-200 border border-white/5 active:scale-95 text-left group"
            >
              {/* Icon Badge */}
              <div 
                className="flex items-center justify-center w-7 h-7 rounded-lg mb-2 text-white font-bold text-xs shadow-sm"
                style={{ backgroundColor: asset.color }}
              >
                {asset.iconType === 'core' && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
                  </svg>
                )}
                {asset.iconType === 'clients' && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="20" x="4" y="2" rx="2" />
                    <path d="M9 22v-4h6v4" />
                    <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
                  </svg>
                )}
                {asset.iconType === 'retainer' && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 16h5v5" />
                  </svg>
                )}
                {asset.iconType === 'consulting' && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                  </svg>
                )}
                {asset.iconType === 'btc' && '₿'}
                {asset.iconType === 'eth' && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <polygon points="6,1 2,6 6,8 10,6" />
                    <polygon points="6,9 2,7 6,11 10,7" />
                  </svg>
                )}
                {asset.iconType === 'dash' && 'Đ'}
                {asset.iconType === 'edo' && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <rect x="2" y="2" width="8" height="8" rx="2" transform="rotate(45 6 6)" />
                  </svg>
                )}
              </div>

              {/* Asset Name */}
              <span className="text-[10px] font-medium text-slate-400 group-hover:text-slate-200 transition-colors">
                {asset.name}
              </span>

              {/* Asset Balance */}
              <span 
                className={`text-[12px] font-bold text-white tracking-tight mt-0.5 transition-all duration-300 ${
                  isPrivacyMasked ? 'blur-xs select-none opacity-60' : ''
                }`}
              >
                {isPrivacyMasked ? '$••••' : val}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
