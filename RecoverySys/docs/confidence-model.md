# Confidence model posture

This is the normative confidence posture for RecoverySys. The decision
evaluator, evidence-coverage primitive, mission-envelope checks, result
provenance, and conservative confidence presentation are implemented in the
current branch. The implementation is intentionally incomplete at the evidence
boundary: the checked-in corpus has review-only cases, so the product surface
must not present `Supported` until an applicable case has independent review
metadata.

## Current implementation boundary

- `src/lib/confidence.js` implements the four states below and stable reason
  codes. It rejects stale/missing results, out-of-scope inputs, and uncovered
  evidence before considering a positive state.
- `src/lib/evidenceCoverage.js` distinguishes review-only cases from
  `accepted-for-comparison` cases and ranks accepted evidence by level.
- `src/components/ConfidenceStatus.jsx` and
  `src/lib/recoveryBrief.js` currently inject an uncovered/review-only
  coverage posture. This is deliberate: the eight checked-in corpus cases are
  not accepted, so current results remain `Insufficient confidence` even when
  fresh and in scope.
- `src/lib/simulationIdentity.js` and `src/lib/resultIntegrity.js` carry
  input, model, assumptions, schema, app, and method provenance and prevent
  stale results from being treated as current.
- `src/lib/missionEnvelope.js` and the canonical assessment primitives expose
  scope, freshness, validity, evidence, reason-code, method, and policy fields.
  Cross-artifact parity is not complete.

## Version identities

The current browser production authority is:

| Identity | Current value | Owner |
|---|---|---|
| App release | `1.2.0.1` | `src/lib/constants.js`, `package.json` |
| Simulation schema | `1` | `src/lib/constants.js` |
| Simulation model | `browser-js-recovery` / `isa-apogee-descent-v1` | `src/lib/constants.js` |
| Simulation assumptions | `recovery-assumptions-v1` | `src/lib/constants.js` |
| Simulation method | `deterministic-physics` | `src/lib/constants.js` |
| Payload schema | `1` | `src/lib/schema.js` |
| Recovery Brief | `recovery-brief-v1` | `src/lib/recoveryBrief.js` |
| Criteria policy | `recovery-criteria-v1` | `src/lib/criteria.js` |
| Validation corpus | `0.2.0` | `validation/manifest.json` |

Confidence rules do not yet have a separate exported version identity. That
is an open contract gate; changing confidence precedence or reason semantics
must add one rather than silently reusing the numerical model version.

## Confidence states

- **Supported:** relevant inputs and model behavior are within documented scope, and reviewed evidence supports the displayed result for the stated conditions.
- **Conditional:** a result is usable only with explicit assumptions, missing evidence, or a narrow operating envelope shown to the user.
- **Sensitivity-flagged:** the result may be especially affected by uncertain inputs or model assumptions; show the influential variables and recommend review.
- **Insufficient-confidence:** evidence, inputs, or model coverage is inadequate for a responsible interpretation; do not present a reassuring conclusion.

These labels describe evidence posture, not probability of success, accuracy
percentage, certification, or safety approval.

## Provenance hierarchy

Prefer, in order: directly documented real-flight observations with traceable
conditions; independent instrumented test data; reviewed trusted-simulator
comparisons; reviewed analytic or metamorphic cases; unreviewed references and
user assumptions. Higher provenance does not automatically make an extrapolated
result applicable.

## Freshness and stale results

Current result provenance records a deterministic input key/revision, browser
model ID/version, assumptions version, simulation schema version, app version,
method, and generation time. A result is stale when the relevant input identity,
model version, assumptions version, or simulation schema no longer matches the
current browser authority; missing provenance is stale. Stale or missing results
are not usable for conclusions, comparisons, briefs, or flight-log predictions.

## UI guidance

Label the confidence state next to the affected result, in plain language, with
a concise reason and the relevant scope/assumption. Do not rely on color alone;
expose text and accessible names, preserve units, and offer a path to inspect
inputs and evidence. Distinguish estimate, comparison, and observation.

## Prohibited claims

Do not say or imply “safe,” “approved,” “certified,” “flight proven,” “validated”
in the real-flight sense, or “will succeed.” Do not turn a comparison tolerance
into a universal accuracy claim. Keep manufacturer, engineering, field, and
range review responsibilities explicit.

## Open gates

- No corpus case is independently accepted; no real-flight evidence exists.
- Per-part catalog provenance remains unverified and cannot support a `Supported`
  state.
- Confidence-rule versioning, generated evidence indexing, and full
  screen/print/export/flight-log parity remain incomplete.

These gates limit evidence and confidence claims; they do not prevent the
implemented evaluator and conservative insufficient-confidence presentation
from being used.
