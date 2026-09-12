# RecoverySys capability and gap matrix

Assessment date: 2026-09-09. Status: product scope agreed in conversation; implementation assessment complete; dependency order below is a recommendation, not implementation approval.

## Product contract

RecoverySys helps teams design and evaluate recovery systems using whatever is known about the rocket, from preliminary specifications to existing hardware. Design a system and check an existing setup are entry paths into the same plan. Recovery is not assumed to be an afterthought: published examples establish iterative integration, not prevalence of a rocket-first sequence.

Standard architectures are editable starting templates, not product limits. Users must be able to describe custom sections, compartments, hardware connections, deployment events and independently descending assemblies. Representation support does not imply analytical coverage. Unsupported behavior remains explicit.

The product supports requirements-first sizing, catalog suggestions, owned/custom hardware, comparison, testing and revision, flight review, and observed-flight comparison. Requirements distinguish hard constraints, preferences and unknowns. Estimated/measured provenance is independent of fixed/adjustable status. Starting targets and competition profiles carry source, applicability and edition; customization remains visible. No profile implies compliance or flight authorization.

## Assessment method and limits

- Inspected current production code across App/state, schema, parts, compatibility/load models, simulation/review, persistence, imports, flight records and print/export. Roadmap completion statements were not accepted as implementation proof.
- Ran the local Vite application in isolated Chromium. Observed the default demo, dashboard, six-step guide, rocket specs, Flight Log form, stale simulation after a mass edit, and successful rerun. Captured the dashboard visually.
- Browser pointer helpers timed out; DOM click/input events were used for the successful interactions. These observations prove rendered state transitions, not physical pointer accessibility or a keyboard/mobile audit.
- No application code changed. No project test suite, build, external network integration, desktop packaging, file import/export round-trip, or quantitative model-validation campaign was run. Source-backed rows are not end-to-end certification.
- Missing means no implemented representation/flow was found in the relevant production modules and scoped source searches. Proposed acceptance scenarios below were not executed for missing capabilities.

## Legend

Status: **Present** = implementation exists within stated limits; **Partial** = reusable implementation falls short of agreed behavior; **Missing** = no production capability found. A present component may have an integration gap.

Gap types: **F** functionality/data model; **UI** frontend; **W** workflow/integration; **E** external evidence/validation. Dependencies refer to capability IDs, not a promise of a particular code structure.

## A. Define and design the recovery system

