# AGENTS.md

**Project:** S4TK CLI basic Merger  
**Scope of this doc:** Operating manual for AI coding agents (Codex/Cursor/Windsurf/Copilot) working on this repo.  
**Authoritative Plan:** Agents must obey the implementation plan in `Core-Design-Document.md` (rev listed within). No unsanctioned feature work.

---

## 0) Prime Directives (Read First)
1. **Determinism > cleverness.** Given the same inputs/config, outputs must be byte‑for‑byte identical.
2. **Safety defaults.** Deny-by-default for domain logic; avoid risky I/O patterns. Writes must be crash‑safe and atomic as specified in the plan.
3. **Small PRs.** One module or task card per PR. Keep diffs surgical, tested, and documented.
4. **No scope creep.** If a task card doesn’t authorize domain logic, do not add it. Leave TODOs with links to the next task card.
5. **Cross‑platform.** Windows/macOS/Linux supported. Normalize path handling, line endings, encodings.

---

## 1) Roles & Ownership (basic Merger)
Each agent works only within its assigned module(s). Do not edit files owned by other modules without coordination. The module layout mirrors `Core-Design-Document.md` §5.

| Module | Primary Files | Summary of Responsibilities |
|---|---|---|
| CLI Subcommand | `src/cli-basic.ts` | Register `basic` subcommand + flags; validate flag combinations. |
| Orchestrator | `src/basic/main.ts` | Collect → order → plan → dry‑run/merge; coordinates submodules. |
| Scanner | `src/basic/scanner.ts` | Expand `--files`, enumerate `--in` recursively for `*.package`; ignore hidden/temp; de‑dupe; stable sort by `path|name|mtime`. |
| Planner | `src/basic/plan.ts` | Map inputs → outputs (single `--out` or `--by-folder` → `<out-root>/<group>.package`). |
| Merger | `src/basic/merge.ts` | Append‑all using S4TK; handle `--max-size` rollover; crash‑safe temp write + atomic rename. |
| Verify | `src/basic/verify.ts` | Optional reopen/sanity checks (counts; basic invariants). |
| Manifests | `src/basic/manifest.ts` | Emit per‑output YAML manifest and optional run‑level changelog. |
| Changelog | `src/basic/changelog.ts` | Optional run‑level YAML (skipped with `--no-changelog`). |
| Stats | `src/basic/stats.ts` | Optional counts/timings to JSON. |
| Utilities | `src/util/fsx.ts`, `src/util/determinism.ts` | Temp files, fsync, atomic rename; stable compares and path normalization. |

---

## 2) File Ownership & Boundaries
- **CLI & Orchestrator** (`src/cli-basic.ts`, `src/basic/main.ts`): Owns argument parsing, validation, and invoking the basic‑merge pipeline. Keep CLI minimal; orchestration composes pure functions where possible.
- **basic Modules** (`src/basic/*`): Implement the append‑all flow. Side‑effects are isolated in merger and filesystem utilities.
- **Utilities** (`src/util/*`): Generic helpers for determinism and safe I/O. No domain semantics.
- **Tests** (`test/*`): Each module has a matching test file; add fixtures as needed (no network; no real `.package` files unless explicitly allowed by task).

---

## 3) Coding Standards
- **TypeScript strict mode.** No `any` unless justified by a TODO with a matching task card.
- **ESM first** with CJS build via `tsup`. Preserve CLI shebang.
- **Functional composition.** Pure functions for planning/reporting; side‑effects isolated.
- **Deterministic ordering.** All collections sorted with `stableCompare` before use.
- **Logging**: Use `pino` when logging is introduced; in skeleton stages, prefer `console.log` only in CLI.

---

## 4) Test Policy
- Use **Vitest**. Keep tests fast and hermetic (no network, no real packages).
- Provide at least one negative test per module (bad inputs).
- Determinism tests must assert order stability across mixed case/diacritics.
- CI matrix: ubuntu, windows, macOS on Node 20.

---

