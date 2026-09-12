# RecoverySys interaction flows

Status: proposed interaction brief, not implemented UI or an approved visual direction.
Date: 2026-09-09.
Inputs: [product record](../../PRODUCT.md), [capability matrix](capability-gap-matrix.md), [plan contract](recovery-plan-contract.md).

## Interaction thesis

The user works on one recovery plan, not a collection of unrelated calculators. The selected physical system, requirements, evaluated scenario and evidence stay connected across workspaces. Guidance provides next actions without forcing experienced users through a wizard or treating completion of screens as verification.

Primary mode: operate. Optimize task completion, traceability and comprehension. No new palette, typography, animation scheme or framework is chosen here. Existing DESIGN.md is not silently rewritten; its older expert-only/no-guide assumptions conflict with the newly confirmed product direction and must not govern these flows.

### Confirmed quick-drafting requirement

Preserve the current catalog-and-configuration interaction as a central design surface. Users can open a standard arrangement or empty draft, add/replace parts and see supported compatibility feedback without first completing requirements, architecture or evidence forms. Provide requirements-first sizing as an alternative entry, not a compulsory sequence. Deeper workspaces organize optional detail around the draft; they are not onboarding gates.

Keep the draft in the same durable plan throughout refinement. Template assumptions remain explicit, unknown values block only dependent calculations, and part swaps visibly stale dependent results. Label specific gaps such as estimated mass, unknown packing dimensions or unconfirmed connections rather than relying solely on a generic Draft badge.

Acceptance: with no formal requirement profile and incomplete rocket specifications, a user can add and replace a chute, see which checks can run and what remains unknown, save/reopen the draft, then add requirements and test evidence without recreating the configuration.

## Quick-draft workspace specification

Status: proposed screen composition implementing the confirmed quick-drafting requirement. This is not a new visual identity or implemented UI.

### Desktop composition

```text
Plan name | Saved / Unsaved | Scenario | Draft assumptions
---------------------------------------------------------
Parts catalog       | Recovery draft       | Relevant feedback
Search / category   | Selected components  | Selected-item checks
Catalog / custom    | Placement / grouping | Missing information
Owned filter        | Add / swap / remove  | Estimated consequences
Candidate details   | Optional phase view  | Run / compare / inspect
---------------------------------------------------------
Deeper tasks: Rocket & requirements | Tests & flights | Handoff
```

The recovery draft is the main working surface. The catalog stays available while editing it. Feedback is contextual and bounded; it does not become a second dashboard of every result. At smaller desktop widths, feedback moves to an expandable panel rather than squeezing all three regions into unreadable columns.

### First-use behavior

- New draft opens directly into the workspace, not a requirements questionnaire. Use an explicit template choice to populate a standard arrangement; selecting Empty preserves an incomplete arrangement rather than inventing connections.
- Do not require naming a plan before selecting parts. An automatically titled draft can be renamed later.
- Catalog browsing and part selection work without rocket inputs. A missing mass yields a specific prompt for descent estimates, not a disabled workspace.
- Show template assumptions as inspectable draft context. Do not require confirming every connection before exploring parts, but do not imply those connections have been verified.
- Keep a labeled example available without silently substituting demo values for the user's missing inputs.

### Add, swap and remove

1. A part row has a clear Add or Use action and a separate Details action. Standard target roles are explicit: for example, Replace main chute. Do not infer a target silently when several assemblies/chute roles are eligible.
2. Selecting a configured item puts the catalog into a visible replacement context. Search/filter position remains stable while comparing candidates.
3. A replacement changes the selected instance's component specification while retaining valid placement/role references. Explain invalidated dimensions, connections or evidence; do not silently drop them. If attachment interfaces differ, mark the relationship unresolved rather than guessing equivalence.
4. Adding another copy creates a distinct instance; replacing does not add duplicate mass. Choosing which instance is being replaced is explicit when multiple copies exist.
5. Removing an uncomplicated draft item is immediate with Undo. Removing an item referenced by events or finalized evidence first explains the affected relationships; historical evidence is never deleted with the current selection.
6. Undo restores the relevant draft change. It cannot label an unrelated analysis run current or rewrite a finalized attempt.

### Feedback while drafting

Use three distinct feedback layers:

