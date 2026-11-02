import React from 'react';
import { motion } from 'motion/react';
import { Play, CalendarPlus } from 'lucide-react';
import { OrbitalIndicator } from './OrbitalIndicator';

export interface DynamicHeroCapsuleProps {
  onStartShift?: () => void;
  onOpenAnalytics: () => void;
  onOpenQuickFill: () => void;
  onOpenTimesheet: () => void;
  t: (key: string) => string;
  haptic?: (pattern: number | number[]) => void;
}

/**
 * Apple Dynamic Island Style Hero Capsule.
 * Replaces heavy multi-layer mesh orbs with a sleek, 120fps
 * frosted-glass status capsule and 3D orbital constellation.
 */
export const DynamicHeroCapsule: React.FC<DynamicHeroCapsuleProps> = ({
  onStartShift,
  onOpenQuickFill,
  onOpenAnalytics,
  t,
  haptic,
}) => {
  return (
    <div className="relative w-full rounded-2xl apple-glass-pill p-3 sm:p-4 border border-[var(--b)] transition-all">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Dynamic Island Status & Orbital Dot Cluster */}
        <div 
          onClick={() => {
            if (haptic) haptic(8);
            if (onStartShift) onStartShift();
          }}
          className="flex items-center gap-3 min-w-0 cursor-pointer group"
          role="button"
          tabIndex={0}
          aria-label={t('Shift Stopwatch')}
        >
          {/* Orbital 3D Constellation Sphere */}
          <div className="relative w-8 h-8 rounded-full bg-[var(--bg)]/80 flex items-center justify-center border border-[var(--b)] shrink-0 shadow-xs group-hover:border-[var(--a)]/40 transition-colors">
            <OrbitalIndicator size={20} color="var(--a)" speed={0.2} dotCount={10} />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--a)]">
                {t('Workspace')}
              </span>
              <span className="w-1 h-1 rounded-full bg-[var(--t3)] opacity-40" />
              <span className="text-micro font-medium text-[var(--t3)]">
                {t('Ready')}
              </span>
            </div>
            <h3 className="text-sm font-bold tracking-tight text-[var(--t1)] group-hover:text-[var(--a)] transition-colors">
              {t('Shift Stopwatch')}
            </h3>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              if (haptic) haptic(10);
              onOpenQuickFill();
            }}
            aria-label={t('Quick Fill')}
            className="w-9 h-9 rounded-full border border-[var(--b)] bg-[var(--bg)]/70 hover:bg-[var(--bg)] text-[var(--t2)] hover:text-[var(--t1)] flex items-center justify-center transition-colors shadow-xs"
            title={t('Quick Fill')}
          >
            <CalendarPlus size={15} strokeWidth={1.5} />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => {
              if (haptic) haptic(12);
              if (onStartShift) onStartShift();
            }}
            aria-label={t('Track Shift')}
            className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-full bg-[var(--a)] text-[var(--bg)] font-bold text-xs shadow-xs hover:opacity-90 transition-opacity"
          >
            <Play size={12} fill="currentColor" strokeWidth={0} />
            <span className="whitespace-nowrap">{t('Track')}</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
