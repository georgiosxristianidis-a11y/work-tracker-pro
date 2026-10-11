# HANDOFF: 05_calendar_flip_badge
- **Task**: 3D Desk / Tear-off Flip animation for Days badge ("8 days")
- **Status**: COMPLETED & IN PRODUCTION (v0.1.14)
- **Branch**: main
- **Commit**: cd77072 (PR #8) -> 934d27d (v0.1.14)

## Architecture Summary
- **Component**: `src/components/CalendarDaysBadge.tsx`
  - 3D perspective (`[perspective:600px]`), X-axis rotation (`rotateX`), spring physics (`stiffness: 320, damping: 22, mass: 0.8`).
  - Directional flip: downwards/forward on count increment and tap, upwards/backward on decrement.
  - Interactive tap: tactile haptic feedback (`[12, 18]`) + 220ms delay before modal navigation to let the page-flip transition complete smoothly.
  - Design tokens: `var(--bg-1)`, `var(--b)`, `var(--t1)`, `var(--t2)`, `var(--t3)`.
- **Integrations**:
  - `src/components/CalendarScreen.tsx`: Top header Days badge replaced with `CalendarDaysBadge`.
  - `src/components/HomeScreen.tsx`: Top header Days badge replaced with `CalendarDaysBadge`.

## Verification & DoD
- Machine gatekeeper: `npm run gate` -> exit code 0.
- GitHub Actions CI (Lint + Build + Playwright E2E): PASS.
- Production Release: `v0.1.14` deployed on Vercel.