- **Known component information:** mass, dimensions, source and properties available without rocket inputs.
- **Supported quick checks:** compatibility, packing screening and scoped descent estimates when their inputs exist. Show assumptions and the specific missing inputs otherwise. Recompute inexpensive deterministic checks after an edit; do not run full simulations or large imports on each keystroke.
- **System analysis:** explicit Run action and current/stale/missing state tied to the exact revision and scenario. A stale result may be viewed as a labeled previous run, never mixed into current quick estimates.

Do not show an overall safe/ready badge. A component can match a target while packing remains unknown and system analysis is stale. Represent these separately in ordinary language.

Examples of feedback copy, not fixed production strings:

- Add rocket mass to estimate descent rate.
- Matches the selected descent target; packed diameter is unknown.
- This swap changes recovery mass. Previous simulation needs rerunning.
- Template connection assumed; confirm before using its load-path analysis.

### Optional detail, without leaving the draft behind

- Rocket inputs open alongside the draft or in a focused inspector; closing returns to the selected component and catalog position.
- Size from target opens a contextual sizing tool for the selected role/group. It does not start a separate project or require a full competition profile.
- Custom architecture expands the same system representation. No conversion into a second advanced-mode document and no reset of selections.
- Create test links to the selected component/event and current configuration. The test record opens with those references populated, not with a duplicate hardware-entry form.
- Save alternative captures the current revision/scenario for comparison. Applying an alternative is explicit and preserves the previous one.
- Opening requirements, evidence or handoff keeps plan/revision context and provides a return path to drafting.

### Narrow-screen and keyboard behavior

On narrow screens, keep Draft and Parts as adjacent, easily switched task views; selecting a part returns to or confirms its target in Draft. Contextual feedback expands below that item or opens an inspector. Preserve search/filter/scroll state between views. Do not compress the desktop three-column layout.

All add/swap/remove/details actions are labeled buttons. Keyboard users can choose the target instance without dragging. Changes announce the affected component and stale/unknown state without reading the full warning list. A diagram remains optional for essential edits.

### Acceptance scenarios for the quick-draft surface

| Scenario | Observable acceptance |
|---|---|
| Start with no inputs | Browse and select hardware, save a draft, and see missing-input explanations without a forced wizard |
| Swap repeatedly | Replace a chute several times without leaving the workspace, losing search position or duplicating component mass |
| Known mass, unknown bay | See applicable descent estimates while packing is explicitly unknown; no overall compatibility pass |
| Swap after simulation | Immediate quick checks reflect the new item; the previous system result is visibly stale until rerun |
| Multiple recovery groups | Replacement action identifies the target group/instance and never overwrites another group's chute |
| Add formal requirements later | Existing selections remain; requirements evaluate them rather than forcing reselection |
| Add tests later | Test definition references the current item/event; finalized attempts retain their actual tested snapshot after subsequent swaps |
| Save fails | Draft stays recoverable with persistent unsaved feedback, not an inaccurate Saved label |
| Keyboard or narrow screen | Complete add, replace, inspect, undo and return-to-draft without dragging or a desktop-only interaction |

These are future usability checks, not measured task-time claims. A prototype should test them with a standard draft and a multi-group arrangement before visual polish or full implementation.

### Isolated interactive prototype

The [quick-draft prototype](prototypes/quick-draft.html) exercises the focused main-chute journey with the production catalog, `computeDescentRate` and `computePackingVolume`. Serve it through the existing Vite server; it is not a standalone file:// page. It does not replace production routes or implement the complete architecture/evidence workspace.

It supports 148 catalog main chutes, search and rate/diameter ordering, add/replace/remove/undo, explicitly chute-excluding mass, optional target, allocated bay dimensions, immediate estimates, a session-only comparison baseline, isolated local persistence and prototype JSON export. Export is explicitly not compatible with production configuration import. No full-flight simulation or approval is claimed.

Browser smoke checks exercised selection without mass, mass-driven estimates, swapping, retained baseline, radial/space failures, positive allocated-space screening, invalid mass, search/empty search, undo retaining later input edits, removal/undo, and reload restoration. A sample estimate matched the production descent function. Desktop and 390px rendering were inspected without horizontal page overflow; the mechanical design check reported no findings. Browser automation context errors prevented completing a native keyboard interaction check; DOM-driven behavior verification is not a full keyboard/accessibility audit. Numerical model accuracy was not validated by these checks.

### Production implementation

