# Design System Upgrade Plan (Phase Checklist)

This document outlines a structured, phased approach to auditing, standardizing, and upgrading our current design system. The goal is to move away from isolated, chaotic visual decisions (like mixing solid flat design with one-off glassmorphism) to a mature, predictable, and highly professional UI language, while maintaining 100% functional stability.

## 目 Phase 1: Audit & Analysis (Current State)
_Goal: Identify inconsistencies and establish a baseline._
- [x] **Color System Review**: Map all current CSS variables (`--bg`, `--t1`, `--a`, etc.) across all themes (Light, Dark, Indigo). Identify missing shades or redundant colors.
- [x] **Typography Audit**: Document all font sizes, weights, and tracking (`tracking-widest`, `tracking-tighter`). Ensure logical progression and consistent pairings (Epilogue).
- [x] **Layout & Spacing Check**: Analyze padding, margins, and border radii (currently heavily using `rounded-[2rem]`, `rounded-[14px]`). Check for arbitrary values.
- [x] **Component Inventory**: Review Buttons, Cards, Inputs, Modals, and Navigation for visual consistency (hover states, active states, borders).
- [x] **Accessibility & UX**: Evaluate contrast ratios, touch target sizes (minimum 44px for mobile), and focus rings.

## 🛠 Phase 2: Consolidation & Standardization (Foundation)
_Goal: Define the strict visual rules and update the core infrastructure._
- [x] **Unified Visual Language**: Decide firmly on the aesthetic direction (e.g., "Solid & Elevated" vs "Neumorphic" vs "Flat & Minimal"). *Recommendation: Stick to Solid & Elevated (clean backgrounds, subtle borders, intentional drop shadows) to ensure high performance and readability. Remove one-off glassmorphism.*
- [x] **Token Standardization**: Refine `index.css` to include a scalable token system. Use consistent naming conventions.
- [x] **Tailwind Config Extension**: Move arbitrary values (e.g., `text-[10px]`, `rounded-[2rem]`) into standard Tailwind config extensions for reusability and semantic meaning.
- [x] **Animation & Motion Guidelines**: Standardize Framer Motion transitions (duration, stiffness, damping) to ensure all micro-interactions feel cohesive and snappy, not sluggish or disconnected.

## 🏗 Phase 3: Component Refactoring (Execution)
_Goal: Apply the standardized foundation to the codebase incrementally._
- [x] **Refactor Core Primitives**: Update low-level components (Buttons, Toggles, Icons) to use the new standardized tokens.
- [x] **Update Complex Layouts**: Refactor Cards (e.g., `HomeScreen`, `SettingsScreen`) to ensure padding, borders, and shadows align with the unified visual language.
- [x] **Standardize Modals & Drawers**: Ensure `QuickFillModal` and other overlays use consistent backdrops and entrance/exit animations.
- [x] **Refine Empty States**: Polish the Zero States (e.g., AnimatedZero/Rocket) to ensure they feel premium and purposeful without being overly playful if the tone is professional.

## 🧪 Phase 4: Quality Assurance & Testing (Validation)
_Goal: Ensure the upgrade did not introduce regressions._
- [x] **E2E Visual Testing**: Run Playwright test suites (`npx playwright test`) to ensure structural integrity.
- [x] **Cross-Theme Verification**: Test Light, Dark, and Indigo modes to ensure contrast and token mapping work perfectly across all components.
- [x] **Responsive & Touch Validation**: Test on mobile viewports to confirm touch targets are easily clickable and layouts do not break or overflow.
- [x] **Performance Profiling**: Ensure the CSS changes (like removing heavy `backdrop-blur`) improve or maintain high render performance.

## 📚 Phase 5: Documentation & Governance (Future-proofing)
_Goal: Maintain the standard for all future development._
- [x] **Design Principles Document**: Create a short internal guideline (e.g., `DESIGN_GUIDELINES.md`) detailing the strict dos and don'ts (e.g., "No emojis", "No arbitrary border radii").
- [x] **Component Templates**: Establish clear code examples for creating new views or components to prevent future style fragmentation.
- [x] **Code Review Standards**: Enforce design system compliance during code reviews (no inline styles, no new random colors).
