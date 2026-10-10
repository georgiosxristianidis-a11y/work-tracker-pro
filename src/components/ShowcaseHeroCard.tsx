import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Play, CalendarPlus, TrendingUp, FileText, Sparkles } from 'lucide-react';

interface ShowcaseHeroCardProps {
  onStartShift?: () => void;
  onOpenAnalytics: () => void;
  onOpenBulkAdd: () => void;
  onOpenTimesheet: () => void;
  t: (key: string) => string;
  haptic?: (pattern: number | number[]) => void;
}

interface SlideItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  actionLabel: string;
  actionIcon: React.ElementType;
  onAction: () => void;
  accentHue: string;
}

export const ShowcaseHeroCard: React.FC<ShowcaseHeroCardProps> = ({
  onStartShift,
  onOpenAnalytics,
  onOpenBulkAdd,
  onOpenTimesheet,
  t,
  haptic
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: SlideItem[] = [
    {
      id: 'shift',
      tag: 'SYSTEM WORKFLOW',
      title: 'Shift Stopwatch',
      description: 'Live time tracking with instant rate calculation and precision records.',
      actionLabel: 'Track Shift',
      actionIcon: Play,
      onAction: onStartShift || onOpenTimesheet,
      accentHue: 'var(--a)'
    },
    {
      id: 'target',
      tag: 'SMART ANALYTICS',
      title: 'Earnings Target',
      description: 'Track pacing toward monthly financial targets and work hours.',
      actionLabel: 'View Analytics',
      actionIcon: TrendingUp,
      onAction: onOpenAnalytics,
      accentHue: 'var(--green)'
    },
    {
      id: 'batch',
      tag: 'QUICK BATCH',
      title: 'Smart Batch Fill',
      description: 'Quickly populate standard shifts across workdays in seconds.',
      actionLabel: 'Batch Logging',
      actionIcon: CalendarPlus,
      onAction: onOpenBulkAdd,
      accentHue: 'var(--a)'
    },
    {
      id: 'audit',
      tag: 'COMPLIANCE & EXPORT',
      title: 'Timesheet Audit',
      description: 'Generate structured PDF records and audit reports instantly.',
      actionLabel: 'View Reports',
      actionIcon: FileText,
      onAction: onOpenTimesheet,
      accentHue: 'var(--a)'
    }
  ];

  const totalSlides = slides.length;

  const nextSlide = () => {
    if (haptic) haptic(8);
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    if (haptic) haptic(8);
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const active = slides[currentSlide];
  const ActionIcon = active.actionIcon;

  return (
    <div className="relative w-full rounded-card border border-[var(--b)] bg-[var(--bg-1)] p-5 overflow-hidden shadow-sm transition-all">
      {/* Top micro-header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--a)] animate-pulse" />
          <span className="text-micro font-bold uppercase tracking-[0.2em] text-[var(--t3)]">
            WORK TRACKER PRO
          </span>
        </div>
        <div className="flex items-center gap-1 text-[var(--t3)]">
          <Sparkles size={13} className="text-[var(--a)]" />
          <span className="text-micro font-semibold uppercase tracking-widest">PRO ENGINE</span>
        </div>
      </div>

      {/* Main card body with responsive grid */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Left column: navigation pills & text content */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Controls pill stack (< >) */}
          <div className="flex flex-col gap-1.5 shrink-0 pt-1">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={prevSlide}
              aria-label="Previous slide"
              className="w-8 h-8 rounded-full border border-[var(--b)] bg-[var(--bg)] flex items-center justify-center text-[var(--t2)] hover:text-[var(--t1)] hover:border-[var(--a)]/40 transition-colors shadow-xs"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={nextSlide}
              aria-label="Next slide"
              className="w-8 h-8 rounded-full border border-[var(--b)] bg-[var(--bg)] flex items-center justify-center text-[var(--t2)] hover:text-[var(--t1)] hover:border-[var(--a)]/40 transition-colors shadow-xs"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </motion.button>
          </div>

          {/* Dynamic slide content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="space-y-1.5"
              >
                <div className="text-micro font-bold uppercase tracking-[0.2em] text-[var(--t3)]">
                  {active.tag}
                </div>
                <h3 className="text-xl font-black tracking-tight text-[var(--t1)] leading-snug">
                  {active.title}
                </h3>
                <p className="text-xs text-[var(--t2)] leading-relaxed line-clamp-2 max-w-[280px]">
                  {active.description}
                </p>

                {/* Split Action Button (inspired by reference CTA) */}
                <div className="pt-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (haptic) haptic(12);
                      active.onAction();
                    }}
                    className="group inline-flex items-stretch rounded-control border border-[var(--b)] bg-[var(--bg)] text-[var(--t1)] shadow-xs overflow-hidden transition-all hover:border-[var(--a)]/40"
                  >
                    <span className="px-3.5 py-2 text-xs font-bold tracking-wide flex items-center">
                      {active.actionLabel}
                    </span>
                    <span className="px-2.5 py-2 border-l border-[var(--b)] bg-[var(--a-bg)] flex items-center justify-center text-[var(--a)] group-hover:bg-[var(--a)] group-hover:text-[var(--bg)] transition-colors">
                      <ActionIcon size={14} strokeWidth={2.5} />
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right column: Glowing Mesh Orb visual & slide index counter */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
          {/* Hardware-accelerated cyber-mesh organic orb */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center pointer-events-none select-none">
            {/* Ambient background glow */}
            <div
              className="absolute inset-0 rounded-full blur-2xl opacity-25 transition-all duration-700"
              style={{ background: active.accentHue }}
            />

            {/* Floating animated core */}
            <motion.div
              animate={{
                scale: [1, 1.06, 0.98, 1],
                rotate: [0, 90, 180, 360],
              }}
              transition={{
                duration: 18,
                repeat: Infinity,
                ease: 'linear'
              }}
              className="relative w-20 h-20 rounded-full p-1"
              style={{
                background: `radial-gradient(circle at 35% 30%, ${active.accentHue} 0%, rgba(99, 102, 241, 0.4) 45%, rgba(139, 92, 246, 0.1) 75%, transparent 100%)`
              }}
            >
              {/* Internal glowing ripple */}
              <motion.div
                animate={{
                  scale: [0.85, 1.05, 0.85],
                  opacity: [0.6, 0.9, 0.6]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="w-full h-full rounded-full border border-white/20 shadow-inner flex items-center justify-center"
              >
                <div className="w-6 h-6 rounded-full bg-white/25 backdrop-blur-xs" />
              </motion.div>
            </motion.div>
          </div>

          {/* Slide index & animated progress gauge */}
          <div className="flex flex-col items-end gap-1.5 mt-auto">
            <div className="text-xs font-mono font-bold tracking-widest text-[var(--t1)] tabular-nums">
              <span>0{currentSlide + 1}</span>
              <span className="text-[var(--t3)] mx-1">/</span>
              <span className="text-[var(--t3)]">0{totalSlides}</span>
            </div>
            {/* Underline progress bar matching reference gauge */}
            <div className="w-16 h-0.5 rounded-full bg-[var(--b)] overflow-hidden">
              <motion.div
                className="h-full bg-[var(--a)]"
                initial={false}
                animate={{ width: `${((currentSlide + 1) / totalSlides) * 100}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