| ID | Agreed requirement and acceptance scenario | Current implementation and evidence | Status / gaps | Dependencies |
|---|---|---|---|---|
| C01 | Start from preliminary or existing rocket specifications. Record mass as estimated and diameter as measured/fixed; later revise mass without losing the plan. | Flat string-valued specs, numeric schema bounds/defaults and rocket input forms exist. No per-value provenance or independent adjustability metadata. `src/lib/schema.js`; `src/components/RocketSpecs.jsx`; `src/App.jsx:100-125`. | Partial; F/UI/W | C20 for persistence of added metadata |
| C02 | Design and check-existing entry paths operate on one plan. A user starts with selected hardware, receives sizing guidance and edits it without restarting. | One shared App state and demo/fresh/continue guide exist. Guide is a fixed six-step configure/simulate flow, not requirements-led design. `GuidedPlanWizard.jsx:8-15,103-178`; `App.jsx:221-303`. Guided callbacks also need contract reconciliation before preserving the flow as-is. | Partial; UI/W | C01, C03, C06, C08 |
| C03 | Editable architecture templates and custom arrangements. Extend a dual-deployment template with an independently recovered payload; save and reopen without flattening it into main/drogue slots. | Eight fixed component categories and a flat slot-to-part configuration. Optional drogue bay supplements the main bay. No architecture entity, template library, arbitrary section graph or independent descent groups. `src/data/parts.js`; `ConfigBuilder.jsx`; `schema.js`; `compatibility.js` computePackingVolume. | Missing beyond fixed arrangements; F/UI/W | C01, C20 |
| C04 | Define connections and deployment sequence. Show what stays connected, what releases, and which mass each chute supports at each event. Unsupported mechanics remain marked. | Fixed main/drogue behavior, main deployment altitude and component-specific checks; no explicit connection/load-path or event/assembly model. `simulation.js`; `compatibility.js`; `recoveryLoad.js`; `RocketSpecs.jsx`. | Missing generalized representation; F/UI/E | C03 |
| C05 | Evaluate supported physical integration. Assign parts to three compartments, see individual fit checks, and retain unresolved packing/extraction inspections. | Main plus optional drogue compartment volume/radial screening, obstruction and shear-pin inputs, charge estimates and static packing/checklist order exist. No arbitrary assignment or measured assembly geometry. Volume/radial screening is not proof of deployability. `compatibility.js` computePackingVolume; `RocketSpecs.jsx`; `PrintChecklist.jsx`. | Partial; F/UI/W/E | C03, C04, C15 |
| C06 | User requirements distinguish hard constraints, preferences and unknowns. Set separate landing targets per assembly plus space, drift, deployment/redundancy and practical mass/budget/owned-hardware preferences; unknowns cannot count as passes. | Thresholds are embedded in rules/review; SuggestPanel has local main/drogue target rates. No durable requirements model, per-assembly objectives, budget or feasibility ledger. `compatibility.js`; `analysisReview.js`; `SuggestPanel.jsx:110-160`. | Missing unified capability; F/UI/W | C01, C03, C20 |
| C07 | Source-backed starting targets and edition-specific competition profiles. Apply a profile, inspect its source/applicability, customize a limit, and retain uncheckable external requirements. | No profile/source-rule data model or editor. Catalog provenance is unrelated to competition requirements. Existing hardcoded thresholds are not profiles. `schema.js`; `App.jsx`; `src/data/catalogProvenance.js`; scoped requirements/preset searches. | Missing; F/UI/E | C06; actual authoritative source review |
| C08 | Inverse sizing before selection. Given supported mass/conditions and a descent target, show required drag area; show diameter only with an explicit geometry/Cd assumption. | Descent forward model exists; SuggestPanel scores existing parts against target rates. No required-area solver independent of catalog candidates. `simulation.js` computeDescentRate; `SuggestPanel.jsx:119-144`. | Partial foundation; F/UI/E | C01, C04, C06 |
| C09 | Explain candidate suitability. Compare catalog/custom candidates against all evaluated hard constraints; show exclusions and unknown specifications instead of calling every close-rate candidate suitable. | Top-five suggestions for main, drogue and cord exist. Chutes ranked by absolute rate difference; cords by static-load rating margin. Packing feasibility and full-system requirements are not part of ranking. `SuggestPanel.jsx:11-17,119-159`; dashboard mounts it. | Partial; F/UI/W/E | C05, C06, C08, C10 |
| C10 | Evaluate owned and custom hardware. Mark an existing catalog component owned, add a team-built component, use both in candidate comparison without favorable invented values. | Custom-part add/edit/delete and catalog search exist in eight fixed categories; custom parts join allParts and can transfer. No owned preference flag or custom mechanism schema. An inventory-management product is not implied. `PartsBrowser.jsx`; `hooks/useCustomParts.js`; `payloadBoundary.js`. | Partial; F/UI/W/E | C03, C06, C20; per-part source work |

## B. Analyze, compare and understand limits

| ID | Agreed requirement and acceptance scenario | Current implementation and evidence | Status / gaps | Dependencies |
|---|---|---|---|---|
| C11 | Evaluate supported recovery behavior per event/assembly. Run supported descent, load, landing-energy and drift calculations while an unsupported release mechanism remains unassessed, not silently approximated as standard dual deployment. | Ascent estimates, terminal descent, layered-wind drift, landing energy, static load and snatch screening exist. Single fixed system model, not arbitrary independent assemblies/events. `simulation.js`; `recoveryLoad.js`; `missionEnvelope.js`. Preserve supported math but re-evaluate applicability before generalizing. | Partial; F/UI/E | C03, C04, C06; model-specific evidence |
| C12 | Compare alternatives and sensitivity. Change a chute or deployment setting, see outcomes and requirement margins, and retain the assumptions behind each alternative. | A/B configuration snapshot comparison and deterministic one-at-a-time sensitivity exist; snapshots are session-only. Dispersion exists and is not measured confidence. No saved requirements-aware alternatives. `CompareTab.jsx`; `App.jsx:180-191`; `sensitivity.js`; `DispersionMap.jsx`. | Partial; F/UI/W/E | C06, C09, C11, C20 |
| C13 | Consistent missing/current/stale results with direct remediation. Edit mass, see all dependent results marked stale, rerun, then see all surfaces agree that the result is current even if evidence remains insufficient. | Fingerprints/provenance, stale gating, rerun and reasoned findings exist. Browser observed chart/metrics becoming stale and then updating; ResultStatus still said NO_RESULT after rerun. SimulationTab passes confidenceProps instead of ResultStatus's required simulation/specs/config/resultFresh props. `resultIntegrity.js`; `simulationIdentity.js`; `MissionControlLayout.jsx:68-82`; `SimulationTab.jsx:14`; `ResultStatus.jsx:39-79`. | Partial; existing UI/W defect | Reconcile current result contract first; extend identity to C03/C06 later |
| C14 | Evidence-aware claims without false approval. Show domain/applicability limits; a user acknowledgement or uploaded flight must not promote model validity. | Confidence/evidence evaluators and disclosures exist, but UI/brief hardcode uncovered evidence. Manifest has seven review-only cases and no real-flight cases. Runtime accepted-evidence integration is absent. `evidenceCoverage.js`; `confidence.js`; `ResultStatus.jsx:52-62`; `recoveryBrief.js`; `validation/manifest.json:9-22`. | Partial; F/W/E | C11, C13; independently accepted applicable evidence. Test upload alone is insufficient |

