# Online Catalog Evidence, Variant Resolution & Validation Design (Revision 2)

**Date:** 2026-11-05  
**Lane Directory:** `RecoverySys/validation/catalog-review/online-2026-11-05/`  
**Base Pin:** `725d8a0446b9225fbb24a70f1b0065d5cdf70f9f`  
**Revision Pin:** `c759cbf989d5b3d81ae3a91545fad71fdcbf55b2`  
**Branch:** `t3/catalog-evidence-audit-rework`  
**Execution Context:** Isolated T3 worktree (`t3-1ac85a51`), bounded revision sub-agent  
**Parent / Integrator:** Codex (`gpt-6.1-sol` high), independent reviewer  
**Predecessor Review:** `RecoverySys/docs/history/online-validation-2026-11-05/CATALOG-REVIEW-1.md`  
**Status:** **REVISION COMPLETED — STRICTLY READ-ONLY PACKET AUDITOR DELIVERED**  
**Author Self-Acceptance:** Strictly prohibited by contract. Author accepts zero proposals.

---

## 1. Executive Summary & Review Rework

This revised packet responds directly and comprehensively to the four acceptance objections detailed in `docs/history/online-validation-2026-11-05/CATALOG-REVIEW-1.md`:

1. **Iris IFC-30-SL Mapping Hypothesis & Hold Dispositions:**
   - Captured primary sources omit IFC-30-SL. Exact mapping and the 45.4 g mass claim are unsupported by captured primary sources.
   - Mapping of `ifc-030-sl` to IFC-30-SL is reclassified as an **unconfirmed hypothesis**.
   - All six Iris proposals (`PROP-20261105-03` through `PROP-20261105-08`) are placed on **HOLD**.
   - Renaming or overwriting `ifc-030-sl` based on inference is strictly prohibited.
   - Sourced discrepancies are documented and preserved: distributor lists 46 g, catalog lists 45 g, and 1.6 oz arithmetic conversion yields 45.36 g. Arithmetic conversions are not turned into source assertions.
   - Primary manufacturer construction tutorial page (`https://fruitychutes.com/help_for_parachutes/drone-parachute-tutorials/how_to_make_a_parachute`) is archived as a 7th evidence capture (`fruitychutes-how-to-make-a-parachute.md`, SHA-256 `b04fa352b2d131f192603c61f389a09b843f220de14a4e9891f86a264ce7221b`); it supports limited general construction claims only and omits specific SKU specs.
2. **Hardware Rating Metadata & Convention Correction:**
   - Removed blanket claims that hardware ratings (600 lb, 1,000 lb, 1,500 lb) are breaking loads or follow a generic 3:1–5:1 WLL.
   - Rating conventions are explicitly marked `unknown` in source metadata and documentation unless specifically stated by the manufacturer.
   - Individual suspension line ratings (200 lb Spectra, 220 lb nylon) are distinguished from whole vehicle recovery chain ratings.
3. **Bounded Read-Only Evidence Auditor & Negative Mutation Tests:**
   - Replaced the self-confirming 65-check script with a bounded read-only data-driven evidence auditor (`validate-catalog-decisions.mjs`).
   - Fixed path resolution: git common-dir resolution is anchored relative to `__dirname` (`resolvePrimaryRoot`), fixing the `../../../../.git` relative resolution defect when run from the primary repository root.
   - Implemented real byte hashing (`crypto.createHash('sha256').update(actualBytes)`).
   - Added catalog comparison against production `PARTS` in `src/data/parts.js` and original staged diff in `primary-pages-2026-11-05-diff.json`.
   - Added proposal ID and tuple deduplication.
   - Added unit conversion verification and tolerance checks against $1\text{ oz} = 28.349523125\text{ g}$.
   - Summary counts are dynamically derived from proposals, not asserted as fixed coverage constants.
   - Implemented a complete `node:test` suite (`validate-catalog-decisions.test.mjs`) verifying detection of 6 negative mutations (`missingartifact`, `changedbytes/hash`, `wrongsource/variant link`, `ounce-as-gram`, `duplicateproposal`, `alteredcurrentvalue`).
   - Explicitly stated boundaries: strictly read-only, no production enforcement, hash/length does not prove freshness or absence of upstream changes, and semantic evaluation requires human review.
