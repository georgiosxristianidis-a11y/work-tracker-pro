# TASK CARD 07: Safe Particle Celebration VFX & Polish (FX-3, FX-4, FX-5)
- **Status**: Completed & Verified
- **Target Files**: `src/lib/particle-celebration.ts`, `src/hooks/useCelebration.ts`, `src/components/SuccessSparkles.tsx`
- **Priority**: Medium (Visual Polish & Mobile Performance)

## Core Objectives
1. **Theme-Aware Additive Glow (FX-3)**: Enable `gl.blendFunc(gl.SRC_ALPHA, gl.ONE)` strictly in Dark and Indigo themes; use standard alpha in Light theme to avoid washout/clipping on white backgrounds.
2. **Zero-Division Safe Dispersion Burst (FX-4)**: Stable glyph lock window (0.45..0.82), outward radial impulse + subtle gravity drop at exit (`uProgress > 0.80`), zero-division guarded (`len > 0.001 ? pos / len : aRandom`).
3. **Safe Tactile Pulse (FX-5)**: Safe `triggerHaptic` check with `'vibrate' in navigator` and `settings.hapticEnabled` check. Zero unconsented audio / Web Audio leaks.

## Definition of Done (DoD)
- [x] Particles glow in Dark/Indigo without washing out in Light theme
- [x] Glyph stays visible for ~550ms before kinetic spark dispersion
- [x] TypeScript strict: `npm run lint` -> 0 errors
- [x] Machine Gatekeeper: `npm run gate` -> exit code 0
