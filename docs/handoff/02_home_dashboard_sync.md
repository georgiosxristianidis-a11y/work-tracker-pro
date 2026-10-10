# TASK CARD 02: Home Dashboard Elite Rhythm & Metrics Sync
- **Status**: Completed & Verified
- **Target Files**: `src/components/HomeScreen.tsx`, `src/components/DashboardWidgets.tsx`
- **Priority**: #2

## Core Objectives
1. Synchronize card radiuses and vertical rhythm (`space-y-6`) to match Calendar standards.
2. Elevate Worked Days metric visibility to equal parity with earnings and hours in Monthly Summary.
3. Strict `tabular-nums` on all counter values, rolling numbers, and progress labels.
4. High-contrast typography hierarchy without washed-out opacity layers (`opacity-60` removed).
5. Smooth pull-to-refresh / touch scroll physics without jank.

## Definition of Done (DoD)
- [x] Mobile viewport audit (390x844): balanced 3-column Monthly Summary (Earnings • Hours • Days)
- [x] TypeScript strict: `npm run lint` -> 0 errors
- [x] Machine Gatekeeper: `npm run gate` -> exit code 0
- [x] Zero layout shift during counter transitions
