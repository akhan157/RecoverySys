# RecoverySys v2 execution plan

## Purpose

This is the controlling implementation plan for RecoverySys v2. Execute work packages in dependency order, record evidence in the completion ledger, and do not advance through a gate on intent alone.

V2 makes RecoverySys a more defensible recovery-planning workflow. It does not turn the product into flight-certification software, a complete vehicle simulator, or a launch approval authority.

## Fixed decisions

- The browser JavaScript implementation is the sole production simulation authority.
- Python engine material remains research-only and cannot gate a release.
- RecoverySys remains local-first with no required account or backend.
- Confidence labels describe evidence posture, not probability of success or a safety score.
- Stale results are unusable for conclusions, comparisons, briefs, and flight-log predictions.
- Model, assumptions, schema, evidence, and catalog identities evolve independently.
- General HPR is the product scope. AeroBing may supply representative cases but not product-specific rules.
- Existing persistence, share, import, and export payloads require explicit migration when their contracts change.

## V2 release claim

At v2 release, a user can create a recovery plan, see whether the mission and its outputs are within documented model scope, understand important assumptions and evidence limitations, review hardware and deployment concerns, compare uncertainty-sensitive scenarios, and produce a traceable recovery brief. Every displayed conclusion is current, reasoned, and no stronger than its evidence.

## Release exclusions

- 6-DOF flight dynamics, stability, rail-exit, or full aerodynamic analysis.
- Automatic launch authorization, certification, or universal safety/accuracy claims.
- A universal dynamic snatch-load truth model. V2 retains an explicitly limited screening proxy unless evidence justifies replacement.
- Accounts, cloud persistence, live collaboration, or a hosted parts database.
- Automatic optimization before validation coverage supports its objective function.
- Real-flight validation as a release requirement. Real-flight evidence can be added only through the corpus protocol.
- macOS release claims until a macOS host verifies the artifact.

## Execution rules

1. Start each package only when all listed dependencies are complete.
2. Keep changes bounded to one package or a tightly coupled package pair.
3. Add the narrowest meaningful automated evidence before broad regression checks.
4. A numerical behavior change must update model or assumptions identity and affected corpus cases in the same change.
5. A persistence shape change must include migration and round-trip tests in the same change.
6. A user-visible confidence or safety statement must have a stable reason code and evidence source.
7. Never weaken a failing gate by broadening tolerance without documenting and reviewing the basis.
8. Do not claim `accepted-for-comparison` without independent review metadata.
9. Preserve existing visual language and verify desktop and mobile behavior for user-facing packages.
10. Update this ledger immediately after verification; do not batch status changes at the end.

## Evidence levels

Each output domain receives the strongest applicable evidence level:

- **E0 Uncovered:** no reviewed case applies.
- **E1 Invariant:** unit, property, or metamorphic evidence only.
- **E2 Analytic:** reproducible comparison with an independently derived equation or limiting case.
- **E3 Simulator comparison:** reviewed comparison with a named and versioned trusted simulator.
- **E4 Test evidence:** reviewed instrumented component or system test.
- **E5 Flight observation:** reviewed flight data with traceable conditions.

Evidence level is not a confidence state. Applicability, input quality, model scope, and sensitivity still determine the displayed state.

## Confidence states

- **Supported:** applicable reviewed evidence covers the result and required inputs are within scope.
- **Conditional:** the result depends on an explicit assumption or narrower evidence boundary.
- **Sensitivity-flagged:** plausible input variation materially changes the interpretation.
- **Insufficient-confidence:** required inputs, model coverage, freshness, or evidence are inadequate for a responsible conclusion.

No state may be rendered as `safe`, `approved`, `certified`, `flight proven`, or a success probability.

## Work graph

```text
V2-00 baseline and contract ledger
  -> V2-01 executable validation gate
    -> V2-02 initial validation corpus
      -> V2-03 model boundaries and mission envelope
      -> V2-04 evidence coverage and confidence evaluation
        -> V2-05 confidence and stale-reason UI
        -> V2-06 sensitivity and uncertainty workflow
V2-00 -> V2-07 catalog provenance and hardware assumptions
V2-03 + V2-07 -> V2-08 hardware and deployment review
V2-05 + V2-06 + V2-08 -> V2-09 recovery brief and transfer contracts
V2-09 -> V2-10 flight evidence capture
V2-02 + V2-06 + V2-10 -> V2-11 model refinement decisions
All release-required packages -> V2-12 release qualification
```

