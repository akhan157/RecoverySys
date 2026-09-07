# RecoverySys — Two Design Directions

**Revamp: “Flightline”** — a refined engineering workstation that preserves the current workflow and makes recovery geometry, flight behavior, and verification easier to read.

**New design: “Recovery Atlas”** — a phase-driven recovery workspace organized around one question: **What happens to this vehicle next, and why should we trust it?**

Both designs must expose the same underlying configuration, simulation results, and compatibility findings. Switching designs changes presentation—not engineering state.

**Scope note:** The brief identifies the recovery bay, flight chart, telemetry metrics, and compatibility warnings, but does not include screenshots or application source. Flightline therefore specifies how to elevate those surfaces while retaining their existing workflow order; it does not presume undocumented controls or capabilities.

---

# 1. Shared Engineering UX Contract

These rules apply to both designs.

## State must remain truthful

Keep these concepts separate:

| Concept | Meaning | Presentation |
|---|---|---|
| Configuration validity | Whether the supplied inputs permit a calculation | Inline input errors and a configuration summary |
| Compatibility | Whether configured components satisfy the checks the engine actually performs | Findings with affected components and supporting values |
| Simulation lifecycle | Not run, running, complete, or failed | Persistent text status |
| Result freshness | Whether displayed results match the current inputs | “Current” or “Outdated” next to the result |
| Selection | The component, event, or finding the user is inspecting | Accent outline and linked highlighting |

Do not present a successful simulation as proof of safe recovery.

Do not invent confidence scores, certify a vehicle as “flight-ready,” or display nominal conditions when required data is absent.

### Result freshness

When an engineering input changes:

- Preserve the last successful result for comparison.
- Label it **“Outdated · configuration changed.”**
- Visually de-emphasize its chart without making it unreadable.
- Keep the explicit simulation action available.
- Never allow a presentation-only change to invalidate results.

When a calculation fails, show the failure while retaining the previous successful result, explicitly identified as previous.

## Numeric presentation

- Use tabular numerals for metrics, tables, chart ticks, and numeric inputs.
- Keep units adjacent to values, not embedded in editable numeric text.
- Respect the application’s unit settings.
- Choose display precision by quantity; preserve full underlying precision.
- Missing values display `—` with an explanation, never `0`.
- Label results **predicted**, **simulated**, or **measured** according to their actual source. Do not call simulated outputs live telemetry.

## Findings must explain consequences

Each finding contains:

1. Severity.
2. Affected component or relationship.
3. The violated condition.
4. Actual and required values, where available.
5. A direct route to the relevant input.

Use existing engine severities. Do not introduce UI-only blocking rules.

**Example format—not a new engineering rule:**

> **Clearance below configured minimum**  
> Selected assembly clearance: `{actual}`. Required: `{minimum}`.  
> **Inspect recovery bay →**

Severity is communicated with an icon and text as well as color.

## Linked inspection

Selecting a component, event, or finding should highlight the related items wherever those relationships exist:

- Component → recovery bay and its input controls.
- Deployment event → flight chart marker and relevant configuration.
- Finding → affected geometry and editable field.
- Chart event → event details.

Use stable domain identifiers. Do not infer engineering relationships from display labels.

---

# 2. Part One — Flightline

## Design intent

**A precision instrument, not a dashboard template.**

Flightline uses dark blue-gray surfaces, restrained cyan selection, warm white typography, and amber exception states. It should feel appropriate on a launch-preparation laptop without becoming a decorative “mission control” screen.

The hierarchy is deliberate:

1. The configured recovery system.
2. Its simulated behavior.
3. The values needed to interpret that behavior.
4. Exceptions requiring action.

No glass effects, neon gradients, oversized status numbers, or cards nested inside cards.

## Layout

Preserve the current workflow sequence and control grouping. Improve its shell and panel hierarchy rather than adding a new navigation model.

For a wide desktop, use this composition where compatible with the existing application:

```text
┌───────────────────────────────────────────────────────────────────────┐
│ RecoverySys   Configuration name      Classic / Flightline / Atlas     │
│ Configuration status                         Result status   Run      │
├──────────────────┬─────────────────────────────┬──────────────────────┤
│ Existing input   │ RECOVERY BAY                │ FLIGHT PROFILE       │
│ groups, in their │                             │                      │
│ current order    │ Scaled/schematic geometry   │ Altitude / velocity  │
│                  │ Component inspection        │ Event markers        │
│                  │                             │                      │
│                  ├─────────────────────────────┴──────────────────────┤
│                  │ PREDICTED METRICS                                  │
│                  ├────────────────────────────────────────────────────┤
│                  │ COMPATIBILITY & VERIFICATION                       │
└──────────────────┴────────────────────────────────────────────────────┘
```

