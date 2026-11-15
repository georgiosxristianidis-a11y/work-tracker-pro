import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flame, Rocket } from 'lucide-react';

interface AnimatedZeroProps {
  type: 'earnings' | 'hours';
  t: (k: string) => string;
  onClick?: () => void;
}

const COIL_MS = 440;

export const AnimatedZero = ({ type, t, onClick }: AnimatedZeroProps) => {
  const [rocketState, setRocketState] = useState<'idle' | 'charging' | 'launching'>('idle');
  const pillRef = useRef<HTMLDivElement | null>(null);
  const launchRef = useRef<HTMLSpanElement | null>(null);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const holdingRef = useRef(false);
  const timerIdsRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timerIdsRef.current) window.clearTimeout(id);
    timerIdsRef.current = [];
  }, []);

  const resetVisuals = useCallback(() => {
    holdingRef.current = false;
    clearTimers();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (launchRef.current) {
      launchRef.current.style.transition = '';
      launchRef.current.style.transform = '';
    }
    if (labelRef.current) {
      labelRef.current.style.transition = '';
      labelRef.current.style.transform = '';
    }
    if (pillRef.current) {
      pillRef.current.style.transition = '';
      pillRef.current.style.transform = '';
    }
    setRocketState('idle');
  }, [clearTimers]);

  useEffect(() => () => resetVisuals(), [resetVisuals]);

  const fireCatapult = (cx: number, cy: number, cs: number, cr: number) => {
    holdingRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    clearTimers();

    if (launchRef.current) {
      launchRef.current.style.setProperty('--rc-x', `${cx.toFixed(2)}px`);
      launchRef.current.style.setProperty('--rc-y', `${cy.toFixed(2)}px`);
      launchRef.current.style.setProperty('--rc-s', cs.toFixed(3));
      launchRef.current.style.setProperty('--rc-r', `${cr.toFixed(2)}deg`);
      launchRef.current.style.transition = 'none';
      launchRef.current.style.transform = '';
    }
    if (labelRef.current) {
      labelRef.current.style.transition = 'none';
      labelRef.current.style.transform = '';
    }
    if (pillRef.current) {
      pillRef.current.style.transition = 'transform 180ms cubic-bezier(0.22, 1, 0.36, 1)';
      pillRef.current.style.transform = 'scale(1.015)';
    }

    setRocketState('launching');

    const settleId = window.setTimeout(() => {
      if (pillRef.current) pillRef.current.style.transform = 'scale(1)';
    }, 220);

    const navId = window.setTimeout(() => {
      onClick?.();
    }, 460);

    const resetId = window.setTimeout(() => {
      resetVisuals();
    }, 920);

    timerIdsRef.current.push(settleId, navId, resetId);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (rocketState === 'launching') resetVisuals();

    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // Synthetic events without active pointerId skip pointer capture
    }

    holdingRef.current = true;
    startRef.current = performance.now();
    setRocketState('charging');

    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const tick = (now: number) => {
      if (!holdingRef.current) return;
      const elapsed = now - startRef.current;
      const raw = Math.min(1, elapsed / COIL_MS);
      const ease = 1 - Math.pow(1 - raw, 2.15);
      const jitter = (!reducedMotion && raw > 0.55) ? Math.sin(elapsed * 0.09) * 0.65 : 0;

      const cx = -8.5 * ease + jitter;
      const cy = 8.5 * ease - jitter;
      const cs = 1 - 0.16 * ease;
      const cr = -20 * ease;

      if (launchRef.current) {
        launchRef.current.style.transition = 'none';
        launchRef.current.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0) scale(${cs.toFixed(3)}) rotate(${cr.toFixed(2)}deg)`;
      }
      if (labelRef.current) {
        labelRef.current.style.transition = 'none';
        labelRef.current.style.transform = `translate3d(${(-3.5 * ease).toFixed(2)}px, 0, 0)`;
      }
      if (pillRef.current) {
        pillRef.current.style.transition = 'none';
        pillRef.current.style.transform = `scale(${(1 - 0.03 * ease).toFixed(4)})`;
      }

      if (raw >= 1) {
        fireCatapult(cx, cy, cs, cr);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const onRelease = () => {
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      if (!holdingRef.current) return;
      holdingRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      const elapsed = performance.now() - startRef.current;
      const raw = Math.min(1, elapsed / COIL_MS);
      const ease = 1 - Math.pow(1 - raw, 2.15);

      if (elapsed >= 150) {
        fireCatapult(-8.5 * ease, 8.5 * ease, 1 - 0.16 * ease, -20 * ease);
      } else {
        if (launchRef.current) {
          launchRef.current.style.transition = 'transform 105ms cubic-bezier(0.22, 1, 0.36, 1)';
          launchRef.current.style.transform = 'translate3d(-6.5px, 6.5px, 0) scale(0.87) rotate(-16deg)';
        }
        if (labelRef.current) {
          labelRef.current.style.transition = 'transform 105ms cubic-bezier(0.22, 1, 0.36, 1)';
          labelRef.current.style.transform = 'translate3d(-3px, 0, 0)';
        }
        const tapId = window.setTimeout(() => {
          fireCatapult(-6.5, 6.5, 0.87, -16);
        }, 105);
        timerIdsRef.current.push(tapId);
      }
    };

    window.addEventListener('pointerup', onRelease, { once: true });
    window.addEventListener('pointercancel', onRelease, { once: true });
    rafRef.current = requestAnimationFrame(tick);
  };

  const titleText = type === 'earnings' ? t("Time is money!") : t("Start Work");

  return (
    <div
      ref={pillRef}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={titleText}
      data-rocket-state={rocketState}
      onPointerDown={handlePointerDown}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          fireCatapult(-6.5, 6.5, 0.87, -16);
        }
      }}
      className={`flex items-center gap-2.5 h-[42px] px-4 rounded-full apple-glass-pill text-[var(--t1)] shadow-sm relative select-none ${onClick ? 'cursor-pointer pointer-events-auto' : ''}`}
      style={{ touchAction: onClick ? 'none' : 'manipulation', overflow: 'visible' }}
    >
      <span className="relative flex items-center justify-center w-5 h-5" style={{ overflow: 'visible' }}>
        <span
          className={`wt-rocket-exhaust absolute left-0 bottom-0 w-1.5 h-1.5 rounded-full pointer-events-none bg-[var(--a)] ${rocketState === 'launching' ? 'is-launching' : ''}`}
          style={{ opacity: 0 }}
        />
        <span
          className={`wt-rocket-exhaust absolute left-1 bottom-1 w-1 h-1 rounded-full pointer-events-none bg-[var(--t1)] ${rocketState === 'launching' ? 'is-launching' : ''}`}
          style={{ opacity: 0, animationDelay: '45ms' }}
        />
        <span
          ref={launchRef}
          className={`wt-rocket-launch relative inline-flex items-center justify-center text-[var(--a)] ${rocketState === 'launching' ? 'is-catapult' : ''}`}
        >
          <span className={`wt-rocket-float inline-flex items-center justify-center ${rocketState !== 'idle' ? 'is-paused' : ''}`}>
            {type === 'earnings' ? <Flame size={19} strokeWidth={2} /> : <Rocket size={19} strokeWidth={2} />}
          </span>
        </span>
      </span>

      <span className="wt-rocket-track inline-flex items-center overflow-hidden pr-2.5 -mr-2">
        <span
          ref={labelRef}
          className={`wt-rocket-label text-[11px] font-black uppercase tracking-wider text-[var(--t1)] whitespace-nowrap select-none ${rocketState === 'launching' ? 'is-f1-surge' : ''}`}
        >
          {titleText}
        </span>
      </span>
    </div>
  );
};
