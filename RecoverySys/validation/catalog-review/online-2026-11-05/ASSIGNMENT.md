# Lane Assignment: Online Catalog Evidence & Validation Design (Phase 1)

**Lane Directory:** `RecoverySys/validation/catalog-review/online-2026-11-05/`  
**Execution Timestamp:** 2026-11-05T18:14:00-05:00  
**Author Role:** Research Sub-Agent (Phase 1 Manufacturer/Catalog Research)  
**Parent / Integrator:** Primary Orchestrator / Lane Reviewer  

---

## 1. Exact Pin and Environment Verification

- **Repository Root:** `/home/ak/RecoverySys` (derived from git common directory `/home/ak/RecoverySys/.git`)
- **App Directory:** `RecoverySys/` relative to git root
- **Active Worktree:** `/home/ak/.t3/worktrees/RecoverySys/t3-52cc2bb3`
- **Branch:** `t3/online-catalog-validation`
- **Pinned Base SHA:** `725d8a0446b9225fbb24a70f1b0065d5cdf70f9f`
- **CWD Status:** Confirmed (`/home/ak/.t3/worktrees/RecoverySys/t3-52cc2bb3`)
- **Memory Check (`free -h`):** 15 GiB total, 5.5 GiB available (exceeds 2 GiB minimum threshold)
- **Concurrency Limit:** Maximum 2 compiler/test jobs; zero heavy builds required for this research lane.

---

## 2. Why This Lane Exists (Citations)

RecoverySys ships a 225-part static engineering catalog (`src/data/parts.js`) supporting recovery system sizing, descent rate calculation, packing compatibility, and load screening. Under the catalog sourcing contract (`RecoverySys/docs/catalog-sourcing-contract.md`), schema validity is not manufacturer accuracy, and automatic catalog overwrites are deferred until review tooling and validation gates exist.

- `RecoverySys/docs/GOAL-HANDOFF.md`: Notes 1.3.0-rc.2 qualification checkpoint; catalog field approval is in progress; 6 category records and 14 staged proposals in `primary-pages-2026-11-05.json` along with historical 37 records and 35 differences in `fruity-2026-10-19.json` require reviewer decisions without overwriting engineering values.
- `RecoverySys/docs/catalog-sourcing-contract.md`: Requires per-field dry-run diffs, human review, provenance tracking, preservation of prior values, and strict prohibition of invented constants from ambiguous ranges.
- `RecoverySys/validation/catalog-review/README.md`: Notes that catalog `ifc-030-sl` versus manufacturer `IFC-30-SUL` variant mapping needs a decision, Rocketman `lp-024` / `lp-036` standard versus ultralight variants differ markedly from catalog records, and the 36 in descent table (7.4 lb @ 20 fps) conflicts with the rated value (7 lb @ 20 fps).
- `RecoverySys/docs/online-evidence-2026-11-05.md`: Details access date 2026-11-05 and external evidence boundaries.
- `/home/ak/AGENTS.md`: Mandates strict lane ownership, no self-approval, preservation of raw artifacts outside git, and a Gate 1 design stop before production edits.

---

## 3. Scope Boundaries

### In-Scope:
1. Online research of primary manufacturer sources (Fruity Chutes, Rocketman) using polite web tools without exceeding rate limits.
2. Resolving exact variant identities:
   - `ifc-030-sl` vs `IFC-30-SUL` vs `IFC-30-SL` vs `IFC-30-S`.
   - `cfc-030-n` (CFC-30-N-ST nylon elliptical).
   - Rocketman `lp-024` and `lp-036` (Standard 1.1 oz nylon vs Ultra-Light 0.66 oz nylon).
   - Rocketman 36 in descent table (7.4 lb @ 20 fps) vs rating line (7 lb @ 20 fps).
   - Historical candidate records comparison across Fruity Chutes lines.
