# Analysis tab redesign plan

## Purpose

Redesign Analysis as a cause-to-consequence review instrument for an experienced high-power rocketry user. Its first job is to show what deserves review, why it matters to the recovery plan, and what the user should inspect or change next.

Analysis is not a calculation archive, a safety score, a launch gate, or a second Simulation tab. Detailed calculations remain available for audit, but they no longer control the primary hierarchy.

This plan follows `PRODUCT.md`, the established Engineering Instrument design system, the V2 evidence boundaries, and the V3 UI-remediation plan.

## Confirmed product intent

- **Primary user:** an experienced HPR rocketeer reviewing a plan before peer, engineering, manufacturer, field, or range review.
- **Primary decision:** what needs review before relying on the recovery plan.
- **Always visible:** result currentness, material review findings, tested model response, affected outcomes, and direct next actions.
- **Progressive detail:** formulas, intermediate values, method descriptions, assumptions, provenance, and complete scenario tables.
- **Required boundary:** no displayed state may imply launch authorization, certification, flight readiness, universal physical validation, or probability of success.

## Selected structure: review causality board

The primary surface reads as a decision chain:

```text
UNRESOLVED INPUT OR ASSUMPTION
          ↓
AFFECTED RECOVERY OUTCOME
          ↓
CURRENT FINDING OR CRITERION
          ↓
NEXT REVIEW ACTION
```

This structure replaces the current equal-weight sequence of sensitivity, warning summary, load calculations, descent calculations, timeline, packing, and assumptions.

It differs from a warning queue by preserving causality. A user sees not only that a finding exists, but which uncertain input or assumption affects which modeled outcome and why the proposed action matters.

## First viewport

### 1. Result usability strip

Always show:

- `Not run`, `Stale`, or `Current`;
- simulation/model identity in secondary detail;
- the reason a result is unusable or limited;
- `Run simulation`, `Rerun simulation`, or a specific review action.

Stale and missing results do not populate conclusions below the strip.

### 2. Review summary

Show counts for:

- errors;
- warnings;
- not evaluated;
- material tested-response crossings, once supported by canonical criteria.

Show the highest-priority concrete action. Never infer a positive state from an empty warning list.

### 3. Causality board

Each row contains:

1. **Driver** — a user input, selected hardware value, fallback, missing value, model assumption, or tested variation.
2. **Affected outcome** — descent, landing energy, drift, deployment/snatch screening, opening load, or another canonical output.
3. **Finding** — current estimate and evaluated state, including unknown/not-evaluated when applicable.
4. **Action** — a reason-specific link such as `Review main deployment altitude` or `Review shock-cord rating`.

Rows are ordered by explicit severity and decision relevance, not visual color or an aggregate score.

### 4. Tested model response

Show tested ranges per output without a global cross-unit ranking. Use language such as:

- `Tested model response`;
- `Mass variation changed apogee by …`;
- `Surface-wind variation changed drift by …`;
- `No reviewed decision criterion is attached to this range`.

Do not use `most influential` until influence is normalized per output and tied to an explicit decision criterion.

## Content disposition

### Keep always visible

- result freshness and identity state;
- errors, warnings, and not-evaluated counts;
- highest-priority review action;
- causality rows for material or unresolved items;
- current main descent estimate and landing-energy estimate;
- drift when paired with a user/range criterion or clearly labeled as a raw estimate;
- deployment/snatch screening status and availability;
- tested per-output response ranges.

### Keep as progressive detail

- full one-at-a-time scenario table;
- exact inputs, defaults, and limitations for each calculation;
- snatch proxy force, extension, rating source, and assumptions;
- atmosphere samples and intermediate opening-load values;
- formulas and derivations;
- evidence identifiers, model identity, and assumptions dossier;
- complete compatibility findings after priority items.

### Move or remove from Analysis

- Move the complete flight timeline to Simulation, where phase sequence is the primary context.
- Move detailed packing calculations to the canonical hardware/compatibility review. Analysis may show only an unresolved packing finding and action.
- Remove repeated Simulation metrics that add no interpretation.
- Remove unsupported positive labels such as `SAFE`, `REVIEWED`, `PRELIMINARY CHECKS PASS`, and generic `OK` states inferred from absent findings.
- Avoid `BLOCKED` unless the product defines precisely what workflow is blocked; never use it as a launch-readiness statement.

## Semantic foundation required before visual work

The current UI independently calculates and classifies several values. Redesigning presentation first would preserve contradictory or overstated meaning. Complete these contracts before layout implementation.

### A. Canonical domain assessment

Provide a single structured assessment for every displayed output:

