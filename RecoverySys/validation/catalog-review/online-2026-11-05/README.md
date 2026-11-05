# Online Catalog Evidence, Variant Resolution & Validation Design (Phase 1)

**Date:** 2026-11-05  
**Lane Directory:** `RecoverySys/validation/catalog-review/online-2026-11-05/`  
**Base Pin:** `725d8a0446b9225fbb24a70f1b0065d5cdf70f9f`  
**Execution Context:** T3-isolated checkout, Phase 1 research sub-agent  
**Parent / Integrator:** Primary Orchestrator & Reviewer  
**Status:** **FIRST-DELIVERABLE GATE COMPLETED — STOPPED BEFORE PRODUCTION EDITS**  
**Author Self-Acceptance:** Strictly prohibited by contract. Author accepts zero proposals.

---

## 1. Executive Summary

This deliverable provides primary-source online evidence, variant identity resolution, field-by-field decision proposals, and an executable validation design for the RecoverySys static parts catalog (225 parts in `src/data/parts.js`).

In accordance with `/home/ak/AGENTS.md` and `docs/catalog-sourcing-contract.md`:
- **Production catalog values are UNCHANGED.**
- **Existing source packets, manifests, registers, and handoffs are UNTOUCHED.**
- **All raw downloaded evidence is preserved outside git** at `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/` relative to the primary repository root (`/home/ak/RecoverySys`), verified with SHA-256 hashes.
- **The 14 staged proposals in `primary-pages-2026-11-05-diff.json` were investigated:**
  - **12 REJECTED:** Overwhelming evidence proves they represent **wrong-variant substitutions** (standard 1.1 oz nylon parachutes erroneously matched against ultralight catalog records).
  - **2 HELD:** `cfc-030-n` weight change from 88 g to 87.9 g represents a 0.1 g (0.11%) rounding difference awaiting a catalog-wide floating-point precision policy.
  - **0 ACCEPTED:** Author self-acceptance is prohibited; parent reviewer must decide.

---

## 2. Variant Identity Resolutions

### 2.1. Fruity Chutes `ifc-030-sl` vs `IFC-30-SUL` vs `IFC-30-SL` vs `IFC-30-S`

#### The Issue
Catalog part `ifc-030-sl` currently has:
- `name`: `"30\" Iris Ultralight"`
- `weight_g`: 45
- `packed_diam_in`: 1.9
- `packed_length_in`: 3.2
- `cd`: 2.2
- `shape`: `"flat"`

In `primary-pages-2026-11-05.json`, the author extracted specs from `https://shop.fruitychutes.com/products/iris-30-ultra-light-parachute-2-6lbs-15fps` (SKU `IFC-30-SUL-OB`) and proposed overwriting `packed_diam_in` (1.9 → 1.5 in), `packed_length_in` (3.2 → 4.2 in), and `weight_g` (45 → 38 g).

#### Online Evidence & Diagnosis
Primary source research reveals four distinct 30" annular/toroidal parachute models from Fruity Chutes:
1. **`IFC-30-S` (Iris Ultra Compact):** Standard 1.1 oz ripstop, 200 lb Spectra lines, 725 lb Spectra bridle. Mass: **53.4 g (1.88 oz)**. Pack: **1.9" D × 3.7" L** (10.5 cu in). Matches catalog part `ifc-030-s` (53 g, 1.9" × 3.7").
2. **`IFC-30-SL` (Iris Light):** Specialized lightweight fabric variant. Mass: **45.4–46 g (1.6 oz)**. Pack: **1.9" D × 3.2" L** (9.0 cu in). Matches catalog part `ifc-030-sl` (45 g, 1.9" × 3.2").
3. **`IFC-30-SUL` (Iris Ultralight):** Ultralight 0.7 oz ripstop nylon, 200 lb Spectra lines, Spectra Loop bridle. Mass: **38.0 g (1.34 oz)**. Pack: **1.5" D × 4.2" L** (7.4 cu in). Note: packing volume explicitly assumes deployment-bag packing density (0.18 oz/cu in); traditional fold is ~0.13 oz/cu in.
4. **`IFC-30-SUZ` (Iris Ultra Zero):** Ballistic launcher variant. Mass: **27.7 g**.

#### Finding
Catalog part `ifc-030-sl` has a historical display name mismatch (`"30\" Iris Ultralight"`), but its **part ID (`ifc-030-sl`) and physical dimensions (1.9" × 3.2", 45 g) correspond to `IFC-30-SL` (Iris Light)**.  
Overwriting it with `IFC-30-SUL` (38 g, 1.5" × 4.2") is a **wrong-variant substitution**.

