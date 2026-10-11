import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';

export interface CalendarDaysBadgeProps {
  count: number;
  label: string;
  onClick?: () => void;
  haptic?: (pattern: number | number[]) => void;
  className?: string;
  delayModalMs?: number;
}

export const CalendarDaysBadge = React.memo(({
  count,
  label,
  onClick,
  haptic,
  className = '',
  delayModalMs = 220,
}: CalendarDaysBadgeProps) => {
  const [displayCount, setDisplayCount] = useState(count);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [flipSeq, setFlipSeq] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (count !== prevCountRef.current) {
      const nextDir: 1 | -1 = count >= prevCountRef.current ? 1 : -1;
      setDirection(nextDir);
      setDisplayCount(count);
      setFlipSeq(s => s + 1);
      prevCountRef.current = count;
    }
  }, [count]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    // Tactile page-turn haptic pattern
    if (haptic) {
      haptic([12, 18]);
    }

    // Trigger physical calendar page flip forward
    setDirection(1);
    setFlipSeq(s => s + 1);

    if (onClick) {
      if (delayModalMs > 0) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          onClick();
        }, delayModalMs);
      } else {
        onClick();
      }
    }
  }, [haptic, onClick, delayModalMs]);

  const variants: Variants = {
    enter: (dir: number) => ({
      rotateX: dir > 0 ? -90 : 90,
      opacity: 0,
      scale: 0.92,
      y: dir > 0 ? -4 : 4,
    }),
    center: {
      rotateX: 0,
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 320,
        damping: 22,
        mass: 0.8,
      },
    },
    exit: (dir: number) => ({
      rotateX: dir > 0 ? 90 : -90,
      opacity: 0,
      scale: 0.92,
      y: dir > 0 ? 4 : -4,
      transition: {
        duration: 0.16,
        ease: 'easeIn',
      },
    }),
  };

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      whileTap={{ scale: 0.94 }}
      className={`relative py-1 px-3 rounded-panel border border-[var(--b)] bg-[var(--bg-1)] flex flex-col items-center justify-center gap-0.5 shadow-sm min-w-[3.25rem] min-h-[2.75rem] hover:border-[var(--a)]/40 hover:bg-[var(--b)] transition-all group overflow-hidden select-none cursor-pointer [perspective:600px] ${className}`}
      aria-label={`${label}: ${displayCount}`}
    >
      {/* Tear-off calendar header line / binder groove */}
      <div className="absolute top-0 inset-x-2 h-[2px] bg-gradient-to-r from-transparent via-[var(--a)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Badge Metric Label */}
      <span className="text-micro font-black uppercase tracking-widest text-[var(--t3)] leading-none mb-0.5 group-hover:text-[var(--t2)] transition-colors pointer-events-none">
        {label}
      </span>

      {/* 3D Flip Calendar Number Container */}
      <div className="relative w-full h-[18px] flex items-center justify-center [transform-style:preserve-3d]">
        <AnimatePresence custom={direction} mode="popLayout" initial={false}>
          <motion.div
            key={`${displayCount}-${flipSeq}`}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform-origin:50%_50%]"
          >
            <span className="text-base font-black text-[var(--t1)] leading-none tabular-nums drop-shadow-sm">
              {displayCount}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* Subtle page-fold horizontal line accent */}
        <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-[1px] bg-[var(--b)]/30 pointer-events-none" />
      </div>
    </motion.button>
  );
});

CalendarDaysBadge.displayName = 'CalendarDaysBadge';