The main workspace uses a recovery-bay/chart split. The input rail retains the current workflow rather than becoming an unrelated new wizard.

### Sizing

- Application header: minimum `64px`, allowed to grow.
- Input rail: `288px`, expanding to `320px` on very wide displays.
- Workspace gap: `16px`.
- Panel padding: `20px`.
- Recovery bay and chart: target `380–460px` high on a typical desktop.
- Avoid fixed-height text containers.

### Responsive behavior

- **≥ 1440px:** input rail + bay/chart split.
- **1100–1439px:** retain rail; stack bay and chart if either plot becomes too narrow.
- **768–1099px:** inputs become a collapsible region above the workspace.
- **< 768px:** single-column document flow; expand chart details beneath the chart rather than in floating overlays.

Do not conceal errors inside a collapsed input group: show its error count on the group header.

## Recovery bay

Make the bay an engineering drawing, not a decorative rocket illustration.

- Orthographic section view.
- Clear vehicle interior boundary.
- Restrained material hatching only where material information exists.
- Consistent physical scaling where dimensions permit it.
- Prominent **“Schematic · not to scale”** label otherwise.
- Dimension annotations on selection rather than every dimension permanently visible.
- Selected component: cyan outline plus a small name label.
- Compatibility finding: amber or red marker attached to the actual affected region.
- Geometry conflicts remain visibly conflicting; never move parts apart for visual neatness.

Put nonessential detail behind **Dimensions**, **Labels**, and **Fit view** controls. These are presentation controls and must not modify configuration.

An accessible component list provides the same selection and issue-navigation actions as the drawing.

## Flight chart

Use a technical plot with quiet scaffolding.

- Horizontal gridlines more visible than vertical gridlines.
- Axis labels always include units.
- Altitude and velocity use separate vertically aligned plots sharing time, rather than an ambiguous dual-axis chart.
- Plot only channels that actually exist.
- Deployment and other available events use labeled vertical markers.
- Cursor inspection synchronizes between plots.
- Pinned inspection survives pointer movement.
- Keyboard users can inspect an event list and a result data table.

If the chart library cannot safely support synchronized plots initially, provide explicit channel tabs. Do not overlay different units on an unlabeled shared scale.

## Metrics

Use a single divided strip rather than independent floating cards.

```text
PREDICTED APOGEE     DEPLOYMENT VELOCITY     DESCENT RATE     TIME TO GROUND
{value} {unit}       {value} {unit}          {value} {unit}   {value} {unit}
```

Only include metrics the engine supplies. If a metric requires a selected event, identify that event in its label.

- Label: `11–12px`, medium weight.
- Value: `26–30px`, tabular.
- Unit: `13px`, secondary.
- Optional context: `12px`, one concise line.
- Status color applies to a small icon or supporting annotation, not the entire metric.

Do not color a value green without a defined condition to justify it.

## Compatibility

Use a compact, always-visible findings summary followed by expandable details.

Example headings:

- **2 errors · 1 warning**
- **No compatibility findings**
- **Compatibility not evaluated**

“No compatibility findings” is not equivalent to “safe.”

Sort by engine severity, then preserve stable ordering. Opening a finding highlights its geometry and exposes the relevant input without losing the finding.

## Micro-interactions

- Hover: subtle surface change.
- Focus: explicit two-pixel cyan ring.
- Selection: persistent border/outline, not hover styling.
- Expand/collapse: `140ms`.
- Panel transitions: opacity only; do not slide the entire workstation.
- No animation of calculated numeric values through fabricated intermediate values.
- During simulation, preserve layout and use textual progress where actual progress exists; otherwise an indeterminate indicator.

---

# 3. Part Two — Recovery Atlas

## Design intent

**An engineering document that can be interrogated.**

Atlas abandons the conventional dashboard. It uses a warm, light drafting surface, dark ink, technical blue accents, and a bottom event rail. Its organizing principle is the recovery sequence, not a collection of widgets.

The vehicle is central. Time provides navigation. Evidence stays one action away.