## Phase 0: Baseline and governance

### V2-00 Baseline and contract ledger

**Status:** in progress; browser authority and result identity are complete.

**Objective:** freeze the known-good starting point and identify every contract that v2 may change.

**Work:**

- Run and record the baseline checks from the application directory.
- Reconcile `TODOS.md` with shipped behavior: parts schema validation and linear-elastic snatch screening already exist.
- Create a contract inventory for persisted state, share links, JSON import/export, simulation result envelopes, flight-log entries, print output, and validation cases.
- Correct `validation/manifest.json` to use the production model identity constants in generated validation logic; remove the obsolete `recoverysys-current-estimator` identity.
- Record the dependency audit as a separate risk. Do not apply broad automatic upgrades inside feature work.
- Preserve archived transparency prototypes as references only; select or rebuild one approach rather than merging an archived branch.

**Primary areas:** `package.json`, `src/lib/constants.js`, `src/lib/schema.js`, `src/lib/migrations.js`, `src/lib/payloadBoundary.js`, `src/lib/simulationIdentity.js`, `src/lib/resultIntegrity.js`, `validation/manifest.json`, `TODOS.md`.

**Acceptance:**

- Baseline command results and current test counts are recorded in this document.
- Every externally stored or transferred shape has an owner, version, and migration rule.
- Manifest and runtime identify `browser-js-recovery` and the same model/assumptions versions.
- Backlog contains no item that inaccurately describes already shipped work.

**Evidence:**

```bash
npm run check
npm run e2e
git diff --check
```

**Gate G0:** stop if the baseline fails for reasons unrelated to intended work, or if the active branch does not match the documented continuation strategy.

## Phase 1: Executable validation

### V2-01 Executable validation gate

**Depends on:** V2-00.

**Objective:** make the corpus schema, manifest, provenance, and comparison results executable and release-gating.

**Work:**

- Add a validation CLI that loads `validation/corpus/*.json`, validates each case with Ajv, verifies unique IDs and manifest references, and rejects malformed provenance.
- Keep case data in the corpus directory; tests may adapt it but must not maintain a second authoritative fixture set.
- Add adapters that invoke exported browser-engine functions for supported domains.
- Emit deterministic per-case outcomes and a machine-readable summary.
- Fail on schema errors, missing cases, model identity mismatch, non-finite outputs, or failed accepted comparisons.
- Permit draft/review cases to report without gating numerical agreement; accepted cases gate agreement.
- Add `validate:corpus` and include it in `npm run check` before unit tests.

**Primary areas:** `validation/`, new `scripts/validate-corpus.js`, `package.json`, `src/test/validation-*.test.js`.

**Acceptance:**

- One command runs corpus structural and numerical checks without the UI.
- The same case ID cannot exist twice or be omitted from the manifest.
- A deliberate expected-value error causes a non-zero exit and identifies case, metric, expected, observed, and tolerance.
- Runtime and corpus use the same model identity source.
- The validation summary distinguishes analytic comparison from real-flight validation.

**Evidence:**

```bash
npm run validate:corpus
npm test -- src/test/validation-phase2.test.js
npm run check
```

**Gate G1:** no confidence UI or model accuracy statement proceeds until this gate is executable in CI/local checks.

### V2-02 Initial validation corpus

**Depends on:** V2-01.

**Objective:** establish reviewed coverage of the current model's main domains before changing its claims.

**Work:**

- Migrate the four existing analytic fixtures into schema-conforming JSON cases.
- Add analytic cases for atmosphere, ascent scalar path, thrust-curve integration, descent, drift, landing energy, and unit conversions.
- Add metamorphic cases for mass, drag, parachute area, deployment altitude, wind magnitude/direction, and repeatability.
- Add edge cases for absent drogue/main, invalid inputs, extreme but supported altitude, zero wind, and incomplete layered wind.
- Add screening cases for snatch-load monotonicity and rating boundaries without labeling the proxy physically validated.
- Add at least two representative end-to-end HPR configurations, one of which may be AeroBing-derived but is expressed generically.
- Document tolerance derivation per metric. Use exact/invariant checks where tolerance is not meaningful.
- Seek independent review for cases intended to become `accepted-for-comparison`; otherwise leave them in `review` and do not overstate coverage.