3. Engineering field distinctions:
   - Nominal canopy diameter vs reference projected area vs Cd convention ($C_d = 2.2$ for toroidal/annular vs 1.5–1.6 range for elliptical).
   - Fabric/material (1.1 oz ripstop nylon vs 0.7 oz / 0.66 oz ultralight ripstop).
   - Shroud lines and bridle rating (e.g. 200 lb Spectra, 220 lb nylon) versus full assembly / vehicle descent load rating.
   - Breaking strength versus working load limit.
   - Mass / weight (oz converted to g; rounding differences).
   - Packing volume and dimensions: deployment bag density (0.18 oz/in³) vs traditional fold/wrap (0.13 oz/in³) vs tight roll.
   - Unknowns stay unknown.
4. Deliverables in owned directory `RecoverySys/validation/catalog-review/online-2026-11-05/`:
   - `ASSIGNMENT.md`
   - `sources.json`
   - `DECISION-PROPOSALS.json`
   - `README.md`
5. Preserving actual raw captured artifacts outside git at `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/` relative to primary repo root, with real SHA256 hashes.
6. Validation design for applying/testing confirmed changes: preset tests and falsifiers to catch wrong-variant substitution, unit mistakes, stale/failed fetch changes, and destructive refresh.
7. Identifying external vendor clarifications needed without contacting vendors.

### Out-of-Scope:
- Editing production catalog `src/data/parts.js`.
- Editing existing source packets (`fruity-2026-10-19*`, `primary-pages-2026-11-05*`).
- Editing scripts, manifests, acceptance registers, task boards, or handoff documents.
- Author self-acceptance or status promotion from unverified to verified.
- Fabricating physical measurements or synthetic trial data.
- Git push, pull requests, or branch watches.
- Direct external communications with vendors or third parties.

---

## 4. Non-Negotiables

1. **Strict Ownership:** Own ONLY `RecoverySys/validation/catalog-review/online-2026-11-05/`. No edits anywhere else in the repository.
2. **No Self-Acceptance:** Author cannot accept its own proposals. Proposals provide evidence, rationale, and proposed dispositions for the parent reviewer.
3. **Artifact Preservation Outside Git:** Downloaded raw snapshots must be preserved at sibling path `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/` relative to primary repo root (`/home/ak/RecoverySys`), and referenced with real SHA256 hashes.
4. **Honesty & Integrity:** Raw hashes and paths must be real. Stated ranges (e.g. Cd 1.5–1.6) must never be converted to invented constants. Unknowns stay unknown.
5. **Rate-Limit Compliance:** Do not hammer bulk supplier APIs (Shopify endpoints previously returned HTTP 429). Fetch only targeted product pages.
6. **Hardware & Resource Limits:** Free memory must remain >= 2 GiB. Compiler/test jobs capped at 2.

---

## 5. First-Deliverable Gate

Return the source packet (`sources.json`), exact per-field decision proposals (`DECISION-PROPOSALS.json`), comprehensive analysis and validation design (`README.md`), and raw artifact archive.  
**STOP before any production catalog edits.**

---

## 6. Acceptance Criteria

Acceptance is conducted by the parent orchestrator / lane reviewer based on:
1. Exact variant identities correctly diagnosed with cited evidence.
2. Every proposed change from `primary-pages-2026-11-05-diff.json` and key historical candidate records evaluated field-by-field.
3. Real artifacts, paths, and SHA256 checksums verified.
4. Validation design includes executable falsifiers catching wrong-variant substitution, unit mismatches, and destructive overwrite.
5. No prohibited files modified.

---

## 7. Revised Scope & Review-Rework Pin (Revision 2 — 2026-11-05)

- **Execution Context:** Revision author following independent review by parent Codex (`docs/history/online-validation-2026-11-05/CATALOG-REVIEW-1.md`).
- **Base Pin for Revision:** `c759cbf989d5b3d81ae3a91545fad71fdcbf55b2`
- **Branch:** `t3/catalog-evidence-audit-rework`
- **Active Worktree:** `/home/ak/.t3/worktrees/RecoverySys/t3-1ac85a51`
- **Ownership Invariant:** Own ONLY `RecoverySys/validation/catalog-review/online-2026-11-05/`. Production catalog (`src/data/parts.js`), existing source packets (`primary-pages-2026-11-05*`), physics benchmark directories, corpus/manifest, and parent review/handoff documents remain strictly untouched.
- **Author Governance Invariant:** Author cannot self-accept any catalog decisions or gates (`authorSelfAcceptance = 0`). Recommendations are presented for independent parent integration.

