import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { CELEBRATION_PRESETS } from '../lib/particle-celebration';

export interface CelebrationState {
  active: boolean;
  glyph: string;
  count: number;
  duration: number;
  label?: string;
}

interface UseCelebrationParams {
  viewDate: Date;
  totalEarned: number;
  goal: number;
  curSym: string;
  calcEarnings: (hours: number) => number;
}

/**
 * Event-driven milestone celebration hook.
 * Replaces routine per-shift reward fatigue with meaningful achievement moments:
 * 1. Goal Reached (100%+) — currency symbol, full particles (1200)
 * 2. Personal Best — ★ glyph, full particles (1200)
 * 3. 75% Milestone — "75%" glyph, lightweight particles (400)
 * 4. 50% Milestone — "50%" glyph, lightweight particles (400)
 */
export function useCelebration({
  viewDate,
  totalEarned,
  goal,
  curSym,
  calcEarnings,
}: UseCelebrationParams): CelebrationState {
  const [celebration, setCelebration] = useState<CelebrationState>({
    active: false,
    glyph: '✓',
    count: CELEBRATION_PRESETS.goalReached.count,
    duration: CELEBRATION_PRESETS.goalReached.duration,
  });

  const allEntries = useAppStore((state) => state.allEntries);
  const currentMonthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

  const prevMonthKeyRef = useRef(currentMonthKey);
  const prevEarnedRef = useRef(totalEarned);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // If month view changed, re-sync baseline without celebration
    if (prevMonthKeyRef.current !== currentMonthKey) {
      prevMonthKeyRef.current = currentMonthKey;
      prevEarnedRef.current = totalEarned;
      return;
    }

    // Skip celebration on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevEarnedRef.current = totalEarned;
      return;
    }

    const prevEarned = prevEarnedRef.current;
    prevEarnedRef.current = totalEarned;

    // Only evaluate if earnings increased within current viewed month
    if (totalEarned <= prevEarned) return;

    // Tier 1 (Epic): Goal Reached
    if (goal > 0 && prevEarned < goal && totalEarned >= goal) {
      setCelebration({
        active: true,
        glyph: curSym || '€',
        count: CELEBRATION_PRESETS.goalReached.count,
        duration: CELEBRATION_PRESETS.goalReached.duration,
        label: 'Goal Reached',
      });
      return;
    }

    // Tier 1 (Epic): Personal Best
    if (allEntries.length > 0) {
      const monthEarningsMap = new Map<string, number>();
      for (const entry of allEntries) {
        const mKey = entry.date.slice(0, 7);
        if (mKey !== currentMonthKey) {
          const current = monthEarningsMap.get(mKey) || 0;
          monthEarningsMap.set(mKey, current + calcEarnings(entry.hours));
        }
      }

      const pastMonths = Array.from(monthEarningsMap.values());
      if (pastMonths.length > 0) {
        const previousBest = Math.max(...pastMonths);
        if (previousBest > 0 && prevEarned < previousBest && totalEarned >= previousBest * 1.01) {
          setCelebration({
            active: true,
            glyph: '★',
            count: CELEBRATION_PRESETS.personalBest.count,
            duration: CELEBRATION_PRESETS.personalBest.duration,
            label: 'Personal Best',
          });
          return;
        }
      }
    }

    // Tier 2 (Significant): 75% Milestone
    const pct75 = goal * 0.75;
    if (goal > 0 && prevEarned < pct75 && totalEarned >= pct75 && totalEarned < goal) {
      setCelebration({
        active: true,
        glyph: '75%',
        count: CELEBRATION_PRESETS.milestone.count,
        duration: CELEBRATION_PRESETS.milestone.duration,
        label: '75% of Goal',
      });
      return;
    }

    // Tier 2 (Significant): 50% Milestone
    const pct50 = goal * 0.5;
    if (goal > 0 && prevEarned < pct50 && totalEarned >= pct50 && totalEarned < pct75) {
      setCelebration({
        active: true,
        glyph: '50%',
        count: CELEBRATION_PRESETS.milestone.count,
        duration: CELEBRATION_PRESETS.milestone.duration,
        label: '50% of Goal',
      });
      return;
    }
  }, [totalEarned, goal, currentMonthKey, allEntries, curSym, calcEarnings]);

  // Auto-dismiss active state after animation completes
  useEffect(() => {
    if (!celebration.active) return;
    const timer = setTimeout(() => {
      setCelebration((prev) => ({ ...prev, active: false }));
    }, celebration.duration + 200);
    return () => clearTimeout(timer);
  }, [celebration.active, celebration.duration]);

  return celebration;
}
