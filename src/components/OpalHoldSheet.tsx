import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check } from 'lucide-react';
import { AnimatedTrash } from './AnimatedTrash';

export interface OpalHoldSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  t?: (key: string) => string;
  haptic?: (pattern?: number | number[]) => void;
  title?: string;
  subtitle?: string;
  holdLabel?: string;
  cancelLabel?: string;
  durationMs?: number;
}

const DEFAULT_HOLD_DURATION_MS = 900;
const identityT = (key: string) => key;

/**
 * Opal Hold Sheet: secondary safety-net sheet requiring a deliberate press-and-hold
 * inside an obsidian-scarlet confirmation sheet before executing destructive wipes.
 */
export const OpalHoldSheet: React.FC<OpalHoldSheetProps> = ({
  isOpen,
  onClose,
  onConfirm,
  t = identityT,
  haptic,
  title = 'Wipe Local Data?',
  subtitle = "Don't wipe unless you have a local backup.",
  holdLabel = 'Hold to Wipe',
  cancelLabel = 'Never Mind',
  durationMs = DEFAULT_HOLD_DURATION_MS,
}) => {
  const [holdState, setHoldState] = useState<'idle' | 'holding' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [showTapHint, setShowTapHint] = useState(false);

  const rafRef = useRef<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef(0);
  const completedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
  }, []);

  const resetHoldState = useCallback(() => {
    clearTimers();
    completedRef.current = false;
    setHoldState('idle');
    setProgress(0);
    setShowTapHint(false);
  }, [clearTimers]);

  useEffect(() => {
    if (!isOpen) {
      resetHoldState();
    }
    return () => clearTimers();
  }, [isOpen, resetHoldState, clearTimers]);

  const cancelHold = useCallback((allowHint: boolean) => {
    if (completedRef.current) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const elapsed = performance.now() - startTimeRef.current;
    setHoldState('idle');
    setProgress(0);
    if (allowHint && elapsed < 180) {
      setShowTapHint(true);
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      hintTimerRef.current = setTimeout(() => setShowTapHint(false), 1100);
    }
  }, []);

  useEffect(() => {
    if (holdState !== 'holding') return;
    const onGlobalUp = () => cancelHold(true);
    const onGlobalCancel = () => cancelHold(false);
    window.addEventListener('pointerup', onGlobalUp);
    window.addEventListener('pointercancel', onGlobalCancel);
    return () => {
      window.removeEventListener('pointerup', onGlobalUp);
      window.removeEventListener('pointercancel', onGlobalCancel);
    };
  }, [holdState, cancelHold]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !completedRef.current) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const finishHold = useCallback(async () => {
    if (completedRef.current) return;
    completedRef.current = true;
    clearTimers();
    setProgress(1);
    setHoldState('complete');
    setShowTapHint(false);
    haptic?.([25, 45, 25]);
    try {
      await onConfirm();
    } finally {
      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 450);
    }
  }, [clearTimers, haptic, onClose, onConfirm]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (completedRef.current || holdState === 'complete') return;

    clearTimers();
    setShowTapHint(false);
    setHoldState('holding');
    setProgress(0);
    startTimeRef.current = performance.now();
    haptic?.(8);

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic pointer events in tests may lack an active pointer id
    }

    const tick = (now: number) => {
      const p = Math.min(1, (now - startTimeRef.current) / durationMs);
      setProgress(p);
      if (p >= 1) {
        void finishHold();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const frameEl = typeof document !== 'undefined' ? document.getElementById('frame') : null;
  const portalTarget = frameEl || (typeof document !== 'undefined' ? document.body : null);
  if (!portalTarget) return null;
  const backdropPosition = frameEl ? 'fixed sm:absolute' : 'fixed';

  const isInkDark = holdState === 'complete' || (holdState === 'holding' && progress >= 0.85);
  const fillWidth = holdState === 'complete'
    ? '116%'
    : holdState === 'holding'
    ? `${Math.round(progress * 116)}%`
    : showTapHint
    ? '28%'
    : '0%';
  const fillOpacity = holdState === 'complete'
    ? 1
    : holdState === 'holding'
    ? Math.min(1, 0.28 + progress * 0.85)
    : showTapHint
    ? 0.9
    : 0;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="opal-hold-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            if (!completedRef.current) onClose();
          }}
          className={`${backdropPosition} inset-0 z-[120] flex items-end justify-center p-3 pb-[calc(14px+env(safe-area-inset-bottom))] bg-black/65 backdrop-blur-md`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="opal-sheet-title"
        >
          <motion.div
            key="opal-hold-sheet"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="wt-opal-sheet w-full max-w-[360px] rounded-card p-5 flex flex-col items-center text-center"
          >
            <div className="w-8 h-1 rounded-full mb-3 wt-opal-sheet-handle" aria-hidden="true" />

            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3 wt-opal-sheet-icon">
              <AnimatedTrash
                size={18}
                isConfirming={holdState === 'holding' && progress > 0.25}
                openProgress={progress}
              />
            </div>

            <h3 id="opal-sheet-title" className="text-base font-black tracking-tight">
              {t(title)}
            </h3>
            <p className="text-xs mt-1 leading-snug max-w-[270px] wt-opal-sheet-sub">
              {t(subtitle)}
            </p>

            <button
              id="opal-sheet-hold-btn"
              type="button"
              data-hold-state={holdState}
              onPointerDown={handlePointerDown}
              onPointerUp={() => cancelHold(true)}
              onPointerCancel={() => cancelHold(false)}
              onContextMenu={(e) => e.preventDefault()}
              className={`wt-opal-btn w-full h-12 rounded-full flex items-center justify-center mt-4 transition-transform active:scale-[0.985] ${
                holdState === 'holding' ? 'is-active-hold' : ''
              } ${isInkDark ? 'is-ink-dark' : ''}`}
            >
              <div
                className={`wt-opal-fill ${holdState === 'complete' ? 'is-complete' : ''}`}
                aria-hidden="true"
                style={{
                  width: fillWidth,
                  opacity: fillOpacity,
                }}
              >
                <div className="wt-opal-halo" />
                <div className="wt-opal-core" />
              </div>
              <div
                className={`wt-opal-finish ${holdState === 'complete' ? 'is-complete' : ''}`}
                aria-hidden="true"
              />
              <span className="relative z-10 flex items-center justify-center gap-2 text-sm font-black tracking-tight">
                {holdState === 'complete' ? (
                  <>
                    <Check size={16} strokeWidth={2.5} />
                    <span>{t('Done')}</span>
                  </>
                ) : holdState === 'holding' ? (
                  t('Keep Holding...')
                ) : showTapHint ? (
                  t('Hold to Confirm')
                ) : (
                  t(holdLabel)
                )}
              </span>
            </button>

            <button
              id="opal-sheet-cancel-btn"
              type="button"
              disabled={holdState === 'complete'}
              onClick={() => {
                haptic?.(5);
                onClose();
              }}
              className="mt-2 h-9 px-5 rounded-full text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 wt-opal-sheet-cancel"
            >
              {t(cancelLabel)}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalTarget
  );
};
