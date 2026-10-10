# TASK CARD 01: Analytics & Charts Elite Redesign
- **Status**: Ready for Execution
- **Target Files**: `src/components/AnalyticsScreen.tsx`, `src/components/AnalyticsChart.tsx`
- **Priority**: #1 (Core Product Pillar)

## Core Objectives
1. Modernize Recharts visual aesthetics to Apple Health / Fitness standard.
2. Fluid area/bar curves with elegant gradient fills (`var(--a)`).
3. Stable touch tooltips with zero layout shift on finger drag.
4. Daylight high-contrast KPI cards: Monthly Projection, Hourly Dynamics, Average Shift.
5. Strict `tabular-nums` alignment for monetary and duration metrics.

## Definition of Done (DoD)
- [ ] Fluid interaction on mobile viewport (390x844)
- [ ] TypeScript strict: `npm run lint` -> 0 errors
- [ ] Machine Gatekeeper: `npm run gate` -> exit code 0
- [ ] Lighthouse Performance >= 95
