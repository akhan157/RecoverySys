# RecoverySys Product Strategy Brief

**Status:** Current product and planning source of truth  
**Release:** `1.2.0.1`  
**Scope:** Local-first recovery planning for general high-power rocketry  
**Audience:** Product, engineering, design, validation, release, and technical review contributors

This brief consolidates the product definition, requirements outline, feature breakdown, and six-phase roadmap. `PRODUCT.md` remains the concise product contract. `ROADMAP.md` remains the execution ledger. Detailed implementation plans may add constraints, but they must not contradict this brief.

## 1. Executive product definition

RecoverySys is a local-first recovery-planning instrument for high-power rocketry. It takes a user from recovery-system inputs to a current, reviewable, traceable recovery plan.

The product combines recovery hardware configuration, bounded flight and landing estimates, compatibility screening, model and evidence disclosures, sensitivity review, comparison, and a handoff-ready Recovery Brief. It helps a technically fluent user see what is known, what is uncertain, what may change the decision, and what must be reviewed next.

RecoverySys does not authorize launch, certify hardware, establish flight readiness, or replace engineering, manufacturer, field, or range review. Its confidence states describe evidence posture and input/model adequacy, not probability of success or a safety score.

## 2. Product positioning

**For** experienced and learning high-power rocketry planners who need a reviewable recovery decision,

**RecoverySys is** a local-first recovery-planning instrument that connects configuration, estimation, evidence boundaries, and review actions in one workflow.

**Unlike** disconnected calculators, opaque dashboards, or claims-heavy flight tools,

**RecoverySys** preserves result identity, currentness, assumptions, provenance, uncertainty drivers, unresolved checks, and independent-review boundaries in the user workflow and exported artifacts.

The product is intentionally narrower and more honest than a complete flight simulator. The browser JavaScript model is the sole production simulation authority. The Python engine is research-only and deferred.

## 3. Problem statement

Recovery planning fails in practice when the user must assemble answers from separate tools and cannot tell whether an answer is current, applicable, or supported by evidence. Common failure modes include:

- recovery hardware and deployment inputs are incomplete or inconsistent;
- a result remains visible after a relevant input changed;
- a warning names a problem but not the affected decision or next action;
- modeled dispersion or load screening is mistaken for validation or approval;
- catalog values are treated as verified without source review;
- saved, shared, printed, and observed artifacts disagree about identity or status;
- technical detail obscures the one decision that needs attention.

RecoverySys addresses this by making the workflow traceable and conservative. It does not remove engineering judgment. It makes the judgment boundary visible and easier to review.

## 4. Target users and personas

### Primary persona: experienced HPR planner

- Builds or reviews a recovery system before a flight.
- Understands motors, deployment, parachutes, harnesses, and field constraints.
- Needs fast iteration without losing assumptions or provenance.
- Values direct findings, exact units, currentness, and exportable evidence.

**Primary outcome:** a current recovery plan with explicit unresolved checks and a credible next review action.

### Secondary persona: first-plan builder

- Has enough rocketry context to start but needs help understanding required inputs.
- Benefits from guided sequencing, pause/resume, demo separation, and plain-language remediation.
- Must not be led to believe that completing a wizard means approval or readiness.

**Primary outcome:** a reviewable first plan without hidden defaults or suppressed warnings.

### Secondary persona: technical reviewer

- Reviews a plan, printout, JSON artifact, or Recovery Brief produced by someone else.
- Needs identity, assumptions, model scope, evidence posture, warnings, and unresolved checks without reconstructing the entire session.

**Primary outcome:** determine whether the artifact is current, what it supports, and what remains outside the artifact's authority.

### Internal persona: maintainer and evidence reviewer

- Changes domain rules, model assumptions, schemas, validation cases, or UI semantics.
- Needs stable identities, deterministic tests, explicit gates, and a clear separation between implementation evidence and independent evidence.

**Primary outcome:** make changes without silently changing the meaning of an existing result or claim.

## 5. Jobs to be done

