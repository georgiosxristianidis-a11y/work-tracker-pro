import React, { useRef, useEffect, useCallback, useMemo } from 'react';

export interface TimeTapeRulerProps {
  value: number;
  onChange: (hours: number) => void;
  haptic?: (pattern?: number | number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

const STEP = 0.5;
const MIN = 0;
const MAX = 24;
const TICK_WIDTH = 28; // width in pixels of each 0.5h segment

export const TimeTapeRuler = React.memo(({
  value,
  onChange,
  haptic,
  min = MIN,
  max = MAX,
  step = STEP,
  className = ''
}: TimeTapeRulerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHourHapticRef = useRef<number>(Math.round(value));

  // Generate all tick values: 0, 0.5, 1, 1.5, ... 24
  const ticks = useMemo(() => {
    const list: number[] = [];
    for (let h = min; h <= max + 0.001; h += step) {
      list.push(Math.round(h * 10) / 10);
    }
    return list;
  }, [min, max, step]);

  // Programmatic scroll to target hour when value changes from outside
  const scrollToValue = useCallback((targetVal: number, smooth: boolean = true) => {
    const el = containerRef.current;
    if (!el) return;
    const clamped = Math.max(min, Math.min(max, targetVal));
    const index = Math.round((clamped - min) / step);
    const targetScroll = index * TICK_WIDTH;
    if (Math.abs(el.scrollLeft - targetScroll) > 1) {
      el.scrollTo({
        left: targetScroll,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  }, [min, max, step]);

  // Sync scroll position on initial mount or when value updates while user is not scrolling
  useEffect(() => {
    if (!isUserScrollingRef.current) {
      scrollToValue(value, true);
    }
  }, [value, scrollToValue]);

  // Handle scroll events with haptic feedback and snap detection
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 150);

    const scrollLeft = el.scrollLeft;
    const rawIndex = scrollLeft / TICK_WIDTH;
    const closestIndex = Math.round(rawIndex);
    const newHour = Math.max(min, Math.min(max, Math.round((min + closestIndex * step) * 10) / 10));

    if (newHour !== value) {
      onChange(newHour);

      // Trigger whole-hour tactile tick
      const integerHour = Math.round(newHour);
      if (newHour % 1 === 0 && integerHour !== lastHourHapticRef.current) {
        lastHourHapticRef.current = integerHour;
        haptic?.(8);
      }
    }
  }, [min, max, step, value, onChange, haptic]);

  return (
    <div
      className={`relative w-full select-none ${className}`}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="Work hours ruler"
    >
      {/* Central Indicator Needle */}
      <div className="absolute left-1/2 top-0 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
        <div className="w-2.5 h-1 rounded-full bg-[var(--a)] shadow-[0_0_10px_var(--a)]" />
        <div className="w-[2px] h-8 bg-[var(--a)] shadow-[0_0_8px_var(--a)] rounded-full" />
      </div>

      {/* Scrollable Tape Ruler with Cylindrical Fade Mask */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full overflow-x-auto scrollbar-none snap-x snap-mandatory flex items-start py-2"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 22%, black 78%, transparent 100%)'
        }}
      >
        {/* Left Spacer to center the first tick (0h) */}
        <div className="shrink-0" style={{ width: 'calc(50% - 14px)' }} />

        {/* Ticks Track */}
        {ticks.map((tick) => {
          const isInteger = tick % 1 === 0;
          const isCurrent = Math.abs(tick - value) < 0.1;

          return (
            <button
              key={tick}
              type="button"
              onClick={() => {
                haptic?.(10);
                onChange(tick);
                scrollToValue(tick, true);
              }}
              style={{ width: `${TICK_WIDTH}px` }}
              className="shrink-0 snap-center flex flex-col items-center justify-start h-12 focus:outline-none group"
              aria-label={`${tick} hours`}
            >
              {isInteger ? (
                <>
                  <div
                    className={`w-[2px] rounded-full transition-colors ${
                      isCurrent
                        ? 'h-6 bg-[var(--a)]'
                        : 'h-5 bg-[var(--t1)] opacity-40 group-hover:opacity-80'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-mono font-black tabular-nums transition-colors mt-1 leading-none ${
                      isCurrent
                        ? 'text-[var(--a)] scale-110'
                        : 'text-[var(--t3)] group-hover:text-[var(--t1)]'
                    }`}
                  >
                    {tick}
                  </span>
                </>
              ) : (
                <div
                  className={`w-[1px] rounded-full transition-colors ${
                    isCurrent
                      ? 'h-4 bg-[var(--a)]'
                      : 'h-3 bg-[var(--t3)] opacity-30 group-hover:opacity-60'
                  }`}
                />
              )}
            </button>
          );
        })}

        {/* Right Spacer to center the last tick (24h) */}
        <div className="shrink-0" style={{ width: 'calc(50% - 14px)' }} />
      </div>
    </div>
  );
});

TimeTapeRuler.displayName = 'TimeTapeRuler';
