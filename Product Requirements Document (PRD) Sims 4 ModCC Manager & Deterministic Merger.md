# Product Requirements Document (PRD): Sims 4 Mod/CC Manager & Deterministic Merger

## 1) Product summary

A desktop application (CLI core + GUI) that ingests Sims 4 `.package` files, indexes their resources, merges safe content into deterministic, size-capped “buckets,” tracks provenance/updates, auto-analyzes EA patch impact, and triages LastException/LastUIException errors into actionable suspects. Technical core leverages Sims 4’s DBPF package format and community libraries (S4TK/s4pi). Feasible because the format and APIs already support reading/writing and enumerating Type-Group-Instance (TGI) identifiers—deterministic merge/update logic is “just software.” [wiki.sc4devotion.com+4sims4toolkit.com+4Medium+4](https://sims4toolkit.com/?utm_source=chatgpt.com)

### Primary goals

- **Speed & sanity for power users with huge CC libraries** (10k+ files).
- **Deterministic merges** for CAS/Build-Buy assets; **layered management** for tuning/scripts (no unsafe merges).
- **Auto-updates & provenance:** link installed items to creator pages/paywalled releases.
- **Patch-day intelligence:** diff EA base/DLC snapshots → show what broke.
- **Exception triage:** parse LastException/LastUIException → rank likely offenders.

### Non-goals

- Hosting or distributing mod binaries.
- Silent manipulation of tuning/script IDs.
- “Magic” load-order fixes that hide conflicts rather than surfacing them.

------

## 2) Users & use cases

- **Power CC collectors:** 50–200 GB of CAS/Build-Buy content; want stable, smaller merged sets; quick updates by dropping a new file in.
- **Gameplay mod users:** scripts/tuning; they want patch-impact signals, not merging.
- **Creators:** want users to see update banners and click through to official pages/paywalls.

Top flows:

1. **Drop-in update:** user adds a new `.package`—tool indexes deltas, rebuilds affected bucket(s), logs a YAML changelog, updates GUI state.
2. **Patch day:** tool snapshots vanilla EA files by build, diffs them vs last snapshot, flags impacted installed mods/CC, generates a patch-impact report.
3. **Crash/exception:** user hits a LastException/LastUIException; tool parses the file and correlates it with installed catalog + patch-diff to rank suspects.

------

## 3) Scope (MVP → V1 → V2)

### MVP (CLI)

- **Indexer:** walk input folders; open packages; collect TGIs + hashes.
- **Policy:** allowlist CAS/Build-Buy types; block scripts/tuning by default.
- **Merger:** deterministic add order; de-dupe identical TGIs; fail on conflict; size-cap rollovers; per-bucket manifests.
- **Provenance (local):** per package source URL + creator/title/version hints (auto-guessed from filenames/sibling readme).
- **Dry-run & reports:** `merge-changelog.yaml`, JSON/CSV stats.

**Feasibility:** S4TK `@s4tk/models` exposes `Package` for read/write; s4pi/Sims4Tools shows the same is possible in .NET; Studio’s GUI “Merge Packages” demonstrates that concatenating resources into one DBPF is known-good behavior (we’re making it deterministic and safer). [sims4studio.com+3sims4toolkit.com+3Medium+3](https://sims4toolkit.com/?utm_source=chatgpt.com)

### V1 (GUI + Patch intelligence + Exception triage)

- **GUI:** Electron/Qt wrapper over CLI; run history; bucket/builder dashboards.
- **Vanilla snapshots:** scan EA base/DLC `.package` files; store `(T,G,I, sha1, size)` by build; compute diffs (added/removed/changed).
- **Patch-impact report:** cross-ref diff with installed catalog; severity bands (certain override vs likely via tuning/STBL adjacency).
- **Exception triage:** parse LastException/LastUIException XML; fingerprint and correlate stack/category with installed catalog + patch diff; output `last-exception-triage.yaml`. (The LE/lastUIE structure and Error #1009 null-ref patterns are well-documented in community examples/tools.) [EA Forums+3Reddit+3The Sims 4 lastException Assistant+3](https://www.reddit.com/r/thesims/comments/ksmhdx/need_some_help_can_someone_interpret_my_last/?utm_source=chatgpt.com)

### V2 (Creator features + community catalog)

- **Creator-signed Release Manifests (SRM):** Ed25519-signed JSONs with file hashes, TGI-set signature, landing URL, paywall flag.
- **Community hash catalog (opt-in):** append-only transparency log of `file_hash`, `tgi_set_hash`, hints; client queries for “newer variant exists?”; no binaries hosted.
- **Updates pane:** “Update available” (free/paid) banners; click-through to creator page.

**Feasibility:** Storing TGIs/hashes—not content—avoids legal/size issues; distribution via compressed NDJSON snapshots/deltas is a standard pattern; app already computes these hashes for merging. EA’s mod policy permits non-commercial tools; donation/Patreon-linked update metadata is aligned with current norms. [EA Help](https://help.ea.com/en/articles/the-sims/the-sims-4/mods-policy/?utm_source=chatgpt.com)

------

## 4) Functional requirements

### 4.1 Ingest & index

- Recursively enumerate `.package` files (deterministic ordering).
- For each resource: collect `(type, group, instance)`, size, SHA-1/CRC32.
- Persist to SQLite: `packages`, `resources`, `versions`, `buckets`, `decisions_log`, `provenance`.

**Feasibility:** DBPF is well understood; TGIs uniquely identify resources inside packages. [Mod The Sims+1](https://modthesims.info/wiki.php?title=DBPF&utm_source=chatgpt.com)

### 4.2 Classification & policy

- **Presets:** `CAS`, `BuildBuy` allowed; `Scripts`, `Tuning overrides` blocked by default.
- Unknown types enter a review queue.
- Flags: `--allow-types`, `--exclude-types`, `--rename-safe` (for audited safe types only).

**Feasibility:** Community docs enumerate common CAS/BB resource types and TGI usage; Sims 4 Studio merges CAS/BB safely today. [sims4studio.com+1](https://sims4studio.com/thread/402/merge-packages-using-sims-studio?utm_source=chatgpt.com)

### 4.3 Deterministic merging

- Input and TGI sort (locale-agnostic).
- Duplicate (same TGI + same bytes) → skip.
- Conflict (same TGI + different bytes) → default fail; log and stop.
- Writer builds new DBPF (or S4TK `Package`), sequentially adds resources; size cap rolls to `bucket.partN.package`.
- Emit `bucket.manifest.json` listing all TGIs and source files.

**Feasibility:** S4TK `Package` supports read/write; s4pi APIs mirror this in .NET; Studio’s merge proves game tolerates combined packages. [sims4studio.com+3sims4toolkit.com+3Medium+3](https://sims4toolkit.com/?utm_source=chatgpt.com)

### 4.4 Incremental rebuilds

- On new/updated input file: compute delta vs prior version (TGI adds/updates/removes).
- Identify impacted buckets and rebuild only those from index (no in-place patching).
- Record decisions into `merge-changelog.yaml`.

### 4.5 Provenance tracking (local)

- Auto-guess `source_url`, `creator_hint`, `title_hint`, `version_hint` from filenames, sibling readmes, and domain mapping.
- Confidence score; one-click user confirm/edit.

### 4.6 Patch-day intelligence

- `snapshot` command: scan base/DLC packages to `vanilla(build_id)`.
- `diff` command: compare builds → `{added, removed, changed}` TGIs.
- `impact` command: overlay diff on installed catalog; output `patch-impact.yaml` with severity bands.

**Feasibility:** DBPF inventorying is the same mechanism used for mod packages; existence of build signatures and community practices around re-enabling mods post-update validate the need/pattern. [EA Help](https://help.ea.com/en/articles/the-sims/the-sims-4/mods-and-the-sims-4-game-updates/?utm_source=chatgpt.com)

### 4.7 Exception triage

- Parse `LastException.txt` / `lastUIException_*.txt` XML (fields: buildsignature/categoryid/stack).
- Map category/stack heuristics → UI/Tuning/Routing buckets; correlate with installed catalog and patch diff; rank suspects and propose actions (disable candidates, clear cache, rebuild CC buckets).

**Feasibility:** Community tools and shared reports show consistent XML structure, Error #1009 null-refs in UI widgets, and mod-related root causes; programmatic parsing is straightforward. [Reddit+2The Sims 4 lastException Assistant+2](https://www.reddit.com/r/thesims/comments/ksmhdx/need_some_help_can_someone_interpret_my_last/?utm_source=chatgpt.com)

### 4.8 Creator & community catalog (V2)

- **SRM (signed) intake**: verify creator identity via OAuth/DNS/public key; accept signed release manifests.
- **Client query**: given local hashes/signature, return update status (up-to-date / update / paid update / unknown).
- **Transparency log**: publish daily signed deltas; clients can mirror/audit.

**Feasibility:** Only hashes/metadata—not content—are stored; creators commonly announce updates behind landing pages/patreon; EA policy allows free distribution + donations and allows addressing inappropriate mods, not relevant here. [EA Help](https://help.ea.com/en/articles/the-sims/the-sims-4/mods-policy/?utm_source=chatgpt.com)

------

## 5) Non-functional requirements

- **Determinism:** same inputs/config ⇒ bit-identical outputs.
- **Performance:** NVMe target ≥200 MB/s aggregate scan; memory <1.5 GB on 60–100 GB libraries (streaming hashes).
- **Cross-platform:** Windows/macOS; Linux optional.
- **Observability:** JSON logs + human console; per-run YAML/JSON artifacts.
- **Security & privacy:** no binary uploads; opt-in telemetry; strip querystrings from source URLs; never send local paths/usernames.

------

## 6) Data model (key tables)

- `packages(id, file_hash, size, file_name, first_seen_path, discovered_at)`
- `resources(id, package_id, type, group, instance, size, sha1, crc32)`
- `buckets(id, name, policy, size_cap_mb)`
- `bucket_members(bucket_id, resource_id, final_instance_if_renamed)`
- `provenance(package_id, source_url, creator_hint, title_hint, version_hint, confidence)`
- `vanilla(build_id, file, type, group, instance, size, sha1)`
- `advisories(file_hash, build_id, severity, reason)` (future)

------

## 7) Architecture

**Core engine (Node/TS)**

- Modules: `scanner`, `s4tk-adapter`, `indexer`, `hasher`, `policy`, `conflict`, `writer`, `roller`, `provenance`, `vanilla-snapshot`, `vanilla-diff`, `impact-analyzer`, `exceptions-parser`, `reports`.

**CLI**

- Commands:
   `merge`, `dry-run`, `snapshot`, `diff`, `impact`, `provenance set/guess`, `catalog check/update/submit` (V2).

**GUI wrapper**

- Electron shell calling CLI; projects, run history, action buttons (open creator page, disable mod, rebuild bucket).

------

## 8) Algorithms & policies (short)

- **Duplicate detection:** TGI match + SHA-1 equal ⇒ skip.
- **Conflict:** TGI match + SHA-1 different ⇒ fail (default). `--rename-safe` limited to audited types only (never tuning/scripts).
- **Update matching:** TGI-set Jaccard ≥ threshold + filename similarity ⇒ new version of same mod/CC.
- **Patch impact severity:**
   Red = mod overrides TGI that EA changed;
   Yellow = tuning/strings adjacency;
   Grey = low value (STBL only).

------

## 9) Feasibility notes w/ sources

- **Read/write packages:** S4TK `@s4tk/models` explicitly supports creating and writing packages and resources programmatically; tutorials show building packages from loose XML. s4pi/Sims4Tools provide equivalent functionality in .NET, further proving the file format is workable. [sims4toolkit.com+2Medium+2](https://sims4toolkit.com/?utm_source=chatgpt.com)
- **DBPF/TGI fundamentals:** The DBPF container and TGI addressing are documented by community wikis; TGI uniquely identifies entries; this underpins deterministic merging and conflict detection. [Mod The Sims+2wiki.sc4devotion.com+2](https://modthesims.info/wiki.php?title=DBPF&utm_source=chatgpt.com)
- **Existing “merge packages” precedent:** Sims 4 Studio’s GUI merge has existed for years; your CLI extends the concept with policies, determinism, and automation. [sims4studio.com](https://sims4studio.com/thread/402/merge-packages-using-sims-studio?utm_source=chatgpt.com)
- **Exception log structure:** Community examples show consistent XML with `buildsignature`, `categoryid`, and `Error #1009` null-ref cases within UI widget namespaces—amenable to parsing and heuristic mapping. [Reddit+1](https://www.reddit.com/r/thesims/comments/ksmhdx/need_some_help_can_someone_interpret_my_last/?utm_source=chatgpt.com)
- **Policy & monetization reality:** EA’s mod policy allows free mods with donation/early-access; tools that don’t sell binaries and simply analyze metadata fit comfortably within that policy. [EA Help](https://help.ea.com/en/articles/the-sims/the-sims-4/mods-policy/?utm_source=chatgpt.com)

------

## 10) UX requirements (GUI)

- **Library view:** creators, categories, buckets, sizes; search/filter; “open source page.”
- **Updates pane:** show update status (free/paid/unsigned community hint).
- **Patch-day dashboard:** changed EA TGIs, impacted items (red/yellow), one-click rebuild for CC buckets.
- **Exceptions pane:** last exception timeline, suspect list with layer & bucket; toggle disable & re-test workflow.
- **Run history:** per-run `merge-changelog.yaml`, `patch-impact.yaml`, logs.

------

## 11) Security, privacy, licensing

- **No binary uploads** to the catalog; hashes/metadata only.
- **Creator verification:** OAuth/DNS/public key; signed SRMs; append-only transparency log (V2).
- **Licenses:** S4TK is open source (Node), Sims4Tools/s4pi are GPL-derived; using S4TK in Node avoids GPL linkage issues for the CLI; ensure your code license is compatible (e.g., MIT/Apache for your layers). (Confirm exact license terms of the S4TK packages you consume at build time.) [Patreon](https://www.patreon.com/posts/sims-4-toolkit-58936217?utm_source=chatgpt.com)

------

## 12) Rollout plan

**Phase 0 (2–3 weeks):**
 Repo skeleton (done), deterministic scanner/indexer, strict policy, dry-run reports.

**Phase 1 (3–5 weeks):**
 Merger + size caps + per-bucket manifests; incremental rebuild; provenance (local); CLI usable for CC libraries.

**Phase 2 (3–4 weeks):**
 Vanilla snapshot/diff + patch-impact; exception parser + triage YAML; basic GUI.

**Phase 3 (V2, ongoing):**
 Creator verification + SRMs; community catalog (read-only → submissions); update banners.

------

## 13) Acceptance criteria (MVP)

- Merge a 5–10 GB CC subset into ≤10 buckets with **zero conflicts** under default policy.
- Re-run with same inputs → identical output hashes.
- Dry-run shows duplicates/exclusions; conflicts return non-zero exit.
- Patch-impact produces deterministic YAML for two different builds.
- Exception triage consumes a real `LastException/lastUIException` and outputs ranked suspects.

------

## 14) Risks & mitigations

- **Misclassification:** start strict; unknowns to review queue; expand presets iteratively. (Mitigation: tests + telemetry of unknown types.)
- **Override minefield:** never merge tuning/scripts; keep as ordered layers; show load-order warnings.
- **Community catalog abuse:** signed SRMs > quorum hints; append-only transparency; rate limiting; no binaries.
- **Support burden:** deterministic logs, manifests, and one-click “rebuild bucket” keep triage tractable.

------

## 15) Open questions

- Exact allowlist for “rename-safe” types (audit needed).
- How aggressive to be with STBL “yellow” warnings (user-tunable?).
- Whether to include optional SSD-specific performance toggles (threading, caching).

------

### Appendix A — Key citations (feasibility)

- **S4TK (`@s4tk/models`) can read/write packages/resources:** official site & tutorials. [sims4toolkit.com+1](https://sims4toolkit.com/?utm_source=chatgpt.com)
- **Sims4Tools/s4pi show longstanding .NET support:** GitHub repo. [GitHub](https://github.com/s4ptacle/Sims4Tools?utm_source=chatgpt.com)
- **DBPF/TGI fundamentals:** community wikis. [Mod The Sims+2wiki.sc4devotion.com+2](https://modthesims.info/wiki.php?title=DBPF&utm_source=chatgpt.com)
- **Sims 4 Studio “Merge Packages” exists:** tutorial. [sims4studio.com](https://sims4studio.com/thread/402/merge-packages-using-sims-studio?utm_source=chatgpt.com)
- **LastException/lastUIException are parseable XML with consistent fields & Error #1009 UI patterns:** examples/tools. [Reddit+2The Sims 4 lastException Assistant+2](https://www.reddit.com/r/thesims/comments/ksmhdx/need_some_help_can_someone_interpret_my_last/?utm_source=chatgpt.com)
- **EA’s mods policy (free distribution + donations):** EA Help. [EA Help](https://help.ea.com/en/articles/the-sims/the-sims-4/mods-policy/?utm_source=chatgpt.com)