1. **When I am preparing a recovery plan,** help me assemble the relevant hardware, motor, deployment, weather, and location inputs without losing what each value means.
2. **When I run an estimate,** show me whether the result is current, within documented scope, and limited by missing or uncertain inputs.
3. **When a warning appears,** tell me which decision it affects, why it matters, and what I should review next.
4. **When I compare scenarios,** show which changed inputs materially affect the outcome without presenting sensitivity as a probability or guarantee.
5. **When I hand off a plan,** produce a traceable artifact containing identity, assumptions, estimates, evidence posture, unresolved checks, and review boundaries.
6. **When I record what happened after a flight,** preserve the observation and prediction identity without automatically promoting the observation to validation evidence.
7. **When I maintain the product,** let me verify behavior through deterministic contracts, fixtures, and release gates rather than relying on visual confidence or undocumented assumptions.

## 6. Product principles

1. Lead with the decision, limiting uncertainty, and next review action.
2. Never display a conclusion more strongly than its current inputs, model scope, and evidence support.
3. Keep technical depth available for audit without forcing every user to read every derivation first.
4. Preserve traceability across inputs, simulation identity, findings, comparisons, briefs, and observations.
5. Treat acknowledgement as review history, never as resolution or improved evidence.
6. Keep estimate, comparison, observation, and independent validation distinct.
7. Make stale, invalid, unsupported, and unknown states visible through text and keyboard interaction, not color alone.
8. Prefer a bounded, explainable workflow over a broader feature that creates an authority claim.

## 7. Current product capabilities

The current release provides:

- Recovery-bay configuration using a 225-part catalog and custom parts.
- Packing-volume screening, component compatibility, and deployment checks.
- Rocket, motor, airframe, deployment, weather, wind, and launch-location inputs.
- Scalar ascent estimation and imported RASP `.eng` thrust-curve integration.
- ISA atmosphere, descent, layered-wind drift, landing energy, and limited load screening.
- Optional ThrustCurve motor search and local `.eng` import.
- Result freshness, simulation identity, mission-envelope checks, evidence posture, confidence states, and deterministic sensitivity analysis.
- Dispersion mapping as a modeled estimate, not a statistical confidence guarantee.
- Local persistence, schema migrations, share links, JSON import/export, custom-part round trips, and configuration comparison.
- Guided first-plan entry with new, resume, import, pause, and start-fresh paths.
- Analysis review surface with result usability, findings, causality, and next-action primitives.
- Versioned Recovery Brief view-model and print output foundations.
- Local Flight Log observation records.
- Web deployment and Tauri desktop packaging foundations.

## 8. Product boundaries and non-goals

The current product does not claim:

- Full vehicle simulation, 6-DOF aerodynamics, stability, rail-exit analysis, or universal motor/airframe performance modeling.
- Automatic launch authorization, certification, flight-readiness approval, or a safety score.
- A universal dynamic snatch-load truth model.
- Accounts, cloud persistence, live collaboration, automatic flight-log upload, or a hosted parts authority.
- Automatic optimization before the objective function and model evidence are defensible.
- Accepted comparison evidence, real-flight validation, manufacturer verification, or universal accuracy.
- Python as a production runtime, release gate, or replacement for the browser authority.

## 9. Core product loop

```text
Start or import a plan
        |
        v
Configure rocket, motor, recovery hardware, deployment, weather, and location
        |
        v
Validate inputs, scope, compatibility, provenance, and currentness
        |
        v
Run the browser-authoritative estimate
        |
        v
Review result status, findings, sensitivity, dispersion, evidence, and next actions
        |
        v
Revise inputs or document unresolved checks
        |
        v
Generate a current Recovery Brief or compare scenarios
        |
        v
Record later observations locally without auto-promoting evidence
```

The loop must preserve result identity at every transition. Relevant input, model, assumptions, schema, or method changes make the prior result stale.

## 10. System architecture

### Runtime layers

| Layer | Responsibility | Current boundary |
|---|---|---|
| React/Vite application | User flow, navigation, responsive views, accessibility, and presentation | Production runtime |
| `App.jsx` and `MissionControlLayout` | Plan state, persistence orchestration, tab shell, guided entry, and application-level actions | Production runtime |
| Domain libraries under `src/lib/` | Simulation, result integrity, criteria, findings, assessments, compatibility, confidence, evidence, persistence, briefs, and flight records | Production runtime |
| Catalog and provenance data | Parts, custom parts, source posture, and validation metadata | Local, versioned with the app |
| Browser storage and transfer | Local persistence, migrations, JSON, share links, and custom data round trips | No required backend |
| Optional external services | ThrustCurve search, map tiles, and web fonts | Explicit, bounded network requests only |
| Tauri wrapper | Desktop packaging around the built SPA | Browser assets remain authoritative |
| `engine/` Python package | Research comparison and future architecture investigation | Not wired, not release-gating, not bundled as a production engine |