## C. Test, learn and retain evidence

| ID | Agreed requirement and acceptance scenario | Current implementation and evidence | Status / gaps | Dependencies |
|---|---|---|---|---|
| C15 | Recovery test records for deployment/extraction, release mechanisms, loads/attachments, avionics/power/tracking, parachute characterization and custom tests. Record a failed attempt, change the packing, retest and retain both configurations and outcomes. | Manual flight records only. No ground/custom test entity, attempt series, linked acceptance criteria or corrective-action flow. `flightEvidence.js`; `FlightLogTab.jsx`; scoped source searches. | Missing; F/UI/W | C03, C04, C06, C20 |
| C16 | Evidence attachments and contextual observations. Link video to a deployment attempt and damage photos to a component; mark expected output activation separately from observed extraction/inflation. | Flight form has source/instrumentation/notes fields but no media attachment model, event annotations or physical-verification chain. `FlightLogTab.jsx`; `flightEvidence.js:71-99`. | Missing attachments/event evidence; F/UI/W | C15, C20 |
| C17 | Measurement imports with honest preview. Import CSV/TSV/XLSX or supported vendor exports, map time/channels/units, see missing channels and measured-versus-derived provenance, and confirm before use. | Configuration JSON, flight-record JSON and motor .eng imports exist. No recovery sensor-table parser, workbook mapper or vendor importer. .eng preview is a reusable interaction pattern, not a recovery-data importer. `CustomMotorImport.jsx`; `engParser.js`; `FlightLogTab.jsx`; `ExportTab.jsx`. | Missing; F/UI/W/E | C15, C16, C20; real export fixtures and versioned format definitions |
| C18 | Preserve original evidence and trace processing. Attach MATLAB/Python files for reference, import their exported measurements, align separate recordings explicitly and distinguish raw, derived and analysis-used data. | Observation source labels exist; no channel/timebase/processing lineage or original-file retention. Do not automatically run scripts, infer calibration or silently smooth data. `flightEvidence.js:40-47,85-97`. | Missing; F/UI/W/E | C16, C17 |
| C19 | Predicted-versus-observed recovery comparison and applicability review. Compare drogue/main phases and events against the actual flown configuration; after hardware changes, flag relevant tests for review without rewriting their history. | Flight records preserve a prediction copy, specs snapshot, model/input provenance and manual observations. UI compares apogee/main rate. No complete hardware/custom-motor snapshot, event/phase series, repeated-test comparison or applicability links. `flightEvidence.js:71-99`; `FlightLogTab.jsx`. Input hash is not a recoverable configuration. | Partial; F/UI/W/E | C03, C04, C11, C15-C18 |

## D. Preserve, hand off and operate

