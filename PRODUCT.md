# RecoverySys

<!-- impeccable:product-schema 1 -->

## Platform

web

The existing React/Vite web interface is also packaged through Tauri. Platform classification describes the shared interface, not a new native application commitment.

## Users

High-power rocketry teams and builders designing or checking recovery systems, from first-time planners to experienced flyers. Teams may arrive with preliminary rocket specifications, a developed design or existing hardware. Do not claim that most teams leave recovery until after rocket construction; that prevalence was not established by research.

## Product Purpose

Help teams design, evaluate, compare, test and document recovery systems for their rockets. Success is a reviewable recovery plan with explicit constraints, chosen hardware, supported analysis, linked observations and unresolved checks, not automatic flight approval.

## Operating Context

Users may collect evidence through deployment/pop tests, mechanism checks, structural/load tests, recovery avionics/power/tracking tests, parachute characterization and actual flights. Evidence can be observations, photos/video, reports, flight-computer exports or custom sensor recordings. Teams retain their acquisition software, including vendor tools, MATLAB and Python; RecoverySys imports supported outputs rather than replacing those tools.

## Agreed Capabilities and Constraints

These are target capabilities agreed in the product discussion, not claims that all are implemented.

- Design recovery and check an existing setup are entry paths into the same plan.
- Editable standard templates and custom recovery architectures; represent sections, compartments, connections, events and independently descending assemblies.
- Distinguish ability to describe an architecture from ability to analyze it. Unsupported mechanisms remain explicit.
- Separate estimated/measured/source provenance from fixed/adjustable constraints.
- Requirements-led inverse sizing and catalog candidate suggestions; also evaluate owned and custom hardware.
- Hard constraints and preferences, explicit unknowns, source-backed starting targets and edition-specific competition profiles. Profile adoption is not compliance.
- Supported recovery analysis, alternatives comparison and actionable concerns with honest assumptions, model limits and freshness.
- Recovery test attempts, configuration snapshots, media/measurements, failures, corrective changes and retests.
- Measurement import previews with channels, units, missingness and measured-versus-derived provenance. Preserve original evidence and processing lineage.
- Predicted-versus-observed flight comparison, printable review material and local-first save/transfer.
- No motor-development/static-fire platform, firing control, arbitrary script execution, full vehicle simulator, cloud-account requirement or automatic certification.

## Evidence on Hand

Current implementation and gaps: `RecoverySys/docs/capability-gap-matrix.md`.
Proposed semantic design: `RecoverySys/docs/recovery-plan-contract.md`.
Primary recovery testing and vendor-format sources are linked from the capability matrix.
The inspected validation manifest lists seven review-stage cases and no real-flight cases. Do not invent accuracy ranges, accepted validation, manufacturer verification or universal operating envelopes.

The current DESIGN.md is historical visual guidance. Its expert-only/no-guide assumptions and accuracy statements do not override the subsequently agreed product scope. No replacement visual identity has been approved in this discussion.

## Product Principles

1. Design around what is known; make unknowns and adjustable constraints explicit.
2. Standard workflows should be straightforward without restricting custom architecture representation.
3. Keep current estimates, passed criteria, evidence quality and approval separate.
4. Preserve what was actually tested or flown; later edits must not rewrite history.
5. Support independent engineering review rather than claiming to replace it.
6. Make quick drafting the front door: add and swap parts with minimal setup, then deepen the same plan with requirements, architecture detail and evidence. Requirements-first sizing is optional, not a mandatory sequence. Label assumptions, unknowns and stale results specifically; a draft is not flight approval.

## Accessibility & Inclusion

The agreed target includes novice guidance, efficient expert navigation, keyboard-operable critical workflows and usable narrow-screen layouts. Do not require drag-and-drop, color discrimination or diagram interaction to complete essential tasks.

## Open Design Decisions

Final navigation, visual identity and component composition remain unapproved. The proposed plan contract is not an implemented schema. Exact parser versions, attachment/storage limits, supported custom-architecture analysis coverage and numerical validation require implementation-specific decisions and evidence.
