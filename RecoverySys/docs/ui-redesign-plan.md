# RecoverySys UI redesign plan

## Purpose

Restore the original mission-control hierarchy while retaining the V2 evidence, provenance, sensitivity, compatibility, and flight-record capabilities. The redesign addresses information density and duplicated disclosure; it does not change simulation calculations, compatibility rules, freshness rules, or evidence semantics.

The confirmed Analysis-tab structure and its prerequisite semantic work are defined in [`analysis-tab-redesign-plan.md`](./analysis-tab-redesign-plan.md).

## Design direction

- Preserve the engineering-instrument identity: dark technical surfaces, hard borders, restrained state colors, monospace values, and high-contrast flight graphics.
- Use normal readable typography for explanatory copy. Reserve compact uppercase and monospace treatment for labels, codes, and measurements.
- Show the state, reason, and next action first. Put methodology, evidence IDs, sources, and assumptions behind accessible disclosure.
- Do not repeat the same evidence explanation on Dashboard, Simulation, Analysis, and Export.
- Name review actions by destination, such as `Review recovery bay length`; do not use generic `Review configuration` actions.
- Never imply approval, certification, flight readiness, geometric packing validation, or probability of success.

## Product-wide information architecture

### Persistent plan and result strip

Add a compact strip below navigation with:

- plan identity;
- configuration completeness;
- result state: not run, current, or stale;
- one primary action: review inputs, run, or rerun.

This strip replaces large repeated evidence-posture panels.

### Shared result status

Create one reusable status treatment that provides:

- current, stale, missing, conditional, and insufficient states;
- one short reason;
- one primary action and, when needed, one secondary action;
- reason-specific links that navigate and focus the affected field or hardware slot;
- expandable model, evidence, scope, and non-approval details.

The expanded content remains available everywhere, but it is not permanently expanded on every result screen.

### Shared review summary

Compatibility and unresolved checks use the same hierarchy:

1. error and warning counts;
2. the highest-priority next action;
3. errors before warnings;
4. compact finding rows;
5. expandable source, evidence, and method detail.

Acknowledgement records review only. It cannot clear a finding or change confidence, freshness, severity, or evidence posture.

## Screen redesigns

### Dashboard

- Preserve the wide three-region mission-control layout and make the bay schematic the primary visual object.
- Replace the full confidence panel with compact result status.
- Show compatibility counts and one `Open compatibility review` action.
- Keep packing-volume estimates separate from component order.
- At narrow widths, stack: result/action, bay schematic, review summary, parts catalog, packing estimate.

### Rocket Specs

- Organize the form into vehicle and motor, flight inputs, recovery hardware, recovery bay, and weather/location sections.
- Mark required, optional, user-supplied, and simulation-used values clearly.
- Place validation and remediation beside affected fields.
- Add stable anchors and focus targets for review links.
- Keep save/share controls discoverable without crowding the form.
- Collapse all field grids to a readable single-column mobile layout where labels would otherwise become ambiguous.

### Simulation

- Restore Flight Profile as the dominant result visualization.
- Keep compact result identity, freshness, and rerun actions above the chart without consuming chart height.
- Target a usable chart height around 420px on common desktop layouts and 300px on narrow mobile layouts; verify rather than hard-code blindly.
- Put core metrics beside or below the chart, never above it.
- Show only a compatibility summary and link; keep full findings in the canonical review.
- Keep result-specific limitations beside the affected result rather than repeating global evidence copy.

### Analysis

- Lead with `What could change this result?` and ranked sensitivity findings.
- Separate sensitivity, snatch-load screening, compatibility, and model/evidence details.
- Keep methodology and assumptions collapsed by default.
- Remove duplicated top-level metrics already explained in Simulation unless they add interpretation.
- Eliminate unsupported language such as `SAFE`; use the evaluator's actual semantic state.

### Dispersion

- Keep the map visually dominant.
- Show run inputs, sample count, and deterministic method near the map without presenting the output as a confidence interval.
- Use shared not-run/current/stale status.
- Stack summary metrics and map cleanly on mobile.

### Compare

- Give Scenario A and Scenario B independent identity and freshness states.
- Compare metric, A, B, difference, and interpretation in one readable table.
- Separate input, compatibility, and evidence differences from output differences.
- Provide direct edit and rerun actions for each scenario.
- Do not use color alone to imply a preferable configuration.

### Flight Log

- Separate flight identity, measured conditions, observed outcomes, source/units, and reviewer notes.
- State that observations do not automatically validate the model or change evidence posture.
- Display the captured simulation/input identity and distinguish observation from interpretation.
- Make import failures visible and actionable.
- Collapse all multi-column form grids on mobile.

### Recovery Brief

Create a real on-screen brief using the same versioned view model as print:

1. identity, generation time, and current/stale state;
2. decision summary and unresolved checks;
3. mission envelope and key estimates;
4. selected recovery hardware and compatibility findings;
5. sensitivity and dispersion summary;
6. static recovery-bay checklist order;
7. provenance, model assumptions, and review boundaries.