**Primary areas:** `validation/corpus/`, `validation/manifest.json`, `validation/README.md`, browser simulation modules.

**Acceptance:**

- Every production output domain has at least E1 coverage.
- Atmosphere, descent, and deterministic drift have at least E2 reviewed or review-ready cases.
- Each case records model version, assumptions, source/derivation, units, decision rule, and tolerance basis.
- Corpus results are deterministic across two consecutive executions.
- No case is labeled real-flight unless the required evidence exists.

**Evidence:**

```bash
npm run validate:corpus
npm test -- src/test/simulation.test.js src/test/recovery-load.test.js
npm run check
```

**Gate G2:** classify domain coverage and known disagreement. Do not tune the model merely to pass a reference until input equivalence and reference assumptions are documented.

## Phase 2: Scope and confidence

### V2-03 Model boundaries and mission envelope

**Depends on:** V2-02.

**Objective:** determine whether inputs are complete and within the model's documented operating scope before interpreting results.

**Work:**

- Define a versioned mission-envelope specification for required motor, mass, airframe, deployment, parachute, cord, weather, and landing-location inputs.
- Implement a pure evaluator returning `in-scope`, `conditional`, or `out-of-scope` with stable reason codes and affected input paths.
- Separate invalid data from valid-but-unsupported conditions.
- Define conservative boundaries only where documentation or corpus evidence supports them; unknown boundaries produce conditional/insufficient outcomes.
- Surface assumptions such as 1-DOF vertical ascent, generic drag, terminal descent, instant wind coupling, and simplified inflation.
- Add navigation from each reason to its input or review section.

**Primary areas:** new `src/lib/missionEnvelope.js`, `src/lib/constants.js`, `src/components/RocketSpecs.jsx`, simulation and dashboard tabs, focused tests.

**Acceptance:**

- The evaluator is deterministic and independent of rendering.
- Every reason has code, plain-language text, severity, affected path, and remediation.
- Missing/invalid inputs never receive reassuring scope labels.
- Boundary tests cover just-inside, at-boundary, just-outside, and unknown cases.
- Desktop and mobile users can reach the affected input from the result.

**Evidence:** focused unit tests, component accessibility tests, then `npm run e2e:narrow` and `npm run check`.

**Gate G3:** review all numeric boundaries. If no defensible boundary exists, ship an assumption disclosure rather than inventing one.

### V2-04 Evidence coverage and confidence evaluation

**Depends on:** V2-02 and V2-03.

**Objective:** derive confidence states from explicit, inspectable rules.

**Work:**

- Create an evidence index generated from accepted/review corpus metadata by model version and domain.
- Implement a pure confidence evaluator using freshness, validity, envelope status, evidence applicability, input provenance, and sensitivity flags.
- Return state plus stable reason codes; never return a numeric confidence percentage.
- Evaluate per domain/result, not as one global vehicle score.
- Treat stale, invalid, uncovered, and out-of-scope results as `insufficient-confidence`.
- Treat review-only evidence as conditional, not supported.
- Version confidence rules independently from numerical model assumptions.

**Primary areas:** new `src/lib/evidenceCoverage.js`, new `src/lib/confidence.js`, generated/indexed validation metadata, tests.

**Acceptance:**

- A decision table test covers every state transition and precedence rule.
- The evaluator cannot produce Supported with stale results, E0 coverage, invalid inputs, or out-of-scope conditions.
- Each output includes applicable evidence IDs and reasons.
- UI-independent tests prove labels change when evidence/model identity changes.

**Evidence:** focused unit/property tests, corpus validation, `npm run check`.

**Gate G4:** manually inspect the decision table for overclaiming before connecting it to presentation.

### V2-05 Confidence and stale-reason UI

**Depends on:** V2-04.

