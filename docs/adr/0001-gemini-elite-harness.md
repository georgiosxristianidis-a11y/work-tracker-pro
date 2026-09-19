# 1. Gemini 3.8 Elite Engineering Harness

Date: 2026-09-19
Status: Accepted

## Context
Gemini 3.8 possesses high processing speed, low token costs, and a 1M+ token context window. However, when used as an unconstrained single-agent system, it suffers from:
1. **Context Rot / Attention Drift**: degraded attention on critical constraints when the prompt is cluttered with verbose build logs and huge source files.
2. **Sycophancy & Lazy Diffing**: tendency to take shortcuts (e.g. `// rest of code unchanged`), inaccurate multi-line search/replace, and claiming tasks are completed without verification.
3. **Diff Scope Creep**: modifying peripheral files without machine gates.

## Decision
We implement an in-repo engineering harness ("Exoskeleton") to elevate Gemini 3.8 to elite competitor tier:

1. **Machine Gatekeeper (`scripts/gate.cjs` / `npm run gate`)**:
   - Executes TypeScript check (`tsc --noEmit`), Vite build check (`vite build`), and diff inspection.
   - Restricts diff scope to <= 3 files and <= 80 lines unless explicitly bypassed with `--bypass-diff-limit`.
   - **Terminal Silencer**: Suppresses progress bars and verbose logs. Outputs only 1 line on success (`exit 0`) or targeted root-cause lines on failure (`exit 1`).
2. **Micro-Memory Protocol (`scripts/handoff.cjs` / `npm run handoff`)**:
   - Replaces monolithic handoff docs with auto-generated, idempotent state files in `docs/handoff/current_task.md` (strictly <= 30 lines).
   - Past history archived to `docs/handoff/archive/`.
3. **Adversarial Inquisitor Subagent (`inquisitor`)**:
   - Read-only subagent acting as Devil's Advocate / Auditor. Inspects `git diff` for regressions, dead code, and rule violations before commit.
4. **Negative Guardrails in `AGENTS.md`**:
   - Explicit ban on code placeholders.
   - Mandatory gate check before proposing task completion.
   - Prohibition on viewing whole files > 150 lines without slicing ranges.

## Consequences
- Clean, unpolluted LLM context with high attention density.
- Zero broken builds shipped to main/trunk.
- Fully automated Definition of Done (DoD) verification.