The experience is spatially stable:

- **Left:** what is configured.
- **Center:** what the system is doing.
- **Right:** what the selected item means.
- **Bottom:** when it happens.

## Master layout

```text
┌──────────────────────────────────────────────────────────────────────┐
│ RecoverySys / Configuration        Classic / Flightline / Atlas      │
│ Result: Current                                      Run simulation │
├─────────────────┬────────────────────────────────┬───────────────────┤
│ SYSTEM          │ RECOVERY CANVAS                │ INSPECTOR         │
│                 │                                │                   │
│ Component tree  │ Vehicle section                │ Selected object   │
│                 │                                │                   │
│ Available       │ Active phase / selected event  │ Inputs or result  │
│ checks          │                                │ evidence          │
│                 │ Linked trajectory inset        │                   │
│                 │                                │ Related findings  │
├─────────────────┴────────────────────────────────┴───────────────────┤
│ EVENT RAIL    Available phases and simulation events                 │
│ ───────────●─────────────────●─────────────────────●───────────────  │
│ Selected time / event                     Contextual predicted data │
└──────────────────────────────────────────────────────────────────────┘
```

### Desktop proportions

- System navigator: `240px`.
- Inspector: `352px`.
- Center canvas: remaining width, minimum `440px`.
- Event rail: initial `160px`, expandable for detailed plots.
- Header: minimum `64px`.

The canvas does not need to fill every pixel with information. Empty space establishes the drawing as the central object.

## The primary experience

### 1. Configure the system

The system navigator lists actual configured components and assemblies.

Selecting one:

- Highlights it in the vehicle section.
- Opens its existing editable properties in the inspector.
- Shows related findings.
- Leaves the event rail visible.

Use the application’s existing component taxonomy. Do not invent avionics, harnesses, or deployment stages that the domain model does not represent.

### 2. Run the calculation

The simulation action remains in the header.

The canvas retains its last result while the calculation runs. Its result label updates truthfully. A failed calculation does not erase configured geometry.

### 3. Inspect the recovery sequence

The bottom rail exposes phases and events supplied by the simulation.

Potential labels include apogee, deployment, and touchdown **only when represented by the available data**.

Selecting an event updates:

- The time cursor.
- The event’s evidence in the inspector.
- Relevant predicted values.
- Available vehicle-state annotations.
- The linked trajectory cursor.

Selecting arbitrary time updates time-dependent outputs only. It does not alter event definitions or configuration.

### 4. Resolve a finding

Selecting a finding changes the inspector to an evidence view:

```text
FINDING TITLE
Severity · affected component

OBSERVED
Actual values with units

CONDITION
Existing rule or configured limit

LOCATION
Highlighted component or relationship

[Edit relevant input]
```

After an edit, the result becomes outdated. Findings derived from the previous simulation must be identified as such; configuration checks can update independently if the engine supports that.

## Recovery canvas

The canvas combines:

1. A sectional vehicle drawing.
2. The selected component or event.
3. Sparse contextual annotations.
4. A compact trajectory overview.

### Visual rules

- Paper-colored background.
- Fine ink outlines.
- Blue selection.
- Annotation labels positioned outside geometry when space permits.
- Optional drafting grid, off by default.
- No fake 3D, animated smoke, starfields, or orbital graphics.

### State depiction

Show deployment or separation states only if the result data provides enough information to represent them.

If the engine supplies event times but no physical motion model:

- Keep the geometry schematic.
- Annotate the selected event.
- Do not animate a physically invented separation trajectory.

The simulation chart remains the authority for calculated motion.

### Canvas controls

- Fit view.
- Zoom in/out.
- Labels.
- Dimensions.
- Expand trajectory.

Wheel zoom should require an explicit modifier or a focused canvas interaction, so ordinary page scrolling is not trapped.

## Inspector

One inspector, three content types:

### Component

- Component name and type.
- Editable properties.
- Dimensions and compatibility context.
- Related findings.

### Event or time

- Event identity, if selected.
- Time and available state values.
- Relevant channels.
- Associated configuration.
- Result freshness.

### Finding

- Severity and evidence.
- Affected objects.
- Navigation to corrective input.
- Evaluation provenance where available.

Always show what the inspector is inspecting. Preserve an accessible route back to the previous selection.

## Event rail

This is Atlas’s defining component.

