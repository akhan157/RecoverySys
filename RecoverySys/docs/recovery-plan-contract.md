# Recovery plan contract

Status: proposed design, not an implemented schema or authorization to rewrite application code.
Date: 2026-09-09.
Companion: [capability and gap matrix](capability-gap-matrix.md).

## Decision

Make the recovery plan the durable unit of work. Its architecture describes physical relationships and intended events; requirements describe desired outcomes; analysis describes what supported models predict; evidence describes what was actually observed. None substitutes for another.

Use explicit records and relationships rather than a general-purpose visual programming language. Standard templates populate the same records users edit for custom systems. The UI need not expose a node editor to represent a graph internally.

These are proposed semantic contracts. Exact JSON field names, schema version, storage implementation and UI layout remain engineering decisions. No universal model support or compliance claim follows from representation support.

## 1. Durable entities

| Entity | Responsibility | Identity and lifetime |
|---|---|---|
| Plan | Named recovery design and current working revision | Stable plan ID; edits change revision, not identity |
| Plan revision | Architecture, inputs, requirements, chosen component specifications and scenarios at a point in time | Immutable revision ID; an explicit edit creates a new revision when recorded as a baseline |
| Section | Physical rocket section or recoverable payload; carries its mass accounting and attachment points | Stable ID through edits; replacement can be a new instance |
| Compartment | Available recovery space belonging to a section | Independent ID; dimensions and obstruction references, not a duplicate mass |
| Component instance | A particular installed/selected chute, harness, connector, release device or other item | Instance ID separate from catalog/custom definition ID; several identical parts can coexist |
| Connection | Relationship between attachment endpoints, including joints, harnesses and releasable links | Stable ID; explicit state and participating component instances |
| Event | Intended condition and physical state transition | Stable ID; references affected entities and predecessor events |
| Requirement | Hard constraint or preference scoped to an assembly, event, component or whole plan | Stable ID; source, applicability and assessment method |
| Scenario | An explicit set of flight/environment conditions and any selected sequence alternative | Stable ID; references the plan revision being evaluated |
| Analysis run | Results, applicability, assumptions and exact model/input identities | Immutable run ID; no replacement of historical output on rerun |
| Test definition | Question, target entities, method reference and acceptance criteria | Stable ID with revision; reusable across attempts |
| Test attempt | Actual test configuration, conditions, observations and outcome | Immutable finalized record; corrections are linked amendments, not silent edits |
| Flight record | Actual flown configuration, observations, recordings and linked preflight predictions | Same evidence principles as attempts; flight-specific identity |
| Artifact / dataset | Original evidence bytes or explicitly derived measurements | Content identity plus metadata; relations to attempts/flights and derivations |
| Review assessment | Human conclusion about evidence applicability or a criterion | Reviewer/date/scope and referenced revisions; not flight authorization |

Working drafts remain editable and autosaved. Finalizing a test record freezes its actual configuration and evidence references. It does not prove the test succeeded or that the design is safe.

A source catalog update must never retroactively change an old plan revision or test. Store the selected specification snapshot plus its catalog reference and provenance. Adopting updated catalog information is an explicit edit.

## 2. Values: knowledge and adjustability are separate

A engineering value has:

- Quantity and explicit unit, or an explicit unknown value.
- Origin: measured, estimated, manufacturer-specified, imported, derived, or unknown.
- Source reference and optional date/method where available.
- Adjustability: adjustable or fixed for this design exercise.
- Optional bounds/uncertainty with its stated meaning. Do not invent a distribution from a range.

For example, a measured tube diameter can still be adjustable if the team can change the tube. A fixed motor choice can have an estimated loaded mass. Unknown is not zero; a default is not measured. Invalid input stays invalid until corrected rather than being silently clamped into a passing value.

Store values with explicit units and normalize at calculation boundaries. Preserve imported original units in provenance. Do not treat imported altitude as interchangeable with AGL height: record reference datum, source and conversion assumptions.

Fixed means design recommendations do not propose changing it. It does not prevent the owner from explicitly unlocking/editing it, and does not rule out sensitivity analysis labeled as hypothetical.

## 3. Architecture: three related views, not one overloaded diagram

### Physical containment

Sections contain compartments and component placements. Physical containment is acyclic. A component has one physical location at a given phase, or an explicit unknown/external location. A component cannot occupy two bays merely because two diagrams reference it.