The prototype interaction is implemented as the default DRAFT workspace in the Revamp layout (`src/components/tabs/QuickDraftTab.jsx`, mounted first in `RevampLayout.jsx`; Classic layout untouched). It reuses `computeDescentRate`, `computePackingVolume`, `normalizeCalculationInputs`, `SpecInput` and the shared plan state, including the production total-mass convention. Compatibility warnings render in the draft feedback panel, so the existing status-badge test contract holds on the default tab. Verified with lint, production build, full unit suite (261 passed) and desktop browser smoke checks of select/swap/undo/mass/baseline/reload behavior plus intact DASHBOARD and SIMULATION tabs.

## Proposed workspaces

These are navigation responsibilities, not final tab labels or fixed screen counts.

| Workspace | Primary question | Primary actions | Related detail |
|---|---|---|---|
| Plan overview | What is defined, what changed, what needs attention? | Resume next unresolved task, inspect revision/scenario, open a concern | Save state, missing inputs, pending evidence reviews; no single safety score |
| Rocket and requirements | What constraints and outcomes are we designing around? | Edit known values, mark origin/adjustability, define requirements, apply a sourced profile | Units, source details, unknowns, mass reconciliation |
| Recovery system | What is connected, where is it packed, what happens during deployment? | Choose/edit template, add sections/components/connections/events | Synchronized physical list/diagram, phase view, mass groups, feasibility |
| Analysis and alternatives | What does this configuration do, and what should change? | Size, compare candidates, run supported evaluations, inspect alternatives | Scope, assumptions, requirement margins, sensitivity and drift |
| Tests and flights | What did we actually observe and what does it support? | Create attempt/flight, import evidence, compare results, record corrective actions | Frozen configuration, artifacts, criteria, applicability |
| Review and handoff | Can another person understand and review this exact plan? | Inspect unresolved items, generate brief, export plan/project bundle | Requirements, sources, evidence links and explicit exclusions |

Components can appear contextually in more than one workspace without creating duplicate state. Selecting a concern opens its exact target and offers a return path to the originating review. Selecting a component in a table or diagram opens the same inspector.

### Persistent context

Always identify the plan, current working revision or historical snapshot, selected scenario and save state. When analysis is shown, identify its input revision and missing/current/stale state. Evidence status is separate. A historical snapshot is visibly read-only, with an explicit action to create an editable revision from it.

Avoid a permanent wall of warnings. Overview summarizes categories and next actions; detailed findings live with their targets and in review. Important unresolved conditions must remain discoverable even when a detail section is collapsed.

## Flow F01: Start, resume or check an existing setup

Covers C01, C02, C20, C22.

**Entry:** new visitor, returning plan, imported plan, or explicit demo.

1. Offer Design recovery, Check my setup, Open/import plan and an explicitly labeled example. If a saved plan exists, foreground resume without silently replacing it.
2. Both design/check paths create the same plan type. Default to quick drafting with clickable/swappable hardware and minimal needed inputs; offer requirements-first sizing as another route. Neither route requires completing the other before editing or saving a draft.
3. Ask only for values needed by the next operation. Unknown dimensions or mass do not prevent recording the plan; they block only calculations requiring them.
4. Let the user record estimated/measured/source status and adjustability without requiring a citation for every draft value. Unknown provenance is explicit.
5. Autosave feedback distinguishes saved, saving, unsaved and failed. Leaving a failed-save state warns and offers an export of recoverable work.

**Exit:** durable draft with an honest next action, not a green completion badge.

**Branches:** demo does not overwrite real work; malformed import preserves existing plans; legacy imports show incomplete architecture for confirmation; returning users may navigate directly to any workspace.

**Proof:** start an incomplete design, leave/reopen, then switch from check to design assistance while retaining component selections and unknowns.

## Flow F02: Design a standard recovery system from constraints

Covers C01, C03-C11, C13, C14, C22.

**Entry:** known rocket constraints, with some inputs still adjustable.