- Events occupy their actual time positions when a time-series result exists.
- Closely spaced labels use lanes or a selected-event label, not falsified spacing.
- Provide previous/next event buttons.
- Offer a text event list equivalent to the visual rail.
- Expand into aligned altitude/velocity plots for detailed analysis.
- Keep the selected event visible when the rail expands.
- No automatic playback by default.

Without results, the rail displays **“Run a simulation to inspect the recovery sequence.”** It must not render illustrative events that look calculated.

## Responsive transformation

- **≥ 1280px:** navigator, canvas, inspector, event rail.
- **960–1279px:** collapse navigator into a labeled system drawer; keep inspector alongside canvas.
- **< 960px:** canvas followed by inspector and event details in document flow; system selection opens a drawer.
- **< 640px:** replace the spatial event rail with a vertical event list and a compact chart.

The mobile design remains an inspection and editing tool, not a scaled-down desktop screenshot.

---

# 4. Concrete Design Tokens

Scope the new tokens to the design root. **Do not alter Classic’s existing styles.**

```css
/* Shared by Flightline and Atlas only. */
:where(
  [data-design="flightline"],
  [data-design="atlas"]
) {
  color-scheme: light;

  --font-ui:
    "Inter", "Segoe UI", system-ui, sans-serif;
  --font-mono:
    "IBM Plex Mono", "Cascadia Mono", Consolas, monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.8125rem;
  --text-md: 0.875rem;
  --text-lg: 1rem;
  --text-xl: 1.25rem;
  --text-metric: clamp(1.625rem, 2vw, 1.875rem);

  --leading-tight: 1.2;
  --leading-normal: 1.5;

  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  --control-height: 2.5rem;
  --touch-target: 2.75rem;
  --header-min-height: 4rem;
  --panel-padding: 1.25rem;

  --border-width: 1px;
  --focus-width: 2px;
  --focus-offset: 3px;

  --duration-fast: 100ms;
  --duration-normal: 140ms;
  --duration-slow: 200ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);

  --z-base: 0;
  --z-sticky: 10;
  --z-popover: 30;
  --z-dialog: 50;
  --z-tooltip: 60;
}
```

## Flightline tokens

```css
[data-design="flightline"] {
  color-scheme: dark;

  --bg-app: #0c121a;
  --bg-panel: #131c27;
  --bg-raised: #1a2634;
  --bg-input: #0e1721;
  --bg-hover: #223245;
  --bg-selected: #143341;

  --fg-primary: #edf3f8;
  --fg-secondary: #b0bfce;
  --fg-muted: #91a2b4;
  --fg-on-accent: #061b22;

  --border-subtle: #2a3a4c;
  --border-strong: #647a90;

  --accent: #6dd6ed;
  --accent-hover: #98e5f4;
  --focus: #8ee5f7;

  --status-info: #9ac7ff;
  --status-info-bg: #152b45;
  --status-success: #82d6ad;
  --status-success-bg: #143228;
  --status-warning: #f3c574;
  --status-warning-bg: #382b17;
  --status-danger: #ff9d9a;
  --status-danger-bg: #3c2229;

  --plot-bg: #101923;
  --plot-grid: #2b3b4c;
  --plot-axis: #91a2b4;
  --plot-altitude: #6dd6ed;
  --plot-velocity: #c4b1ff;
  --plot-event: #f3c574;
  --plot-cursor: #edf3f8;

  --geometry-stroke: #b0bfce;
  --geometry-fill: #253647;
  --geometry-interior: #101923;
  --geometry-dimension: #91a2b4;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;

  --shadow-panel: none;
  --shadow-popover: 0 12px 36px rgb(0 0 0 / 35%);

  --rail-width: 18rem;
  --workspace-gap: 1rem;
}
```

## Recovery Atlas tokens

