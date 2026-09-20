# 3. Cursor Architecture Integration: Glob-Rules, LSP Pre-Flight, Topological Order

Date: 2026-09-19
Status: Accepted

## Context
Cursor achieved industry-leading speed and correctness not merely through prompt engineering, but through specific architectural patterns:
1. **Context Bloat from Monolithic Rules**: A single large rules file pollutes context for unrelated tasks (e.g. CSS rules active while editing DB hooks).
2. **Slow Compiler Feedback Loops**: Waiting for a full Vite/Rollup build cycle to catch a single typo in a file slows agent iteration.
3. **Chaotic Multi-File Edits**: Modifying consumer components before defining required types in provider files causes cascading compiler errors and confuses LLMs.

## Decision
We implement 3 core Cursor-inspired architecture components:

1. **Glob-Scoped Rules (`.agents/rules/*.mdc`)**:
   - `ui.mdc`: applies strictly to `src/components/**/*.tsx` (design tokens, Framer Motion safety with `initial={false}`, strict props).
   - `state.mdc`: applies to `src/store/**`, `src/hooks/**`, `src/lib/**` (separation of logic from DOM, offline-first, idempotent delta sync).
   - `perf.mdc`: applies to `src/**/*.ts*` (useMemo, useCallback, bounded cache keys).

2. **In-Memory LSP Pre-Flight (`scripts/ast.cjs check <file>`)**:
   - Built on TypeScript Compiler API `ts.createProgram`.
   - Validates syntactical and semantic type safety for specific files in < 200 ms with ambient typing awareness.
   - Eliminates waiting for heavy bundlers to verify a localized change.

3. **Topological Ordering (`scripts/ast.cjs order <files...>`)**:
   - Computes DAG (Directed Acyclic Graph) of AST imports across candidate files.
   - Ensures bottom-up modification order: Types & Constants -> Stores & Hooks -> UI Components -> Tests.

## Consequences
- High-density, targeted context per task.
- Sub-second type diagnostics without running full builds.
- Deterministic, error-free multi-file feature development.