Placement and load-bearing attachment are different relationships. A parachute may be packed in the nose compartment while its harness is attached to another section.

### Connectivity

Connections describe what mechanically joins the system. Endpoints reference section attachment points or component attachment points. Record whether a joint is rigid, flexible, releasable or not yet characterized. Geometry, force direction and component ratings are separate inputs.

Connectivity may contain cycles and redundant links; do not require a tree. A structural cycle does not prove load sharing. Parallel-load distribution or an ambiguous load path requires a supported model or an explicit unassessed result.

Opening an airframe joint does not necessarily create independently descending pieces: a harness can keep the sections connected. Derive descending groups from the active retention relationships after each event, not from compartment count or the number of open joints.

### Event sequence

An event has a trigger description, preconditions, affected entities and intended state changes. Examples of state changes include opening a joint, releasing a retainer or initiating chute extraction. Descriptive custom triggers and mechanisms are allowed without claiming the simulator understands them.

Represent deployment milestones separately: commanded, output activated, mechanism operated, extracted, inflated, established descent. Planned transitions are not observed transitions. An electrical event log cannot by itself prove extraction or inflation.

Use an ordered event dependency graph for a chosen scenario. Validate unresolved references and dependency cycles. Alternative/failure branches are separate explicit scenarios rather than an unrestricted executable language. Unsupported concurrent/interacting transitions remain descriptive and unassessed; do not silently serialize them.

## 4. Mass accounting and descending groups

Count physical mass once. Sections, loose payloads and installed component instances must have explicit ownership; containment records do not create extra mass.

Support either:

- Section/base mass excluding separately enumerated component masses; or
- Measured assembly mass including an explicit list of its contained entities.

Do not sum both. Show a reconciliation when a measured total and itemized estimates disagree. Preserve the discrepancy until the user resolves the accounting basis.

For each evaluated phase, derive the connected descending groups and attach active recovery devices to those groups. Every released physical section must belong to exactly one group; unlocated/missing relationships produce an incomplete architecture, not optimistic performance. Expelled/consumed material needs an explicit accounting treatment where relevant.

Two inflated chutes on one group do not automatically have additive independent drag. Multiple canopies, reefing, body interactions and transient loads need an applicable model or an unassessed result. Topology alone does not determine dynamics.

## 5. Requirements and suggestions

A requirement records:

- Scope: plan, specific group/phase, event, component or compartment.
- Quantity/predicate and bounds when machine-evaluable; descriptive criterion otherwise.
- Hard constraint or preference. Unknown is an assessment state, not a third severity.
- Source: team-defined, guidance or an edition-specific competition requirement.
- Applicability and verification method: analysis, test, inspection, demonstration or a combination.
- Original profile rule ID/version and any user override.

Assessment outcomes are met, not met, unknown, not applicable, or not assessed. Record why. A passed calculation is distinct from a fulfilled physical-test requirement. Requirements that need multiple verification methods remain unresolved until their declared evidence is addressed.

Profiles copy traceable requirements into the plan. Updating a profile offers a diff; it cannot rewrite historical criteria. An overridden profile is visibly customized. Do not infer compliance with the remaining handbook from a subset of modeled rules.

Inverse sizing first returns required physical characteristics, such as drag area under specified assumptions. Catalog matching then evaluates candidate instances within the actual architecture and requirements. Report passed, failed and unknown constraints per candidate. Preferences rank only after exposing feasibility; a preferred owned component must not hide a failed hard constraint.

If no candidate fits, explain which constraints are incompatible or unknown. Do not silently relax targets, assume missing specifications or imply that the current catalog contains every viable component.

## 6. Analysis contract and applicability

An analysis run records the complete effective inputs, plan revision, scenario, model/method versions, assumptions, catalog specification snapshots and outputs. Its reproducibility identity covers every input affecting that calculation.

Each result names:

1. Quantity and units, scoped to its group/event/phase.
2. Method and assumptions.
3. Applicability: supported by this method, conditional, unsupported, or missing inputs.
4. Evidence coverage and limitation references.
5. Requirement assessments that consumed it.

Keep freshness, applicability, requirement satisfaction and evidence quality as separate dimensions. A current estimate can fail a requirement; a passing estimate can have insufficient validation; a measured observation can belong to an obsolete design.