4. **CFC-30-N Resolution & Precision Policy Removal:**
   - Adopted parent direction: retain existing 88 g as the rounded equivalent of published 87.9 g (3.1 oz $\times 28.3495 = 87.8835\text{ g}$ rounded to nearest integer 88 g).
   - Removed invented catalog-wide precision policy blocker.
   - Proposals `PROP-20261105-01` and `PROP-20261105-02` updated to `retain-rounded` recommendations (no change to parts.js; parent acceptance recorded separately).
   - Preserved original 14 proposal values and history.
5. **Rocketman Evidence & Non-Renaming Invariant:**
   - Maintained reject recommendations for the 6 Rocketman proposals (`PROP-20261105-09` through `PROP-20261105-14`) supported by primary physical and material evidence (1.1 oz standard ripstop vs 0.66 oz ultralight ripstop, flat nylon lines vs Spectra lines).
   - Documented unresolved internal conflict on 36" standard page (7.4 lb descent table vs 7 lb rating line).
   - No catalog renaming or new part creation in this phase.

---

## 2. Variant Identity Resolutions & Primary Evidence

### 2.1. Fruity Chutes `ifc-030-sl`: Unconfirmed Hypothesis & Hold Dispositions

#### Background & Objection
Catalog part `ifc-030-sl` currently specifies:
- `name`: `"30\" Iris Ultralight"`
- `weight_g`: 45
- `packed_diam_in`: 1.9
- `packed_length_in`: 3.2
- `cd`: 2.2
- `shape`: `"flat"`

In `primary-pages-2026-11-05.json`, specs were extracted from the Iris 30" Ultralight store page (SKU `IFC-30-SUL-OB`, 38 g, 1.5" $\times$ 4.2"), proposing to overwrite `ifc-030-sl`. In `CATALOG-REVIEW-1.md`, the parent reviewer objected that:
> No captured source is for IFC-30-SL. Similar ID/dimensions support a mapping hypothesis, not a confirmed manufacturer identity or exact 45.4 g mass. A current distributor lists 46 g, while the production record is 45 g. The primary manufacturer construction page mentions SL existence but does not establish all claimed dimensions/weight. Capture a primary SL source or keep the mapping unconfirmed and the six Iris proposals on hold. Do not rename or overwrite that part from inference.

#### Primary Source Findings & Documented Discrepancies
- **Primary manufacturer store page:** The URL `https://shop.fruitychutes.com/products/ifc-30-sl` currently returns HTTP 404 (product page no longer hosted directly on the webstore).
- **Primary manufacturer construction/tutorial page:** `https://fruitychutes.com/help_for_parachutes/drone-parachute-tutorials/how_to_make_a_parachute` describes Fruity Chutes' annular/toroidal parachute geometry, Peregrine UAV systems, and Harrier launchers. It confirms the existence of the Iris family and deployment systems, but does **not** provide complete SKU-level dimensions or mass for IFC-30-SL. It has been archived as evidence artifact `fruitychutes-how-to-make-a-parachute.md` (SHA-256 `b04fa352b2d131f192603c61f389a09b843f220de14a4e9891f86a264ce7221b`).
- **Distributor data:** Third-party distributor Unmanned Systems Source lists SKU `IFC-30-SL` with mass **46 g** and dimensions 1.9" D $\times$ 3.7" L (sharing dimensions with IFC-30-S).
- **Catalog data:** Existing `src/data/parts.js` record has mass **45 g** and dimensions 1.9" D $\times$ 3.2" L.
- **Arithmetic conversion:** 1.6 oz converted at $28.3495\text{ g/oz}$ yields $45.36\text{ g}$. Arithmetic conversions must not be asserted as primary source evidence.

