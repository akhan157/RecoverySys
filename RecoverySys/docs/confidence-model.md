# Confidence model posture

This is a normative posture specification for future product work. It does not change current result contracts or implement confidence scoring.

## Confidence states

- **Supported:** relevant inputs and model behavior are within documented scope, and reviewed evidence supports the displayed result for the stated conditions.
- **Conditional:** a result is usable only with explicit assumptions, missing evidence, or a narrow operating envelope shown to the user.
- **Sensitivity-flagged:** the result may be especially affected by uncertain inputs or model assumptions; show the influential variables and recommend review.
- **Insufficient-confidence:** evidence, inputs, or model coverage is inadequate for a responsible interpretation; do not present a reassuring conclusion.

These labels describe evidence posture, not probability of success, accuracy percentage, certification, or safety approval.

## Provenance hierarchy

Prefer, in order: directly documented real-flight observations with traceable conditions; independent instrumented test data; reviewed trusted-simulator comparisons; reviewed analytic or metamorphic cases; unreviewed references and user assumptions. Higher provenance does not automatically make an extrapolated result applicable.

## Freshness and stale results

A future implementation must mark derived results stale when relevant inputs, selected parts, model version, or calculation assumptions change. The stale-result behavior depends on the Session 1 requirement; this document intentionally specifies no implementation, state shape, or contract change.

## UI guidance

Label the confidence state next to the affected result, in plain language, with a concise reason and the relevant scope/assumption. Do not rely on color alone; expose text and accessible names, preserve units, and offer a path to inspect inputs and evidence. Distinguish estimate, comparison, and observation.

## Prohibited claims

Do not say or imply “safe,” “approved,” “certified,” “flight proven,” “validated” in the real-flight sense, or “will succeed.” Do not turn a comparison tolerance into a universal accuracy claim. Keep manufacturer, engineering, field, and range review responsibilities explicit.

## Implementation boundary

This specification is future-facing. Implementing it requires an explicitly reviewed design for evidence storage, model/version identity, stale-result handling, result labels, accessibility, and migration. Until that work is approved, current simulation, persistence, and result contracts remain unchanged.
