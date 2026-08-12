# RecoverySys Product Roadmap

**Roadmap revision:** 2026-08-12
**Current branch:** `main`
**Current release:** `1.2.0.1`

This is the high-level source of truth for product direction and progress. The
detailed implementation plans remain useful, but they are subordinate to this
document and the complete strategy brief:

- [`PRODUCT-STRATEGY-BRIEF.md`](PRODUCT-STRATEGY-BRIEF.md) - complete product definition, requirements outline, feature breakdown, acceptance criteria, metrics, risks, release strategy, and six-phase roadmap.
- [`docs/v2-execution-plan.md`](docs/v2-execution-plan.md) - validation, evidence, trust, and release gates.
- [`docs/v3-plan.md`](docs/v3-plan.md) - guided first-plan experience, UI remediation, E2E coverage, and external evidence.
- [`docs/ui-redesign-plan.md`](docs/ui-redesign-plan.md) - screen-by-screen interface implementation.
- [`docs/analysis-tab-redesign-plan.md`](docs/analysis-tab-redesign-plan.md) - Analysis semantics and cause-to-consequence review.
- [`docs/recovery-workflow-roadmap.md`](docs/recovery-workflow-roadmap.md) - earlier recovery-workflow framing.
- [`TODOS.md`](TODOS.md) - small technical backlog; do not use it as the product priority order.

## Product Direction

RecoverySys is a **local-first recovery-planning instrument for high-power
rocketry**. Its job is to help a technically fluent user move from rocket and
recovery inputs to a current, reviewable, traceable recovery plan.

The product should be more useful than a collection of disconnected calculators,
but narrower and more honest than a full flight simulator. It should explain
what was calculated, what may change the result, what remains unresolved, and
what needs independent engineering, manufacturer, field, or range review.

RecoverySys does not authorize a launch, certify hardware, establish flight
readiness, or replace independent review. Confidence states describe evidence
and input posture, not probability of success or a safety score.