1. Select a standard architecture template. Preview its sections, compartments and intended event sequence before applying; template application never implies those details were measured.
2. Match the template to the actual rocket. Reconcile section/assembly masses and which components are already included. Assign components to compartments and attachment endpoints.
3. Define outcomes per descending group/phase. Add hard limits and preferences, or apply a profile with source/edition/applicability visible. Overrides remain marked.
4. Select a chute role/group and choose Size from requirements. Show required drag area and assumptions before candidate parts. A diameter needs a stated canopy model/Cd basis.
5. Candidate rows show evaluated criteria, failures and unknowns. Include owned/custom candidates. A closest-rate match is not called feasible if it fails packing or lacks required specifications.
6. Selecting a candidate creates/replaces a component instance, then recomputes supported local compatibility. Full simulation remains an explicit action with visible stale state.
7. Run applicable system evaluations. Present per-group outcomes and requirement margins. Separate unsupported analysis from missing inputs and failed constraints.
8. Turn physical-verification requirements into planned tests or inspections instead of asking the user to acknowledge them away.

**Exit:** chosen candidate system with current scoped estimates and unresolved external work.

**Branches:** no candidate fits -> show conflicting constraints and allow explicit edits; fixed constraints are not silently relaxed. Missing catalog property -> allow sourced/user input or leave unknown. Impossible mass accounting -> explain double-counting/inconsistency rather than calculate from it.

**Proof:** a candidate matching descent target but failing bay fit is visibly unsuitable under that constraint; changing the target updates suggestions and requirements together.

## Flow F03: Extend the system with independent payload recovery

Covers C03-C06, C09-C11, C13, C14, C22.

**Entry:** a working standard configuration.

1. Add a recoverable payload/section with its own mass basis and attachment points.
2. Record initial retention and the event that releases it. Keep storage location separate from the parachute/harness attachment.
3. Step through before/after views of the event. Display the derived connected groups and their masses. A missing connection is an explicit incomplete relationship, not an assumed release.
4. Assign recovery devices and requirements to each resulting group. Inherited template requirements prompt a scope review rather than applying only to the original global mass.
5. Evaluate groups using supported methods. Any interaction, multi-canopy behavior or transient outside coverage remains unassessed.

**Exit:** two explicit descent groups with separate outcomes and requirements.

**Branches:** deleting a connection lists the affected events, masses and evidence references before commit; a physical connectivity cycle is allowed but ambiguous load distribution is not guessed; unassigned hardware mass requires reconciliation.

**Proof:** opening a body joint while retaining a harness leaves one group; releasing payload retention creates a separate group without duplicating its mass.

## Flow F04: Describe and review a custom release mechanism

Covers C03-C05, C10, C11, C14-C16, C22.

**Entry:** template customization or blank architecture.

1. Add a custom component/mechanism and its known dimensions, mass, interfaces and specification sources. Do not demand unsupported numeric parameters just to preserve the design.
2. Define intended trigger, prerequisites and affected connection/state changes using structured options where supported and descriptive fields otherwise.
3. Inspect event dependencies and phase transitions. Reject unresolved references or event dependency cycles; allow descriptive custom behavior with a visible unassessed status.
4. Run unrelated supported checks where possible. Do not replace the mechanism with a conventional main-deploy event merely to get a simulation result.
5. Create a linked test definition for the specific unsupported assertion, such as observed release under the team's stated test conditions.

**Exit:** faithfully described architecture with a clear analytical boundary and planned evidence collection.

**Proof:** user can save/reopen a custom mechanism without obtaining an invented reliability, deployment-time or approval result.

## Flow F05: Compare alternatives and resolve concerns

Covers C06, C08-C14, C20, C22.

**Entry:** a candidate configuration or an actionable finding.

1. Save an alternative from the current revision/scenario, then change a candidate component or a condition. Label whether comparison changes hardware, environment, requirements or several at once.
2. Compare inputs, scoped outputs and requirement margins side by side. Mark changed requirements so a relaxed target cannot masquerade as improved performance.
3. Open a sensitivity view to identify influential inputs. Hypothetical changes to fixed inputs remain labeled hypothetical and do not change the plan.
4. Follow a finding to the exact value, connection or component. Preserve return context and scroll/focus position.
5. Apply a chosen alternative explicitly. Dependent outputs become stale; after rerun all surfaces agree on the current run, even if evidence remains insufficient.

**Exit:** chosen revision with rationale and preserved alternatives.

**Branches:** unavailable model outputs show unavailable cells rather than zero; an old result retains its old model/input identity; undo restores inputs without pretending an unrelated run is current.

**Proof:** changing the wind scenario does not overwrite a saved baseline, and an acknowledged concern stays unresolved until its condition changes or evidence addresses it.