#### Disposition
- **Reject** all 6 proposed changes (main and drogue) for `ifc-030-sl`.
- **Recommendation for Phase 2:** Rename `ifc-030-sl` display name to `"30\" Iris Light (Spectra)"` to eliminate confusion, and optionally create a new, separate catalog record for `ifc-030-sul` (`"30\" Iris Ultralight"`).

---

### 2.2. Rocketman `lp-024` and `lp-036`: Standard vs Ultra-Light Lines

#### The Issue
Catalog records `lp-024` and `lp-036` currently have:
- `lp-024`: `weight_g: 20`, `packed_diam_in: 1.38`, `packed_length_in: 1.57`, `cd: 2.2`, `material: "nylon"`
- `lp-036`: `weight_g: 43`, `packed_diam_in: 1.38`, `packed_length_in: 3.08`, `cd: 2.2`, `material: "nylon"`

In `primary-pages-2026-11-05.json`, the author extracted specs from `https://www.the-rocketman.com/products/rocketman-high-performance-cd-2-2-parachutes` and proposed:
- `lp-024`: `weight_g` 20 → 87.88 g (+339%), `packed_diam_in` 1.38 → 2.0 in, `packed_length_in` 1.57 → 2.75 in.
- `lp-036`: `weight_g` 43 → 136.08 g (+216%), `packed_diam_in` 1.38 → 2.6 in, `packed_length_in` 3.08 → 4.52 in.

#### Online Evidence & Diagnosis
Investigation of Rocketman's primary product catalog revealed that Rocketman manufactures two distinct lines:
1. **Rocketman High Performance CD 2.2 Parachutes (Standard Line):**
   - Fabric: 1.1 oz Mil-Spec Ripstop Nylon (20 Denier).
   - Lines: 1/4" flat-braided nylon (250 lb rated).
   - Swivel: 1,500 lb.
   - 24": 3.1 oz (**87.88 g**), pack **2.0" D × 2.75" L** (8.6 cu in).
   - 36": 4.8 oz (**136.08 g**), pack **2.6" D × 4.52" L** (24.0 cu in).
