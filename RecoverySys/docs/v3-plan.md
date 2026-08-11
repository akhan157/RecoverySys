# RecoverySys v3 plan

## Purpose

V3 turns the v2 workflow into a guided first-plan experience and carries forward evidence work that cannot be completed by implementation alone. It does not weaken v2 disclosures or recast estimates as approval, certification, or a probability of success.

The implementation-ready interface redesign is defined in [`ui-redesign-plan.md`](./ui-redesign-plan.md). It restores the original mission-control hierarchy while integrating V2 capabilities with less repetition and clearer action paths.

The Analysis surface has a dedicated intention-first plan in [`analysis-tab-redesign-plan.md`](./analysis-tab-redesign-plan.md).

## V3 first product slice: guided first plan

**Goal:** help a first-time user move from an empty plan to a reviewable recovery brief without hiding assumptions, warnings, or confidence limitations.

### Flow

1. **Start and scope** — state that RecoverySys is a recovery planning aid; offer a new plan, demo plan, import, or resume path.
2. **Rocket and motor** — collect loaded mass, motor impulse/burn or curve, airframe ID, and drag inputs. Explain why required inputs matter.
3. **Recovery hardware** — select main/drogue/harness hardware, flag catalog provenance, and identify missing or user-supplied values.
4. **Deployment and weather** — collect main deployment altitude and wind profile; explain drift inputs and missing-direction failures.
5. **Simulate and review** — run the estimate, show mission-envelope/confidence posture, compatibility findings, and sensitivity response.
6. **Recovery brief** — produce the existing reviewable brief with unresolved checks and explicit engineering/manufacturer/range review boundaries.

### Requirements

- The user can leave, resume, import, or skip optional information without losing entered data.
- Required versus optional inputs are explicit; no auto-filled value is presented as measured or verified.
- Every warning and confidence state remains accessible through text and keyboard navigation.
- The guide never suppresses warnings, marks an unreviewed plan as complete, or changes evidence posture after acknowledgement.
- Existing direct-navigation tabs remain available for experienced users.
- First-run demo behavior remains distinguishable from the user’s own plan.

### Acceptance evidence

- Desktop and mobile Playwright flow: new plan → inputs → compatible hardware review → simulation → brief.
- Keyboard-only traversal, focus order, labels, and error/remediation checks.
- Resume/import/new-plan branch tests.
- Test that guided completion still shows insufficient confidence when accepted evidence is unavailable.

## V3 product-experience remediation

The v2 review found that important limitations are technically present but too dense, repetitive, and difficult to act on. This is a usability and interpretation risk: a user can miss an important action or mistake acknowledgement for resolution. V3 will correct the presentation without weakening the underlying evidence boundaries.

### V3-U1: result posture and remediation

- Replace the repeated full evidence-posture panel on Dashboard, Simulation, and Analysis with a compact, consistent result-status treatment. It must still distinguish missing, stale, and current results and retain the explicit non-approval boundary.
- Keep the detailed explanation available on demand rather than repeating it in every result view.
- Replace generic review actions with reason-specific links that name the affected input or hardware and take the user directly to it. Stale results must offer an obvious rerun path.
- Do not allow a review acknowledgement, compact status, or link treatment to imply that a result is validated, approved, certified, or ready to fly.

**Acceptance evidence:** desktop and narrow-mobile tests show the compact status, its expanded detail, direct remediation destination, stale-result rerun action, and the non-approval statement.

### V3-U2: compatibility review hierarchy

- Rebuild compatibility review around a scan-first hierarchy: error/warning count, short next action, errors before warnings, then expandable per-finding detail.
- Each finding must show the affected inputs, source/evidence classification, and remediation once. Remove repeated generic limitation copy and avoid dense all-caps/small-font blocks for normal explanatory text.
- Preserve acknowledgement as a record that review occurred only; it must neither dismiss an unresolved finding nor alter evidence posture.
- Review the surrounding Rocket Specs layout at desktop and narrow mobile widths so the panel does not force excessive resizing or crowd required inputs.

**Acceptance evidence:** a warning-profile suite verifies error-before-warning ordering, visible remediation, acknowledgement boundary, keyboard access to expanded detail, and readable mobile layout.

### V3-U3: simulation flight-profile layout restoration

- Audit the Flight Profile chart/container against the pre-v2 layout and restore the original visual priority and usable chart dimensions where the v2 additions caused it to be resized or crowded.
- Keep simulation identity, result status, and actions available without competing with the primary chart.
- Define responsive chart-height and overflow behavior explicitly instead of relying on incidental flex sizing.

**Acceptance evidence:** visual desktop and narrow-mobile regression checks establish chart size/visibility, status placement, and no clipped controls or data.

### V3-U4: recovery brief and physical-packing boundary

