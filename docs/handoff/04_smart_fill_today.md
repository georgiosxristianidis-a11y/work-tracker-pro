# TASK CARD 04: Smart Fill to Today Preset
- **Status**: Completed
- **Target Files**: `src/hooks/useQuickFill.ts`, `src/components/QuickFillModal.tsx`, `src/components/CalendarScreen.tsx`, `src/App.tsx`, `src/hooks/useTranslation.ts`
- **Priority**: #4

## Core Objectives
1. Add dedicated "Fill 1st to Today" preset action (e.g., Oct 1–10).
2. Skip weekends automatically while respecting user custom shifts.
3. Guarantee future days remain unlogged and clean.
4. Integrate 1-tap Undo notification with shift count badge.
5. Provide instant preview counter before applying changes.

## Definition of Done (DoD)
- [x] Correctly populates 1st to current date without touching future days
- [x] TypeScript strict: `npm run lint` -> 0 errors
- [x] Machine Gatekeeper: `npm run gate` -> exit code 0
- [x] Full reversibility via Undo toast (with instant `await loadEntries()` reload)