2. **Rocketman Ultra-Light High-Performance CD 2.2 Parachutes:**
   - Fabric: **0.66 oz Mil-Spec Ripstop Nylon**.
   - Lines: **220 lb (0.039") Spectra**. Center line: 350 lb (0.070") Spectra.
   - 24": 0.7 oz (**19.84 g → rounded 20 g**), pack **1.375" D (~1.38") × 1.569" L (~1.57")** (2.33 cu in).
   - 36": 1.5 oz (**42.52 g → rounded 43 g**), pack **1.375" D (~1.38") × 3.08" L** (4.57 cu in).

#### Finding
The catalog records `lp-024` and `lp-036` **match the Rocketman Ultra-Light line with mathematical certainty** (0.7 oz = 19.84 g → 20 g, 1.375" × 1.569" → 1.38" × 1.57"; 1.5 oz = 42.52 g → 43 g, 1.375" × 3.08" → 1.38" × 3.08").  
The proposed changes were extracted from the **Standard line** (1.1 oz fabric), which is over 3 times heavier. Applying standard values to ultralight records would destroy user mass budgets and recovery calculations.

#### Disposition
- **Reject** all 6 proposed changes for `lp-024` and `lp-036`.
- **Recommendation for Phase 2:** Update display names to reflect their true identity: `"24\" Ultra-Light High Performance CD 2.2"` and `"36\" Ultra-Light High Performance CD 2.2"`. Update material specification from generic `nylon` to `0.66 oz ripstop nylon / Spectra lines`.

---

### 2.3. Rocketman 36" Internal Rating Conflict: Descent Table vs Rating Line

#### Online Evidence & Diagnosis
On the manufacturer product page for Rocketman Standard High Performance CD 2.2 Parachutes:
- Under **Descent Rate Table**:
  - `-15fps @ 4.2lb`
  - `-17fps @ 5.4lb`
  - **`-20fps @ 7.4lb`**
  - `-25fps @ 11.5lb`
- Immediately below the table:
  - **`Rating: 7lb @ 20fps`**

There is a direct **0.4 lb (5.7%) internal contradiction** between the descent rate table (7.4 lb) and the summary rating line (7.0 lb) at 20 ft/s on the manufacturer's own page.

In contrast, the Rocketman **Ultra-Light** 36" product page specifies:
- `Descent Rate: -15fps @ 4.2lb, -17fps @ 5.4lb, -20fps @ 7.4lb, -25fps @ 11.5lb`
- It does **not** contain the conflicting `Rating: 7lb @ 20fps` line.

#### Finding
Neither 7.4 lb nor 7.0 lb should be adopted into standard catalog fields without explicit clarification. The conflict further confirms that standard-line text must not be ingested into the Ultra-Light catalog part.

---

### 2.4. Fruity Chutes `cfc-030-n` (Classic Elliptical Nylon)

#### Online Evidence & Diagnosis
Manufacturer page `https://shop.fruitychutes.com/products/30-elliptical-parachute-3-3lb-20fps` (SKU `CFC-30-N-ST`):
- Nominal diameter: 30 in. Gores: 8.
- Canopy material: 1.1 oz ripstop nylon.
- Shroud lines: 220 lb nylon. Swivel: 1,000 lb.
- Mass: 3.1 oz (87.9 g). Catalog currently has 88 g (nearest integer rounding of 87.8835 g).
- Dimensions: 2.6" D × 3.0" L (15.9 cu in) assuming a tight pack.
- Aerodynamic drag: Published as **`Cd between 1.5 - 1.6`**. Catalog has 1.55 (midpoint).
- Recovery rating: 3.3 lb at 20 fps.

#### Finding
The identity match is verified (HIGH confidence). The proposed change from 88 g to 87.9 g represents a floating-point precision shift (0.1 g). Under `docs/catalog-sourcing-contract.md`, ambiguous ranges must not be converted to invented constants. The current catalog $C_d = 1.55$ serves as an engineering midpoint.

#### Disposition
- **Hold** proposed changes for `weight_g` (main and drogue) pending an established catalog-wide floating-point precision policy.

---

## 3. Engineering Field Distinctions & Standards

| Field / Attribute | Engineering Meaning | Catalog Rule & Sourcing Constraint |
|---|---|---|
| **Nominal Diameter ($D$)** | Reference circular diameter quoted by vendor. | Not necessarily equal to projected aerodynamic diameter ($D_p$). Annular/toroidal chutes have $D_p < D_{flat}$. |
| **Drag Coefficient ($C_d$)** | Dimensionless scaling constant in $F_d = \frac{1}{2} \rho v^2 C_d A$. | **Ranges stay ranges.** If vendor publishes 1.5–1.6, do not invent constants. Toroidal pull-down apex chutes (Iris, Rocketman HP) use $C_d \approx 2.2$; standard elliptical chutes use $C_d \approx 1.5–1.6$. |
| **Material (Canopy & Lines)** | Fabric areal density and fiber type. | 1.1 oz ripstop nylon vs 0.7 oz / 0.66 oz ultralight ripstop. Lines: braided nylon vs high-modulus polyethylene (Spectra). Shroud material directly affects line stretch and shock load absorption. |
| **Shroud Line Rating** | Breaking strength of an individual suspension line. | **NOT the vehicle recovery rating.** E.g., 200 lb Spectra or 220 lb nylon per line across 8 lines provides high multi-line redundancy, but total vehicle rating is governed by canopy area and descent speed (e.g. 2.6–5.0 lb @ 15–20 fps). |
| **Breaking Load vs Working Load** | Ultimate tensile failure vs maximum allowable service load. | Manufacturer hardware ratings (e.g., 600 lb, 1,000 lb, 1,500 lb swivel) are breaking loads. Working load limit (WLL) typically incorporates a 3:1 to 5:1 safety factor. |
| **Weight / Mass** | Total assembly mass in grams. | Conversion: $1\text{ oz} = 28.349523125\text{ g}$. Distinguish integer rounding (e.g. 88 g) from exact decimal conversion (87.88 g → 87.9 g). |
| **Packing Volume & Dimensions** | Packed cylinder diameter and length. | **Packing method dependent.** Fruity Chutes deployment bag density is $0.18\text{ oz/in}^3$; traditional fold/wrap is $0.13\text{ oz/in}^3$. Tight-pack rolls differ significantly from loosely bagged chutes. |
| **Unknowns** | Unverified or unmeasured parameters. | **Unknowns stay unknown.** No synthetic fabrication. |

---

## 4. Proposal Summary & Dispositions

Across the 14 proposals staged in `primary-pages-2026-11-05-diff.json`:

| Proposal ID | Catalog ID | Category | Field | Old | Proposed | Proposed Disposition | Primary Rationale |
|---|---|---|---|---|---|---|---|
| `PROP-20261105-01` | `cfc-030-n` | `main_chute` | `weight_g` | `88` | `87.9` | **HOLD** | Rounding policy (integer 88 vs float 87.9 from 3.1 oz). |
| `PROP-20261105-02` | `cfc-030-n` | `drogue_chute` | `weight_g` | `88` | `87.9` | **HOLD** | Rounding policy (integer 88 vs float 87.9 from 3.1 oz). |
| `PROP-20261105-03` | `ifc-030-sl` | `main_chute` | `packed_diam_in` | `1.9` | `1.5` | **REJECT** | Variant mismatch: overwrites IFC-30-SL with IFC-30-SUL. |
| `PROP-20261105-04` | `ifc-030-sl` | `main_chute` | `packed_length_in` | `3.2` | `4.2` | **REJECT** | Variant mismatch: overwrites IFC-30-SL with IFC-30-SUL. |
| `PROP-20261105-05` | `ifc-030-sl` | `main_chute` | `weight_g` | `45` | `38` | **REJECT** | Variant mismatch: overwrites IFC-30-SL with IFC-30-SUL. |
| `PROP-20261105-06` | `ifc-030-sl` | `drogue_chute` | `packed_diam_in` | `1.9` | `1.5` | **REJECT** | Variant mismatch: overwrites IFC-30-SL with IFC-30-SUL. |
| `PROP-20261105-07` | `ifc-030-sl` | `drogue_chute` | `packed_length_in` | `3.2` | `4.2` | **REJECT** | Variant mismatch: overwrites IFC-30-SL with IFC-30-SUL. |
| `PROP-20261105-08` | `ifc-030-sl` | `drogue_chute` | `weight_g` | `45` | `38` | **REJECT** | Variant mismatch: overwrites IFC-30-SL with IFC-30-SUL. |
| `PROP-20261105-09` | `lp-024` | `main_chute` | `packed_diam_in` | `1.38` | `2.0` | **REJECT** | Variant mismatch: overwrites Ultra-Light with Standard. |
| `PROP-20261105-10` | `lp-024` | `main_chute` | `packed_length_in` | `1.57` | `2.75` | **REJECT** | Variant mismatch: overwrites Ultra-Light with Standard. |
| `PROP-20261105-11` | `lp-024` | `main_chute` | `weight_g` | `20` | `87.88` | **REJECT** | Variant mismatch: overwrites 20 g Ultra-Light with 88 g Standard. |
| `PROP-20261105-12` | `lp-036` | `main_chute` | `packed_diam_in` | `1.38` | `2.6` | **REJECT** | Variant mismatch: overwrites Ultra-Light with Standard. |
| `PROP-20261105-13` | `lp-036` | `main_chute` | `packed_length_in` | `3.08` | `4.52` | **REJECT** | Variant mismatch: overwrites Ultra-Light with Standard. |
| `PROP-20261105-14` | `lp-036` | `main_chute` | `weight_g` | `43` | `136.08` | **REJECT** | Variant mismatch: overwrites 43 g Ultra-Light with 136 g Standard. |

**Disposition Totals:**
- **REJECT:** 12
- **HOLD:** 2
- **ACCEPT:** 0 (Author cannot self-accept)

---

## 5. Raw Artifacts Archive & Provenance

Raw article markdown snapshots were captured using polite web inspection tools and archived outside git at `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/` relative to repository root (`/home/ak/RecoverySys`):

| Source ID | Product | Captured File Path (rel. to primary root) | SHA-256 Checksum |
|---|---|---|---|
| `fruitychutes-cfc-30-n-standard` | Fruity Chutes CFC-30 Nylon | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/fruitychutes-cfc-30-n-standard.md` | `38d6c353ab835a8523d6086d29a60a8eb8be4bfab7a7939a7ab2dfdbb537a54f` |
| `fruitychutes-ifc-30-sul-ultralight` | Fruity Chutes Iris 30 Ultralight | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/fruitychutes-ifc-30-sul-ultralight.md` | `a58bbac41e333da174b7ef4c0a6e46ed6b8b5d37038b06066c12fc7caec036a9` |
| `fruitychutes-ifc-30-s-compact` | Fruity Chutes Iris 30 Compact | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/fruitychutes-ifc-30-s-compact.md` | `f0b4436486fd2952ed6c28c6b497bf6f5a558dad454f6434a4994d6a3cb7b06a` |
| `fruitychutes-cfc-30-s-compact` | Fruity Chutes CFC-30 Compact | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/fruitychutes-cfc-30-s-compact.md` | `14b04c142289ca09977cab1c565fc17067d867e417148e5823fb939c507116ea` |
| `rocketman-hp-cd22-standard` | Rocketman High Performance (Standard) | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/rocketman-hp-cd22-standard.md` | `c605770dbd6a773d442e3f7c8ece01f6e5e76d9f42c380e15887f43688c7285a` |
| `rocketman-hp-cd22-ultralight` | Rocketman Ultra-Light HP | `../RecoverySys-artifacts/online-validation-2026-11-05/catalog/rocketman-hp-cd22-ultralight.md` | `b71e6d7200a2a5aee90bc4f0a910773b695c14a70de190ec5a7b963afc9de2bd` |

---

## 6. Validation Design: Executable Falsifier Test Suite

To guarantee that invalid proposals cannot slip into the production catalog during Phase 2, an executable test suite has been created:
```bash
node RecoverySys/validation/catalog-review/online-2026-11-05/validate-catalog-decisions.mjs
```

### Falsifier Coverage:
1. **Wrong-Variant Substitution Falsifier:**
   - Detects mass or volume shifts exceeding 50% between candidate source records and existing catalog records.
   - Specifically asserts that `lp-024` (+339%), `lp-036` (+216%), and `ifc-030-sl` are rejected.
2. **Unit Mistake Falsifier:**
   - Checks that numerical mass values in grams correspond to physical reality (>10 g for large parachutes), catching raw ounce values (e.g. 0.7 or 3.1) injected into gram fields.
3. **Stale/Failed Fetch Falsifier:**
   - Verifies that all cited raw artifacts exist, are substantive (>500 bytes), match recorded SHA-256 checksums exactly, and do not contain rate-limiting strings (`local_rate_limited`, `429 Too Many Requests`).
4. **Range Preservation & Destructive Overwrite Falsifier:**
   - Checks that ambiguous manufacturer ranges (such as CFC-30 $C_d \in [1.5, 1.6]$) are retained as ranges without inventing constants.
   - Enforces that author self-acceptance is 0.

**Execution Result:**
```
Results: 65 passed, 0 failed.
All catalog validation design falsifiers PASSED successfully.
```

---

## 7. External Vendor Clarification Needed (No Contact Made)

The following items represent manufacturer ambiguities requiring future clarification:

1. **Rocketman Parachutes:**
   - **Internal rating contradiction:** Product page for 36" High Performance CD 2.2 lists both `20fps @ 7.4lb` in the descent rate table and `Rating: 7lb @ 20fps` in the summary text. Clarification needed on which rating is canonical.
   - **Catalog naming conventions:** Rocketman separates the "Ultra-Light" line from the "High-Performance CD 2.2" line. Clarification on whether legacy part IDs `lp-024` and `lp-036` are universally recognized as Ultra-Light.
2. **Fruity Chutes:**
   - **IFC-30-SL vs IFC-30-SUL distribution:** Fruity Chutes offers IFC-30-S (Ultra Compact, 53.4 g), IFC-30-SL (Light, 45.4 g), and IFC-30-SUL (Ultralight, 38 g). Clarification on current commercial availability of the SL line versus SUL line.

*No external contact was made, honoring autonomous execution rules.*

---

## 8. Gate 1 Questions & Phase 2 Recommendations for Parent Orchestrator

1. **Precision Policy Decision:** Does the parent reviewer approve adopting floating-point precision for mass (`87.9 g` vs integer `88 g`) for `cfc-030-n`?
2. **Catalog Part Expansion vs In-Place Correction:**
   - For `ifc-030-sl`: Should `ifc-030-sl` be renamed `"30\" Iris Light (Spectra)"` (retaining its 45 g / 1.9" × 3.2" dimensions) and a new part `ifc-030-sul` created for the 38 g / 1.5" × 4.2" Iris Ultralight?
   - For `lp-024` / `lp-036`: Should the catalog name be updated to explicitly include `"Ultra-Light"` to reflect their actual physical identity?
3. **Rollback & Provenance Logging:** When approved changes are staged, `src/data/catalogProvenance.js` must record prior values, source URLs, access dates, reviewer identity, and review date.
