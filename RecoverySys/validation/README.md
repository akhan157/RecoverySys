# Validation artifacts

## Purpose and scope

This directory records reproducible comparison cases for RecoverySys's current
estimates and the implemented confidence/evidence primitives. It is an evidence
register and authoring protocol, not a runtime contract or a substitute for
engineering review. Review-only corpus entries do not make a result
`Supported`.

## Boundary

**Simulator comparison** means comparing outputs with analytic calculations, trusted simulator outputs, or other documented references under stated inputs and tolerances. **Real-flight validation** means comparing with instrumented or otherwise documented flight observations. The corpus currently contains no real-flight cases; simulator comparison must not be described as flight validation.

## Status policy

Cases are `draft`, `review`, `accepted-for-comparison`, `superseded`, or `rejected`. `accepted-for-comparison` means the case is reproducible and its provenance, method, and tolerance have been reviewed; it does not mean the model is certified, accurate for all vehicles, or safe for flight.

## Provenance and tolerance

Every source must identify its provenance, including URL/title/access date where applicable, citation or derivation, and a source-artifact SHA-256 hash when an artifact is used. Expected metrics state units and absolute and/or relative tolerance with an explicit basis. Tolerances are comparison criteria, not accuracy claims.

## Non-claims

These artifacts do not certify a vehicle, approve a launch, establish safety, or replace manufacturer instructions, engineering analysis, field procedures, range rules, or flight review.

## Current model limitations

The current model remains an estimate with simplifying assumptions documented in the product README: vertical one-degree-of-freedom ascent, generic drag, simplified parachute/descent behavior, layered wind interpolation, and approximate shock-load and Monte Carlo calculations. Results can differ because of geometry, motor behavior, deployment, packing, weather, and build conditions.


## Machine-readable coverage

`node scripts/validate-corpus.js` emits a JSON report. The `domainCoverage` array is
sorted by domain and reports case IDs, expected output metric names, status counts,
accepted comparison IDs, and unreviewed case IDs. The `caseSummaries` array reports
one deterministic entry per case — id, file, domain, kind, status, recorded model
identity, and per-metric expected/observed values, difference, tolerance, pass, and
whether the metric gates agreement. Review and draft cases remain
structural/reproducibility checks; they never gate numerical agreement and are never
reported as accepted evidence.

The current review-only expansion includes explicit scalar ascent coverage
(`ascent-apogee-scalar-2kg-2000ns`), deployment-altitude main-descent coverage
(`recovery-descent-main-2kg-500ft`), and a mass-doubling terminal-descent
metamorphic case (`terminal-descent-mass-doubling-metamorphic`). Seeded
dispersion now has a stable scalar summary contract
(`summarizeDispersionRun` in `src/lib/simulation.js`): a seeded run reduces to
deterministic scalar metrics — landing-point count, centroid, mean/p95/max
drift from the centroid, and the confidence-ellipse axes — regression-checked
by unit tests. It remains an API/unit-test reproducibility concern rather than
a corpus case because a corpus case requires an independent reference, and
none is claimed; no accepted comparison or real-flight metadata is implied.