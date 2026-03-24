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