Provide distinct `Print recovery brief` and `Print checklist` outputs. Do not route both actions to an identical document.

Print requirements:

- white background and readable black text;
- approximately 10–11pt minimum body size;
- status preserved through text, not color alone;
- controlled page breaks and unsplit warning rows;
- repeated document identity/currentness in print headers;
- no interactive controls;
- no duplicated hardware, warning, or status sections.

### Recovery-bay order boundary

Rename the list to `Static recovery-bay checklist order` and place this boundary immediately before it on screen and in print:

> This is a static planning sequence, not a measured packing layout, geometry validation, assembly instruction, or flight-readiness assessment.

Volume screening remains separate and must not imply validation of shape, diameter, routing, compression, retention, clearance, or deployment path.

## Shared component work

- Replace `ConfidenceStatus` presentation with a reusable compact `ResultStatus` while preserving the evaluator contract.
- Add reusable `ReviewLink`, `ReviewSummary`, and accessible disclosure primitives.
- Extract a canonical compatibility finding row/detail presentation.
- Add a `BayOrder` component shared by screen and print.
- Add `BriefSection` primitives shared by the on-screen and print brief.
- Standardize tab page headers, metric hierarchy, action placement, focus styles, and state badges.
- Reduce layout-critical inline styles so responsive rules have clear ownership.

## Implementation sequence

### Phase UI-0: baseline and contracts

- Capture deterministic desktop, constrained-desktop, Pixel 5, and print baselines.
- Record the original/pre-V2 Flight Profile proportions for comparison.
- Centralize result-status input and remediation routing without changing evaluator semantics.
- Define canonical compatibility ordering and Recovery Brief view-model fields.

**Gate:** contract/unit tests pass; screenshots and current print artifact are archived for comparison.

### Phase UI-1: shared hierarchy

- Implement compact result status, review links, review summary, disclosures, and common page headers.
- Replace repeated full evidence panels while retaining detailed access and non-approval boundaries.
- Correct navigation/focus for `specs.*` and `config.*` destinations.

**Gate:** current, stale, and missing states are keyboard accessible and every actionable reason reaches the correct destination.

### Phase UI-2: primary workflow restoration

- Redesign Dashboard and Rocket Specs hierarchy.
- Simplify compatibility review with errors first and details on demand.
- Restore Simulation Flight Profile prominence and explicit responsive sizing.

**Gate:** a user can configure, review, run, interpret, change, and rerun without encountering repeated evidence walls or an undersized chart.

### Phase UI-3: analysis and supporting workflows

- Restructure Analysis around decision impact.
- Apply shared result states to Dispersion and independent states to Compare.
- Reformat Flight Log and expose observation/source boundaries.

**Gate:** supporting tabs use the same status, action, typography, and responsive patterns without changing numeric behavior.

### Phase UI-4: brief and print

- Build the on-screen Recovery Brief.
- Split recovery-brief and checklist print outputs.
- Add the static packing-order disclaimer and unresolved physical checks.
- Remove duplicated status, warning, and hardware sections.

**Gate:** current and stale multi-page artifacts are readable at normal print scale and retain all required limitations.

### Phase UI-5: consistency and regression closure

- Complete keyboard, responsive, typography, spacing, and focus-state review across all tabs.
- Remove obsolete V2 presentation code after parity is proven.
- Run the full feature E2E release gate defined in `v3-plan.md`.

## Verification matrix

Review these deterministic states at 1440×900, 1024×768, Pixel 5, and print where applicable:

- empty and partially configured plans;
- current and stale simulations;
- compatibility errors, warnings only, and long remediation text;
- packing-volume warning and static bay order;
- sensitivity and dispersion results;
- one stale comparison scenario;
- current and stale Recovery Briefs;
- multi-page warnings and unresolved checks.

Required behavior coverage:

- Start Fresh and demo startup;
- custom `.eng` motor import/use/clear/reload;
- main, drogue, and custom-part selection;
- configuration save, JSON transfer, and share-link transfer;
- A/B comparison;
- current/stale propagation after relevant input and hardware changes;
- review-link destination and focus;
- acknowledgement does not resolve a warning;
- desktop/mobile navigation and chart dimensions;
- keyboard navigation and disclosures;
- distinct brief/checklist print output;
- flight-record capture and transfer;
- no page, console, or same-origin errors.

## Completion criteria

- The app retains the original RecoverySys instrument character rather than becoming a generic dashboard.
- Users can identify result currentness, the highest-priority issue, and the next action before reading detailed disclosures.
- Flight Profile is again the primary Simulation visual.
- Compatibility review is scannable and no longer relies on permanently expanded small text.
- Recovery Brief is readable on screen and paper and does not overstate packing accuracy.
- Existing calculation and persistence behavior remains unchanged and passes the full V3 E2E release gate.
