# Hosted analytic artifact upload correction

At head `c409eade369fe24d2e8a0bb0311500fc88cc7d40`, Node22 job
`127719312775` in hosted run `42165005777` passed `npm run check`, the eleven
analytic guard tests, all four analytic comparisons and five negative-control
groups. Evidence upload then failed because upload-artifact rejects patterns
containing `.` or `..` path segments. Browser checks were skipped downstream.
This job is not counted as an overall CI pass.

Correction: resolve the external artifact root with `realpath -m`, export the
normalized absolute path, and use it for upload. Skip the upload if the analytic
step never established an artifact root. This changes no test thresholds or
production code. Parent verified YAML parsing and path normalization locally;
the replacement hosted run must pass before the authorized merge into main.

The failed job's raw log is retained outside git at
`../RecoverySys-artifacts/online-validation-2026-11-05/ci/job-127719312775.log`.