- domain/output ID;
- value and unit;
- freshness and validity;
- envelope state;
- evidence state and applicable evidence IDs;
- stable reason codes;
- method and policy versions.

### B. Canonical decision criteria

Every threshold-based state must come from one source containing:

- stable criterion ID;
- domain and applicability;
- exact threshold and boundary operator;
- basis/source and review status;
- policy version;
- resulting category and margin.

Exact boundary behavior must agree across simulation, compatibility, Analysis, print, and export.

### C. Canonical review findings

Replace message-derived codes with authored stable codes. Each finding contains:

- code and domain;
- severity;
- evaluated or not-evaluated state;
- concise consequence;
- specific remediation;
- exact input paths and affected part IDs;
- calculation, heuristic, evidence, or checklist classification;
- source/evidence references.

Acknowledgement remains a separate review record.

### D. Sensitivity assessment

Replace aggregate cross-unit influence scoring with:

- baseline result identity;
- scenario and range-basis identity;
- variant validity and envelope state;
- per-output deltas and ranges;
- criterion/category crossings when defensible;
- unresolved assumptions;
- explicit separation of conditional or out-of-scope variants.

If no reviewed criterion exists, display model response only and omit materiality claims.

### E. Analysis review view model

Build one deterministic view model that aggregates:

- result usability;
- prioritized review findings;
- cause-to-outcome relationships;
- direct actions;
- key estimates;
- tested model response;
- supporting detail references.

`AnalysisTab` renders this model. It must not contain independent physics constants, threshold maps, or status derivation.

## Interaction model

### Desktop

- Result strip spans the surface.
- Review summary and tested-response summary sit above the board.
- The causality board uses a wide primary column for the decision chain and a secondary inspector for the selected row.
- Selecting a row updates the inspector without hiding the full queue.
- The inspector contains estimate, criterion, affected inputs, remediation, method, assumptions, and provenance.
- One row may open by default only when it is the highest-priority evaluated finding; never auto-open an inferred positive state.

### Narrow mobile

- Preserve order: result usability → highest-priority action → causality rows → tested response → supporting dossier.
- Convert each causality row to an inline disclosure; do not introduce a separate modal or side drawer.
- Keep the driver, affected outcome, finding, and action visible when collapsed.
- Maintain 44px interaction targets and visible keyboard focus.
- Avoid horizontal tables for primary review content. Detailed scenario tables may use a deliberate scroll container with clear affordance.

### Navigation and focus

- Review links name the affected input or part.
- Activating a link opens the correct tab/section and focuses the target.
- The destination provides a visible return path to Analysis.
- Status changes are announced through text and accessible semantics without relying on color.

## Visual direction

This is an established-world extension, not a rebrand.

- Preserve the Engineering Instrument language: hard-edged structural panels, restrained semantic color, high-contrast data, and monospace physical quantities.
- Use Inter/system UI typography for explanatory copy and JetBrains Mono for physical values and identifiers.
- Stop rendering normal explanation as tiny uppercase telemetry. Use sentence case and a readable body size for consequence, remediation, and limitations.
- Use color only for evaluated state and action emphasis. Unknown and not-evaluated states remain visibly neutral.
- Use tables or ruled rows for comparable technical data; do not turn every item into a generic card.
- Motion is limited to state transitions, disclosure, focus, and updated values; no decorative page entrance.

## Copy contract

Preferred semantics:

- `Current estimate`
- `Criterion exceeded`
- `Within tested criterion`
- `Review required`
- `Not evaluated`
- `Screening unavailable`
- `Model response only`
- `No finding generated`

Avoid unless supported by an explicit product contract:

- `Safe`
- `Approved`
- `Certified`
- `Flight ready`
- `Reviewed`
- `All checks pass`
- `Probability`
- `Confidence interval`
- `NAR/TRA limit` or other attributed criteria without reviewed source and applicability metadata.

## Implementation work graph

### AN-0: freeze current behavior and claims

- Capture current desktop, constrained-desktop, Pixel 5, and print states.
- Inventory every Analysis output, threshold, source claim, formula, and duplicate implementation.
- Add characterization tests for current numerical outputs and exact threshold boundaries before consolidation.

**Gate:** current behavior is reproducible; known semantic contradictions are documented rather than silently changed.

### AN-1: canonical assessment contracts

- Centralize derived calculations and decision criteria.
- Replace UI-local atmosphere, opening-load, cord-factor, landing, and packing classifications.
- Add stable finding codes and explicit not-evaluated states.

**Primary areas:** `src/lib/simulation.js`, `src/lib/compatibility.js`, new assessment/criteria modules, associated unit tests.