**Objective:** explain currentness and evidence posture next to affected results without relying on color.

**Work:**

- Extend stale evaluation to return reason codes for changed inputs, parts, model, assumptions, or schema.
- Add an accessible confidence/status component with state, concise reason, scope, and evidence drill-down.
- Integrate it with dashboard, simulation, analysis, dispersion, compare, export/print, and flight-log predictions.
- Keep stale numerical values hidden or clearly non-usable; never mix current and stale conclusions.
- Use plain language in user-facing copy while retaining technical details on demand.

**Primary areas:** `src/lib/simulationIdentity.js`, `src/lib/resultIntegrity.js`, result tabs, `PrintChecklist.jsx`, shared primitives, CSS, tests.

**Acceptance:**

- Status is conveyed by text and accessible name, not color alone.
- Every stale trigger identifies what changed and offers rerun/remediation.
- A keyboard user can inspect evidence and return to the result.
- Print/export preserves status and evidence identity.
- Desktop and mobile E2E cover fresh, each stale category, conditional, sensitivity-flagged, and insufficient states.

**Evidence:** focused component tests, Playwright desktop/mobile scenarios, `npm run check`.

**Gate G5:** copy review rejects prohibited claims and unexplained jargon.

## Phase 3: Uncertainty and decision support

### V2-06 Sensitivity and uncertainty workflow

**Depends on:** V2-04.

**Objective:** show which uncertain inputs can materially change a recovery decision without pretending Monte Carlo scatter is a measured confidence interval.

**Work:**

- Define bounded uncertainty inputs for mass, Cd, parachute Cd/diameter, deployment altitude, and layered wind.
- Implement deterministic one-at-a-time sensitivity runs around the authoritative browser engine.
- Define materiality in terms of decision thresholds and sign/category changes, not arbitrary visual movement.
- Keep random dispersion separate from evidence confidence; seed stochastic runs for reproducibility.
- Report influential inputs, tested ranges, output ranges, and unresolved assumptions.
- Provide scenario comparison rather than automatic optimization.

**Primary areas:** new `src/lib/sensitivity.js`, `src/lib/simulation.js`, `src/components/tabs/AnalysisTab.jsx`, `DispersionTab.jsx`, `CompareTab.jsx`, tests.

**Acceptance:**

- Same inputs and seed produce identical output.
- Input ranges and sampling method are visible.
- Sensitivity flags correspond to tested threshold crossings.
- Invalid or out-of-envelope variants are reported, not silently discarded.
- UI calls dispersion an estimate and never a confidence guarantee.

**Evidence:** property/metamorphic tests, deterministic snapshots of summaries, desktop/mobile E2E, `npm run check`.

**Gate G6:** stop if the chosen ranges lack a documented basis; expose user-controlled scenarios instead of fabricated defaults.

## Phase 4: Hardware and deployment review

### V2-07 Catalog provenance and hardware assumptions

**Depends on:** V2-00. May run after V2-01 in parallel with corpus authoring.

**Objective:** make catalog specifications traceable and prevent stale catalog data from appearing authoritative.

**Work:**

- Extend `parts-schema.json` with source title/URL, access date, source type, and verification status where a part drives a numerical or compatibility conclusion.
- Define migration/default behavior for existing built-in parts and custom parts.
- Validate provenance shape, dates, URLs, and required fields in `validate:parts`.
- Generate a catalog report listing missing, old, or unverified sources.
- Document a non-developer update/review procedure; retain JS as runtime source unless a measured need justifies conversion.
- Avoid implying that schema validity proves manufacturer accuracy.

**Primary areas:** `parts-schema.json`, `src/data/parts.js`, `scripts/validate-parts.js`, custom-part forms, catalog tests, docs.

**Acceptance:**

- Every built-in value used for compatibility or load screening has traceable source metadata or is explicitly `unverified`.
- Validation rejects malformed provenance and reports actionable part IDs/paths.
- Custom parts are labeled user-supplied and survive export/import.
- Catalog report is deterministic and included in release evidence.

**Evidence:** validator tests, `npm run validate:parts`, payload round-trip tests, `npm run check`.

**Gate G7:** provenance rollout may be incremental only if unverified entries are visibly identified and cannot yield Supported confidence.