- Audit the Recovery Brief at screen and print widths for scanability, page breaks, font size, and redundant content before changing its format. Keep a print-friendly layout only if the audit confirms it is readable and preserves essential handoff content.
- Rename and label the recovery-bay top-to-bottom sequence as a static planning/checklist order. It is not a measured packing layout, geometry validation, assembly instruction, or flight-readiness claim.
- Keep packing-volume status separate from the static order. A volume estimate does not validate component shape, diameter, routing, compression, retention, deployment, or installation constraints.
- Place a concise physical-review disclaimer immediately before the list and include unresolved physical checks in the printed brief.

**Acceptance evidence:** screen/print checks confirm the disclaimer precedes the list, selected items retain deterministic order, absent items do not reorder remaining entries, stale briefs remain labeled stale, and packing warnings remain distinct from the sequence.

## V3 verification plan: complete workflow E2E coverage

Current Playwright coverage is 16 authored tests run in Chromium desktop and Pixel 5 (32 executions). It is a strong smoke/regression suite, not full workflow coverage. V3 will organize the following deterministic, browser-visible coverage; external fonts, map assets, and tiles remain routed through the existing deterministic fixtures.

### Author and maintain

- **Entry and navigation:** first visit/demo, explicit demo, Start Fresh, landing direct-load/CTA/back navigation, tab keyboard traversal, and narrow layout.
- **Plan editing:** required/invalid values, motor search and selection, main/drogue/custom-part selection, replacement/removal, bay readouts, wind persistence, and warning-tab indicators.
- **Custom hardware:** valid and malformed `.eng` import; imported motor values influence a run; custom-part add/edit/delete/validation/persistence; custom content survives share and JSON round trips.
- **Results and review:** no-result/current/stale states after every relevant input and hardware change; confidence/result-status remediation; concrete compatibility error, warning, packing-overflow, deployment/snatch, and provenance profiles; sensitivity and dispersion states.
- **Transfer and comparison:** saved configuration, share payload precedence over demo, A/B comparison, full JSON payload round trip, invalid/wrong-format/migrated/oversize import handling, and selected-part integrity in a fresh receiver context.
- **Brief, print, and evidence:** recovery brief current/stale states, both print actions and print media, static-packing disclaimer, local flight-log capture, evidence export/import, invalid evidence import, and imported record display.
- **Accessibility and resilience:** meaningful labels and focus order, keyboard-only critical flows, no page/console/same-origin errors, and desktop/Pixel 5 responsive checks. Dark/light preference is included only when enabled by the product environment.

### Execution gates

- **Pull request:** run affected feature specs plus the existing smoke/navigation suite in desktop Chromium and Pixel 5. New work must include a deterministic success path and its relevant invalid/stale/error path.
- **Release candidate:** run all feature specs in both projects, including receiver-context transfer, custom motor/part lifecycle, dispersion fixtures, print, flight-evidence transfer, keyboard smoke, and responsive checks.
- Preserve traces, screenshots, and HTML/JUnit reports on failures. Avoid visual snapshot assertions until chart/map rendering has a stable, intentional fixture policy; use semantic and layout assertions first.

## External evidence backlog

These items are planning and review work, not tasks that code can self-certify.

### V3-E1: independent validation-case review

- Review the current eight corpus cases for reproducibility, source fidelity,
  units, tolerance basis, and applicability.
- Record reviewer identity/date in the corpus only after an actual independent
  review.
- Promote only defensible cases to `accepted-for-comparison`; rejected or
  superseded cases remain historical.
- Add explicit ascent-domain, dispersion, and metamorphic cases only with
  recorded derivation and scope; the current corpus includes scalar/curve
  representative end-to-end replay cases.

### V3-E2: catalog source review

- Replace manufacturer-level unverified registry entries with per-part source URL/title/access date and review status.
- Preserve unknown/custom values as user-supplied.
- Do not make catalog provenance equivalent to current manufacturer approval.

### V3-E3: real-flight evidence intake

- Define reviewer intake for exported local flight records.
- Require traceable conditions, measurement source, units, model/input identity, and reviewer decision.
- Flight records remain observations unless separately accepted into the corpus.

### V3-E4: platform qualification

- Build, inspect, and run the macOS portable artifact on appropriate macOS hardware before making a macOS support claim.
- Record artifact identity and inspection results alongside release evidence.

### V3-E5: evidence-led model refinements

- Change physics only after a reproducible discrepancy changes a recovery decision or evidence posture.
- Update the model/assumptions identity, stale existing results, and compare old/new behavior through the corpus in the same change.

## Explicit non-goals

- Automatic launch approval or checklist sign-off.
- Universal accuracy claims from a small comparison corpus.
- Accounts, cloud persistence, or automatic flight-log upload.
- Replacing independent engineering, manufacturer, field, or range review.
