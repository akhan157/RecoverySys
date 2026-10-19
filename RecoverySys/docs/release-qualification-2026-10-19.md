# Release qualification — 1.3.0-rc.1

Candidate prepared 2026-10-19 on `release/v1.3.0-rc.1`. This record reports evidence; it does not certify launch readiness.

## Scope

Legacy OpenRocket import, persistent accepted-source metadata, commercial supplier data, packing-screen copy corrections, and removal of the experimental visualization from V1. Browser JavaScript remains authoritative. Engineering candidates are review-only.

## Evidence ledger

- Supplier refresh: 103 matched offers, three manufacturers, zero fetch/mapping failures on 2026-10-19.
- Catalog: 225 category entries, 205 distinct IDs; unmatched commercial data stays unknown.
- Import corpus: 38 fixtures, including 26 real-world files with substantial shared lineage.
- Physics corpus: 14 review-only cases; zero accepted comparison cases and zero real-flight cases.
- Local Node 22.23.3: clean dependency install succeeded; formatting, lint, catalog/corpus validation, 41 test files / 386 tests and production build passed. Both initial and patched-dependency full browser suites passed 62/62. The patched Vitest 4.1.12 check passed all 386 tests and the build. Remote Linux checks and all 62 browser workflows also passed. Windows portable archive inspection, SHA-256 and 15-second process launch passed. macOS universal slices, signature verification, SHA-256 and a 15-second process launch on the runner host passed. These are automated smoke checks, not manual workflow qualification.
- Manual Windows/macOS workflows and 10–15 observed user trials: open. CI builds cannot substitute for these observations.

## Tester workflow

Use `v1-field-trial.md`; record actual outcomes in `field-trial-results.csv`. Save the candidate version, OS and artifact SHA-256 with each trial. Do not collect private source files without consent. Stop and record any unnoticed mass ambiguity, stale result presented as current, lost source identity or misleading physical-fit claim.

## Independent review preparation

`validation/independent-review/` contains a standalone reference calculator report for four analytic quantities. Three differ by about 0.0009–0.0021% from stored expectations due to constants/conversion choices, exceeding their 1e-9 regression tolerances. Rounded landing energy agrees. These remain unaccepted reviewer findings; no production model or evidence status was changed.

## Dependency review

Compatible patches and the patched Vitest 4 line remove the two critical
findings in the prior tooling lockfile. Production dependency audit reports zero
advisories. Seven findings remain in the development-only Tailwind 3 dependency
graph (five high, two moderate: braces/chokidar/glob/micromatch and selector
parsing). The build processes repository-controlled CSS and glob patterns; none
of this tooling is shipped in the browser runtime. A Tailwind major migration
requires separate stylesheet/build qualification and is not silently forced in
this candidate. Recheck advisories before promoting a stable release.

Remote candidate: [PR #15](https://github.com/akhan157/RecoverySys/pull/15), application commit `65ab868fb0a9607b60fe7d9546074516ffe32c97`. [PR qualification run](https://github.com/akhan157/RecoverySys/actions/runs/39324880549) passed all three jobs. The redundant [branch run](https://github.com/akhan157/RecoverySys/actions/runs/39324862644) was cancelled. Machine-readable results and downloaded artifact hashes are in `validation/platform/1.3.0-rc.1-ci.json`.

PR #15 merged as `095bdd3565c4537e18dc30468c3cb8c8e60d322d`. Web publication succeeded through [deployment run](https://github.com/akhan157/RecoverySys/actions/runs/39325818680). Final evidence/attribution edits do not change application code or these checked artifacts.

Supplier automation: [manual verification run](https://github.com/akhan157/RecoverySys/actions/runs/39325970396) succeeded with 103 offers, zero commercial-field changes and zero failures. The bot published refreshed timestamps as `bcd429c`; scheduled refresh is now active on main.

Public verification: `https://akhan157.github.io/RecoverySys/` served candidate asset `index-c0uUVPNx.js` containing `1.3.0-rc.1` and `V1.3 RC1`. The configured raw-main supplier snapshot returned 103 offers from all three suppliers. Release assets were downloaded, locally hashed, and matched GitHub server-side SHA-256 digests. Test release: `https://github.com/akhan157/RecoverySys/releases/tag/v1.3.0-rc.1`.