### V2-08 Hardware fit and deployment review

**Depends on:** V2-03 and V2-07.

**Objective:** turn compatibility checks into a reviewable deployment plan tied to inputs and sources.

**Work:**

- Normalize compatibility results to stable codes, affected parts/inputs, source references, severity, and remediation.
- Add explicit review groups for packing/volume, component fit, harness/attachments, redundancy, deployment sequence, and unresolved checks.
- Distinguish computed checks, documented manufacturer constraints, and user attestations.
- Retain the linear-elastic snatch model as a screening proxy and connect its generic-assumption status to confidence evaluation.
- Require user acknowledgment only for checklist completion, never as a way to erase a warning.
- Ensure single- and dual-deploy workflows have coherent, tested sequences.

**Primary areas:** `src/lib/compatibility.js`, `src/lib/recoveryLoad.js`, `ConfigBuilder.jsx`, `PartsBrowser.jsx`, dashboard/analysis tabs, print checklist, tests.

**Acceptance:**

- Every warning links to the relevant part/input and, when available, provenance.
- Unknown or unverified hardware data cannot become a passing computed check.
- Deployment order is complete for supported single/dual configurations.
- Snatch results retain proxy/limitation language in screen, print, and export.
- Keyboard and mobile review paths are complete.

**Evidence:** rule-table unit tests, component tests, desktop/mobile E2E, `npm run check`.

**Gate G8:** review warning severities and ensure acknowledgment never converts evidence posture.

## Phase 5: Recovery brief and evidence loop

### V2-09 Recovery brief and transfer contracts

**Depends on:** V2-05, V2-06, and V2-08.

**Objective:** produce one reviewable artifact that preserves inputs, conclusions, limitations, and identity across print/share/export.

**Work:**

- Define a versioned recovery-brief view model rather than assembling independent tab fragments.
- Include mission envelope, hardware, deployment sequence, key outputs, sensitivity, confidence reasons, evidence IDs, unresolved checks, and sign-off boundaries.
- Include generated-at time and app/model/assumptions/schema/catalog/confidence-rule versions.
- Update JSON export/import and share behavior only through explicit schema/migration work.
- Make print layout legible without color and prevent stale results from appearing current.
- Add deterministic brief fixture/snapshot tests for representative plans.

**Primary areas:** new `src/lib/recoveryBrief.js`, `ExportTab.jsx`, `PrintChecklist.jsx`, payload/migration modules, share-link modules, tests.

**Acceptance:**

- Screen, print, and exported brief agree on identity, statuses, and unresolved checks.
- Import round-trip preserves all durable brief inputs and user review state.
- Old supported payloads migrate or fail with a specific actionable message.
- Share-link limits/failures are explicit; oversized data directs users to JSON export.
- Brief states that it does not authorize launch or replace independent review.

**Evidence:** fixture tests, migration matrix, import/export E2E between fresh browser contexts, print E2E, `npm run check`.

**Gate G9:** inspect generated artifacts, not only DOM tests. Block release on any current/stale or unit mismatch.

### V2-10 Flight evidence capture

**Depends on:** V2-09.

**Objective:** capture traceable observations that can inform future corpus work without automatically treating user entries as validation.

**Work:**

- Version flight-log entries and attach the exact brief/result identity used before flight.
- Record observation source, instrument/device, units, conditions, missing fields, and notes.
- Preserve predicted versus observed values without automatically changing confidence rules.
- Add JSON export/import for flight records with migration and validation.
- Add an explicit candidate-evidence export for manual corpus review; never auto-promote a flight log to accepted evidence.
- Separate observation, interpretation, and review status.

**Primary areas:** `FlightLogTab.jsx`, new flight-log storage/schema modules, payload boundary, migrations, tests.

**Acceptance:**

- Flight records survive reload and round-trip export/import.
- Predicted values retain the original model/input identity even after current inputs change.
- Missing instrumentation/provenance is visible.
- Candidate export conforms to a documented review intake shape but remains unaccepted.
- Deletion and migration behavior are tested.

**Evidence:** storage/migration tests, two-context E2E, candidate-export schema validation, `npm run check`.