### Result authority and data flow

```text
User inputs
  -> schema and payload boundary
  -> mission envelope and compatibility checks
  -> browser JavaScript simulation
  -> result identity and integrity envelope
  -> assessments, findings, confidence, sensitivity, and dispersion views
  -> screen, comparison, Recovery Brief, print, JSON, and Flight Log observation
```

Every consuming surface must use the same result identity, freshness, units, reason codes, and evidence posture. A surface must not invent a second threshold or status classification.

## 11. Product breakdown

| Capability | User value | Current state | Planned completion signal |
|---|---|---|---|
| Plan entry and navigation | Start, resume, import, demo, or start fresh without losing work | Guided first-plan entry integrated; direct expert navigation remains | Desktop/mobile flows cover new, resume, import, invalid, stale, and insufficient paths |
| Rocket and motor inputs | Define the vehicle and propulsion inputs that drive the estimate | Current | Required, optional, defaulted, catalog, and user-supplied values are explicit |
| Recovery hardware | Configure main, drogue, harness, protection, links, and custom parts | Current | Provenance and missing values are visible wherever they affect a conclusion |
| Simulation | Produce bounded ascent, descent, drift, load, and landing estimates | Current browser authority | Model identity, assumptions, units, and failure semantics remain versioned |
| Compatibility review | Find packing, volume, deployment, and hardware concerns | Current; broader parity remains | Errors, warnings, affected inputs, source posture, and remediation are consistent across surfaces |
| Result integrity | Prevent stale or mismatched outputs from being treated as current | Current foundation | Screen, export, print, comparison, brief, and Flight Log all enforce currentness |
| Analysis review | Explain driver, affected outcome, finding, and next action | Integrated Analysis foundation | First viewport answers what needs review, why, what it affects, and what to check next |
| Sensitivity and dispersion | Show influential inputs and modeled landing variation | Current with incomplete coverage | Seeded dispersion and defensible per-output influence coverage are reproducible |
| Comparison | Compare plan scenarios without mixing stale or incompatible results | Current foundation | Currentness, identity, and cross-scenario status remain explicit |
| Recovery Brief | Hand off a traceable current plan | View-model and print foundation | Screen, print, export, and import agree on identity, status, units, and unresolved checks |
| Flight Log and evidence | Preserve observations without automatic validation claims | Local observation records current | Candidate evidence export/intake includes provenance and external review status |
| Persistence and transfer | Save, share, export, import, and migrate without data loss | Current foundation | Fresh-context round trips pass for valid, invalid, migrated, and oversized payloads |
| Desktop and web release | Use the same local-first product on supported targets | Web and Tauri foundations | Clean-install, Windows, macOS, accessibility, and artifact checks pass for claimed targets |

## 12. Current versus planned functionality

### Current and supported by local checks

- Core configuration, catalog, custom parts, persistence, import/export, share, simulation, compatibility, result integrity, sensitivity, analysis primitives, and local flight records.
- Browser JavaScript as the only production simulation authority.
- Conservative confidence and stale-result presentation backed by review-only corpus coverage.
- Guided first-plan entry and direct expert navigation.
- Unit, component, validation, and production-build checks in the current repository.

### Partial and actively planned

- Cross-artifact semantic parity across screen, print, export, comparison, and Flight Log.
- Full on-screen Recovery Brief and distinct brief versus checklist print artifacts.
- Seeded dispersion and broader sensitivity coverage.
- Per-part provenance review and accepted evidence indexing.
- Candidate flight-evidence export and external review intake.
- Full desktop/mobile workflow and accessibility qualification.
- Clean-install verification on the supported CI runtime.

### Deferred

- Evidence-led model changes under M7.
- Optional higher-fidelity engine architecture under M8.
- Longer-term expansion under M9.
- Hosted compute, sidecar compute, or Rust/WASM replacement until evidence, privacy, security, packaging, and fallback gates pass.

