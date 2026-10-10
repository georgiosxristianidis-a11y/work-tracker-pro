# TASK CARD 04: Smart Fill to Today Preset
- **Status**: Queued
- **Target Files**: `src/hooks/useQuickFill.ts`, `src/components/QuickFillModal.tsx`, `src/components/CalendarScreen.tsx`
- **Priority**: #4

## Core Objectives
1. Add dedicated "Fill 1st to Today" preset action (e.g., Oct 1–10).
2. Skip weekends automatically while respecting user custom shifts.
3. Guarantee future days remain unlogged and clean.
4. Integrate 1-tap Undo notification with shift count badge.
5. Provide instant preview counter before applying changes.

## Definition of Done (DoD)
- [ ] Correctly populates 1st to current date without touching future days
- [ ] TypeScript strict: `npm run lint` -> 0 errors
- [ ] Machine Gatekeeper: `npm run gate` -> exit code 0
- [ ] Full reversibility via Undo toast
