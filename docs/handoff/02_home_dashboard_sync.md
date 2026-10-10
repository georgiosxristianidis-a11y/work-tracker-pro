# TASK CARD 02: Home Dashboard Elite Rhythm & Metrics Sync
- **Status**: Queued
- **Target Files**: `src/components/HomeScreen.tsx`, `src/components/MetricCard.tsx`
- **Priority**: #2

## Core Objectives
1. Synchronize card radiuses and vertical rhythm (`space-y-7`) to match Calendar standards.
2. Elevate Worked Days metric visibility to equal parity with earnings and hours.
3. Strict `tabular-nums` on all counter values, rolling numbers, and progress labels.
4. High-contrast typography hierarchy without washed-out opacity layers.
5. Smooth pull-to-refresh / touch scroll physics without jank.

## Definition of Done (DoD)
- [ ] Mobile viewport audit (390x844)
- [ ] TypeScript strict: `npm run lint` -> 0 errors
- [ ] Machine Gatekeeper: `npm run gate` -> exit code 0
- [ ] Zero layout shift during counter transitions
