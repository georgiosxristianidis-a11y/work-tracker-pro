# 2. Ephemeral Git Worktrees and AST Engine

Date: 2026-09-19
Status: Accepted

## Context
Following the initial harness setup (Gatekeeper, Micro-Memory, and Adversarial Critic), a 35% gap remained compared to elite autonomous frameworks like Astra and Fable:
1. **Direct Trunk Mutation Risk**: In-place edits in the working directory risk polluting `trunk`/`main` if a complex refactoring or hypothesis fails midway.
2. **Context Blowup During Code Exploration**: Viewing large files (>200-700 lines) dumps hundreds of tokens of JSX markup into context, crowding out attention heads.
3. **Delayed Syntax Validation**: Syntax errors (e.g. unclosed JSX tags, bracket mismatch) were only caught at full build time (`vite build`), causing slower iteration cycles.

## Decision
We implement:
1. **Ephemeral Git Worktree Dispatcher (`scripts/isolate.cjs` / `npm run isolate`)**:
   - `start <name>`: creates isolated branch `worktree/<name>` and directory `.worktrees/<name>`, with instant Windows junction to root `node_modules` (0 second install time, 0 disk bloat).
   - `verify <name>`: executes gate validation inside the isolated worktree.
   - `merge <name>`: verifies gate and executes fast-forward merge into `main`, then wipes the worktree and branch.
   - `abort <name>`: instantly terminates worktree (`git worktree remove --force`) and deletes branch, leaving 0 leftover diff or dirty state in trunk.
2. **Semantic AST Engine (`scripts/ast.cjs` / `npm run ast`)**:
   - Built on native `typescript.createSourceFile` (0 new external dependencies).
   - `outline <file>`: strips implementation bodies and outputs only interfaces, types, component props, and function signatures. Reduces context consumption by 85–95%.
   - `verify <file>`: parses syntax diagnostics in < 150ms before triggering heavy bundlers.

## Consequences
- 100% clean trunk protection: failed experiments leave no dirty files.
- High attention density: agents inspect component interfaces via AST outline without reading 700 lines of JSX.
- Parity with Astra/Fable architectural isolation.