#### Revised Finding & Disposition
- The mapping of `ifc-030-sl` to manufacturer model `IFC-30-SL` is classified as an **unconfirmed hypothesis**.
- All six staged Iris proposals (`PROP-20261105-03` through `PROP-20261105-08`) are placed on **HOLD**.
- **Prohibit overwrite and rename:** Catalog part `ifc-030-sl` must not be renamed or overwritten from inference. It remains at 45 g, 1.9" $\times$ 3.2" pending valid primary source capture.

---

### 2.2. Rocketman `lp-024` and `lp-036`: Standard vs Ultra-Light Lines

#### Primary Physical & Material Evidence
Investigation of Rocketman's primary product documentation confirms two physically distinct product lines:
1. **Rocketman High Performance CD 2.2 Parachutes (Standard Line):**
   - Canopy Fabric: **1.1 oz Mil-Spec Ripstop Nylon** (20 Denier, zero porosity).
   - Suspension Lines: **1/4" flat-braided nylon** (250 lb rated per line, 8 lines).
   - Swivel: 1,500 lb.
   - 24": 3.1 oz (**87.88 g**), pack **2.0" D $\times$ 2.75" L** (8.6 cu in).
   - 36": 4.8 oz (**136.08 g**), pack **2.6" D $\times$ 4.52" L** (24.0 cu in).
