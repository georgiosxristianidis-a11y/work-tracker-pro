# TASK CARD 03: Dark & Indigo Palette Deep Polish (WCAG AA)
- **Status**: Queued
- **Target Files**: `src/index.css`, `src/components/CalendarScreen.tsx`, `src/components/HomeScreen.tsx`
- **Priority**: #3

## Core Objectives
1. Full WCAG AA contrast audit across Dark (`.dark`) and Indigo (`.indigo`) themes.
2. Calibrate amber overtime bars (`#f59e0b` / `var(--a)`) against dark backdrops.
3. Verify half-sheet preset buttons, touch highlights, and focus rings.
4. Ensure Saturday/Sunday cells remain distinguishable from active workdays without eye strain.
5. Guarantee semantic color integrity (`--green`, `--t3`, `--border`) in all themes.

## Definition of Done (DoD)
- [ ] WCAG AA compliance across Light, Dark, Indigo themes
- [ ] TypeScript strict: `npm run lint` -> 0 errors
- [ ] Machine Gatekeeper: `npm run gate` -> exit code 0
- [ ] Lighthouse Accessibility score >= 98