```css
[data-design="atlas"] {
  color-scheme: light;

  --bg-app: #efeee8;
  --bg-panel: #faf9f5;
  --bg-raised: #ffffff;
  --bg-input: #ffffff;
  --bg-hover: #e9edf0;
  --bg-selected: #e2edf8;

  --fg-primary: #172635;
  --fg-secondary: #46596a;
  --fg-muted: #60707d;
  --fg-on-accent: #ffffff;

  --border-subtle: #d2d8db;
  --border-strong: #7e8b95;

  --accent: #185b98;
  --accent-hover: #104a80;
  --focus: #155fa4;

  --status-info: #185b98;
  --status-info-bg: #e2edf8;
  --status-success: #216345;
  --status-success-bg: #e5f1e8;
  --status-warning: #855000;
  --status-warning-bg: #fff0d3;
  --status-danger: #a02d36;
  --status-danger-bg: #fbe8e9;

  --plot-bg: #faf9f5;
  --plot-grid: #dce0e1;
  --plot-axis: #60707d;
  --plot-altitude: #185b98;
  --plot-velocity: #795098;
  --plot-event: #855000;
  --plot-cursor: #172635;

  --geometry-stroke: #46596a;
  --geometry-fill: #e1e6e7;
  --geometry-interior: #faf9f5;
  --geometry-dimension: #60707d;

  --radius-sm: 0.1875rem;
  --radius-md: 0.3125rem;
  --radius-lg: 0.5rem;

  --shadow-panel: none;
  --shadow-popover: 0 10px 28px rgb(23 38 53 / 14%);

  --navigator-width: 15rem;
  --inspector-width: 22rem;
  --event-rail-height: 10rem;
  --workspace-gap: 0;
}
```

## Token usage rules

```css
/* Namespace new components to avoid leaking into Classic. */
.rs-metric__value,
.rs-numeric-input,
.rs-data-table {
  font-variant-numeric: tabular-nums lining-nums;
}

.rs-metric__value {
  font-family: var(--font-mono);
  font-size: var(--text-metric);
  line-height: var(--leading-tight);
}

.rs-control:focus-visible {
  outline: var(--focus-width) solid var(--focus);
  outline-offset: var(--focus-offset);
}

.rs-input {
  color: var(--fg-primary);
  background: var(--bg-input);
  border: 1px solid var(--border-strong);
}

.rs-primary-action {
  color: var(--fg-on-accent);
  background: var(--accent);
}

@media (prefers-reduced-motion: reduce) {
  :where(
    [data-design="flightline"],
    [data-design="atlas"]
  ) {
    --duration-fast: 0ms;
    --duration-normal: 0ms;
    --duration-slow: 0ms;
  }
}
```

Use subtle borders for passive panel separation; use strong borders for controls and meaningful boundaries. Verify rendered text, focus, and graphical contrast against WCAG AA rather than assuming token selection alone proves compliance.

Bundle fonts locally if the repository supports it. The interface must remain usable offline with the declared fallbacks.

---

# 5. JSX Component Architecture

The following names describe responsibilities, not a requirement to create a new file for every component. Reuse existing components and repository conventions wherever they already satisfy the contract.

## Shared application boundary

```text
RecoveryApp
├── Existing domain state / simulation controller
├── Presentation preferences
├── Shared inspection selection
├── DesignSwitcher
└── Active design
    ├── ClassicView
    ├── FlightlineView
    └── AtlasView
```

### State ownership

**Existing domain state owns:**

- Configuration.
- Unit preferences.
- Validation and compatibility findings.
- Simulation lifecycle and results.
- Result/configuration association.

**Shared inspection state owns:**

- Selected component.
- Selected finding.
- Selected event or time.

**Presentation state owns:**

- Active design.
- Expanded panels.
- Canvas viewport.
- Inspector visibility.
- Chart display options.

Reuse the existing store/context pattern. Do not introduce a second global state library for the redesign.

Uncommitted editable values must not disappear when a design unmounts. Either retain shared draft state or use the existing explicit commit flow consistently across all three views.

## Shared engineering surfaces

```text
RecoveryBay
├── Geometry rendering
├── Selection overlay
├── Dimension overlay
└── Accessible component list

FlightProfile
├── Available channel plots
├── Event markers
├── Cursor inspection
└── Accessible data / event view

MetricReadout
FindingList
FindingDetails
ResultStatus
QuantityField
SimulationAction
```

These components share data interpretation and behavior. Their surrounding composition and styles differ.

Prefer explicit display variants such as `variant="panel"` or `variant="canvas"` over deeply nested theme checks. Do not create a universal panel abstraction that must understand both entire layouts.

## Flightline composition

```text
FlightlineView
├── FlightlineHeader
│   ├── ConfigurationIdentity
│   ├── ResultStatus
│   └── SimulationAction
├── ExistingConfigurationGroups
└── FlightlineWorkspace
    ├── RecoveryBayPanel
    │   └── RecoveryBay
    ├── FlightProfilePanel
    │   └── FlightProfile
    ├── PredictedMetricStrip
    └── CompatibilityPanel
        ├── FindingSummary
        └── FindingList
```