## 5) Commit & PR Checklist (Agent must self‑certify)
- [ ] Only files listed in your task card are changed.
- [ ] `npm run check` passes locally (lint, build, test).
- [ ] New/changed code has tests.
- [ ] No domain dependencies added (esp. `@s4tk/models`) unless your task card permits.
- [ ] No FS reads/writes beyond allowed scope.
- [ ] README or inline docs updated if user‑visible behavior changed.

---

## 6) Task Cards (Authoritative Extract)
Use these verbatim. If a task is not here, it is **out of scope** for current work. See details and acceptance criteria in `Core-Design-Document.md` §7.

### TaskCard: CLI Subcommand (7.1)
**Goal:** Wire `basic` subcommand and flags; validate flag combinations.  
**Files:** `src/cli-basic.ts`.  
**Notes:** Keep CLI free of business logic; delegate to orchestrator.

### TaskCard: Scanner (7.2)
**Goal:** Expand `--files`, enumerate `--in` recursively for `*.package`; ignore hidden/temp; de‑dupe; stable sort by `path|name|mtime`.  
**Files:** `src/basic/scanner.ts`.  
**Tests:** Mixed‑case/diacritics; Windows long paths.

### TaskCard: Planner (7.3)
**Goal:** Map inputs → outputs (single `--out` or `--by-folder` → `<out-root>/<group>.package`).  
**Files:** `src/basic/plan.ts`.  
**Tests:** Deterministic grouping and output naming.

### TaskCard: Merger + Verify (7.4)
**Goal:** Append‑all using S4TK. Implement size cap (`--max-size`) and optional `--verify` (resource count match; type histogram log).  
**Files:** `src/basic/merge.ts`, `src/basic/verify.ts`, `src/core/s4tk.ts` (adapter).  
**Constraints:** Crash‑safe temp writes, fsync, atomic rename.

### TaskCard: Manifests & Changelog (7.5)
**Goal:** Emit per‑output YAML manifest and optional run‑level changelog.  
**Files:** `src/basic/manifest.ts`, `src/basic/changelog.ts`.  
**Tests:** Schema adherence per §3.1.

### TaskCard: Stats (optional) (7.6)
**Goal:** Emit counts/timings to JSON when requested.  
**Files:** `src/basic/stats.ts`.  
**Tests:** Predictable numeric formatting.

### TaskCard: Progress & UX (7.7)
**Goal:** Implement `--progress` output; quiet/TTY‑aware logs.  
**Files:** `src/basic/main.ts` (or dedicated progress helper).  
**Tests:** Smoke tests; no timing assertions.

---

## 7) Communication Protocol (for multi‑agent runs)
1. **Propose → Commit → Verify** loop per task card.  
2. Each agent posts a short status in PR description: *Scope, Risks, Tests added, Rollback plan.*  
3. If blocked by another module, place a **contract** (interface/types) in `src/types.ts` and proceed with mocks.

---

## 8) Risk Flags & Escalation
Raise a **BLOCKER** label in PR if any of the following appear:
- Non‑deterministic behavior across OSes (path separators, case sensitivity, mtime semantics).
- Any unsafe write paths (non‑atomic rename, missing fsync) or potential for truncated finals.
- CI timing out or test order dependence.

Mitigation path: cut scope, add adapters, or gate with env flags.

---

## 9) Style Guide (essentials)
- Filenames: `kebab-case`. Exports: named where possible.
- No default exports except React (not used here).  
- Avoid global state; prefer passing explicit params.
- Throw `Error` with clear, non‑localized messages; error codes TBD later.

---

## 10) Roadmap Hand‑off
Post basic‑merge, future tracks may include: policy engine, conflict resolver, intelligent dedupe, advanced reports, and writer enhancements. Each will arrive as a **separate** task card + PR and may replace or extend modules listed above.

---

## 11) Glossary
- **TGI**: Type–Group–Instance, unique resource identity key within Sims packages.
- **Bucket**: A logical group of input packages merged into one output `.package` (or rolled parts).
- **Dry‑run**: Full analysis with no writes; produces reports only.

---

**End of AGENTS.md**

