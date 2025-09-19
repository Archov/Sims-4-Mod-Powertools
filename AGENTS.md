# AGENTS.md

**Project:** S4TK CLI Package Merger  
**Scope of this doc:** Operating manual for AI coding agents (Codex/Cursor/Windsurf/Copilot) working on this repo.  
**Non‑negotiable:** Agents must obey the **Implementation Plan** in `S4TK CLI Package Merger — Implementation Plan` and the **Repo‑Only Skeleton Prompt** when applicable. No unsanctioned feature work.

---

## 0) Prime Directives (Read First)
1. **Determinism > cleverness.** Given the same inputs/config, outputs must be byte‑for‑byte identical.
2. **Safety defaults.** Until the policy engine lands, the code must deny-by-default for domain logic. Skeleton stages must not touch the filesystem except for build/test artifacts.
3. **Small PRs.** One module or task card per PR. Keep diffs surgical, tested, and documented.
4. **No scope creep.** If a task card doesn’t authorize domain logic, do not add it. Leave TODOs with links to the next task card.
5. **Cross‑platform.** Windows/macOS/Linux supported. Normalize path handling, line endings, encodings.

---

## 1) Phase Map → Agents
Each agent works only within its assigned phase(s). Do not edit files owned by other phases without coordination.

| Phase | Agent Role | Primary Files | Summary of Responsibilities |
|---|---|---|---|
| A | **Repo Scaffolder** | `package.json`, `tsconfig*.json`, `.eslintrc.cjs`, `.prettierrc`, `.github/workflows/ci.yml`, `src/cli.ts`, `src/main.ts` | Create TypeScript/Node skeleton. CLI `--help` works. No domain deps. CI green. |
| B | **Inventory & Filtering Author** | `src/core/taxonomy.ts`, `src/core/policy.ts` (stubs), tests | Define placeholder presets and deny‑by‑default stubs. No real types yet. |
| B | **Scanner Author** | `src/core/scanner.ts`, tests | Deterministic discovery of `*.package` **names only**. No reading. |
| B | **Manifest Parser** | `src/core/manifest.ts`, tests, `test/fixtures` | Parse CSV/JSON/YAML and map inputs→buckets. No FS writes. |
| C | **Indexer/Hasher (analysis)** | `src/core/s4tk.ts`, `src/core/hashing.ts` | Gate S4TK spike behind env flag; add streaming SHA1 API (no calls yet). |
| C | **Planner** | `src/core/planner.ts` | Assemble dry‑run plan from scanner + manifest (no writes). |
| D | **Writer (later)** | `src/core/writer.ts` | Stub only in skeleton; real work in post‑skeleton tasks. |
| E | **Reporter** | `src/core/reports.ts` | Emit JSON/CSV dry‑run outputs. |
| E | **Determinism Guardian** | `src/util/determinism.ts`, tests | Provide stable comparers and prove via tests. |
| F | **QA/Perf** | `test/*.test.ts`, CI | Add fixtures, error injections, and perf smoke tests (no timing assertions yet). |

---

## 2) File Ownership & Boundaries
- **CLI & Orchestrator** (`src/cli.ts`, `src/main.ts`): Owns argument parsing, basic validation, and invoking pipeline stubs. It must not import S4TK or touch disk beyond reading flags.
- **Core Modules** (`src/core/*`): Each module exposes pure functions where possible. Side‑effects (I/O) are centralized later in `writer.ts`.
- **Util** (`src/util/*`): Only generic helpers. No domain knowledge.
- **Tests** (`test/*`): Each module has a matching test file.

Agents must not:
- Introduce additional packages without explicit instruction.
- Pull in `@s4tk/models` outside `core/s4tk.ts` (and even there, keep behind `S4TK_ENABLED`).
- Read/write `.package` content in skeleton tasks.

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
Use these verbatim. If a task is not here, it is **out of scope** for skeleton PRs.

### TaskCard: Repo Scaffolding (Phase A)
**Goal:** Produce a runnable TS CLI skeleton with CI.  
**Files:** root configs, `src/cli.ts`, `src/main.ts`, basic tests.  
**Done:** `node dist/cli.mjs --help` prints options; CI green.

### TaskCard: Scanner (Phase B2)
**Goal:** Deterministic discovery of `*.package` file paths from `--in` directories.  
**Constraints:** Do not open files. Exclude hidden/temp. Stable sort.  
**Output:** JSON list (for now returned from function).  
**Tests:** Mixed‑case and diacritic names produce stable order.

### TaskCard: Manifest Parser (Phase B3)
**Goal:** Parse CSV/JSON/YAML mapping `inputPath → bucket`.  
**Constraints:** Validate paths exist (but do not open). Deduplicate entries.  
**Output:** `{ bucketName, files[] }[]`  
**Tests:** BOM, relative paths, missing files → warnings/errors.

### TaskCard: Determinism Utilities (Phase E3)
**Goal:** Implement `stableCompare(a,b)`; provide unit tests with tricky locales.  
**Constraints:** No Intl collation; implement a predictable ASCII‑first compare with tie‑breakers.

### TaskCard: Planner (Phase C)
**Goal:** Combine scanner output + manifest into a dry‑run plan: `{ buckets[], inputs[], stats }`.  
**Constraints:** No hashing or writer calls.  
**Tests:** Deterministic bucket ordering.

### TaskCard: Reports (Phase E1)
**Goal:** Emit JSON/CSV summaries from the dry‑run plan.  
**Constraints:** No disk writes in tests; expose a function that returns strings/buffers.  
**Tests:** Schema compliance; predictable numeric/string formatting.

### TaskCard: S4TK Spike (Phase A2/C1) — *Optional in skeleton*
**Goal:** Prove we can import `@s4tk/models` behind `S4TK_ENABLED`.  
**Constraints:** Dynamic import only. No hard dependency.  
**Tests:** Gated test runs only when env var is set.

---

## 7) Communication Protocol (for multi‑agent runs)
1. **Propose → Commit → Verify** loop per task card.  
2. Each agent posts a short status in PR description: *Scope, Risks, Tests added, Rollback plan.*  
3. If blocked by another module, place a **contract** (interface/types) in `src/types.ts` and proceed with mocks.

---

## 8) Risk Flags & Escalation
Raise a **BLOCKER** label in PR if any of the following appear:
- Need to touch domain logic (hashing, S4TK, writer) during skeleton.
- Non‑deterministic behavior on Windows vs Linux (path separators, case sensitivity).
- CI timing out or test order dependence.

Mitigation path: cut scope, add adapters, or gate with env flags.

---

## 9) Style Guide (essentials)
- Filenames: `kebab-case`. Exports: named where possible.
- No default exports except React (not used here).  
- Avoid global state; prefer passing explicit params.
- Throw `Error` with clear, non‑localized messages; error codes TBD later.

---

## 10) Roadmap Hand‑off (post‑skeleton)
After skeleton merges, agents will implement: hashing, policy engine, conflict resolver, writer, rolling output, and full reports—as defined in the Implementation Plan. Each will arrive as a **separate** task card + PR.

---

## 11) Glossary
- **TGI**: Type–Group–Instance, unique resource identity key within Sims packages.
- **Bucket**: A logical group of input packages merged into one output `.package` (or rolled parts).
- **Dry‑run**: Full analysis with no writes; produces reports only.

---

**End of AGENTS.md**