**Gate G10:** privacy and claim review. Local flight data is never transmitted automatically.

## Phase 6: Evidence-led model decisions

### V2-11 Model refinement decisions

**Depends on:** V2-02 and V2-06; V2-10 evidence is optional input, not a release blocker.

**Objective:** change physics only where evidence shows a material, decision-relevant deficiency.

**Decision sequence for each domain:**

1. Reproduce disagreement with an executable corpus case.
2. Verify units, input equivalence, conventions, and external-reference assumptions.
3. Measure whether disagreement changes a recovery decision or confidence state.
4. Choose one outcome: retain and document, narrow the envelope, adjust uncertainty, or change the model.
5. For a model change, add old/new comparison evidence, update model or assumptions version, stale prior results, and update relevant docs in one package.

**Candidate domains:** thrust-curve ascent, scalar ascent fallback, layered wind, descent/inflation assumptions, dispersion, and snatch screening.

**Acceptance:**

- Every model change cites a failing/revealing case and decision impact.
- No model change is justified solely by making a test green.
- Existing accepted cases are reviewed for supersession.
- Version changes invalidate prior results as designed.
- Release notes distinguish model refinement from real-world validation.

**Evidence:** domain corpus suite, focused regression tests, old/new comparison report, `npm run check`, affected E2E.

**Gate G11:** v2 does not require every candidate refinement. Promote only evidence-backed, bounded changes; defer the rest with documented limitations.

## Phase 7: Release qualification

### V2-12 Release qualification

**Depends on:** V2-00 through V2-10. Only approved V2-11 refinements are required.

**Objective:** prove the v2 claims on supported release targets and publish matching documentation.

**Work:**

- Freeze model, assumptions, schema, catalog, evidence index, and confidence-rule identities.
- Run the full validation and regression matrix from a clean install.
- Test representative fresh, stale, invalid, out-of-envelope, conditional, sensitivity-flagged, and insufficient workflows.
- Build and inspect the web artifact and Windows portable archive.
- Verify macOS on a Mac before making a macOS support claim; otherwise document it as unverified.
- Perform accessibility review for keyboard flow, names, focus, contrast, status text, and print legibility.
- Review all product copy against prohibited claims and actual evidence coverage.
- Update README, ROADMAP, TODOS, CHANGELOG, validation docs, and release notes only after evidence is final.
- Record artifact hashes and known limitations.

**Required commands:**

```bash
npm ci
npm run validate:parts
npm run validate:corpus
npm run check
npm run e2e
npm run portable:build
git diff --check
```

Run the macOS build command only on a suitable macOS host:

```bash
npm run portable:macos:build
```

**Release acceptance:**

- All required commands pass from a clean dependency install.
- No accepted corpus comparison fails.
- Desktop and mobile E2E cover the complete planning-to-brief path.
- Import/export/share migration matrix passes for every supported prior payload version.
- Generated brief has no stale/current, identity, unit, or unresolved-check mismatch.
- Windows artifact launches and its SHA-256 is recorded.
- Documentation makes only claims supported by the final evidence report.
- Remaining limitations and externally gated items are explicit.

**Gate G12:** release only when evidence supports the v2 release claim. A schedule is not grounds to weaken confidence rules, tolerances, or disclosures.

## Verification matrix

| Claim | Direct evidence | Broader evidence |
|---|---|---|
| Corpus is valid and reproducible | `npm run validate:corpus` | clean-install `npm run check` |
| Numerical outputs match accepted references | per-domain corpus cases | full corpus report |
| Stale results cannot be used | integrity unit tests | desktop/mobile Playwright flows |
| Confidence states obey policy | decision-table tests | representative UI/brief flows |
| Mission boundaries are deterministic | boundary unit tests | navigation/remediation E2E |
| Sensitivity is reproducible | seeded/property tests | scenario comparison E2E |
| Catalog values are traceable | catalog validator/report | hardware review and export tests |
| Brief preserves the plan | view-model and fixture tests | print/share/import E2E |
| Flight observations retain identity | storage/migration tests | reload and transfer E2E |
| Release artifacts match claims | artifact smoke checks | release checklist and hashes |

## External gates

