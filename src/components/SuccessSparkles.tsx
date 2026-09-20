import { useEffect, useRef } from 'react';
import { createCelebration, hexToGL } from '../lib/particle-celebration';
import type { CelebrationHandle } from '../lib/particle-celebration';

/**
 * GPU-accelerated particle morph celebration.
 * Particles assemble from chaos into ✓, then disperse.
 * Respects `prefers-reduced-motion`. Fully disposes WebGL after animation.
 */
interface SuccessSparklesProps {
  active: boolean;
  glyph?: string;
  count?: number;
  duration?: number;
}

export const SuccessSparkles = ({
  active,
  glyph = '✓',
  count = 1200,
  duration = 1500,
}: SuccessSparklesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<CelebrationHandle | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect reduced motion preference
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    // Read accent color from current theme
    const accent = getComputedStyle(canvas).getPropertyValue('--a').trim();
    const color = hexToGL(accent || '#d4af37');

    // Size canvas for device pixel ratio
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const celebration = createCelebration(canvas, {
      glyph,
      color,
      count,
      duration,
    });

    if (celebration) {
      handleRef.current = celebration;
      celebration.start();
    }

    return () => {
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  );
};
