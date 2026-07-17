# RecoverySys Roadmap

## Strategy

RecoverySys is a **recovery-first, high-confidence HPR planning tool**: more useful and actionable than a collection of calculators, but deliberately narrower and more transparent than a full flight simulator. General HPR remains the product core. AeroBing is an early validation context and source of representative workflows—not a reason to make the product AeroBing-specific.

Near-term release stabilization is separate from longer-term physics validation and differentiated workflow development. We earn trust before expanding scope.

## Phased outcomes

### 1. Stabilize the release

- Make the current planning, compatibility, simulation, persistence, share-link, and export paths reliable.
- Preserve clear warnings, assumptions, units, and failure states; avoid silently optimistic results.
- Establish a small regression suite of representative HPR configurations, including AeroBing scenarios.

**Success:** a builder can complete and share a recovery plan repeatedly without data loss, confusing state, or unmarked invalid inputs.

### 2. Validate the planning model

- Compare apogee, descent, drift, deployment, and load outputs against trusted reference calculations and field/test cases.
- Record model boundaries and confidence by input quality and simulation method.
- Prioritize validation and refinement of thrust-curve ascent and layered-wind modeling, plus better load modeling, where evidence shows material risk.

**Success:** results have documented error ranges, reproducible reference cases, and explicit “insufficient confidence” behavior rather than false precision.

### 3. Differentiate the recovery workflow

- Optimize for decisions flyers actually make: select compatible recovery hardware, check packing and loads, compare scenarios, understand landing footprint, and produce a usable plan/checklist.
- Add guided suggestions, tradeoff views, and uncertainty-aware outputs only where they improve those decisions.
- Use AeroBing feedback to validate workflow quality while keeping terminology, parts, and assumptions general to HPR.

**Success:** users can move from rocket inputs to a defensible recovery configuration faster than with disconnected calculators, and can explain why the recommendation is safe enough to review.

## Explicit deferrals

- A full vehicle simulator, 6-DOF aerodynamics, stability/rail-exit analysis, and detailed motor/airframe performance modeling.
- Becoming an AeroBing-specific product or building a one-off customer workflow that weakens general HPR usefulness.
- Accounts, backend persistence, collaboration, and a broad hosted motor/parts database.
- Advanced optimization/automation before the underlying models and reference data are validated.

## Current technical trust gaps

- Apogee confidence depends heavily on user-entered scalar inputs when a trusted thrust curve is unavailable; the scalar path can be materially inaccurate. Curve integration is newer and still needs reference validation.
- Drift uses a simplified layered-wind interpolation; the displayed uncertainty is not a measured confidence interval and does not capture full atmospheric variation.
- Shock-cord checks use a static load approximation rather than a dynamic deployment/snatch-load model.
- Catalog specifications are hand-maintained and may become stale or lack provenance; imported/API motor data also needs defensible validation and traceability.
- There is not yet a sufficiently broad, versioned validation corpus covering real HPR configurations, edge cases, and agreement with trusted tools or flight data.

Until these gaps are reduced, RecoverySys should present itself as a transparent recovery planning aid—not an authority that replaces engineering judgment, certification requirements, or validated flight simulation.