## 13. Product Requirements Document outline

### Functional requirements

- **FR-01 Plan lifecycle:** Users can create, import, resume, pause, reset, and start fresh without unintentionally overwriting a saved plan.
- **FR-02 Input clarity:** Required, optional, defaulted, catalog, custom, and unverified values are distinguishable.
- **FR-03 Validation:** Invalid, incomplete, unsupported, and out-of-scope inputs produce stable reason codes and direct remediation.
- **FR-04 Simulation:** The browser authority produces a versioned result envelope or an explicit no-result state.
- **FR-05 Currentness:** Relevant input, model, assumptions, schema, or method changes make previous results stale.
- **FR-06 Review:** Findings identify severity, affected outcome, evidence/source posture, and next action.
- **FR-07 Uncertainty:** Sensitivity and dispersion remain separate from evidence confidence and success probability.
- **FR-08 Transfer:** Save, JSON, share, comparison, print, and brief flows preserve identity, units, status, and unresolved checks.
- **FR-09 Observation:** Flight records preserve prediction identity and remain observations unless externally reviewed.
- **FR-10 Boundaries:** The product states what is outside model scope and never presents acknowledgement as resolution.

### Non-functional requirements

- Local-first operation with no required account, backend, or upload.
- Deterministic domain and validation tests for contract and status behavior.
- Keyboard-accessible critical flows, semantic labels, readable focus order, and no color-only status.
- Responsive desktop and narrow-mobile behavior for critical workflows.
- Explicit schema and model identities for durable or transferred artifacts.
- Bounded external requests with clear privacy and network behavior.
- Reproducible build, lint, formatting, validation, unit, and E2E checks for release candidates.

## 14. Acceptance criteria

A product increment is accepted only when the relevant criteria below pass:

1. **Critical path:** A user can start or import a plan, enter required inputs, select hardware, run a simulation, review findings, and reach a traceable brief without hidden approval language.
2. **State transitions:** No-result, current, stale, invalid, out-of-scope, conditional, sensitivity-flagged, and insufficient-confidence states are distinguishable and correctly triggered.
3. **Semantic parity:** The same identity, units, reason codes, criteria, and status appear across screen, comparison, export, print, brief, and Flight Log surfaces.
4. **Transfer integrity:** Valid, invalid, migrated, oversized, and custom-part payloads behave deterministically in a fresh receiver context.
5. **Evidence boundary:** Review-only corpus cases cannot produce a supported or validated claim; observations cannot auto-promote to evidence.
6. **Accessibility:** Critical desktop and narrow-mobile paths work through keyboard and text, with labels, focus, remediation, and status not dependent on color.
7. **Privacy:** No configuration, flight record, or evidence data leaves the device without explicit user action and clear disclosure.
8. **Release:** Formatting, parts validation, corpus validation, lint, unit tests, build, E2E, artifact checks, documentation, version identities, and remaining external limitations are recorded.

## 15. Six-phase product roadmap

The core roadmap has six phases. M7 through M9 are deferred tracks, not additional release phases.

### North-star product goal

**Make RecoverySys the clearest and most trustworthy local-first recovery-planning review instrument for high-power rocketry by helping a planner move from inputs to a current, traceable, independently reviewable recovery decision without overstating what the model or evidence can prove.**

The goal is complete only when the six phases work as one chain:

```text
Trustworthy foundations
  -> consistent meaning
    -> actionable review
      -> traceable handoff
        -> guided completion
          -> qualified release
```

### Phase goal plan

Each phase has one outcome goal, a bounded set of workstreams, measurable proof,
and a gate. A phase is not complete because code exists. It is complete when the
user outcome and evidence gate are both met.

#### Phase 1: Trust foundation

**Goal:** Establish one reproducible baseline in which every important input,
stored shape, result identity, and evidence claim has an explicit owner.

**Workstreams:**

- Reconcile the product contract, runtime identities, migrations, persistence,
  share links, JSON, briefs, flight records, and validation corpus.