The following cannot be manufactured by implementation work and must remain explicit:

- Independent reviewer identity for `accepted-for-comparison` cases.
- Licensed/access-controlled external simulator artifacts when used.
- Manufacturer or test evidence for component-specific load behavior.
- Traceable real-flight observations.
- macOS artifact verification on macOS hardware.

Absence of an external gate does not block all v2 work. It limits evidence level, confidence state, or platform claim as specified above.

## Rollback and compatibility

- Keep migrations forward-only and fixture-tested; never silently reinterpret old data.
- Preserve the last supported schema decoder until the release support window is explicitly changed.
- A failed model rollout reverts code, model identity, and affected evidence index together.
- Do not delete superseded corpus cases; retain status and reason.
- Do not remove old result fields until all in-repository consumers and migration fixtures no longer need them.
- Generated artifacts and local flight data are not committed unless explicitly designated as fixtures.

## Completion ledger

Update `Status`, `Evidence`, and `Decision` when each gate closes.

| Package | Status | Evidence | Decision |
|---|---|---|---|
| V2-00 Baseline and contract ledger | Complete | `npm run check`, `npm run e2e`, and `git diff --check` passed; browser-authority and provenance baseline recorded | Existing parts validation and snatch screening treated as shipped foundations |
| V2-01 Executable validation gate | Complete | `npm run validate:corpus` validates schema, manifest, identities, evaluator registration, and accepted-case gate behavior | Review cases report structural health; only accepted cases will gate numerical agreement |
| V2-02 Initial validation corpus | In progress; externally gated | Five checked-in review cases cover atmosphere, descent, drift, and static load screening | Add domain coverage and independent review before any case becomes accepted |
| V2-03 Mission envelope | Complete | Pure evaluator, stable reason codes, and unit tests; integrated as a visible review boundary | No unsupported numeric operating boundaries invented |
| V2-04 Confidence evaluation | Complete | Pure evidence-coverage/confidence decision table and UI integration; unsupported states are prevented by tests | No numeric confidence score; no Supported state without accepted evidence |
| V2-05 Confidence/stale UI | Complete | Accessible desktop/mobile E2E and focused tests show current/stale/no-result posture and remediation | Review-only corpus remains insufficient confidence |
| V2-06 Sensitivity workflow | Complete | Deterministic one-at-a-time analysis, focused tests, and desktop/mobile E2E | Separate model response from probability or confidence interval |
| V2-07 Catalog provenance | Complete within available evidence | Registry/report covers all built-ins; UI labels catalog data unverified and custom data user-supplied | Per-part verification remains externally gated |
| V2-08 Hardware/deployment review | Complete within available evidence | Stable compatibility metadata, review UI, acknowledgement boundary, focused tests, and desktop/mobile E2E | Existing rule coverage retained; component-specific validation remains external |
| V2-09 Recovery brief | Complete | Versioned view model, export/print status, provenance, and focused tests | Existing config/share format remains unchanged |
| V2-10 Flight evidence capture | Complete | Versioned local records, migration, immutable prediction snapshot, local JSON transfer, and focused tests | User records never auto-promote to corpus evidence |
| V2-11 Model refinement decisions | Externally gated | Corpus CLI and sensitivity workflow expose evidence needed for decisions | No physics change without a reviewed, decision-relevant discrepancy |
| V2-12 Release qualification | Complete for the Windows/web build; externally limited | Clean `npm ci`, `npm run check` (28 files / 234 tests), `npm run e2e` (32 desktop/mobile tests), `npm run portable:build`, and `git diff --check` passed. Windows portable SHA-256: `914BEDE4EE27625E0546A8C74CCFDC5E4FA67D6D12A7478EF7476DF8DAEDFF59` | Do not claim macOS support, accepted comparison evidence, manufacturer verification, or real-flight validation until their external gates close |

## First execution queue

Execute these next without reopening product strategy:

1. Finish V2-00 contract inventory, manifest identity reconciliation, and backlog cleanup.
2. Implement V2-01 corpus CLI and wire it into `npm run check`.
3. Migrate existing fixtures and build V2-02 coverage domain by domain.
4. Close G2 with a coverage/disagreement report before implementing confidence presentation.
