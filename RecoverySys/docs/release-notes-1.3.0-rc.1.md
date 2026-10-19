# RecoverySys 1.3.0-rc.1 test candidate

This candidate adds legacy OpenRocket import, persistent accepted-source identity,
and supplier budgeting with explicit stale/unknown price and stock. Packing
screens remain heuristic. The 2D/3D experiment is deferred and absent from V1.

Use the web artifact or portable desktop archive matching your platform. Record
the artifact SHA-256, app version and OS before testing. Desktop archives are
unsigned/ad-hoc signed test artifacts; macOS universal slices do not establish
manual qualification on both architectures. See the qualification record for
actual CI and launch results.

Try your own plan: import/review stage, configuration, geometry and mass; select
parts; inspect unknown supplier data; simulate; change an input and confirm the
result becomes stale; rerun; export/save and reopen. Imported source identity
should persist, and reloaded inputs require a fresh simulation. Use
`v1-field-trial.md` and `field-trial-results.csv` to record outcomes.

Known limits: scalar ascent, simplified drift/load/packing assumptions,
unreviewed catalog values, incomplete commercial coverage and no accepted
real-flight validation. No view or result establishes physical fit or launch
readiness. Check suppliers directly before ordering. Published snapshot refresh
requires the new snapshot file on the configured repository branch; failure
retains the prior timestamp and data.

Dependency review: no production dependency advisories; seven development-only Tailwind 3 findings remain documented in the qualification record.