| ID | Agreed requirement and acceptance scenario | Current implementation and evidence | Status / gaps | Dependencies |
|---|---|---|---|---|
| C20 | Local-first durable plans and transfer. Save/reopen a plan including architecture, requirements and linked evidence; transfer it without dropping attachments or changing historical snapshots; surface failed saves/imports. | Versioned config JSON/share links, custom-part storage and flight-record JSON exist. Active plan auto-saves after 300ms except demo/import sessions; explicit save handles errors but autosave ignores its return value. Simulation/compare state is not restored. Files/media and cross-record project bundles are absent. `storage.js:59-68`; `hooks/usePersistence.js:33-44`; `App.jsx:100-125,274-303,327-348`; `payloadBoundary.js`; `flightEvidence.js`. | Partial; F/UI/W | Foundational schema/version/identity contract; attachment storage design. Do not stuff media into share URLs |
| C21 | Reviewable brief and handoff. Export/print the exact configuration, current predictions, assumptions, requirements, unresolved checks and supporting test references; no checklist acknowledgement becomes launch approval. | Existing brief/checklist, hardware/specs, warning and provenance disclosures, static packing boundary and config sharing exist. No test/requirements integration or complete evidence bundle. `recoveryBrief.js`; `PrintChecklist.jsx`; `ExportTab.jsx`. | Partial; F/UI/W/E | C06, C13-C16, C19, C20 |
| C22 | Usable novice/expert and accessible responsive workflows. Complete standard design, custom architecture review and evidence import with clear hierarchy, keyboard access and narrow-screen behavior. | Classic/Revamp tab shells, guided flow and reusable UI primitives exist. Current surface is parts/tabs first. No new architecture/requirements/evidence workspace. Desktop render observed; keyboard/mobile not audited. Guided text includes flight-ready/accuracy claims that conflict with the agreed evidence posture. `layouts/`; `GuidedPlanWizard.jsx:51-53,245-262`; `primitives/`. | Partial; UI/W/E | C02-C21 surface contracts; does not require replacing reusable calculation code |

## Concrete integration findings, separate from new scope

1. **Result-status disagreement, runtime observed.** Demo metrics were current while the dashboard evidence card said NO_RESULT. After changing mass from 11000g to 12000g, Simulation correctly displayed RESULT_STALE and withheld metrics. Rerunning produced populated metrics (including 9842ft apogee and 14.3ft/s main descent), but the evidence card still said NO_RESULT. These numbers are observed software outputs, not accuracy validation. The prop mismatch is source-backed in C13.
2. **Guided entry is present but not proven end to end.** Guide's part picker calls selectPart(category, part), while App's selectPart accepts one part object (`GuidedPlanWizard.jsx:297-300`; `App.jsx:282-285`). Its .eng callback routes through onSetSpec('customMotor', ...) rather than the App custom-motor action (`GuidedPlanWizard.jsx:237-241`; `App.jsx:148-163,288-291`). These are source-observed contract mismatches; no guided selection/import reproduction was performed in this assessment.
3. **Guided evidence copy contradicts the boundary.** Source and browser show 'flight-ready brief'; source also asserts an apogee accuracy range. The validation manifest does not support a universal accuracy claim. Reconcile copy with actual model evidence, not by weakening disclosures elsewhere.
4. **Evidence plumbing is not evidence availability.** Correct the input/result wiring, but do not make confidence Supported simply because an evaluator exists. Review-only model cases and user flight observations must remain distinct from accepted applicable evidence.

## What to reuse versus change

Reuse where behavior remains applicable:
- Catalog/custom-part CRUD and provenance labels.
- Numeric input normalization, bounded payload parsing and migration mechanisms.
- Supported descent/atmosphere/wind calculations, compatibility rules and screening functions, with explicit applicability.
- Result identity/staleness mechanisms, not the contradictory status plumbing.
- A/B comparison, sensitivity, charts and map display primitives.
- .eng preview/confirm interaction pattern for a new measurement importer.
- Flight-record prediction snapshots, brief/print layouts and local-first transfer concepts.

Replace or extend the underlying product representation:
- Fixed slot configuration as the sole system model.
- Implicit requirements scattered through thresholds and component state.
- One globally modeled descent sequence for all custom architectures.
- Flight-only summary records as the entire evidence model.
- Separate transfers with no complete project/evidence relationship.

## Recommended dependency order

This is dependency ordering, not removal of agreed scope.

1. **Define the durable plan contract:** stable identities, value provenance/adjustability, architecture representation, requirement references, snapshots and migration/transfer semantics (C01/C03/C06/C20). Validate the design with standard dual deployment, an independently recovered section and a custom release arrangement. The storage mechanism is not selected here.
2. **Establish calculation applicability and system evaluation:** event/assembly mappings and per-compartment checks (C04/C05/C11), then inverse sizing and requirements-aware candidates (C08-C10). Preserve unknown/unsupported states.
3. **Build two dependent branches after the shared contract:**
   - Requirements/profile and decision support: C07/C09/C12.
   - Recovery test/evidence records: C15/C16, then C17/C18 and C19.
   These branches can be developed independently only after shared identities and snapshot/transfer interfaces are settled.
