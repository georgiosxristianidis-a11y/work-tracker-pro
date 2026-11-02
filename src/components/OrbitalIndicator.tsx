import React, { useEffect, useRef } from 'react';

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
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Minimalist Apple-grade 3D Constellation Indicator.
 * Renders an ultra-slow, ambient celestial orbit with 10 subtle micro-dots.
 * Pure calmness, zero distraction, 120fps hardware acceleration.
 */
export const OrbitalIndicator: React.FC<OrbitalIndicatorProps> = ({
  size = 24,
  dotCount = 10,
  color = 'currentColor',
  speed = 0.2,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    // Fibonacci Sphere points: perfectly balanced minimalist distribution
    const points: Point3D[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for (let i = 0; i < dotCount; i++) {
      const y = 1 - (i / (dotCount - 1 || 1)) * 2;
      const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = phi * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      points.push({ x, y, z });
    }

    let angleY = 0;
    let animId: number;

    const radius = (size * 0.4) * dpr;
    const centerX = (size / 2) * dpr;
    const centerY = (size / 2) * dpr;
    const tiltX = 0.35; // Fixed elegant tilt

    let fillStyle = '#ffffff';
    try {
      if (color.startsWith('var(')) {
        const varName = color.slice(4, -1).trim();
        const computed = getComputedStyle(canvas).getPropertyValue(varName).trim();
        if (computed) fillStyle = computed;
      } else if (color !== 'currentColor') {
        fillStyle = color;
      } else {
        const computedColor = getComputedStyle(canvas).color;
        if (computedColor) fillStyle = computedColor;
      }
    } catch {
      fillStyle = '#ffffff';
    }

    const cosTilt = Math.cos(tiltX);
    const sinTilt = Math.sin(tiltX);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!prefersReducedMotion) {
        // Very slow, meditative ambient drift
        angleY += 0.005 * speed;
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

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [size, dotCount, color, speed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={`inline-block shrink-0 select-none pointer-events-none ${className}`}
      aria-hidden="true"
    />
  );
};