**North-star goal:** Make RecoverySys the clearest and most trustworthy
local-first recovery-planning review instrument for high-power rocketry by
moving a planner from inputs to a current, traceable, independently reviewable
decision without overstating what the model or evidence can prove. The six
phase goal plan is defined in
[`PRODUCT-STRATEGY-BRIEF.md`](PRODUCT-STRATEGY-BRIEF.md#15-six-phase-product-roadmap).

## How To Use This Roadmap

Use the milestone progress map and the execution order to decide what to build
next. A milestone is complete only when its exit criteria and evidence are met,
not when the code exists or a design document is written.

When work changes a contract, also update the relevant detailed plan, tests,
migrations, and release notes. Record the implementing commit and verification
date in this document when a milestone changes state.

### Status Legend

- **Current** - working in the product today and supported by tests or artifacts.
- **Partial** - some implementation exists, but the promised workflow or contract is incomplete.
- **Planned** - designed or specified, but not integrated into the product.
- **External gate** - cannot be completed by code alone; requires independent review, hardware, or field evidence.
- **Deferred** - intentionally outside the near-term product boundary.

## Milestone Progress Map

The roadmap is dependency-ordered, but implementation has progressed across
M0-M6 in parallel. Crossed-out bullets inside a milestone represent verified
increments, not a completed milestone. A milestone remains partial until its
full exit criteria and evidence gates pass.

| Milestone | Status | Verified progress | Main remaining gate |
| --- | --- | --- | --- |
| M0 | Partial | Local formatting, lint, tests, build, and validation gates | Supported Node 22 run, ledger reconciliation, and contract inventory |
| M1 | Partial | 14 review cases and seeded dispersion support | Broader corpus, provenance, and independent evidence |
| M2 | Partial | Canonical contracts and Analysis semantic slice | Stale-result closure and cross-artifact parity |
| M3 | Partial | Cause-to-consequence Analysis surface | Full Analysis UX/accessibility closure; broader UI remains deferred |
| M4 | Partial | On-screen Brief and separate Brief/Checklist print artifacts | Evidence transfer and import/export/share/Flight Log parity |
| M5 | Partial | GuidedReview entry, guided state paths, and qualification coverage | Full supported-runtime critical-path qualification |
| M6 | Partial | Local qualification gates and print-media inspection | Node 22, Windows, macOS, transfer, and external-evidence gates |
| M7 | Deferred | No promoted model changes | Evidence-backed model decision |
| M8 | Deferred research | Python research engine exists but remains disconnected | M6, M7, comparison, security, privacy, and packaging gates |
| M9 | Deferred | No committed expansion work | Future product decision after trust-centered workflow stabilizes |

## Current Baseline

The current branch is a consolidated checkpoint. It includes the main v1.2
planning workflow and substantial v2 trust foundations, but it is not yet a
fully qualified v2/v3 release.

### Working Today

- Recovery-bay configuration using a 225-part catalog, custom parts, packing-volume checks, component compatibility, and deployment checks.
- Rocket, motor, airframe, deployment, wind, and launch-location inputs.
- Scalar ascent estimation, imported RASP `.eng` thrust-curve integration, ISA atmosphere, descent, layered-wind drift, landing energy, and static/linear-elastic load screening.
- ThrustCurve motor search and local `.eng` import.
- Result freshness and simulation identity, mission-envelope checks, evidence posture, confidence states, deterministic sensitivity analysis, and dispersion mapping.
- Local persistence, schema migrations, share links, JSON import/export, custom motor/part round trips, configuration comparison, and a local Flight Log.
- Versioned Recovery Brief view-model and print output, with separate Recovery Brief and Recovery Checklist print artifacts.
- Guided first-plan entry through `GuidedReview.jsx`, including new, resume, import, pause, start-fresh, stale, and insufficient-confidence paths, while preserving direct expert-tab navigation.
- Web deployment and Tauri desktop packaging foundations, including a Windows portable build and an unverified macOS universal build path.

### Not Yet Complete

- Fourteen review-only validation cases now exist, including scalar and curve representative end-to-end plans plus descent unit-conversion, invalid-input edge, and metamorphic coverage. There are no accepted comparison cases or real-flight evidence cases.
- Catalog provenance is still primarily manufacturer-level and unverified; per-part source review is not complete.
- The Analysis tab has the integrated cause-to-consequence review surface and canonical semantic support, but stale-result closure, cross-artifact parity, and broader application redesign remain incomplete.
- `DetailsTab.jsx` and `MethodDetailsTab.jsx` remain snapshot/prototype work outside the GuidedReview integration.
- Sensitivity coverage is incomplete; dispersion accepts an explicit safe-integer seed for reproducible runs while retaining stochastic behavior without a seed. Broader dispersion validation and cross-unit influence ranking remain incomplete.
- The versioned Recovery Brief is available on screen, and separate brief/checklist print modes are implemented. Chromium print-media qualification verifies that each mode exposes only its intended artifact sections and that stale estimates remain withheld; broader screen/export/import/share and Flight Log parity remains incomplete.
- Flight evidence is stored locally, but candidate-evidence export and external review intake are not complete.
- `engine/` contains a FastAPI/SciPy RK45 research implementation, but it is not wired into the app, not validated as a second production authority, and not bundled into desktop builds. See [`M8-architecture-decision-report.md`](M8-architecture-decision-report.md) for the deferred-engine decision and security evidence.
- The 2026-08-11 qualification record documents the verified M5 guided branch and M6 local gates. Local verification uses Node 26; CI remains pinned to Node 22. The current branch is `c863eff` on `main`; supported-runtime, platform, transfer-parity, and external-evidence gates remain open.

### Baseline Evidence Snapshot

Observed on 2026-08-12 at current `main` HEAD `c863eff`. Items marked as
qualification-record evidence were verified on 2026-08-11; the unit-test and
production-build rows were re-run locally on 2026-08-12.

| Check | Result |
| `git status` | Clean at `c863eff` on `main`, tracking `origin/main` |
| `npm run validate:parts` | Qualification record: passes; 225 parts |
| `npm run validate:corpus` | Qualification record: passes; 14 review cases |
| `npm test` | Passes; 34 files and 281 tests |
| `npm run lint` | Qualification record: passes with zero warnings |
| `npm run format:check` | Qualification record: passes |
| `npm run build` | Passes |
| `npm run e2e` | Qualification record: 36/36 on desktop and Pixel 5 mobile Chromium |
| `npm test -- --run src/test/PrintChecklist.brief.test.jsx` | Qualification record: 3/3 pass after print qualification |
| `npm run e2e -- e2e/phase2.spec.js` | Qualification record: 10/10 across Chromium desktop and Pixel 5 |
| `npm run check` | Qualification record: passes after print qualification |

The 2026-08-11 qualification record is [`docs/release-qualification-2026-08-11.md`](docs/release-qualification-2026-08-11.md). It records the verified M5 guided first-plan increment and M6 local gates, including print artifact media inspection, while keeping supported-runtime, Windows, macOS, independent, and remaining transfer-parity gates open.

This snapshot verifies the consolidated implementation locally. Broader
cross-artifact, clean-install, platform, and external evidence gates remain
open.

## Delivery Sequence

The core product roadmap has six phases. M0 through M6 are grouped so the
release path stays legible; M7 through M9 are deferred tracks after the core
release boundary. The dependency-ordered execution plan and parallel-work
lanes are defined in the [Execution Order](#execution-order) section below.

```text
Phase 1 Trust foundation (M0 + M1)
  -> Phase 2 Canonical semantics (M2)
      -> Phase 3 Decision-first workflow (M3)
          -> Phase 4 Recovery Brief and evidence loop (M4)
              -> Phase 5 Guided first plan (M5)
                  -> Phase 6 Release qualification (M6)

Phase 1 + Phase 2 -> M7 Evidence-led model decisions
Phase 6 + M7 -> M8 Advanced engine and optional compute architecture
M8 -> M9 Longer-term expansion, only if product scope still supports it
```

The complete phase goals and exit criteria are in
[`PRODUCT-STRATEGY-BRIEF.md`](PRODUCT-STRATEGY-BRIEF.md#15-six-phase-product-roadmap).

## Milestones

### M0 - Green Baseline And Reconciliation

**Priority:** P0
**Status:** Partial
**Goal:** establish one trustworthy starting point before adding more product
behavior.

Work:

- Restore formatting and lint checks for the current branch.
- Re-run the supported CI matrix, including the existing Playwright suite, from a clean install.
- Decide whether Node 26 is supported locally or whether the test harness should explicitly use the CI-supported Node 22 line.
- Reconcile the v2 completion ledger with actual implementation and evidence.
- Resolve the documentation conflict between future-facing confidence posture and implemented confidence modules.
- Inventory stored and transferred contracts: local storage, share links, JSON, simulation envelopes, briefs, and flight records.
- Choose one transparency direction for integration. Keep the other snapshot branches as archives; do not merge all three prototypes.
- Track dependency audit findings separately from feature work.

**Exit criteria:** `npm ci`, `npm run check`, `npm run e2e`, and `git diff --check`
pass on the supported CI runtime; the roadmap ledger and detailed plans agree
with the code; selected prototype work has an explicit keep/replace/archive
decision.

### M1 - Validation And Evidence Foundation

**Priority:** P0
**Status:** Partial; external gate (seeded dispersion fixtures implemented;
broader validation and evidence gates remain).
**Goal:** know which outputs are covered by which kind of evidence before making
stronger product claims.

Work:

- Expand the corpus beyond the current 14 review cases with explicit atmosphere,
  ascent-domain, additional unit-conversion, edge-case, metamorphic, and
  representative end-to-end coverage.
- Add deterministic machine-readable case summaries and coverage by output domain.
- Seed dispersion runs and make stochastic fixtures reproducible; explicit seeded dispersion fixtures now exist, while broader stochastic fixture coverage remains incomplete.
- Document tolerance derivation, input equivalence, units, model identity, and scope for every case.
- Promote cases to `accepted-for-comparison` only after independent review metadata exists.
- Add per-part catalog source metadata and a deterministic provenance report.
- Define the source metadata and review contract that any future automated catalog sourcing must satisfy.
- Keep real-flight records separate from accepted validation evidence.

**Exit criteria:** every production output has at least invariant coverage;
important domains have reviewed analytic or simulator comparisons; no UI text
implies stronger evidence than the corpus supports; per-part unverified status is
visible wherever it affects a conclusion.

**External gates:** independent reviewer identity, trusted simulator artifacts,
manufacturer/test data, and traceable flight observations cannot be produced by
implementation alone.

### M2 - Canonical Result Semantics

**Priority:** P0
**Status:** Partial; canonical contracts and the Analysis slice are integrated; stale-result closure and cross-artifact parity remain
**Goal:** make every result, warning, threshold, and evidence state mean the same
thing across calculation, UI, print, export, and flight records.

Work:

- Centralize domain assessments with value, unit, freshness, validity, envelope, evidence, reason codes, and method/policy identity.
- Replace message-derived compatibility codes with authored stable finding codes.
- Centralize threshold criteria and exact boundary behavior.
- Make stale results unusable for conclusions, comparisons, briefs, and flight-log predictions; resolve the current stale-brief behavior.
- Separate invalid, unsupported, unknown, conditional, sensitivity-flagged, and insufficient-confidence states.
- Replace aggregate cross-unit sensitivity ranking with per-output model response and defensible criterion crossings only.
- Remove prohibited or overstated labels such as `SAFE`, `REVIEWED`, `PRELIMINARY CHECKS PASS`, and unsupported confidence-interval language.

**Exit criteria:** screen-independent tests prove semantic parity at exact
boundaries; no surface invents its own physics or status classification; stale
and unknown data cannot render as a reassuring conclusion.

### M3 - Decision-First Workflow And Analysis Rebuild

**Priority:** P1
**Status:** Partial; Analysis tab finalization integrated; broader UI deferred

**Scope boundary:** The minimum approved UI/UX target is a production-ready
Analysis tab. The broader Dashboard, compatibility, Simulation, Dispersion,
Compare, Flight Log, and whole-application redesign remains deferred until
explicit approval is given; do not start that wider sequence implicitly.

**Goal:** rebuild the front end around the decision a reviewer needs to make,
with the Analysis tab as the primary semantic and interaction redesign rather
than a cosmetic refresh.

Primary work, in the order defined by [`docs/ui-redesign-plan.md`](docs/ui-redesign-plan.md):

- Add a shared plan/result strip for plan identity, completeness, currentness, and the next action.
- Add reusable result status, review links, review summaries, accessible disclosures, and canonical finding rows.
- Rebuild compatibility review around errors, warnings, remediation, affected inputs, and source classification.
- Restore Flight Profile as the dominant Simulation visual with explicit responsive sizing.
- Rebuild Analysis as a cause-to-consequence board: driver -> affected outcome -> finding -> next action. This replaces the current equal-weight dossier layout; it is not an incremental card or copy polish pass.
- Apply current/stale semantics consistently to Dispersion and Compare.
- Keep Flight Log observations distinct from interpretation and validation.
- Complete keyboard, mobile, focus, contrast, reduced-motion, and no-color-only status behavior.

#### Analysis Tab Rebuild

The Analysis tab becomes the primary review surface after a simulation. Its first
viewport must answer: **what needs review, what outcome it affects, why it
matters, and what should be checked next?**

Implement it in this order:

1. **Semantic foundation:** consume the canonical assessments, criteria, finding codes, freshness, evidence, and sensitivity view models from M2. Analysis must not define its own physics constants, thresholds, or status meanings.
2. **Result usability strip:** show `Not run`, `Stale`, or `Current`, the reason, model identity, and the correct action to run, rerun, or review a specific input.
3. **Review summary:** show errors, warnings, not-evaluated domains, and only defensible decision-criterion crossings. Never infer a positive state from an empty warning list.
4. **Causality board:** show driver, affected recovery outcome, finding or unknown state, and a direct action such as `Review main deployment altitude` or `Review shock-cord rating`.
5. **Tested model response:** show per-output ranges and assumptions without cross-unit influence scores, probability language, or confidence-interval claims.
6. **Progressive detail:** keep formulas, intermediate values, provenance, evidence IDs, scenario tables, and method notes available behind accessible disclosures.
7. **Responsive/accessibility closure:** preserve the same order on mobile, keep primary content out of horizontal tables, maintain 44px targets, focus destinations, live status text, and reduced-motion behavior.

Move the complete flight timeline to Simulation and detailed packing review to
the canonical compatibility surface. Remove or replace unsupported labels such
as `SAFE`, `REVIEWED`, `PRELIMINARY CHECKS PASS`, and ambiguous `BLOCKED` states.

The detailed implementation contract is [`docs/analysis-tab-redesign-plan.md`](docs/analysis-tab-redesign-plan.md). The Analysis rebuild is gated on M2
semantic contracts and gates M4 artifact parity; it should be implemented before
the guided onboarding so onboarding teaches the same review language as the
expert workflow.

**Exit criteria:** an experienced user can identify what needs review, why it
matters, and where to go next from the first viewport; desktop and Pixel 5 paths
have no clipped actions, lost focus, or primary-content overflow. Analysis,
Simulation, compatibility review, the Recovery Brief, print, and Flight Log
agree on finding codes, values, currentness, and unresolved review actions.

### M4 - Recovery Brief And Evidence Loop

**Priority:** P1
**Status:** Partial

**Completed increments:** Print output scopes Simulation Results to the checklist
artifact only; stale estimates remain withheld; and Chromium print-media
inspection verifies distinct Recovery Brief and Recovery Checklist artifact
sections. M4 remains Partial because screen/export/import/share parity and the
evidence-loop gates remain open.

**Goal:** turn a current plan into one traceable handoff artifact and preserve
later observations without promoting them automatically to evidence.

Work:

- [x] Build the on-screen Recovery Brief from the same versioned view model as print.
- [x] Separate `Print recovery brief` from `Print checklist` instead of routing both to the same document.
- Include identity, generated time, currentness, mission envelope, hardware, deployment sequence, key estimates, sensitivity, evidence, unresolved checks, and review boundaries.
- Rename and label the bay list as a static planning/checklist order. It is not measured packing geometry, an assembly instruction, or flight-readiness validation.
- Keep packing-volume screening separate from the static order.
- Add candidate-evidence export/intake for Flight Log records with source, units, conditions, reviewer status, and immutable prediction identity.
- Verify import/export/share migration behavior and print parity in fresh browser contexts; print-mode separation is qualified, while transfer parity remains open.

**Exit criteria:** screen, print, export, and imported artifacts agree on values,
identity, status, units, and unresolved checks; stale artifacts cannot appear
current; local flight observations never upload or auto-promote.

### M5 - Guided First-Plan Onboarding

**Priority:** P1
**Status:** Partial; guided branch qualification increment verified; full critical-path qualification remains open
**Goal:** help a first-time user reach a reviewable brief without weakening the
expert workflow or hiding assumptions.

Flow:

1. Start and scope: new plan, demo, import, or resume.
2. Rocket and motor: required values, curve/scalar choice, and why inputs matter.
3. Recovery hardware: main, drogue, harness, provenance, and custom values.
4. Deployment and weather: altitude, wind profile, direction, and missing inputs.
5. Simulate and review: currentness, envelope, findings, sensitivity, and evidence posture.
6. Recovery Brief: unresolved checks and independent-review boundaries.

Requirements:

- Users can pause, resume, import, start fresh, or skip optional information without data loss.
- Required, optional, defaulted, catalog, and user-supplied values are explicit.
- Existing direct-navigation tabs remain available for experienced users.
- Demo data is never confused with the user's own plan.

**Exit criteria:** deterministic desktop and mobile flows cover new, resume,
import, invalid, stale, and insufficient-confidence paths; keyboard users can
complete the critical path; guided completion never implies approval or flight
readiness.

### M6 - Release Qualification

**Priority:** P0 at release boundary
**Status:** Partial; local qualification gates pass, including print artifact media
inspection; platform, transfer-parity, and external gates remain

Release gate:

- Clean-install formatting, parts validation, corpus validation, lint, unit tests, build, and Playwright E2E.
- Representative fresh, stale, invalid, out-of-envelope, conditional, sensitivity-flagged, and insufficient workflows.
- Full import/export/share migration matrix, print artifact inspection, and no current/stale or unit mismatch.
- Windows portable artifact launches and its hash is recorded.
- macOS artifact is verified on macOS before a macOS support claim; otherwise it remains unverified.
- Accessibility, copy, privacy, provenance, and prohibited-claim review are complete.
- Documentation, changelog, release notes, and version identities match the shipped artifacts.

**Exit criteria:** all required gates pass from a clean install and every
remaining external limitation is stated in the release documentation.

### Blocked External Milestones

The following gates remain open and are not represented as completed by the local
verification above:

- **Independent evidence:** no accepted comparison cases, independent reviewer
  identity, trusted simulator artifact, manufacturer/test dataset, or traceable
  real-flight observation has been supplied. The 14 current corpus cases remain
  review-only.
- **macOS qualification:** no macOS host run has verified the universal artifact;
  macOS support remains unverified.
- **Windows release artifact:** the historical portable build is documented, but
  the integrated checkpoint still requires a fresh Windows launch and hash check.
- **Supported-runtime release run:** local checks used Node 26 with a file-backed
  `localStorage`; a clean-install Node 22 CI-equivalent run remains a release gate.


### M7 - Evidence-Led Model Decisions

**Priority:** P2
**Status:** Deferred until evidence is sufficient
**Goal:** improve the model only when a reproducible, decision-relevant gap is
shown.

Candidate domains:

- Thrust-curve ascent and scalar fallback.
- Layered wind and dispersion.
- Descent/inflation assumptions.
- Landing energy.
- Static/linear-elastic snatch screening versus a dynamic model.

For every proposed physics change: reproduce the discrepancy, verify units and
reference assumptions, measure decision impact, choose whether to retain,
narrow, add uncertainty, or change the model, then update model identity,
assumptions, corpus cases, stale behavior, tests, and documentation together.

**Exit criteria:** no physics change is justified only by making a test green;
old/new behavior and decision impact are documented for every promoted change.

### M8 - Advanced Engine And Optional Compute Architecture

**Priority:** P2/P3
**Status:** Deferred research track
**Dependencies:** M1, M2, M6, and an evidence-backed decision from M7
**Goal:** evaluate whether a higher-fidelity engine adds enough validated value to
justify a second execution target, optional hosted computation, and additional
desktop packaging complexity.

#### What Exists Today

The deferred `engine/` package is a Python FastAPI service using NumPy and
SciPy. It currently provides:

- RK45 1-DOF vertical ascent integration.
- Thrust-curve or scalar-thrust ascent inputs.
- Mass depletion, Mach-dependent drag, atmosphere, descent, wind layers, and Monte Carlo dispersion.
- `GET /api/health` and `POST /api/simulate` endpoints.

It has no browser client, no production result contract, no accepted validation
corpus, no desktop sidecar packaging, and no evidence that its outputs are more
accurate than the browser implementation. A higher-order numerical solver does
not by itself establish physical accuracy. This track must not be marketed as a
"super-accurate simulator" until the model scope and evidence support that claim.

#### Staged Plan

1. **Benchmark before integration:** compare browser and Python outputs using the same inputs, units, assumptions, thrust curves, and boundary cases. Record disagreement instead of silently selecting the larger or more impressive result.
2. **Define engine identity:** version the engine, physics assumptions, input schema, output schema, numerical settings, and evidence source independently from the browser engine.
3. **Decide the role:** choose one of `research comparator`, `optional high-fidelity analysis`, or `replacement authority`. The default recommendation is optional analysis or research comparator; the browser path remains the default until a replacement is independently justified.
4. **Define a safe web path:** if hosted compute is useful, expose it through an explicit, versioned API with authentication/rate limits, payload size limits, timeouts, cost controls, no silent uploads, and clear user consent. Supabase, Vercel, or another provider are implementation options, not product requirements.
5. **Define a safe desktop path:** evaluate a Tauri sidecar compiled from Python or a native Rust/WASM implementation. The downloadable app must run the selected engine locally without requiring a hosted backend, and it must handle process startup, shutdown, crashes, updates, binary size, platform libraries, and offline use.
6. **Preserve cross-engine interpretation:** show which engine produced a result, keep model identities in the result envelope, prevent unsupported cross-engine comparisons, and make stale results unusable after either engine or assumptions change.
7. **Qualify every target:** verify Windows portable packaging and macOS universal packaging on their respective hosts. Do not claim desktop support for an engine target until the packaged artifact is exercised, not merely compiled.

#### Architecture Options To Evaluate

| Option | Best use | Main cost or risk |
|---|---|---|
| Browser JavaScript remains authoritative | Default web, offline, and current desktop behavior | Limited fidelity until the browser model is expanded and validated |
| Optional hosted Python service | Connected web users needing heavier computation | Privacy, service availability, free-tier limits, cold starts, abuse controls, and no offline support |
| Tauri local Python sidecar | Desktop users needing the same higher-fidelity engine offline | Per-platform binaries, packaging size, runtime dependencies, signing, lifecycle, and security hardening |
| Rust/WASM shared engine | Long-term web/desktop code sharing | Significant rewrite and a new validation surface |

The roadmap does not assume that Supabase or Vercel can solve desktop
distribution. A hosted service and a downloadable application are separate
delivery problems. The architecture decision must explicitly cover both.

#### Non-Negotiable Gates

- The browser implementation remains a complete fallback; hosted compute is never required for normal planning.
- No configuration, flight record, or evidence data is transmitted without an explicit user action and clear disclosure.
- The engine has a versioned contract and deterministic fixtures, including timeout, malformed-input, unavailable-service, and mismatched-version behavior.
- Cross-engine differences are visible and explainable; the product never labels an output more accurate solely because it came from the newer engine.
- Security review covers CORS, request validation, denial-of-service limits, secrets, dependency supply chain, local sidecar permissions, and packaged binary integrity.
- The engine is not promoted into release authority until an independent review and accepted comparison evidence exist for the claims it makes.

**Exit criteria:** a written architecture decision, cross-engine comparison
report, versioned API/sidecar contract, privacy and security review, explicit
fallback behavior, and verified packaged artifacts exist. If those conditions
are not met, the Python engine remains research-only and the product continues
using the browser implementation.

### M9 - Longer-Term Expansion

**Priority:** P3
**Status:** Deferred
**Goal:** consider expansion only after the trust-centered workflow is stable.

Potential work, subject to a future product decision:

- Non-developer catalog update/review tooling.
- Broader validated component and motor data workflows.
- Additional recovery tradeoff and scenario tools.
- Automatic sourcing and pulling of parts data from manufacturer or approved supplier sites, with explicit source URLs, fetch dates, version history, field-level change review, rate-limit compliance, and human approval before catalog updates.
- More complete offline and platform distribution experience.

Automatic sourcing is deferred until the M1 provenance contract and M6
privacy, security, and release gates are satisfied. It must be staged as
catalog review tooling, then dry-run sourcing with field-level diffs, then
human-approved updates, then controlled refreshes. It must not silently
overwrite catalog data or imply manufacturer endorsement, accuracy,
availability, or flight suitability.

These are not commitments yet. They must not displace validation, semantic
consistency, accessibility, or artifact reliability.

## Explicit Non-Goals

The following are intentionally outside the current product boundary:

- Full vehicle simulation, 6-DOF aerodynamics, stability, rail-exit analysis, or universal motor/airframe performance modeling as current-release capabilities. These may only be reconsidered through M8 with validated scope and evidence.
- Automatic launch authorization, certification, flight-readiness approval, or a safety score.
- Accounts, cloud persistence, automatic flight-log upload, or live collaboration.
- A broad hosted parts database that creates an authority claim without traceable provenance.
- Automatic optimization before the objective function and model evidence are defensible.
- Becoming an AeroBing-specific product; AeroBing may supply representative cases only.

## Execution Order

This is the dependency-ordered execution plan for the milestones. M0 through M6
are the core release path and must be finished in order: each milestone is gated
on the one before it. M7 through M9 are deferred tracks that start only after
the core boundary and evidence gates pass. Completed increments are removed
from this queue; partial milestones remain until their exit criteria and
evidence gates are complete.

```text
M0 baseline
  -> M1 validation + provenance
      -> M2 canonical semantics
          -> M3 Analysis
              -> M4 artifact/evidence parity
                  -> M5 guided onboarding qualification
                      -> M6 release qualification
                          -> M7 evidence-led model decisions
                              -> M8 advanced engine decision
                                  -> M9 expansion, including automated parts sourcing
```

### Parallel work

Independent evidence collection can start during M1 and continue through M6.
Windows and macOS artifact preparation can start during M0, but qualification
belongs in M6. Detailed design for automated catalog sourcing can begin during
M1, but implementation must wait until the M1 provenance contract and M6
privacy, security, and release gates are satisfied. Documentation updates
happen continuously, not at the end. Test fixtures can be expanded during M1
and M2.

### Step 1: Finish M0 - Green Baseline And Reconciliation

1. Run the full project check on the supported Node 22 runtime from a clean install.
2. Run the complete Playwright suite from a clean install.
3. Reconcile the v2 completion ledger with the actual code and evidence.
4. Resolve the documentation conflict between future-facing confidence posture and implemented confidence modules.
5. Inventory stored and transferred contracts: local storage, share links, JSON, simulation envelopes, briefs, and flight records.
6. Decide which transparency prototype, if any, remains the product direction; archive the alternatives.
7. Track dependency audit findings separately from feature work.
8. Keep the roadmap, release qualification record, changelog, and version identity aligned.

**Output:** one reproducible baseline on the supported runtime.

### Step 2: Finish M1 - Validation, Evidence, And Catalog Provenance

1. Expand the validation corpus beyond the current 14 review cases.
2. Add deterministic machine-readable case summaries and coverage by output domain.
3. Complete seeded dispersion coverage and make stochastic fixtures reproducible.
4. Document tolerance derivation, input equivalence, units, model identity, and scope for every case.
5. Add per-part catalog source metadata and a deterministic provenance report.
6. Define the source metadata and review contract that any future automated catalog sourcing must satisfy.
7. Keep real-flight records separate from accepted validation evidence.
8. Start collecting independent evidence in parallel; it cannot be produced by code alone.

**Output:** every result has a known evidence posture, and catalog data has traceable provenance.

### Step 3: Finish M2 - Canonical Result Semantics

1. Centralize domain assessments with value, unit, freshness, validity, envelope, evidence, reason codes, and method/policy identity.
2. Replace message-derived compatibility codes with authored stable finding codes.
3. Centralize threshold criteria and exact boundary behavior.
4. Make stale results unusable for conclusions, comparisons, briefs, and flight-log predictions.
5. Separate invalid, unsupported, unknown, conditional, sensitivity-flagged, and insufficient-confidence states.
6. Replace aggregate cross-unit sensitivity ranking with per-output model response and defensible criterion crossings only.
7. Remove prohibited or overstated labels such as `SAFE`, `REVIEWED`, `PRELIMINARY CHECKS PASS`, and unsupported confidence-interval language.
8. Define shared status and remediation contracts.

**Output:** the same input produces the same meaning on the screen, Analysis tab, Brief, print, export, import, and Flight Log.

### Step 4: Finish M3 - Complete The Analysis Experience

M3 depends on M2. Do not expand the whole application yet.

1. Add a shared plan/result strip for plan identity, completeness, currentness, and the next action.
2. Finish review summaries, remediation links, accessible disclosures, and canonical finding rows.
3. Finish the cause-to-consequence board: driver, affected outcome, finding, and next action.
4. Finish tested model-response presentation with per-output ranges and assumptions.
5. Finish progressive detail with formulas, intermediate values, provenance, evidence IDs, scenario tables, and method notes.
6. Close keyboard, mobile, focus, contrast, reduced-motion, and no-color-only status behavior.
7. Keep the broader Dashboard, Compatibility, Simulation, Dispersion, Compare, Flight Log, and whole-application redesign deferred until explicit approval.

**Output:** an experienced user can identify what needs review, why it matters, and what to do next from the first viewport.

### Step 5: Finish M4 - Artifact And Evidence Transfer Parity

1. Make the on-screen Brief, print Brief, and Checklist agree on values, identity, status, units, and unresolved checks.
2. Complete the static checklist-order boundary; keep packing-volume screening separate.
3. Fix stale-result withholding across every artifact; stale artifacts cannot appear current.
4. Complete JSON export/import parity.
5. Complete share-link migration parity.
6. Complete Flight Log parity; keep observations distinct from interpretation and validation.
7. Add candidate-evidence export and external review intake with source, units, conditions, reviewer status, and immutable prediction identity.
8. Verify all of this in fresh browser contexts.

**Output:** a plan moves between screen, print, export, import, sharing, and Flight Log without changing meaning.

### Step 6: Finish M5 - Qualify The Guided First-Plan Flow

1. Qualify new-plan, resume, import, and invalid-import flows.
2. Qualify pause and start-fresh behavior.
3. Qualify stale and insufficient-confidence states.
4. Verify required, optional, defaulted, catalog, and user-supplied values are explicit.
5. Verify demo data cannot be mistaken for a user plan.
6. Run the complete desktop and Pixel 5 mobile critical path, including keyboard activation.
7. Verify that guided completion never implies approval or flight readiness.

**Output:** a first-time user can reach a reviewable Brief without bypassing the trust boundaries.

### Step 7: Finish M6 - Release Qualification

1. Run all checks from a clean Node 22 install: formatting, parts validation, corpus validation, lint, unit tests, build, and Playwright E2E.
2. Run representative fresh, stale, invalid, out-of-envelope, conditional, sensitivity-flagged, and insufficient workflows.
3. Complete the import/export/share migration matrix, print artifact inspection, and no current/stale or unit mismatch.
4. Verify accessibility, copy, privacy, provenance, and prohibited-claim behavior.
5. Launch and hash the Windows portable artifact.
6. Verify the macOS artifact on macOS before making a macOS support claim; otherwise it remains unverified.
7. Align documentation, changelog, release notes, and version identities with the shipped artifacts.

**Output:** a release-qualified core RecoverySys version, with every remaining external limitation stated in the release documentation.

### Step 8: M7 - Evidence-Led Model Decisions

Do not improve the model merely because a result looks wrong or a test is inconvenient.

For each proposed physics change:

1. Reproduce the discrepancy.
2. Verify units and reference assumptions.
3. Compare old and new behavior.
4. Measure decision impact.
5. Decide whether to retain, narrow, add uncertainty, or change the model.
6. Update model identity, assumptions, corpus cases, stale behavior, tests, and documentation together.

**Output:** evidence-backed model changes only.

### Step 9: M8 - Evaluate The Advanced Python Engine

Only evaluate the Python engine after M6 and after M7 produces an evidence-backed reason to do so.

1. Compare browser and Python outputs using the same inputs, units, assumptions, thrust curves, and boundary cases.
2. Define independent engine identity, physics assumptions, input/output schema, numerical settings, and evidence source.
3. Decide the role: research comparator, optional high-fidelity analysis, or replacement authority. The default recommendation is optional analysis or research comparator; the browser path remains authoritative until independently justified.
4. Complete security and privacy review covering CORS, request validation, denial-of-service limits, secrets, dependency supply chain, local sidecar permissions, and packaged binary integrity.
5. Define hosted and desktop execution paths with explicit fallback behavior and no silent uploads.
6. Verify packaged Windows and macOS artifacts on their respective hosts.

**Output:** a written architecture decision, cross-engine comparison report, versioned API/sidecar contract, privacy and security review, explicit fallback behavior, and verified packaged artifacts. Without these, the Python engine remains research-only.

### Step 10: M9 - Longer-Term Expansion, Including Automatic Parts Sourcing

Automatic sourcing belongs here, after the trust-centered core is stable, in this order:

1. **Catalog review tooling:** review source records, view stale or missing provenance, compare catalog values against source records, and approve or reject changes.
2. **Sourcing in dry-run mode:** fetch from approved manufacturer or supplier URLs, store raw fetch metadata, parse candidate values, and produce a field-level diff without modifying the catalog.
3. **Human-approved updates:** require explicit approval, preserve previous values, record reviewer, timestamp, source URL, and changed fields, and support rollback.
4. **Controlled refreshes:** rate-limit requests, respect site terms and robots policies, handle unavailable or changed pages, and never treat a failed fetch as evidence that a part disappeared. Keep the last known value visible with its age and provenance state.

Automatic sourcing must not silently overwrite catalog data or imply manufacturer endorsement, accuracy, availability, or flight suitability.

## Trust Gaps To Keep Visible

- Scalar apogee estimates can be materially inaccurate without a trusted thrust curve.
- Drift and dispersion remain simplified estimates and are not measured confidence intervals.
- Load screening is not a universal dynamic snatch-load truth model.
- Catalog values may be stale or unverified without per-part source review.
- The validation corpus is currently too small and lacks accepted comparison and real-flight cases.
- Local-first data remains on the device unless the user explicitly exports or shares it.

Until these gaps are reduced, RecoverySys should present itself as a transparent
recovery-planning aid, not an authority that replaces engineering judgment,
manufacturer guidance, field procedures, range rules, or validated flight
simulation.
