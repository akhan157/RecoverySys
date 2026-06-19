# Initial Cadence Trials - 2026-06-19

Coordinate-free reliability notes from the first persisted GoogleFindMyTools runs.

## Session 2: 10 Minute Cadence Trial

- Checks: 3
- Collector status: 3 ok, 0 failed
- Freshness by check: 0 usable, 2 stale, 1 failed
- Repeated checks: 1
- New location points: 2
- Recovery-grade checks: 0

Interpretation: the collector path worked, but every observation was too old for recovery use. The final check repeated the prior observation after it aged past the failed threshold.

## Session 3: Second 10 Minute Cadence Trial

- Checks: 3
- Collector status: 3 ok, 0 failed
- Freshness by check: 0 usable, 0 stale, 3 failed
- Repeated checks: 3 after local DB repair
- New location points: 0 after local DB repair
- Recovery-grade checks: 0

Interpretation: Find Hub continued returning the same old observation. This exposed and then verified a bug: repeated detection must be global by observed timestamp, not scoped to the active outside session.

## Session 4: Global Repeat Verification

- Checks: 1
- Collector status: 1 ok, 0 failed
- Freshness by check: 0 usable, 0 stale, 1 failed
- Repeated checks: 1
- New location points: 0
- Recovery-grade checks: 0

Interpretation: the global-repeat fix worked against the real collector. The repeated observation was linked to the prior location point and did not create a duplicate route point.

## Current Read

The collector integration is functional and persistence is measuring the right failure mode. The early data does not yet show recovery-grade tracking: the source is returning stale or failed observations, often repeated. Do not draw a final Moto Tag verdict until at least one real outdoor movement window is captured.
