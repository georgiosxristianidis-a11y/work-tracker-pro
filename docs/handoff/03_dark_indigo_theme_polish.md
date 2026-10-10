# TASK CARD 03: Dark & Indigo Palette Deep Polish (WCAG AA)
- **Status**: Completed & Verified
- **Target Files**: `src/index.css`, `src/components/CalendarScreen.tsx`
- **Priority**: #3

## Core Objectives
1. Full WCAG AA contrast audit across Dark (`.dark`) and Indigo (`.indigo`) themes.
2. Calibrate `--t2`, `--t3`, and `--danger` against dark and indigo backdrops (>6.5:1 ratio).
3. Verify half-sheet preset buttons, touch highlights, and focus rings.
4. Ensure Saturday/Sunday cells remain distinguishable from active workdays without eye strain (`opacity-75`).
5. Guarantee semantic color integrity (`--green`, `--t3`, `--danger`) in all themes.

## Definition of Done (DoD)
- [x] WCAG AA compliance across Light, Dark, Indigo themes
- [x] TypeScript strict: `npm run lint` -> 0 errors
- [x] Machine Gatekeeper: `npm run gate` -> exit code 0
- [x] High-contrast daylight visibility on weekend cells and KPI badges
