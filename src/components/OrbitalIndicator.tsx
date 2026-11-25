import React, { useContext, useEffect, useRef, useState } from 'react';
import { MotionConfigContext } from 'motion/react';

export interface OrbitalIndicatorProps {
  /** Size in pixels (default 24) */
  size?: number;
  /** Dot count (default 10 for pure minimalist celestial look) */
  dotCount?: number;
  /** Primary accent color or CSS variable (default 'currentColor') */
  color?: string;
  /** Rotation speed multiplier (default 0.2 for calm ambient drift) */
  speed?: number;
  className?: string;
  /** Enable tap/click direction reversal (default true) */
  interactive?: boolean;
  onDirectionChange?: (dir: 'cw' | 'ccw') => void;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Minimalist Apple-grade 3D Constellation Indicator.
 * Supports smooth speed tuning and click/tap rotation direction reversal.
 */
export const OrbitalIndicator: React.FC<OrbitalIndicatorProps> = ({
  size = 24,
  dotCount = 10,
  color = 'currentColor',
  speed = 0.2,
  className = '',
  interactive = true,
  onDirectionChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dirRef = useRef<1 | -1>(1);
  const boostRef = useRef<number>(0);
  const [dir, setDir] = useState<'cw' | 'ccw'>('cw');
  const motionConfig = useContext(MotionConfigContext);
  const forceReducedMotion = motionConfig.reducedMotion === 'always';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = forceReducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    const points: Point3D[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < dotCount; i++) {
      const y = 1 - (i / (dotCount - 1 || 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      points.push({ x, y, z });
    }

    let angleY = 0;
    let animId = 0;

    const radius = (size * 0.4) * dpr;
    const centerX = (size / 2) * dpr;
    const centerY = (size / 2) * dpr;
    const tiltX = 0.35;

    let fillStyle = 'white';
    const resolveFillStyle = () => {
      try {
        const styles = getComputedStyle(canvas);
        const tokenT1 = styles.getPropertyValue('--t1').trim();
        if (tokenT1) fillStyle = tokenT1;
        if (color.startsWith('var(')) {
          const varName = color.slice(4, -1).trim();
          const computed = styles.getPropertyValue(varName).trim();
          if (computed) fillStyle = computed;
        } else if (color !== 'currentColor') {
          fillStyle = color;
        } else {
          const computedColor = styles.color;
          if (computedColor) fillStyle = computedColor;
        }
      } catch {
        fillStyle = 'white';
      }
    };
    resolveFillStyle();

    const cosTilt = Math.cos(tiltX);
    const sinTilt = Math.sin(tiltX);

    const render = () => {
      animId = 0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!prefersReducedMotion) {
        boostRef.current *= 0.92;
        if (boostRef.current < 0.0002) boostRef.current = 0;
        angleY += dirRef.current * (0.009 * speed + boostRef.current);
      }

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const transformed = points.map(p => {
        // Rotate around Y
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.z * cosY + p.x * sinY;

        // Apply fixed tilt on X
        const y2 = p.y * cosTilt - z1 * sinTilt;
        const z2 = z1 * cosTilt + p.y * sinTilt;

        return {
          px: centerX + x1 * radius,
          py: centerY + y2 * radius,
          z: z2
        };
      });

      // Sort back-to-front
      transformed.sort((a, b) => a.z - b.z);

      ctx.fillStyle = fillStyle;

      for (let i = 0; i < transformed.length; i++) {
        const pt = transformed[i];
        const depthNorm = (pt.z + 1) / 2; // 0 to 1
        const alpha = 0.15 + depthNorm * 0.75;
        const dotRadius = (0.9 + depthNorm * 1.1) * dpr;

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion && !document.hidden) {
        animId = requestAnimationFrame(render);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = 0;
        }
      } else if (!prefersReducedMotion && !animId) {
        animId = requestAnimationFrame(render);
      }
    };

    const themeObserver = new MutationObserver(() => {
      resolveFillStyle();
      if (prefersReducedMotion) render();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    render();

    return () => {
      themeObserver.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [size, dotCount, color, speed, forceReducedMotion]);

  const handleToggleDirection = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    e.stopPropagation();
    const nextDirNum: 1 | -1 = dirRef.current === 1 ? -1 : 1;
    dirRef.current = nextDirNum;
    boostRef.current = 0.032;
    const nextDir: 'cw' | 'ccw' = nextDirNum === 1 ? 'cw' : 'ccw';
    setDir(nextDir);
    onDirectionChange?.(nextDir);
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={interactive ? handleToggleDirection : undefined}
      data-orbital=""
      data-dir={dir}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        touchAction: interactive ? 'manipulation' : undefined,
      }}
      className={`inline-block shrink-0 select-none ${
        interactive ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'
      } ${className}`}
      aria-label={interactive ? 'Orbital indicator — tap to reverse rotation' : undefined}
      aria-hidden={interactive ? undefined : true}
    />
  );
};