- Keep the browser JavaScript model as the sole production authority.
- Expand executable validation beyond the current 14 review cases, including
  explicit ascent, additional unit-conversion, edge-case, metamorphic, and
  representative end-to-end coverage. The corpus now includes descent
  unit-conversion, invalid-input edge, and metamorphic cases, while keeping
  review-only, accepted-comparison, and real-flight evidence separate.
- Record supported-runtime, formatting, parts, corpus, lint, unit, build, and
  E2E evidence from a clean install.

**Proof:** No unowned durable contract, no hidden evidence promotion, deterministic
validation output, and a documented list of external evidence still missing.

**Gate:** The baseline is green on the supported runtime, but no stronger product
claim is made until independent evidence exists.

#### Phase 2: Canonical semantics

**Goal:** Make a result mean the same thing across calculation, screen,
comparison, export, print, Recovery Brief, and Flight Log.

**Workstreams:**

- Centralize assessments, criteria, findings, reason codes, freshness, validity,
  envelope, evidence, units, and method identity.
- Make stale, invalid, unsupported, unknown, conditional, and
  sensitivity-flagged states explicit and deterministic.
- Ensure acknowledgement records review history but cannot resolve evidence or
  change confidence posture.

**Proof:** Screen-independent boundary tests demonstrate semantic parity and
  stale results cannot produce current conclusions.

**Gate:** No consuming surface invents a threshold, status, or physics meaning.

#### Phase 3: Decision-first workflow

**Goal:** Let the first review viewport answer what needs attention, which
  recovery outcome it affects, why it matters, and what to check next.

**Workstreams:**

- Complete the Analysis cause-to-consequence flow: driver, affected outcome,
  finding or unknown state, and direct remediation.
- Apply shared result status and reason-specific remediation to the surrounding
  workflow.
- Preserve technical detail through accessible disclosures instead of making
  every user parse a dossier before acting.
- Qualify desktop, narrow-mobile, keyboard, focus, contrast, and reduced-motion
  behavior for the critical review path.

**Proof:** A reviewer can move from a finding to its affected input or hardware
  review section without guessing, and no warning hierarchy hides a higher-risk
  issue.

**Gate:** The review surface is actionable without becoming an approval surface.

#### Phase 4: Recovery Brief and evidence loop

**Goal:** Turn a current plan into a traceable handoff artifact and preserve
  later observations without silently upgrading them into validation.

**Workstreams:**

- Complete the on-screen Recovery Brief from the versioned brief view-model.
- Separate brief output from checklist output.
- Preserve plan identity, generated time, currentness, envelope, hardware,
  deployment, estimates, sensitivity, evidence, unresolved checks, and review
  boundaries in screen, print, export, and import.
- Add candidate flight-evidence export and intake with source, units, conditions,
  reviewer status, and immutable prediction identity.

**Proof:** Fresh-context transfer and print checks show identical values, units,
  identities, statuses, and unresolved checks. Stale artifacts remain visibly stale.

**Gate:** A reviewer can trust what the artifact contains without treating it as
  certification or flight approval.

#### Phase 5: Guided first plan

**Goal:** Help a first-time planner reach a reviewable plan while preserving
  expert control, explicit assumptions, and every important warning.

**Workstreams:**

- Guide start and scope, rocket and motor, recovery hardware, deployment and
  weather, simulation and review, and Recovery Brief.
- Support new, demo, import, resume, pause, start-fresh, invalid, stale, and
  insufficient-confidence paths without data loss.
- Keep direct-navigation tabs available for experienced users.
- Qualify keyboard, labels, focus, mobile layout, and error/remediation behavior.

**Proof:** Desktop and narrow-mobile deterministic flows reach a reviewable brief
  without implying approval, hiding optionality, or confusing demo data with a
  user's plan.

**Gate:** Guided completion improves access to the product without weakening its
  evidence boundary.

#### Phase 6: Release qualification

**Goal:** Release only the workflows, targets, and claims that code, evidence,
  platform checks, and documentation support.

**Workstreams:**

- Run clean-install formatting, parts validation, corpus validation, lint, unit,
  build, and Playwright checks on the supported runtime.
- Exercise fresh, stale, invalid, out-of-envelope, conditional,
  sensitivity-flagged, and insufficient-confidence workflows.
- Verify import/export/share migration, print artifacts, accessibility, privacy,
  provenance, prohibited-claim copy, and version identities.
