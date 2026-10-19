# Release qualification — 1.3.0-rc.1

Candidate prepared 2026-10-19 on `release/v1.3.0-rc.1`. This record reports evidence; it does not certify launch readiness.

## Scope

Legacy OpenRocket import, persistent accepted-source metadata, commercial supplier data, packing-screen copy corrections, and removal of the experimental visualization from V1. Browser JavaScript remains authoritative. Engineering candidates are review-only.

## Evidence ledger

- Supplier refresh: 103 matched offers, three manufacturers, zero fetch/mapping failures on 2026-10-19.
- Catalog: 225 category entries, 205 distinct IDs; unmatched commercial data stays unknown.
- Import corpus: 38 fixtures, including 26 real-world files with substantial shared lineage.
- Physics corpus: 14 review-only cases; zero accepted comparison cases and zero real-flight cases.
- Local Node 22.23.3: clean dependency install succeeded; formatting, lint, catalog/corpus validation, 41 test files / 386 tests and production build passed. Full browser suite and remote platform jobs are pending.
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