Reuse existing physics through narrow adapters for configurations they actually support. Never reduce a custom architecture to main/drogue slots invisibly. If an adapter cannot preserve mass, event order or recovery-group meaning, refuse that calculation and name the missing support.

A new input revision invalidates dependent analysis, not all historical evidence. Presentation-only edits need not force recalculation. Initially conservative dependency tracking is acceptable if the reason is visible; later refine it using explicit dependency identities.

## 7. Tests, flights and evidence

### Test definition and attempt

A test definition specifies the question, target entities, acceptance criteria and method reference. Recovery test families are deployment/extraction, release mechanisms, load/attachment checks, avionics/power/tracking, canopy characterization and custom tests. This is a record system, not a firing controller or a source of hazardous test procedures.

Each attempt stores its actual tested revision or an explicit test-article snapshot and differences from the intended flight configuration. Subscale and surrogate assemblies are separate test articles with a stated relationship to the flight design, not mislabeled flight hardware.

Record operator/date, conditions, instrumentation if any, manual observations, datasets/media, criterion results, limitations and corrective actions. A failure remains in the series when a later attempt passes. Interrupted or inconclusive tests remain distinct from failures and successes. Records can be valid without sensor files.

### Evidence applicability

Link evidence to exact assertions, not a global verified flag. An observed separation can support separation under tested conditions without proving inflation or in-flight performance.

A design change creates an applicability-review item for dependent evidence. The old attempt remains unchanged. A reviewer can retain applicability with a reason, limit its scope, or require another test. Do not auto-promote user observations into accepted model-validation evidence.

### Flight comparison

Link the flown snapshot to the preflight analysis run actually used. Do not reconstruct historical predictions using today's catalog or model. Record deviations between planned and flown setups. Compare supported phases/events with their data sources and time references visible.

A run created after a flight is a retrospective comparison, not a preflight prediction. Results from different configurations cannot be silently pooled into one reliability or accuracy statistic.

## 8. Dataset ingestion and artifact retention

Input channels: manual entries; CSV/TSV; selected XLSX sheets/tables; verified vendor export presets; reference attachments. Vendor-native formats remain attachments until a tested decoder exists. Scripts/native MATLAB files may be attached but never automatically executed.

Import stages:

```text
Original file retained
  -> format/version detection and bounded parsing
  -> table/channel/time/unit mapping
  -> preview with missing/invalid/derived-channel disclosures
  -> user confirmation
  -> immutable normalized dataset + mapping provenance
  -> optional explicit derived dataset
  -> analysis selects dataset and records its dependency
```

Store per-channel quantity, unit, measured/vendor-derived/user-derived classification, device/source, calibration information when available and missingness. Preserve original headers and software/firmware versions when known. Unknown provenance remains unknown.

Each recording retains its own timebase and sampling behavior. Time alignment is an explicit derived transform with anchor/offset and uncertainty where known. Do not silently fill packet gaps, smooth traces, resample at a higher rate or infer peak loads from sparse data.

Workbook formulas/macros are not executed by RecoverySys. Preview whether imported values are stored cell values and flag unavailable/unsupported values. File limits, decompression limits and supported codec/table handling must be selected during implementation, not left unbounded.

Artifacts have content hashes and metadata. A hash detects byte identity, not truth, calibration or authentic authorship. Keep original files distinct from normalized/filtered/cropped derivatives and record the operation and input identities. An external link is weaker retention than embedded evidence and must be labeled as such.

## 9. Persistence, export and import

Recommend IndexedDB for browser structured records and local binary artifacts, behind a small persistence boundary that desktop can reuse. This is a proposed choice, not an implemented storage migration. Avoid putting recordings/video in localStorage or share URLs. Browser storage is not a guaranteed backup; surface quota/failure states and provide portable exports.

Separate:

- Plan-only transfer, explicitly excluding evidence where absent.
- Complete project bundle with manifest, immutable record snapshots, datasets and selected original artifacts.

Import into a staging area, validate versions/references/hashes/limits and show conflicts before committing. Fail without overwriting the existing plan if required records are invalid. Missing optional linked evidence may be imported only with visible missing-artifact status. Reimport should not duplicate identical records; conflicting content under the same identity requires explicit resolution or a fork with remapped references.