- Launch and record each claimed desktop artifact on its target host.

**Proof:** Every release claim has an artifact, command result, target host,
  evidence posture, and documented limitation.

**Gate:** Unsupported platform or evidence claims remain explicitly unsupported.

### Goal review cadence

- **At phase start:** confirm dependencies, user outcome, and the smallest
  evidence needed to avoid building on an ambiguous contract.
- **During implementation:** update the owning detailed plan, tests, migrations,
  and source identities with the change.
- **At phase exit:** review the acceptance criteria, release risks, and external
  gates. Record what passed, what remains partial, and what must not be claimed.
- **Before reprioritization:** apply the P0 through P3 framework. Expansion work
  cannot outrank a trust, privacy, accessibility, or release blocker.

### Phase summary

| Phase | Milestones | Goal | Exit condition | Status |
|---|---|---|---|---|
| 1. Trust foundation | M0, M1 | Establish a green baseline, versioned contracts, executable validation, and evidence boundaries | Supported-runtime checks pass; every stored/transfer shape has an owner; corpus status is explicit | Partial; external evidence gate |
| 2. Canonical semantics | M2 | Make results, findings, thresholds, freshness, and evidence mean the same thing everywhere | Screen-independent boundary tests pass; no surface invents status or physics | Partial |
| 3. Decision-first workflow | M3 | Make the Analysis tab and review flow lead with decision, impact, and next action | Critical review surfaces are semantically aligned, accessible, responsive, and actionable | Partial |
| 4. Recovery Brief and evidence loop | M4 | Produce a current, traceable handoff artifact and preserve later observations safely | Screen, print, export, and import agree; stale artifacts cannot appear current | Partial |
| 5. Guided first plan | M5 | Help a first-time user reach a reviewable plan without hiding assumptions or weakening expert flow | New, resume, import, invalid, stale, and insufficient paths pass desktop/mobile and keyboard checks | Partial |
| 6. Release qualification | M6 | Release only what code, evidence, platforms, and documentation support | Clean-install checks, E2E, artifact verification, accessibility, privacy, and release docs pass | Partial; local gates pass, platform and external gates remain |

### Deferred tracks after the core six

- **M7 Evidence-led model decisions:** Change physics only after a reproducible discrepancy changes a decision or evidence posture.
- **M8 Advanced engine and optional compute:** Evaluate a second execution target only after comparison, security, privacy, fallback, and packaging gates pass.
- **M9 Longer-term expansion:** Consider broader catalogs, scenario tools, and distribution only after trust-centered workflow stability.

## 16. Prioritization framework

Prioritize work in this order:

1. **P0 Trust and release blockers:** stale-result correctness, contract migrations, evidence overclaiming, privacy/security, data loss, release gates, and accessibility blockers.
2. **P1 Core decision value:** work that helps a user configure, understand, review, compare, or hand off a recovery plan.
3. **P2 Evidence-led improvements:** model or workflow improvements justified by reproducible discrepancies, reviewed cases, or external evidence.
4. **P3 Expansion:** broader engines, hosted computation, automation, catalogs, or convenience features that do not improve the core trust loop.

For competing items, score each against:

- decision impact for the primary user;
- trust or safety risk if wrong;
- dependency value for later phases;
- evidence strength and verification cost;
- reversibility and migration cost;
- accessibility and privacy impact.

A feature cannot outrank a P0 trust blocker because it is visually attractive or technically interesting. Deferred work stays deferred until its prerequisites are met.

## 17. Success metrics

These are product targets and measurement definitions, not claims that the current release already meets them. Baselines remain `TBD` until instrumentation or a repeatable study exists.