**Gate:** screen-independent tests prove one value/state at each exact boundary and unknown-data case.

### AN-2: sensitivity integrity

- Remove cross-unit aggregate ranking.
- Preserve deterministic per-output ranges.
- Partition unusable variants.
- Add criterion crossings only where criteria and range bases are versioned and defensible.

**Primary areas:** `src/lib/sensitivity.js`, `src/test/sensitivity.test.js`.

**Gate:** output is unit-invariant, deterministic, and never describes model response as probability or confidence interval.

### AN-3: Analysis review view model

- Build cause-to-outcome relationships from canonical assessments and findings.
- Define deterministic priority order and direct action destinations.
- Add current, stale, empty, warning, error, and not-evaluated fixtures.

**Primary areas:** new `src/lib/analysisReview.js`, view-model tests, action-path tests.

**Gate:** fixtures produce stable rows, ordering, and actions without importing React.

### AN-4: shared review primitives

- Implement compact result usability, review summary, causality row, detail inspector, and tested-response summary.
- Reuse existing Button, StatusChip, SectionLabel, and disclosure primitives.
- Do not add layout-critical inline styles.

**Primary areas:** `src/components/primitives/`, new `src/components/analysis/`, scoped Analysis CSS.

**Gate:** component tests cover keyboard operation, unknown states, long text, and non-color semantics.

### AN-5: Analysis surface rebuild

- Replace the current equal-weight dossier layout with the confirmed causality board.
- Move timeline and packing detail to their canonical owning surfaces.
- Retain detailed calculations as selected-row or final-dossier disclosures.
- Remove duplicate local calculation code only after parity tests pass.

**Primary areas:** `src/components/tabs/AnalysisTab.jsx`, `SensitivityPanel.jsx`, Analysis styles, Simulation/compatibility destinations where content moves.

**Gate:** the first viewport answers what needs review, what it affects, and what to do next without scrolling through formulas.

### AN-6: responsive and accessibility closure

- Verify desktop, constrained desktop, and Pixel 5 composition.
- Verify focus movement, return navigation, disclosure semantics, live status, touch targets, overflow, and reduced motion.
- Run the Impeccable detector once on changed UI targets after implementation, then perform one batched desktop/mobile visual review and one confirmation pass.

**Gate:** no clipped actions, unreadable small copy, horizontal primary-content overflow, focus loss, or color-only status.

### AN-7: workflow and artifact parity

- Verify Analysis agrees with Simulation, compatibility review, Compare, Recovery Brief, print, and flight-record snapshots.
- Add the Analysis paths to the V3 full-feature E2E release gate.

**Gate:** stale state, values, criteria, findings, and identities agree across every consuming surface.

## Verification plan

### Unit and contract tests

- exact criterion boundaries and operators;
- unknown versus evaluated-positive states;
- canonical calculation parity;
- stable authored finding codes;
- review priority ordering;
- cause-to-outcome mapping;
- per-output sensitivity ranges and unusable variants;
- no stale result in the view model.

### Component tests

- missing, stale, current, warning, error, and not-evaluated presentations;
- review-link navigation and destination focus;
- disclosure names and state;
- long consequence/remediation text;
- keyboard-only row and inspector operation;
- model-response language and absence of prohibited claims.

### Playwright workflows

1. Configure and run a current plan, then identify and open the highest-priority review item.
2. Follow a specific action to Rocket Specs or hardware selection and verify focus.
3. Change the input, verify stale Analysis, rerun, and verify the updated cause/outcome row.
4. Produce an error, warning-only, and not-evaluated hardware state.
5. Verify tested response on desktop and Pixel 5 without a global influence score.
6. Verify Analysis, Recovery Brief, and print agree on state and unresolved findings.
7. Verify no page, console, or same-origin errors.

### Visual review states

- no result;
- stale result;
- current result with no evaluated concern but unresolved evidence;
- one error and several warnings;
- multiple not-evaluated domains;
- long remediation and large numeric values;
- conditional/out-of-scope sensitivity variant;
- desktop 1440×900;
- constrained desktop 1024×768;
- Pixel 5.

## Completion criteria

- An experienced user can state what needs review and why from the first viewport.
- Every primary row connects a driver or assumption to an affected outcome and a direct action.
- Analysis contains no independent physics constants or threshold classification.
- Unknown data never renders as a positive state.
- Sensitivity is presented as deterministic per-output model response unless explicit decision criteria justify stronger materiality language.
- Detailed calculations remain available and traceable without dominating the task.
- The surface retains RecoverySys's Engineering Instrument identity and passes semantic, responsive, accessibility, and cross-artifact parity gates.
