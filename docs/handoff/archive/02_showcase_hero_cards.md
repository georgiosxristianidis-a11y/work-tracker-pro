# TASK CARD 02: Showcase Hero Cards (Precision Obsidian UI)
- **Status**: Completed & Verified
- **Target Files**: `src/components/ShowcaseHeroCard.tsx`, `src/components/HomeScreen.tsx`, `src/index.css`
- **Priority**: #2 (Showcase & Dashboard Focus Pillar)

## Core Objectives
1. Precision Obsidian & Cyber-Biomorphic card architecture inspired by high-end pro tools (Linear, Raycast).
2. Sub-pixel 1px hairline borders (`border-[var(--b)]`) with subtle depth layering and ambient luminescence.
3. 4-step workflow carousel (`01 / 04`) with vertical `< >` pill-stack and animated progress gauge.
4. Conjoined Split-Action CTA buttons (label + icon trigger) linked directly to core store actions.
5. Lightweight procedural glowing mesh orb via CSS/SVG + `motion/react` (0 KB external 3D bundle overhead).
6. Full synergy with `.indigo`, `.dark`, and `.light` themes, maintaining daylight high-contrast numbers.

## Definition of Done (DoD)
- [x] Responsive layout adapted to mobile PWA frame (#frame max-height 852px)
- [x] Minimum 44px touch targets on all interactive controls
- [x] TypeScript strict: `npm run lint` -> 0 errors
- [x] Machine Gatekeeper: `node scripts/gate.cjs` -> exit code 0
- [x] Zero regressions in existing shift tracking and analytics flows