## Flow F06: Record a ground test, failure and retest

Covers C06, C14-C16, C18-C20, C22.

**Entry:** unresolved verification requirement, component/event inspector, or Tests workspace.

1. Choose a recovery test family or Custom. Name the question and criterion. Link the target component/event and method reference.
2. Confirm the actual tested configuration. Offer a test-article snapshot and explicit differences for subscale, surrogate or modified assemblies.
3. Start an attempt record. Observations can be entered after the physical test; the app does not arm hardware or operate the test.
4. Record date, conditions, observations and outcome. Media and instrumentation are optional; incomplete information stays visible.
5. Associate evidence with the assertion it supports. Output activation, physical release, extraction, inflation and descent are separate observations.
6. Finalize the attempt with a criterion assessment: met, not met or inconclusive. An interrupted attempt can remain incomplete. Finalization freezes records, not the engineering verdict.
7. If a change is needed, record the corrective action and create another attempt from the revised tested configuration. Keep the unsuccessful attempt in the series.

**Exit:** traceable attempt series and an explicit statement of what the evidence supports.

**Branches:** no file -> valid manual record; conflicting observations -> preserve both and mark assessment unresolved; later correction -> amendment retaining original; attachment save fails -> do not claim evidence persisted.

**Proof:** a successful second pop test does not erase the first failure or automatically satisfy an in-flight inflation requirement.

## Flow F07: Import a recording or attach external analysis

Covers C15-C18, C20, C22.

**Entry:** an attempt or flight record; standalone imports remain unassigned until linked.

1. Choose Import measurements or Attach reference file. The distinction is visible before upload. Native logs/scripts/PDFs may be reference-only.
2. Retain the original file; identify supported format and version if possible. For XLSX, choose the sheet/table; formulas/macros are not executed.
3. Map time and measurement channels. Confirm units, quantity, datum/reference, device/source and measured/vendor-derived/user-derived classification. Unknown provenance remains unknown.
4. Preview table and chart with missing channels, packet gaps, duplicate/nonmonotonic time, raw sensor counts and unavailable calibration clearly identified. A parser success is not evidence validity.
5. Confirm the mapping. Save the immutable normalized dataset and provenance; optionally save a reusable mapping for that export version/setup.
6. For multiple files, retain separate recordings and explicitly align timebases. Any resampling/filtering/cropping creates a linked derivative with visible settings rather than modifying originals.
7. Select which datasets support which observations or analyses. Attachment alone does not mean parsed or used.

**Exit:** an interpretable dataset or clearly labeled reference artifact attached to a specific context.

**Branches:** unsupported format -> retain reference-only or cancel; units ambiguous -> require mapping before calculation; missing channel -> assess only supported quantities; cancellation -> no partial committed record; duplicate -> reuse identical artifact, do not duplicate attempts.

**Proof:** a vendor export without velocity does not invent a measured velocity column. Radio gaps remain gaps unless the user creates an explicit derived interpolation. Canceling import leaves the existing attempt unchanged.

## Flow F08: Compare a flight with its prediction

Covers C11-C14, C16-C20, C22.

**Entry:** a completed flight or a flight imported from an older RecoverySys record.

1. Select the configuration actually flown and the preflight analysis run, if available. Record differences from the planned setup.
2. Add manual observations, instrumentation, flight-computer datasets, video and landed-condition photos.
3. Map observed events and supported descent intervals. Show their sources and timing uncertainty. Do not equate a deployment command with canopy inflation.
4. Compare per-phase/group predictions with corresponding observations, excluding missing or inapplicable comparisons rather than supplying zeros.
5. Record discrepancies, damage, lessons and proposed changes. Keep a post-flight recalculation labeled retrospective.
6. If the design changes, create an applicability review for relevant past evidence. Retain applicability with a reason, limit it or request another test; do not mutate the old flight record.

**Exit:** a flight-specific comparison and a defensible next design action.

**Branches:** no preflight prediction -> record observations without manufacturing one; legacy hardware snapshot absent -> mark unreconstructable fields; sensor/video disagreement -> preserve disagreement; several flights -> show configuration differences before aggregate comparison.

**Proof:** today’s component catalog cannot change last month’s recorded prediction or the hardware attributed to it.

## Flow F09: Review, export and reopen the exact plan

Covers C06, C07, C13-C16, C19-C22.