Save success is reported only after persistence completes. A failed write leaves a visibly unsaved working state. Define behavior for multiple tabs editing the same plan rather than allowing silent last-writer wins. Export resolves all required references; delete operations must account for evidence shared by more than one record.

## 10. Migration from current RecoverySys

Current `payloadBoundary.js` accepts a fixed config/specs/customMotor shape; known catalog items are transferred by ID and resolved against the receiver's catalog. `flightEvidence.js` records specs and predicted results, not a full recoverable hardware snapshot. These are constraints, not adequate historical identity for the new model.

Migration rules:

1. Preserve original saved payloads and existing flight observations before converting; conversion failure must not destroy them.
2. Convert known slots to component instances with recorded specification snapshots where available. Do not fabricate historic specifications missing from old ID-only records; mark resolved-at-migration values and their source.
3. Map existing main/drogue dimensions into compartments. Existing data does not specify actual physical sections or connection topology: present an explicit incomplete legacy arrangement requiring confirmation. Do not assert that a chute slot proves dual deployment or a particular harness layout.
4. Keep a bounded legacy analysis path only for old records/configurations that its assumptions describe, clearly identified as the legacy method. New custom architectures must not be routed through it by guesswork. Remove obsolete production callers when the new supported path replaces them; historical method identity is data, not a permanent UI mode.
5. Mark old value provenance and adjustability as unknown/unconfirmed where not recorded. Existing defaults must not become measured inputs.
6. Preserve stored historical predictions as historical output. Do not claim reconstructable hardware or preflight evidence when only a hash/specs summary survives.
7. Extend schema validation and transfer together. Preserve future-version rejection behavior rather than silently discarding unfamiliar fields.

## 11. Representative acceptance walkthroughs

| Scenario | Architecture and outcome | Boundary defended |
|---|---|---|
| Standard dual deployment | Booster, avionics section and nose remain joined by harness connections after airframe joints open. Drogue and main events alter deployed devices, not automatically the number of descending groups. | Open joints do not imply independent recovery; mass counted once |
| Independent payload | Payload retention releases; payload has its own group and chute. Booster/avionics/nose remain another group with separate requirements and outputs. | One global mass/descent result cannot represent both |
| Custom release arrangement | User describes release condition and links; topology determines intended post-release groups. Release reliability/timing remains unassessed without applicable evidence/model. | Describing a mechanism is not simulating or approving it |
| Failed pop test and retest | Two immutable attempts with distinct packing/tested snapshots; second meets its criterion, first remains visible. Neither establishes in-flight inflation by itself. | Retests do not erase failures or overstate coverage |
| Two recordings | Onboard and radio files retain their own timestamps/gaps; user confirms mapping/alignment. Missing radio samples do not become measured interpolation. | Imported data availability and measurement truth remain separate |
| Later design edit | Changing a relevant harness instance makes affected analysis stale and creates evidence applicability review, without mutating old results. | Historical truth survives current editing |
| Unknown imported hardware | Legacy record contains only obsolete catalog ID; migration marks missing specifications and cannot reconstruct the flown configuration. | No invented provenance or silent catalog substitution |

A throwaway JavaScript connectivity experiment exercised the first three grouping cases. It returned one retained assembly for connected dual deployment, two groups for an independently recovered payload and two groups after the custom retention link was removed. This checks the grouping concept only, not deployment dynamics, load sharing, importer behavior or production code. No experimental files were created.

## 12. Frontend consequences

Proposed workspace responsibilities, not finalized tabs:

- Rocket and constraints: known/unknown values and what can change.
- Recovery system: physical arrangement, connections and intended sequence with templates.
- Requirements and choices: target characteristics, candidates and tradeoffs.
- Analysis and concerns: scoped outputs, assumptions, actions and stale/unsupported states.
- Tests and flights: attempts, evidence, comparisons and applicability reviews.
- Review and handoff: reproducible plan/brief with unresolved requirements and evidence references.

A simple user should select a template and edit ordinary forms. The system diagram is a synchronized view of the same records, not a second source of truth. Advanced users can add custom components/events without being forced into fixed slots. Persistent context should identify the selected plan revision/scenario and the result/evidence state.

Next design work is to turn these responsibilities into end-to-end interaction flows for the representative scenarios before choosing final navigation, visual styling or framework changes.
