# TODOS.md — RecoverySys
Last updated: 2026-07-17 — v1.2.0.0 release cleanup

## Shipped in 1.2.0.0

- **Thrust-curve ascent integration** — custom `.eng` motor curves are parsed and used by `integrateAscent()` for powered-flight simulation; scalar burn-time integration remains available when no curve is supplied.
- **Layered wind drift model** — surface, mid, and aloft wind inputs are interpolated by altitude during drift calculation, with wind direction and launch coordinates used for landing prediction.

## v2 — Physics & Simulation

### TODO: Dynamic snatch load model for shock cords
**What:** Replace the static `mass × G_factor × 9.81` shock load formula with a dynamic impulse-based model that integrates deployment force over cord stretch duration.
**Why:** The static formula assumes instantaneous load application. In reality, the cord stretches over time, and the peak snatch force depends on deployment velocity, cord spring constant, and damping. Kevlar's low elongation makes this especially relevant — the static formula may underestimate or overestimate depending on conditions.
**Pros:** More accurate safety factor; directly comparable to test data from cord manufacturers.
**Cons:** Requires deployment velocity (= drogue descent rate at main deploy altitude — we have this from the sim) and accurate spring constants (k values) per cord. Significantly more complex than the current model.
**Context:** Current v1 implementation uses `peak_load_lbs = mass_kg × G_factor × 9.81 / 4.448` with a material-tiered safety factor threshold (nylon ≥4, kevlar ≥8). A dynamic model would compute `F_snatch = m × v² / (2 × δ_max)` where δ_max = cord_length × elongation_pct. This is a `simulation.js`-only change once elongation data is in parts.js.
**Effort:** M → with CC+gstack: S
**Priority:** P2
**Depends on:** elongation_pct already added to parts.js in v1.1 shock cord feature

---

## v2 — Flight Visualization & Diagnostics

*(No open items — P1 deploy sanity banners and P2 full ascent arc shipped in v1.2.0.0)*

---

## v2 — Parts Catalog

### TODO: Parts catalog update tooling
**What:** A lightweight way to update `src/data/parts.js` when manufacturers publish new specs or products.
**Why:** The v1 parts catalog is a hand-maintained static JS array. When Featherweight releases firmware that changes voltage range, or Fruity Chutes repackages their 36" chute, the catalog goes stale. Currently requires a developer to hand-edit the JS object.
**Pros:** Non-developer domain expert can validate spec changes; reduces time-to-accuracy; catches schema drift early.
**Cons:** Another tool to maintain.
**Context:** The simplest approach is a JSON schema (`parts-schema.json`) + a validator script (`scripts/validate-parts.js`) that CI can run. A future enhancement could be a form-based editor that writes valid entries to `parts.js`. No backend needed — the catalog is client-side static data.
**Effort:** S → with CC+gstack: S
**Priority:** P3
**Depends on:** None

---

