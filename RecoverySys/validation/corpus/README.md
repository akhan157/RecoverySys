# Corpus authoring and review

## Case protocol

1. Create one self-contained JSON case conforming to `schema.json`.
2. Record exact inputs, model ID/version, expected metric values and units, comparison method, decision rule, and notes about assumptions.
3. Identify the source with citation and derivation. For downloaded or generated source artifacts, preserve the artifact name and SHA-256 hash. Use URL, title, and access date when applicable.
4. A second reviewer checks reproducibility, units, provenance, tolerance basis, and whether the conclusion exceeds the evidence. Record review metadata in `comparison`.
5. Only then may status become `accepted-for-comparison`; this status is not flight validation or safety approval.

## Status and provenance

Use `draft` while authoring, `review` while independently checking, `accepted-for-comparison` for reproducible reviewed comparisons, `superseded` when replaced, and `rejected` when evidence or method is unsuitable. Never omit uncertainty or silently tighten a tolerance. Hashes identify source artifacts, not the correctness of their contents.

## Changes

For a correction that preserves the case identity, update the case and explain the reason in notes/history. For changed inputs, source, model behavior, expected values, or tolerance basis, add a new case ID and mark the old case `superseded` when appropriate. Do not delete historical accepted cases without preserving the reason and provenance.

## Case kinds

- **Analytic:** compared with a transparent equation, limiting result, or hand-derived calculation.
- **Trusted simulator:** compared with a named, versioned external simulator or reference implementation; this remains simulator comparison.
- **Real flight:** compared with documented flight observations or instrumentation; none exist in the initial corpus and this requires unusually strong provenance.
- **Metamorphic:** tests a relationship that should hold when inputs are transformed (for example, a controlled monotonicity or symmetry), without claiming agreement to reality.

A case may support a narrow confidence decision only for its stated domain and conditions. Avoid generalizing from one case to all vehicles or flights.
