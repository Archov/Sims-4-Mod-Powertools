# S4TK CLI **basic Merger** — Implementation Plan (Updated)

**Rev:** 2025‑09‑19  
**Objective:** A tiny, deterministic, **append‑all** aggregator: take an ordered list of `.package` files and produce **one merged `.package`** (or multiple with `--by-folder`). No policy, no dedupe, no conflict logic—**just concatenate resources in a stable order**, S4S‑style, with crash‑safe writes.

---

## 1) Scope & Guardrails
- **Do:** read inputs → append all resources → write output(s) atomically.  
- **Don’t:** inspect resource semantics, detect conflicts, rename TGIs, dedupe, or classify.  
- **Determinism:** same inputs + flags ⇒ **byte‑identical output**.
- **Crash‑safe:** write to temp then atomic rename; never leave truncated finals.

---

## 2) CLI (v1)
```
s4merge basic \
  --in <dir> [--in <dir> ...] \
  [--files @list.txt]                  # one path per line; # comments ok
  --out <Merged.package> | --by-folder --out-root <dir> \
  [--sort name|path|mtime] [--reverse] # default: path
  [--max-size <MB>]                     # roll to .part2/.part3 at cap
  [--manifest-out <path>]               # default: <out>.manifest.yaml
  [--no-changelog]                      # skip run-level changelog
  [--stats-json <path>]                 # write basic counts/timings
  [--verify]                            # reopen output, sanity checks
  [--dry-run] [--progress]
```

**Notes**
- `--files` order wins; otherwise inputs are enumerated then sorted per flag.  
- With `--by-folder`, outputs are `<out-root>/<top-folder>.package`.

---

## 3) Output Artifacts
- **Merged package(s)**: `.package` (and `.partN.package` if rolled).  
- **Per‑output manifest** (YAML): `<output>.manifest.yaml` (see schema).  
- **Run‑level changelog** (YAML): `merge-changelog.yaml` (unless `--no-changelog`).  
- **Optional stats JSON**: copy counts, unique types seen, elapsed, MB/s.

### 3.1 Per‑output Manifest (YAML)
```yaml
schema: 1
tool: s4merge
command: "s4merge basic --files @list.txt --out Merged/AllCC.package"
created_utc: "2025-09-19T21:20:00Z"
output:
  path: "Merged/AllCC.package"
  bytes: 123456789
  parts: 1          # >1 if --max-size used
inputs:
  order: { key: "path", reverse: false }
  files:
    - idx: 00001
      path: "D:/Mods/Hair/Anto_Hair-01.package"
      bytes: 1048576
      sha1: "e3b0c44298..."   # optional integrity
      mtime: "2025-09-17T03:12:45Z"
rollover:
  max_mb: null
notes:
  - "Append‑all. No dedupe/conflict logic. Resource intra‑order may be reserialized by S4TK."
```

---

## 4) High‑Level Flow
1. **Collect**: expand `--files` and/or enumerate `--in` (recursive `*.package`).  
2. **Order**: stable sort per `--sort`/`--reverse`; freeze list.  
3. **Plan**: if `--by-folder`, group by first top‑level input folder → multiple outputs; else single.  
4. **Dry‑run**: print ordered list + output targets and totals.  
5. **Merge**: for each output
   - `new Package()` (S4TK). For each input in order: `Package.from()` → **append every resource**.
   - Serialize to temp → fsync file & parent dir → atomic rename.  
6. **Emit**: per‑output manifest; optional run‑level `merge-changelog.yaml`; optional `--stats-json`.  
7. **Verify (optional)**: reopen output, check basic invariants (see §7.4).

---

## 5) Minimal Module Layout
```
src/
  cli-basic.ts         # registers subcommand + flags
  basic/main.ts        # orchestrator (collect → plan → dry-run/merge)
  basic/scanner.ts     # expand --files / enumerate --in; stable sort
  basic/plan.ts        # map inputs → outputs (single or by-folder)
  basic/merge.ts       # S4TK append-all; handles --max-size rollovers
  basic/manifest.ts    # write per-output manifest YAML
  basic/changelog.ts   # optional run-level YAML
  basic/stats.ts       # counts, timings; optional JSON output
  basic/verify.ts      # reopen + sanity checks
  util/fsx.ts         # temp files, fsync, atomic rename
  util/determinism.ts # stable compares, path normalizer
```

---

## 6) Acceptance Criteria
- Two runs with identical inputs/flags produce **identical bytes** for each output and manifest.  
- `--by-folder` emits one package per top-level input folder with stable naming.  
- `--max-size` creates `.part2/.part3` at deterministic boundaries.  
- `--verify` passes on successful merges; fails loudly on count mismatch.  
- Interruptions never leave a truncated final file (temp remains).

---

## 7) Tasks (Agent‑ready)

### 7.1 CLI Subcommand
- Wire flags, validate combos (e.g., `--by-folder` requires `--out-root`).

### 7.2 Scanner
- Expand `--files`, enumerate `--in` (ignore hidden/temp), de‑dupe paths, stable sort by `path|name|mtime`.
- Handle Windows long paths; symlinks optional.

### 7.3 Planner
- Single output: everything → `--out`.  
- By‑folder: group inputs by first folder name under each `--in` root → `<out-root>/<group>.package`.

### 7.4 Merger + Verify
- Append‑all with S4TK. Implement simple **size cap**: if projected serialized size > `--max-size`, close current and start `.partN`.
- `--verify`: reopen output, compare **resource count** to sum of input counts (track while merging). Log type histogram.

### 7.5 Manifests & Changelog
- **Manifest** per output as in §3.1 (include command line + order key).  
- **Changelog** per run unless `--no-changelog` (summary of outputs + input list; no per‑resource data).

### 7.6 Stats (optional)
- Count total inputs, total resources copied, unique type IDs seen, elapsed time, MB/s; dump to `--stats-json`.

### 7.7 Progress & UX
- `--progress`: print per-input file completion; final totals; quiet mode respects TTY.

---

## 8) Behavior Notes (Document!)
- **Ordering:** input package order is deterministic; **intra‑package resource order may be reserialized by S4TK**—that’s acceptable for basic merge.
- **No intelligence:** no dedupe, no conflict detection; last writer wins **within** the append stream by position, not by TGI comparison.
- **Atomicity:** write to `*.tmp`, fsync file + parent dir, atomic rename.

---

## 9) Runbook
- Dry‑run single:  
  `s4merge basic --files @list.txt --out D:/Merged/All.package --dry-run`  
- Merge single with manifest + stats:  
  `s4merge basic --files @list.txt --out D:/Merged/All.package --manifest-out D:/Merged/All.manifest.yaml --stats-json D:/Merged/stats.json --progress`  
- By‑folder with rollovers:  
  `s4merge basic --in D:/Mods --by-folder --out-root D:/Merged --max-size 2048 --sort path`

---

## 10) Risks (kept tiny)
- Monster outputs slow load: advise `--by-folder` or `--max-size`.
- YAML bloat: allow `--no-changelog`; manifests list only inputs, not per-resource.
- Memory pressure: if `Package.from()` is heavy, process inputs sequentially; avoid parallel opens.
