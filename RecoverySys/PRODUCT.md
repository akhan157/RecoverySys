# Product

<!-- impeccable:product-schema 1 -->
The complete strategy, requirements outline, feature breakdown, acceptance criteria, and six-phase roadmap are in [`PRODUCT-STRATEGY-BRIEF.md`](PRODUCT-STRATEGY-BRIEF.md).

## Platform

web

## Users

RecoverySys primarily serves experienced high-power rocketry hobbyists reviewing a recovery plan before peer, engineering, manufacturer, field, or range review. First-time planners may use the product, and technical reviewers may inspect its exported artifacts, but the operating interface is optimized for a technically fluent user rather than a consumer audience.

## Product Purpose

RecoverySys is a local-first recovery-planning instrument. It helps a user assemble recovery hardware and flight inputs, run a bounded simulation, identify compatibility and deployment concerns, understand which assumptions materially affect the result, compare scenarios, and produce a traceable recovery brief.

Success means the user can identify what is current, what remains uncertain or outside model scope, what may change the recovery decision, and what must be reviewed next. The product does not authorize launch, certify hardware, establish flight readiness, or replace independent engineering, manufacturer, field, or range review.

## Positioning

RecoverySys combines recovery-hardware configuration, explicit model and evidence boundaries, deterministic sensitivity analysis, compatibility screening, result provenance, and a reviewable handoff artifact in one local workflow. Its confidence states describe evidence posture and input/model adequacy, not probability of success or a safety score.

## Operating Context

- A user creates or imports a recovery configuration, enters rocket, motor, deployment, weather, and location inputs, and selects catalog or custom hardware.
- The user runs the browser JavaScript simulation, reviews currentness, mission scope, compatibility findings, sensitivity, dispersion, and screening calculations, then revises and reruns as needed.
- The user may compare configurations, print or export a Recovery Brief, and record later flight observations locally.
- The Analysis tab is used after a simulation to identify decision-changing risks, influential inputs, and the next review action. Detailed calculations and assumptions support audit and understanding but are not its primary hierarchy.

## Capabilities and Constraints

- The browser JavaScript model is the sole production simulation authority; Python material is research-only.
- Results become stale when relevant inputs or model identity change and cannot support conclusions, comparisons, briefs, or flight-log predictions until rerun.
- The model provides bounded recovery-planning estimates and explicitly limited screening calculations, not complete vehicle dynamics or universal physical validation.
- Catalog provenance, validation-corpus evidence, model assumptions, application schema, and simulation identity are versioned independently.
- Catalog data remains unverified until supported by per-part source review. User-created parts remain user-supplied.
- Recovery-bay order is a static planning/checklist sequence, not geometric packing validation or an assembly instruction.
- The application remains local-first with no required account, backend, or automatic evidence upload.
- Existing persistence, share links, configuration transfer, print, and flight-record contracts require migration when their durable shapes change.

## Brand Commitments

- Product name: RecoverySys.
- Voice: direct, technical, conservative, and specific. Avoid celebratory, marketing, or approval language.
- The interface should behave like an engineering instrument rather than a generic SaaS dashboard.

## Evidence on Hand

- The versioned comparison corpus and manifest are under `validation/`; current review-only cases must not be presented as accepted independent validation.
- Catalog provenance posture is defined in `src/data/catalogProvenance.js`; current entries do not establish manufacturer verification.
- Versioned model, assumptions, result, brief, and flight-record identities are implemented under `src/lib/`.
- Local flight records are observations unless separately reviewed and accepted through the evidence protocol.
- No universal accuracy, certification, launch approval, or flight-readiness evidence exists and none may be fabricated in product copy.

## Product Principles

1. Lead with the decision, the limiting uncertainty, and the next review action.
2. Never display a conclusion more strongly than its current inputs, model scope, and evidence support allow.
3. Keep technical depth available for audit without forcing every user to read every derivation before acting.
4. Preserve traceability across inputs, simulation identity, findings, comparisons, briefs, and observations.
5. Treat acknowledgement as review history, never as resolution or improved evidence.

## Accessibility & Inclusion

Critical status, warnings, currentness, navigation, disclosures, and remediation must remain understandable through text and keyboard interaction without relying on color alone. Desktop and narrow-mobile workflows are both supported.