2. **Rocketman Ultra-Light High-Performance CD 2.2 Parachutes:**
   - Canopy Fabric: **0.66 oz Mil-Spec Ripstop Nylon**.
   - Suspension Lines: **220 lb (0.039") Spectra** (8 lines). Center line: 350 lb (0.070") Spectra.
   - 24": 0.7 oz (**19.84 g $\rightarrow$ rounded 20 g**), pack **1.375" D (~1.38") $\times$ 1.569" L (~1.57")** (2.33 cu in).
   - 36": 1.5 oz (**42.52 g $\rightarrow$ rounded 43 g**), pack **1.375" D (~1.38") $\times$ 3.08" L** (4.57 cu in).

#### Finding & Disposition
- Existing catalog records `lp-024` (20 g, 1.38" $\times$ 1.57") and `lp-036` (43 g, 1.38" $\times$ 3.08") match the Ultra-Light line with mathematical and dimensional precision.
- The 6 staged proposals extracted values from the Standard line (1.1 oz fabric), which is over 3 to 4 times heavier (+339% for 24", +216% for 36"). Overwriting ultralight chutes with standard line values is rejected based on primary physical/material evidence.
- **Reject** all 6 proposals (`PROP-20261105-09` through `PROP-20261105-14`).
- **No catalog rename or new part:** Catalog records remain unchanged in this phase.

#### Rocketman 36" Standard Page Internal Contradiction
On the manufacturer product page for Rocketman Standard High Performance CD 2.2 Parachutes:
- **Descent Rate Table:** specifies `-20fps @ 7.4lb`.
- **Text Summary Line:** states `Rating: 7lb @ 20fps`.

This internal conflict (7.4 lb vs 7.0 lb, a 5.7% discrepancy) confirms that standard line text must not be ingested into catalog records without explicit manufacturer resolution.

---

### 2.3. Fruity Chutes `cfc-030-n`: Retention of Existing 88 g

#### Background & Parent Direction
- Manufacturer SKU: `CFC-30-N-ST`.
- Published Mass: 3.1 oz ($87.8835\text{ g}$, stated as 87.9 g).
- Catalog Record: 88 g (nearest integer rounding of 87.8835 g).
- Difference: 0.1 g (0.11%).

In `CATALOG-REVIEW-1.md`, the parent reviewer determined:
> Parent decided retain existing 88g as rounded equivalent of published 87.9g. Remove invented catalog-wide precision-policy blocker. Recommendation can be retain-rounded/no change for 2 CFC entries, but actual parent acceptance is separate. Retain original 14 proposal values/history.

#### Disposition
- The invented catalog-wide precision-policy blocker is removed.
- Proposals `PROP-20261105-01` and `PROP-20261105-02` are updated to **`retain-rounded`** recommendations (recommending retention of existing 88 g as the rounded equivalent of published 87.9 g).
- No change is made to `src/data/parts.js`. Actual parent acceptance is recorded separately during integration.

---

## 3. Engineering Field Distinctions & Standards

| Field / Attribute | Engineering Meaning | Catalog Rule & Sourcing Constraint |
|---|---|---|
| **Nominal Diameter ($D$)** | Reference circular diameter quoted by vendor. | Not necessarily equal to projected aerodynamic diameter ($D_p$). Annular/toroidal chutes have $D_p < D_{flat}$. |
| **Drag Coefficient ($C_d$)** | Dimensionless scaling constant in $F_d = \frac{1}{2} \rho v^2 C_d A$. | **Ranges stay ranges.** If vendor publishes 1.5–1.6, do not invent constants. Current catalog $C_d = 1.55$ serves as engineering midpoint. |
| **Material (Canopy & Lines)** | Fabric areal density and fiber type. | 1.1 oz ripstop nylon vs 0.7 oz / 0.66 oz ultralight ripstop. Lines: braided nylon vs high-modulus polyethylene (Spectra). |
| **Shroud Line Rating** | Breaking strength of an individual suspension line. | **NOT the whole recovery chain rating.** E.g., 200 lb Spectra or 220 lb nylon per line across 8 lines provides line-level strength; vehicle recovery rating is determined by canopy area and descent speed (e.g. 2.6–5.0 lb @ 15–20 fps). |
| **Hardware Rating Conventions** | Ultimate tensile failure vs proof test vs working load limit. | **Rating convention is UNKNOWN unless specifically documented by the manufacturer.** Do NOT apply blanket breaking load or 3:1–5:1 WLL assumptions. Label unknown conventions as `unknown` in metadata. |
| **Weight / Mass** | Total assembly mass in grams. | Conversion: $1\text{ oz} = 28.349523125\text{ g}$. Distinguish integer rounding (88 g) from decimal conversion (87.88 g $\rightarrow$ 87.9 g). Ounce values must not be injected into gram fields. |
| **Packing Volume & Dimensions** | Packed cylinder diameter and length. | **Packing method dependent.** Fruity Chutes deployment bag density is $0.18\text{ oz/in}^3$; traditional fold/wrap is $0.13\text{ oz/in}^3$. Tight-pack rolls differ significantly from deployment bag packing. |
| **Unknowns** | Unverified or unmeasured parameters. | **Unknowns stay unknown.** No synthetic fabrication. |

---

## 4. Proposal Summary & Dispositions

Across the 14 proposals staged in `primary-pages-2026-11-05-diff.json`:

| Proposal ID | Catalog ID | Category | Field | Old | Proposed | Proposed Disposition | Primary Rationale |
|---|---|---|---|---|---|---|---|
| `PROP-20261105-01` | `cfc-030-n` | `main_chute` | `weight_g` | `88` | `87.9` | **RETAIN-ROUNDED** | Parent decision: retain 88 g as rounded equivalent of published 87.9 g (from 3.1 oz). Precision policy blocker removed. |
| `PROP-20261105-02` | `cfc-030-n` | `drogue_chute` | `weight_g` | `88` | `87.9` | **RETAIN-ROUNDED** | Same as PROP-01. Recommend retain 88 g rounded equivalent. |
| `PROP-20261105-03` | `ifc-030-sl` | `main_chute` | `packed_diam_in` | `1.9` | `1.5` | **HOLD** | Primary sources omit IFC-30-SL. Mapping is unconfirmed hypothesis. Prohibit overwrite/rename. |
| `PROP-20261105-04` | `ifc-030-sl` | `main_chute` | `packed_length_in` | `3.2` | `4.2` | **HOLD** | Same as PROP-03. Primary SL source missing; SUL dimensions diverge. |
| `PROP-20261105-05` | `ifc-030-sl` | `main_chute` | `weight_g` | `45` | `38` | **HOLD** | Same as PROP-03. Distributor lists 46 g, catalog lists 45 g; 45.4 g was arithmetic conversion from 1.6 oz. |
| `PROP-20261105-06` | `ifc-030-sl` | `drogue_chute` | `packed_diam_in` | `1.9` | `1.5` | **HOLD** | Same as PROP-03 (drogue entry). |
| `PROP-20261105-07` | `ifc-030-sl` | `drogue_chute` | `packed_length_in` | `3.2` | `4.2` | **HOLD** | Same as PROP-04 (drogue entry). |
| `PROP-20261105-08` | `ifc-030-sl` | `drogue_chute` | `weight_g` | `45` | `38` | **HOLD** | Same as PROP-05 (drogue entry). |
| `PROP-20261105-09` | `lp-024` | `main_chute` | `packed_diam_in` | `1.38` | `2.0` | **REJECT** | Physical evidence: catalog is 0.66 oz Ultra-Light; proposal is 1.1 oz Standard line. |
| `PROP-20261105-10` | `lp-024` | `main_chute` | `packed_length_in` | `1.57` | `2.75` | **REJECT** | Physical evidence: catalog matches Ultra-Light line (1.569 in L). |
| `PROP-20261105-11` | `lp-024` | `main_chute` | `weight_g` | `20` | `87.88` | **REJECT** | Physical evidence: replacing 20 g ultralight chute with 88 g standard chute is invalid. |
| `PROP-20261105-12` | `lp-036` | `main_chute` | `packed_diam_in` | `1.38` | `2.6` | **REJECT** | Physical evidence: catalog is Ultra-Light line; proposal is Standard line. |
| `PROP-20261105-13` | `lp-036` | `main_chute` | `packed_length_in` | `3.08` | `4.52` | **REJECT** | Physical evidence: catalog matches Ultra-Light line (3.08 in L). |
| `PROP-20261105-14` | `lp-036` | `main_chute` | `weight_g` | `43` | `136.08` | **REJECT** | Physical evidence: replacing 43 g ultralight chute with 136 g standard chute is invalid. |

**Dynamically Derived Summary Counts:**
- **REJECT:** 6 (Rocketman standard-to-ultralight overwrites rejected on physical material evidence)
- **HOLD:** 6 (Iris proposals held pending primary SL source; mapping is unconfirmed hypothesis)
- **RETAIN-ROUNDED:** 2 (CFC proposals recommend retaining 88 g rounded equivalent; parent acceptance separate)
- **ACCEPT:** 0 (Author self-acceptance strictly prohibited)
- **Total Evaluated:** 14

---

## 5. Raw Artifacts Archive & Provenance

All raw article markdown snapshots were captured using polite web inspection tools and archived outside git at `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/` relative to repository root (`/home/ak/RecoverySys`):

| Source ID | Product | Captured File Path (rel. to primary root) | Capture Format | SHA-256 Checksum |
|---|---|---|---|---|
| `fruitychutes-cfc-30-n-standard` | Fruity Chutes CFC-30 Nylon | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/fruitychutes-cfc-30-n-standard.md` | `normalized-markdown` | `38d6c353ab835a8523d6086d29a60a8eb8be4bfab7a7939a7ab2dfdbb537a54f` |
| `fruitychutes-ifc-30-sul-ultralight` | Fruity Chutes Iris 30 Ultralight | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/fruitychutes-ifc-30-sul-ultralight.md` | `normalized-markdown` | `a58bbac41e333da174b7ef4c0a6e46ed6b8b5d37038b06066c12fc7caec036a9` |
| `fruitychutes-ifc-30-s-compact` | Fruity Chutes Iris 30 Compact | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/fruitychutes-ifc-30-s-compact.md` | `normalized-markdown` | `f0b4436486fd2952ed6c28c6b497bf6f5a558dad454f6434a4994d6a3cb7b06a` |
| `fruitychutes-cfc-30-s-compact` | Fruity Chutes CFC-30 Compact | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/fruitychutes-cfc-30-s-compact.md` | `normalized-markdown` | `14b04c142289ca09977cab1c565fc17067d867e417148e5823fb939c507116ea` |
| `rocketman-hp-cd22-standard` | Rocketman High Performance (Standard) | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/rocketman-hp-cd22-standard.md` | `normalized-markdown` | `c605770dbd6a773d442e3f7c8ece01f6e5e76d9f42c380e15887f43688c7285a` |
| `rocketman-hp-cd22-ultralight` | Rocketman Ultra-Light HP | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/rocketman-hp-cd22-ultralight.md` | `normalized-markdown` | `b71e6d7200a2a5aee90bc4f0a910773b695c14a70de190ec5a7b963afc9de2bd` |
| `fruitychutes-how-to-make-a-parachute` | Fruity Chutes Construction Tutorial | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/fruitychutes-how-to-make-a-parachute.md` | `normalized-markdown` | `b04fa352b2d131f192603c61f389a09b843f220de14a4e9891f86a264ce7221b` |

All seven files are preserved outside git with verified SHA-256 checksums and fair use documentation limits.

---

## 6. Bounded Evidence Auditor & Mutation Test Suite

### 6.1. Evidence Auditor (`validate-catalog-decisions.mjs`)
The evidence auditor operates as a strictly bounded, read-only data-driven verification tool:
```bash
node RecoverySys/validation/catalog-review/online-2026-11-05/validate-catalog-decisions.mjs
```

#### Core Capabilities & Protections:
1. **Absolute Path Anchoring (`resolvePrimaryRoot`):**  
   Resolves the primary repository root by evaluating `git rev-parse --git-common-dir` with `{ cwd: __dirname }` and anchoring relative paths against `__dirname`. This eliminates the defect where git returned `../../../../.git` and `resolve` evaluated against the caller's working directory.
2. **Real Byte Hashing:**  
   Computes SHA-256 over raw file bytes (`createHash('sha256').update(actualBytes)`), guaranteeing archive integrity.
3. **Production Catalog & Staged Diff Cross-Check:**  
   Verifies every proposal against actual values in `src/data/parts.js` and staged changes in `primary-pages-2026-11-05-diff.json`.
4. **Deduplication:**  
   Enforces unique `proposalId`s and unique `(catalogId, category, field)` proposal tuples.
5. **Variant & Metadata Consistency:**  
   Verifies that proposals citing standard line sources against ultralight catalog entries are marked `reject` with `REJECT_VARIANT_MISMATCH`, and unconfirmed Iris mappings are marked `hold` with `UNCONFIRMED_HYPOTHESIS`.
6. **Unit Sanity & Conversion Tolerances:**  
   Detects raw ounce numbers erroneously injected into gram fields (e.g. 3.1 in `weight_g`). Verifies exact conversion arithmetic against $28.349523125\text{ g/oz}$.
7. **Dynamic Summary Count Derivation:**  
   Summary statistics are calculated dynamically from the proposals array and compared with recorded summary fields, eliminating hardcoded count assertions.

### 6.2. Negative Mutation Test Suite (`validate-catalog-decisions.test.mjs`)
To prove that the auditor actively rejects invalid evidence and corrupted proposals rather than self-confirming, a comprehensive test suite was implemented using Node's native test runner (`node:test` and `node:assert/strict`):
```bash
node --test RecoverySys/validation/catalog-review/online-2026-11-05/validate-catalog-decisions.test.mjs
```

#### Mutation Tests Implemented:
1. **`Baseline`:** Unmodified authentic packet passes all 215 audit checks with 0 failures.
2. **`Mutation 1 (missingartifact)`:** Synthetic source pointing to a non-existent artifact file fails with `Artifact file not found`.
3. **`Mutation 2 (changedbytes/hash)`:** Synthetic source with altered SHA-256 checksum fails with `SHA-256 mismatch`.
4. **`Mutation 3 (wrongsource/variant link)`:** Proposal linking standard line specs to ultralight catalog chute without reject disposition fails variant check.
5. **`Mutation 4 (ounce-as-gram)`:** Proposal with raw ounce value (3.1) placed into `weight_g` fails with `Ounce-as-gram unit error detected`.
6. **`Mutation 5 (duplicateproposal)`:** Injected duplicate proposal ID or tuple collision fails with `Duplicate proposal detected`.
7. **`Mutation 6 (alteredcurrentvalue)`:** Mutated `currentValue` (99 vs catalog 88) fails with `currentValue does not match catalog value`.

All fixtures in `validate-catalog-decisions.test.mjs` are temporary, synthetic, in-memory objects created exclusively during test execution, never modifying or generating permanent external evidence.

### 6.3. Audit & Test Execution Results
```
> node RecoverySys/validation/catalog-review/online-2026-11-05/validate-catalog-decisions.mjs
Audit Results: 215 passed, 0 failed.
All catalog evidence audit checks PASSED successfully.

> node --test RecoverySys/validation/catalog-review/online-2026-11-05/validate-catalog-decisions.test.mjs
✔ Baseline: Authentic unmodified packet passes all evidence audit checks (7.5ms)
✔ Mutation 1: missingartifact - Detects missing external artifact file (4.1ms)
✔ Mutation 2: changedbytes/hash - Detects SHA-256 hash mismatch / byte mutation (4.1ms)
✔ Mutation 3: wrongsource/variant link - Detects standard-line source linked to ultralight catalog item (3.9ms)
✔ Mutation 4: ounce-as-gram - Detects raw ounce numbers erroneously injected into gram fields (7.6ms)
✔ Mutation 5: duplicateproposal - Detects duplicate proposal ID and tuple collisions (3.8ms)
✔ Mutation 6: alteredcurrentvalue - Detects currentValue tampering or divergence from parts.js (3.9ms)
ℹ tests 7 | pass 7 | fail 0 | duration_ms ~87ms
```

---

## 7. Explicit Manual Boundaries & Disclaimers

The auditor and test suite enforce strict operational boundaries:
1. **Read-Only Scope:** The auditor operates strictly read-only on local repository records and archived evidence files. It performs **no** production catalog writes and enforces **no** production adoption logic.
2. **Archive Integrity vs Live Freshness:** SHA-256 checksums and byte length verify archive integrity against recorded captures. They do **not** prove freshness, live identity, or absence of upstream vendor website changes.
3. **Manual Review Boundary:** Semantic validity of manufacturer marketing claims, hardware rating conventions (breaking strength vs WLL), and aerodynamic flight suitability cannot be automated and strictly requires human engineering review.

---

## 8. Unresolved External Inputs & Limitations

1. **IFC-30-SL Primary Source:** Fruity Chutes primary webstore currently returns HTTP 404 for `ifc-30-sl`. Construction tutorial omits SKU specs. Distributor lists 46 g, catalog lists 45 g. Mapping remains an unconfirmed hypothesis on HOLD pending primary manufacturer documentation.
2. **Rocketman 36" Internal Contradiction:** Rocketman Standard High Performance CD 2.2 product page states both `-20fps @ 7.4lb` (descent rate table) and `Rating: 7lb @ 20fps` (summary line). Clarification from vendor required before any standard line data could be considered.
3. **Hardware Rating Conventions:** Swivel and shroud ratings (600 lb, 1,000 lb, 1,500 lb, 200 lb, 220 lb) do not specify whether they represent ultimate tensile failure or working load limits; conventions are marked unknown.
4. **Checkout Environment Note:** Testing was performed inside the T3 isolated worktree (`/home/ak/.t3/worktrees/RecoverySys/t3-1ac85a51`) across multiple working directory invocations. Verification in the primary repository checkout (`/home/ak/RecoverySys`) will be conducted independently by the parent orchestrator upon merge.