4. **Integrate consistent review and handoff:** C13/C14/C21 across both branches. Current C13 prop/copy defects can be addressed separately before the broader work; accepted external evidence remains its own gate.
5. **Implement the coherent frontend around those contracts:** C02/C22. UX prototyping can accompany contract work; do not freeze mockups around today's fixed slots. Verify desktop/narrow/keyboard behavior and complete plan/evidence round-trips before retiring the old surfaces.

Logical dependencies:

```text
Plan identity + architecture + requirements + persistence contract
              |                         |
     System evaluation             Test/attempt records
              |                         |
      Sizing + candidates        Attachments + measurement imports
              |                         |
      Scenario comparison         Evidence lineage + flight comparison
              +------------+------------+
                           |
                 Review + brief + transfer
```

External source review (competition rules, component specifications, model comparison evidence) runs alongside implementation but cannot be manufactured by it.

## NOT in scope

- Motor development/static-fire analysis or test-stand control: propulsion workflow, not recovery design/evidence. Existing motor curve input can remain a flight-performance input.
- Live firing commands or general data-acquisition control: teams retain their hardware/vendor tooling.
- Arbitrary MATLAB/Python execution: attach source and import explicit output tables instead.
- Universal physics support for every custom mechanism: faithfully represent it and disclose unsupported analyses.
- Automatic launch approval, certification or compliance: requirements and evidence support independent review.
- Accounts/cloud collaboration: local-first remains the agreed boundary.
- Full inventory procurement system: owned-hardware selection is in scope; purchasing/stock management was not agreed.
- Automatic statistical model calibration from a few tests: comparison/lineage is in scope; accepting model refinements requires reviewed evidence.

## Research anchors and evidence boundaries

The agreed testing scope was informed by actual deployment/flight records, team technical reports and vendor export documentation, not by assumptions that all teams record time series.

- [Project Imua Mission 6](https://aerospace.windward.hawaii.edu/project-imua/missions/mission-6/index.html): completed deployment tests, video and repeated flight summaries.
- [NC State 2022 CDR](https://ncsurocketry.org/wp-content/uploads/2022/01/north-carolina-state-university-2022-cdr-report.pdf): completed subscale evidence plus explicitly planned structural/avionics tests.
- [RIT 2023 report](https://launch.rit.edu/uploads/1/1/4/2/114234541/team_84_technical_report_2023_spaceport_america_cup.pdf): mechanism/deployment testing; proposed instrumentation is not measured evidence.
- [Buffalo 2024 report, mirrored copy](https://www.scribd.com/document/1022693846/Team-108-Technical-Report-2024-Spaceport-America-Cup-2): custom parachute/reefing test campaigns.
- [NASA Student Launch 2027 handbook](https://www.nasa.gov/wp-content/uploads/2026/08/g-739882-2027-sli-handbook-508-aug5.pdf): requirement-linked verification, raw altimeter CSV/XLSX and landed-condition photos. Its AI-assistance restriction requires organizer clarification before claiming an AI-assisted workflow is permitted; profiles must be edition-specific.
- [Altus Metrum manual](https://altusmetrum.org/AltOS/doc/altusmetrum.html): CSV/KML, onboard versus telemetry evidence and exporter/version differences.
- [Featherweight Raven manual](https://www.featherweightaltimeters.com/uploads/1/0/9/5/109510427/raven_users_manual_2014may20.pdf): delimited export for MATLAB/spreadsheets and event/electrical logs.

Physical test results apply to their tested conditions. Output activation, physical release, extraction, inflation and stable descent are different assertions. Device-derived velocity is not a direct force measurement. Import compatibility must be established using actual versioned samples; a file extension alone is insufficient.

## Decision

The assessment supports redesigning the frontend around a richer recovery-plan model, not a frontend-only rewrite and not discarding the existing engine wholesale. The first design deliverable should specify architecture, requirements and evidence identities with the acceptance scenarios above; visual workspace design follows those contracts. No implementation or framework replacement is authorized by this matrix.
