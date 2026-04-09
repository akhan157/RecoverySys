# TODOS.md — RecoverySys
Last updated: 2026-03-24 by /plan-ceo-review

## v2 — Physics & Simulation

### TODO: Altitude-dependent wind model
**What:** Replace the single `wind_speed_mph` input with an altitude-banded wind profile.
**Why:** Current drift formula (`drift_ft = apogee_ft / rate × wind_fps`) uses a constant wind speed from launch to landing. Real wind varies significantly with altitude — apogee wind can be 3-5x ground wind. This causes drift prediction errors on high-altitude flights.
**Pros:** More accurate drift prediction; matches ARS reference engine's wind model.
**Cons:** Adds a new UI input (wind profile instead of single speed); increases form complexity.
**Context:** ARS reference engine (`Jeffrey Version`) reads altitude-dependent wind with meridional and zonal components. v2 could add a "Wind Profile" input with altitude-banded speeds (e.g., 0-1000ft, 1000-5000ft, 5000ft+). This is purely a `rocket_specs` + `simulation.js` change — zero parts catalog changes needed.
**Effort:** M → with CC+gstack: S
**Priority:** P2
**Depends on:** None

---

### TODO: Accurate apogee via thrust-curve integration
**What:** Replace the `(impulse/mass) × 0.5` heuristic with numerical integration of the powered flight phase using motor thrust curves.
**Why:** The v1 heuristic has ±30% error. For an L3 flyer trying to hit a specific field or stay within a flight zone, 30% error on a 5000ft apogee = ±1500ft. That's the difference between a field and a tree line.
**Pros:** Eliminates the ±30% label from the UI; enables meaningful apogee prediction; unlocks Monte Carlo sims.
**Cons:** Requires a `motors` parts category (manufacturers, designations, thrust curves — significant data entry into `parts.js`); adds powered-phase simulation complexity to `simulation.js`.
**Context:** v1 uses `motor_total_impulse_ns` as a user-entered scalar in `rocket_specs`. v2 needs a `motors` category in `parts.js` with thrust curve data (RASP format from ThrustCurve.org). The physics engine adds a `simulateAscent()` function alongside the existing `simulateDescent()`. This also enables RocketPy integration. Parts catalog work is the main bottleneck — the physics change itself is ~200 LOC.
**Effort:** XL → with CC+gstack: L
**Priority:** P1
**Depends on:** Motor parts catalog entries in parts.js

---

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

### TODO: Main-deploy vs apogee sanity check in SimPanel
**What:** Post-sim banner: ERROR if `main_deploy_alt_ft >= apogee_ft`, WARN if drogue phase < 500ft or drogue time < 5s.
**Why:** A misconfigured deploy altitude can mean the main chute never fires — currently silent. Users catch this only by reading the numbers.
**Pros:** Prevents a common setup mistake; zero logic change to sim engine.
**Cons:** None.
**Context:** Needs access to `simulation.apogee_ft`, `simulation.deploy_ft`, and `simulation.phase1_time_s`. Render as a banner above the stat cards in SimPanel (reuse existing warn-bg/error-bg CSS vars).
**Effort:** XS → with CC+gstack: XS
**Priority:** P1
**Depends on:** None

---

### TODO: Ascent arc in FlightChart
**What:** Prepend ascent trajectory points to the chart timeline so the full flight arc (liftoff → apogee → landing) is visible.
**Why:** Current chart starts at apogee; users can't see the ascent profile or motor burn point.
**Pros:** Shows the complete flight; enables a BURN marker at motor burnout.
**Cons:** Ascent timeline is already computed in `integrateAscent()` and included in the `timeline` array returned by `runSimulation()` — no physics change needed. Only FlightChart.jsx needs updating.
**Context:** The `ascentTimeline` is already merged into `simulation.timeline` in `runSimulation()`. FlightChart just needs to render a BURN event marker at `simulation.burnout_t_s`. Add it to the `events` array in FlightChart.jsx.
**Effort:** XS → with CC+gstack: XS
**Priority:** P2
**Depends on:** None

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