**Entry:** any revision, including an incomplete one.

1. Review configuration identity, scenario, mass accounting, requirements, current/stale outputs and evidence applicability.
2. Inspect unresolved items by type: missing input, failed criterion, unsupported analysis, physical verification, or pending review. Do not collapse them into a single readiness percentage.
3. Choose a brief/checklist, plan-only transfer or complete project bundle. Preview what is included/excluded, especially attachments and external links.
4. Incomplete/stale plans remain exportable with their status embedded. Export does not upgrade their evidence or approval state.
5. On receiving/importing, stage validation, version checks and reference conflicts. Show a summary before committing; preserve the receiver's existing plans on failure.
6. Reopen the imported revision and follow its requirements, runs and test references. Missing external artifacts stay visibly missing.

**Exit:** another person can identify and review the same configuration, assumptions and evidence boundaries.

**Branches:** oversized/quota-limited evidence -> offer explicit reduced export, never silently omit; conflicting record IDs -> fork/resolve; unsupported future version -> reject safely; print pages -> retain identity, readable tables and unresolved status across page breaks.

**Proof:** plan-only exports clearly say that evidence bytes are excluded; a full project import does not silently substitute newer catalog specifications.

## State and feedback rules

| Condition | User-visible behavior | Must not happen |
|---|---|---|
| Required quantity unknown | Save draft; explain which operation needs it | Default to a reassuring number |
| Existing results stale | Label exact stale run; offer rerun; distinguish historical viewing | Mix new inputs with old unlabeled output |
| Mechanism unsupported | Preserve representation; name unavailable checks | Fake a standard architecture |
| Criterion failed | Explain target, actual/estimated value and next action | Hide failure behind acknowledgement |
| Evidence incomplete | Identify missing observation or file | Treat upload count as verification |
| Save/import failed | Persistent error with recoverable working state | Success toast before commit |
| Historical record selected | Read-only identity and explicit create-revision action | Mutate old evidence while editing current plan |
| Profile overridden | Show original requirement and customization | Claim unqualified profile compliance |

## Responsive and keyboard behavior

- Desktop can pair a system view with an inspector and contextual results. Avoid simultaneously exposing every table, chart and warning.
- Narrow screens show one primary task surface at a time with persistent plan/scenario context. Inspector navigation restores the previous selection and position.
- Every diagram mutation has a list/form equivalent. Add/connect/reorder actions work without dragging; connections use labeled endpoint selectors.
- Event sequence and connection lists have understandable reading order. Status uses text, not color alone.
- Forms retain values on validation failure; error summaries link to fields. Modal/inspector close returns focus to the originating control.
- Charts expose units, source and accessible summary/tabular data. Keyboard selection can inspect events/intervals without precise pointer gestures.
- Import tables support overflow within their region rather than widening the entire page. Units and mappings remain associated with their columns.
- No visual verification is claimed: these are acceptance requirements for the eventual implementation.

## Coverage ledger

| Flow | Capability IDs |
|---|---|
| F01 | C01, C02, C20, C22 |
| F02 | C01, C03, C04, C05, C06, C07, C08, C09, C10, C11, C13, C14, C22 |
| F03 | C03, C04, C05, C06, C09, C10, C11, C13, C14, C22 |
| F04 | C03, C04, C05, C10, C11, C14, C15, C16, C22 |
| F05 | C06, C08, C09, C10, C11, C12, C13, C14, C20, C22 |
| F06 | C06, C14, C15, C16, C18, C19, C20, C22 |
| F07 | C15, C16, C17, C18, C20, C22 |
| F08 | C11, C12, C13, C14, C16, C17, C18, C19, C20, C22 |
| F09 | C06, C07, C13, C14, C15, C16, C19, C20, C21, C22 |

Coverage is traceability, not proof that UI behavior is implemented. All C01-C22 requirements have at least one flow. Next implementation/design review must exercise the listed outcomes and failure branches against real interfaces and import fixtures.

## Boundaries and decisions not invented here

No visual world or framework replacement, no automatic physical test procedures, no propulsion test platform, no unrestricted programming canvas and no automatic flight approval. Exact model coverage, device parser versions, numerical limits and supported attachment codecs require engineering evidence. Navigation labels and screen composition remain proposals; approved product scope is not reduced by grouping it into six workspace responsibilities.
