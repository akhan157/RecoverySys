# Analytic comparison implementation review

Author: Antigravity Gemini high, source `90b8ce19f557e74e5b8b3f4bc46557135560c6b8`.
Independent reviewer/integrator: Codex Sol high. The separate Python reference
imports no production code, while the adapter calls real public production
functions. The four declared equations reproduce the reported numeric results.
Source metadata now distinguishes null/uncaptured HTML from actual file hashes;
all nine captured files were independently hash-checked. NASA printed pages
2-4 were rendered/inspected rather than trusting the garbled text extraction.

Review found remaining reproducibility issues: proposal files were schema-checked
but their actual inputs/values/units/bounds were not bound to the references;
model labels were hardcoded; reports overwrote previous evidence; old design
prose retained incorrect arithmetic and source-stated tolerance claims. Small
integrator follow-ups at `4fa4e7187cfaa8a715cdd00d10467b306ff4147c` address these:

- Bind all four frozen proposals to independent inputs, numerical expectations,
  units, model identity and unchanged numeric bounds before engine evaluation.
- Import actual production identity; record git commit and source dirty-state.
- Reject missing, negative and unbounded comparison tolerances/nonfinite values;
  cover zero-reference behavior and data/model/metric drift with native tests.
- Write every execution into a unique external directory, preserving the worker
  report under `physics/worker-90b8ce1/` and retaining all integration runs.
- Replace superseded design prose with the scoped executable method. Numerical
  allowances are analyst criteria, not published physical uncertainty. The
  telemetry CSV version field does not establish a hardware revision.

These later checker/metadata fixes are author-verified; no independent verdict
on the final changed runner is claimed. Bounded verification at exact clean
source `4fa4e71`: **4 checks / 10 metric comparisons pass**, **5 negative-control
groups detect their mutations**, and **11 native guard tests pass**, none skipped.
The terminal-energy comparison is derived in the adapter from observed speed,
not a separately returned production energy metric. Three cwd invocations all
pass and generate distinct retained reports. Commands/paths/hashes are in
`ANALYTIC-EVIDENCE.json`.

This accepts the increment as recorded mathematical agreement under its declared
assumptions only. It does not accept generic material properties, opening-load
coefficients, measured flight accuracy, or any canonical case. Constant-density
coast is excluded for lack of a matched API seam; Prometheus remains blocked on
vehicle/environment/uncertainty provenance. Canonical corpus promotions: **0**.
No production physics, catalog or model identity changes were made.

A Node22 CI step now runs the guard tests and comparison runner and uploads its
unique reports; it is prepared for the next branch publication, not yet claimed
as a remote pass. The separate OpenRocket execution lane remains outstanding.
Physical/manual/user observations and independent engineering acceptance stay
open. No release or stable promotion is authorized by these numeric passes.