| Metric | Definition | Desired direction |
|---|---|---|
| Reviewable-plan completion | Percentage of started plans that reach a current Recovery Brief or explicit blocked state | Increase without suppressing warnings |
| First-plan completion | Percentage of first-plan users completing the critical path on desktop and narrow mobile | Increase while preserving required review steps |
| Remediation success | Percentage of actionable findings for which the user reaches the affected input or review section | Increase |
| Currentness integrity | Percentage of tested relevant changes that correctly invalidate prior results | 100% in automated contract coverage |
| Transfer fidelity | Percentage of valid JSON/share/import/print round trips preserving identity, units, status, and unresolved checks | 100% for supported contracts |
| Evidence honesty | Percentage of review-only and uncovered cases that remain visibly non-supported | 100% in automated and release review |
| Accessibility completion | Percentage of critical-path scenarios completed with keyboard and semantic text | 100% for release-critical flows |
| Release reproducibility | Percentage of required clean-install checks passing on the supported runtime and target matrix | 100% before release claim |
| User trust signal | Reviewer rating that the product clearly explains what is known, uncertain, and next | Establish baseline, then improve |

## 18. Safety, privacy, and operational risks

| Risk | Product impact | Mitigation |
|---|---|---|
| Users interpret estimates as approval | Unsafe decisions or overconfidence | Explicit scope, no approval language, conservative confidence states, independent-review reminders |
| Stale results remain persuasive | Decisions based on changed inputs | Result identity, stale invalidation, visible rerun/remediation paths |
| Review-only evidence appears validated | False authority claim | Evidence levels, review-only labels, accepted-case gate, no supported state without applicable review |
| Catalog data is stale or unverified | Hardware selection error | Per-part provenance posture, source review status, user-supplied distinction |
| Simplified physics is overgeneralized | Misleading flight or load interpretation | Model identity, assumptions, bounded scope, trust-gap disclosure, evidence-led model changes |
| Local data is exposed through sharing | Privacy loss | Local-first default, explicit export/share action, URL disclosure, no automatic upload |
| Imported payloads are unsafe or oversized | Data loss, denial of service, malformed state | Schema validation, payload limits, migrations, fresh-context round-trip tests |
| External service availability changes | Missing motor search, map, or fonts | Core offline path, bounded optional requests, clear failure behavior |
| Desktop artifact is unqualified | Unsupported platform claims | Host-specific build and launch verification before support claims |
| Documentation drifts from code | Wrong product expectations | This brief plus roadmap as source of truth, contract identities, release documentation gate |

## 19. Release strategy

RecoverySys releases in evidence tiers:

1. **Development checkpoint:** local tests, lint, formatting, corpus validation, and build pass; known gaps remain visible.
2. **Release candidate:** clean-install checks, full unit and Playwright coverage, transfer and print inspection, accessibility review, privacy review, and documentation alignment pass.
3. **Supported target release:** web or desktop artifact is exercised on its claimed host, with artifact identity and remaining limitations recorded.
4. **Evidence-qualified claim:** only after independent comparison or flight evidence exists for the specific claim. Implementation tests alone do not create this tier.

The current release is a development/consolidated product checkpoint, not a fully qualified v2/v3 release. The current local checks pass, but accepted comparison evidence, per-part source review, clean-install supported-runtime qualification, fresh Windows verification, and macOS host verification remain open.

## 20. Final product thesis

RecoverySys should become the clearest recovery-planning review instrument for high-power rocketry, not the loudest simulator and not an authority it cannot support.

Its advantage is disciplined traceability: every estimate has an identity, every warning points to a decision, every uncertainty has a boundary, every artifact preserves its status, and every claim stops where the evidence stops.

If a future feature makes the product broader but less honest, it is the wrong feature. If it helps a planner reach a better-informed independent review decision while preserving privacy, currentness, and evidence boundaries, it belongs in the product.

## 21. Source map

- Concise product contract: [`PRODUCT.md`](PRODUCT.md)
- Execution roadmap: [`ROADMAP.md`](ROADMAP.md)
- V2 contracts and evidence plan: [`docs/v2-execution-plan.md`](docs/v2-execution-plan.md)
- V3 guided workflow and acceptance plan: [`docs/v3-plan.md`](docs/v3-plan.md)
- UI implementation plan: [`docs/ui-redesign-plan.md`](docs/ui-redesign-plan.md)
- Analysis implementation plan: [`docs/analysis-tab-redesign-plan.md`](docs/analysis-tab-redesign-plan.md)
- Confidence posture: [`docs/confidence-model.md`](docs/confidence-model.md)
- Architecture and deferred engine decision: [`M8-architecture-decision-report.md`](M8-architecture-decision-report.md)
- User guide, privacy, and local development: [`README.md`](README.md)
