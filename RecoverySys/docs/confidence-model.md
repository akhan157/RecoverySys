# Confidence model posture

This document is the normative description of the confidence contract implemented in the current browser application. It describes evidence posture, not probability, accuracy percentage, safety, certification, or launch approval.

## Confidence states

The evaluator's internal values and user-facing labels are:

- `supported` / **Supported:** fresh, in-scope output with accepted applicable evidence at E2 or stronger and no higher-priority limitation.
- `conditional` / **Conditional:** accepted evidence exists, but an explicit conditional envelope or review-only evidence limits interpretation.
- `sensitivity-flagged` / **Sensitivity flagged:** otherwise applicable evidence exists, but a tested input variation materially changes the interpretation.
- `insufficient-confidence` / **Insufficient confidence:** the result is missing or stale, out of scope, lacks accepted applicable evidence, or otherwise cannot support a responsible conclusion.

The evaluator precedence is deterministic:

1. Missing or stale result -> `insufficient-confidence`.
2. Out-of-scope mission envelope -> `insufficient-confidence`.
3. No accepted applicable evidence at E2+ -> `insufficient-confidence`.
4. Material sensitivity flag -> `sensitivity-flagged`.
5. Conditional envelope or review-only evidence -> `conditional`.
6. Otherwise -> `supported`.

No state may be rendered as `safe`, `approved`, `certified`, `flight proven`, or a success probability.

## Evidence levels and provenance

The evidence policy names E0 Uncovered, E1 Invariant, E2 Analytic, E3 Simulator comparison, E4 Test evidence, and E5 Flight observation. The current corpus schema admits `metamorphic`, `analytic`, `trusted-simulator`, and `real-flight`; the runtime coverage helper maps those to E1, E2, E3, and E5 respectively. E4 remains a reserved policy level until a reviewed test-evidence case shape is added. Only `accepted-for-comparison` cases contribute accepted coverage; `review` cases are visible as review-only evidence and cannot produce Supported.

Prefer, in order: traceable real-flight observations; independent instrumented test data; reviewed trusted-simulator comparisons; reviewed analytic or metamorphic cases; unreviewed references and user assumptions. Higher provenance does not automatically make an extrapolated result applicable.

## Current wiring

- `src/lib/confidence.js` implements the state machine above and returns stable reason codes plus applicable case IDs.
- `src/lib/evidenceCoverage.js` computes coverage per domain, but there is no generated evidence index wired into the product yet.
- `ConfidenceStatus.jsx` and `recoveryBrief.js` deliberately pass E0 review-only coverage because the five checked-in corpus cases are all `review`. Consequently, a fresh result currently displays **Insufficient confidence**, even when the mission envelope is otherwise in scope.
- Focused tests exercise stale, out-of-scope, no-evidence, sensitivity, conditional, and supported evaluator transitions. Those tests prove rule behavior; they do not create external review evidence.

## Freshness and result identity

Simulation results carry input key/revision, model ID/version, assumptions version, schema version, app version, method, and generation time. The canonical input includes specs, selected hardware, and custom motor data. Currentness compares the canonical input identity and production model/assumptions/schema identities; missing provenance is stale. Stale results are withheld from interpretation and marked for rerun in result, export, and print surfaces.

## UI guidance

Label the posture next to the affected result in plain language, with a concise reason, freshness, scope/assumption, and evidence detail. Do not rely on color alone; expose text and accessible names, preserve units, and provide a path to inspect inputs and evidence. Distinguish estimate, comparison, and observation. Acknowledging a warning records review only; it cannot change evidence posture.

## External gates

Implementation cannot manufacture:

- independent reviewer identity and review metadata for `accepted-for-comparison` cases;
- licensed or access-controlled trusted-simulator artifacts;
- manufacturer or test evidence for component-specific load behavior;
- traceable real-flight observations; or
- macOS artifact verification on macOS hardware.

Until those gates close, documentation must retain `review`, `unverified`, `Insufficient confidence`, and platform-unverified language where applicable.

## Implementation boundary

Future work may add evidence indexing, domain applicability, sensitivity propagation into presentation, and broader artifact tests. It must preserve the state precedence, stale blocking, non-approval language, explicit migration rules, and independent-gate boundaries above.