## Atlas composition

```text
AtlasView
├── AtlasHeader
├── SystemNavigator
├── RecoveryCanvas
│   ├── RecoveryBay
│   ├── SelectionAnnotation
│   └── TrajectoryOverview
├── ContextInspector
│   ├── ComponentEditor
│   ├── EventEvidence
│   └── FindingDetails
└── RecoveryEventRail
    ├── EventNavigation
    ├── TimeInspection
    ├── ContextMetrics
    └── ExpandableFlightProfile
```

Only the selected inspector content should be active. Preserve shared editing state outside disposable inspector content.

## Data boundary rules

- Use existing engineering selectors and calculations.
- Keep unit conversion and formatting centralized.
- Never derive compatibility in rendering code.
- Never rerun simulation because a view mounted.
- Share the same result object across views rather than copying large time-series arrays.
- Derive available chart channels from result capabilities.
- If plot decimation is needed, use it only for rendering; metrics and event evidence use authoritative result data.
- Associate asynchronous results with the configuration that produced them. A late result must not be labeled current for newer inputs.

---

# 6. In-App Design Switcher

Visible labels:

**Classic · Flightline · Atlas**

Descriptions:

- **Classic:** Original interface.
- **Flightline:** Refined current workflow.
- **Atlas:** Phase-driven recovery workspace.

## Behavior

- Persist the selected design in the application’s existing preference mechanism.
- Leave Classic as the default for existing users without an explicit selection.
- Use a native radio-group interaction or an accessible equivalent.
- Keep the switcher mounted outside the changing view.
- Switching must preserve configuration, draft edits, units, results, run state, and shared inspection selection.
- Switching must not trigger simulation, save engineering inputs, or clear findings.
- Mount only the active layout; keep state outside it.
- If the selected object is not spatially visible in a layout, retain selection and expose it through that layout’s inspector or relevant panel.
- On narrow screens, use a labeled select control.

This switcher is presentation preference, not application navigation. It should not create three divergent engineering implementations.

---

# 7. Implementation Order and Acceptance

## Implementation order

1. Identify the existing domain state, simulation lifecycle, geometry renderer, chart renderer, validation UI, and style boundaries.
2. Introduce the presentation switcher without changing Classic behavior.
3. Ensure domain state and unfinished edits survive layout switching.
4. Implement Flightline using the current workflow groups.
5. Implement Atlas using the same engineering surfaces and findings.
6. Exercise actual browser interactions and responsive layouts.
7. Document the design preference and any capability-dependent surfaces.

## Required browser scenarios

| Scenario | Acceptance |
|---|---|
| Switch Classic → Flightline → Atlas | Same configuration, results, units, and selected object |
| Switch with an unfinished numeric edit | Draft preserved; no accidental numeric coercion |
| Switch while simulation runs | One continuing run; no duplicate calculation |
| Edit after a successful run | Previous result remains visible and is marked outdated |
| Calculation fails | Failure is visible; previous success is not presented as current |
| Required input missing | No zero substitution or misleading normal status |
| Select a compatibility finding | Relevant geometry and editable input are reachable |
| Select an event in Atlas | Inspector and chart agree on event identity and time |
| No available event data | Honest empty state; no invented phase markers |
| Change units | Labels and values agree in geometry, metrics, inputs, and charts |
| Keyboard-only use | Switcher, input groups, findings, chart alternatives, and inspector usable |
| 200% zoom / narrow viewport | No lost controls, clipped findings, or unreadable forced desktop layout |
| Reduced motion | No nonessential transitions |
| Return to Classic | Original styling remains unaffected |

Permanent regression tests should protect state preservation, result freshness, and any genuinely error-prone selection/time behavior. Layout appearance and interaction require verification against the running browser surface.

**Delivery status:** design specification only. No repository inspection, implementation, or browser verification is claimed.

---

## Final Design Direction

**Flightline** should make the existing RecoverySys feel precise, calm, and professionally finished without asking users to relearn it.

**Recovery Atlas** should make the recovery sequence itself the interface: select the system, inspect the event, examine the evidence, change the input.

They should be unmistakably different compositions—not the same dashboard with different colors—and remain identical in engineering meaning.