### Rework Tasks Implemented:
1. **Iris IFC-30-SL Mapping Hypothesis & Hold Dispositions:**
   - Captured primary sources omit IFC-30-SL. Exact mapping and 45.4 g claim are unsupported by captured primary sources.
   - Mapping of `ifc-030-sl` to IFC-30-SL is explicitly reclassified as an unconfirmed hypothesis.
   - All six Iris proposals (`PROP-20261105-03` through `PROP-20261105-08`) are placed on **HOLD**.
   - Renaming or overwriting `ifc-030-sl` from inference is strictly prohibited.
   - Primary manufacturer construction page (`https://fruitychutes.com/help_for_parachutes/drone-parachute-tutorials/how_to_make_a_parachute`) is archived at sibling artifact directory with distinct name `fruitychutes-how-to-make-a-parachute.md` (SHA-256 `b04fa352b2d131f192603c61f389a09b843f220de14a4e9891f86a264ce7221b`), supporting limited general construction claims only.
   - Retained documented discrepancies: distributor lists 46 g, catalog lists 45 g, and 1.6 oz arithmetic conversion yields 45.36 g; arithmetic conversions are not turned into source assertions.
2. **Hardware Rating Metadata Correction:**
   - Removed blanket claims that hardware ratings (600 lb, 1,000 lb, 1,500 lb) are breaking loads or follow a generic 3:1–5:1 WLL.
   - Hardware rating conventions are marked `unknown` in metadata unless specifically documented by the manufacturer.
   - Individual suspension line ratings (200 lb Spectra, 220 lb nylon) are distinguished from whole vehicle recovery chain ratings.
3. **Bounded Read-Only Evidence Auditor & Negative Mutation Tests:**
   - Replaced overclaimed self-confirming checker with a bounded read-only data-driven auditor (`validate-catalog-decisions.mjs`).
   - Fixed path resolution bug: anchored git common-dir resolution against `__dirname` to ensure deterministic execution from any working directory (`resolvePrimaryRoot`).
   - Implemented real byte hashing (`crypto.createHash('sha256').update(actualBytes)`).
   - Added cross-verification against production catalog (`PARTS` in `src/data/parts.js`) and original staged diff (`primary-pages-2026-11-05-diff.json`).
   - Added proposal ID and tuple deduplication checks.
   - Added unit conversion verification and tolerance checks ($1\text{ oz} = 28.349523125\text{ g}$).
   - Dynamically derived summary counts rather than asserting fixed coverage constants.
   - Built a comprehensive `node:test` suite (`validate-catalog-decisions.test.mjs`) verifying detection of negative mutations:
     - `missingartifact`: non-existent file detected and failed.
     - `changedbytes/hash`: checksum mismatch detected and failed.
     - `wrongsource/variant link`: standard line linked to ultralight catalog item detected.
     - `ounce-as-gram`: raw ounce value injected into grams field detected.
     - `duplicateproposal`: proposal ID and tuple collisions detected.
     - `alteredcurrentvalue`: divergence from `parts.js` catalog values detected.
   - Explicitly stated boundaries: strictly read-only, no production enforcement, hash/length does not prove freshness or absence of upstream changes, and semantic evaluation requires human review.
4. **CFC-30-N Resolution & Precision Policy Removal:**
   - Parent direction adopted: retain existing 88 g as the rounded equivalent of published 87.9 g (3.1 oz $\times 28.3495 = 87.8835\text{ g}$ rounded to 88 g).
   - Removed invented catalog-wide precision policy blocker.
   - Proposals `PROP-20261105-01` and `PROP-20261105-02` updated to `retain-rounded` recommendations (no change to parts.js).
   - Preserved original 14 proposal values and history.
5. **Rocketman Ultralight Evidence:**
   - Maintained reject recommendations for the 6 Rocketman proposals (`PROP-20261105-09` through `PROP-20261105-14`) supported by primary physical and material evidence (1.1 oz standard ripstop vs 0.66 oz ultralight ripstop, flat nylon lines vs Spectra lines).
   - Documented unresolved internal conflict on 36" standard page (7.4 lb descent table vs 7 lb rating line).
   - No catalog renaming or new part creation in this phase.
