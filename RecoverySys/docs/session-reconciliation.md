# RecoverySys Session Reconciliation

## Current continuation point

- Current consolidated commit: `11f5c9f` (`docs: update roadmap with progress map and execution order`).
- Current branch: `main`, committed and pushed to `origin/main`.
- M0 baseline reconciliation work (contract inventory, runtime decision,
  prototype decision, ledger reconciliation) is implemented on the
  `recoverysys-m0-baseline` child branch and must be reviewed before merge.
- All ten child snapshots were committed, reviewed, merged with explicit parent-preserving resolutions, and their worktrees were removed after approval.
- The current source of truth is [`../PRODUCT-STRATEGY-BRIEF.md`](../PRODUCT-STRATEGY-BRIEF.md) and [`../ROADMAP.md`](../ROADMAP.md).
- Do not merge raw backup branches or resurrect removed child worktrees without a new review.

## What was preserved remotely

| Session | Remote backup branch | Snapshot commit | Contents |
|---|---|---|---|
| Method Dossier | `backup/recoverysys-transparency-dossier-raw-20260728` | `31003c4` | `MethodDetailsTab.jsx` plus layout, CSS, and Simulation changes. |
| Guided Review | `backup/recoverysys-transparency-guided-review-raw-20260728` | `6df85bf` | `GuidedReview.jsx` plus layout and CSS changes. |
| Method Details prototype | `backup/recoverysys-transparency-ux-prototype-raw-20260728` | `4eb8197` | `DetailsTab.jsx` plus Dashboard, Simulation, layout, and CSS changes. |
| Confidence foundation | `backup/recoverysys-confidence-foundation-raw-20260728` | `2c6fa14` | confidence docs and validation corpus manifest/schema. |
| Validation phase 2 | `backup/recoverysys-validation-phase2-raw-20260728` | `df0e60f` | validation fixture and phase-2 test. |
| Vite Pages-base stash | `backup/recoverysys-vite-pages-base-raw-20260728` | `3ae4552` | historical one-line `vite.config.js` change. Baseline now has safer web/Tauri-aware base handling; preserve only. |

Raw branches retain exact original session context for recovery. They can contain unrelated historical ancestors, which is why they are archive sources only.

## Additional source-history archives

These branches preserve local-only session history that was not already available on GitHub:

- `backup/recoverysys-trust-foundation-source-20260728`
- `backup/recoverysys-trust-integration-source-20260728`
- `backup/recoverysys-trust-payload-boundary-source-20260728`
- `backup/recoverysys-trust-result-integrity-source-20260728`
- `backup/recoverysys-windows-source-20260728`
- `backup/recoverysys-publish-source-20260728`
- `backup/recoverysys-release-source-20260728`
- `backup/recoverysys-github-readme-source-20260728`
- `backup/recoverysys-hygiene-source-20260728`
- `backup/recoverysys-hygiene-integration-source-20260728`
- `backup/recoverysys-roadmap-source-20260728`
- `backup/recoverysys-overview-dashboard-source-20260728`

Existing GitHub session branches already preserve portable/macOS, calculation-consistency, parts-catalog, E2E, and snatch-screening histories.

## Session decisions already established

| Session group | Decision |
|---|---|
| Trust/hardening branches | Baseline already contains integrated successors. Do not cherry-pick old whole commits; add only a focused tested fix when baseline audit proves a missing behavior. |
| Windows/macOS portable work | Baseline contains current packaging scripts/config. Do not stage local ZIPs, `.ignore`, or generated schema noise. Verify platform builds separately. |
| Branding, README, hygiene, GitHub refresh | Baseline already includes their meaningful content. Keep only docs that match verified behavior. |
| Transparency candidates | **Decision (M0, 2026-08-13): keep `GuidedReview.jsx`; archive `DetailsTab.jsx` and `MethodDetailsTab.jsx`.** `GuidedReview.jsx` is wired as the first-plan entry and covered by M5 qualification; the other two files are unimported snapshot/prototype surfaces outside the main tab set. History is preserved in the `backup/recoverysys-transparency-*-raw-20260728` branches. Do not merge the archive branches; removal of the dead files from the tree (if pursued) is a separate reviewed change. |
| Confidence and evidence | Current code has conservative confidence/stale evaluators, but the product is wired to E0 review-only corpus coverage. Preserve `Insufficient confidence` until accepted applicable evidence exists. M0 doc reconciliation (2026-08-13): `docs/confidence-model.md` is normative and matches the implemented evaluators (`confidence.js`, `evidenceCoverage.js`, `ConfidenceStatus.jsx`, brief/GuidedReview coverage injection); PRODUCT-STRATEGY-BRIEF and v2-execution-plan describe the evaluator as present, not future-only — no conflicting posture remains. |
| Flight evidence | Current local flight records preserve prediction identity and remain observations; never treat them as accepted corpus evidence without external review. |
| Supported runtime (M0, 2026-08-13) | Node 22 (`v22.23.2`, CI line) and Node 26 (`v26.4.0`, local line) both pass `npm run check` identically (34 files, 281 tests, validators, lint, build) from a clean install. `package.json` engines (`^20.19.0 || ^22.13.0 || >=24.0.0`) already covers both; keep Node 22 as the supported CI runtime and Node 26 for local verification. Known cosmetic difference: `src/test/setup.js` touches Node's experimental `localStorage` getter — Node 22 throws (caught → in-memory store), Node 26 emits an `ExperimentalWarning` and falls back via `?? createMemoryStorage()`; no behavioral difference. |
| Dependency audit (M0, 2026-08-13) | `npm audit` reports 5 high + 1 moderate findings, all transitive dev-dependencies (`brace-expansion`, `fast-uri`, `js-yaml`, `nanoid`, `postcss`, `undici`). No automated upgrade applied inside feature work; findings tracked here, separate from feature work, consistent with the 2026-07-28 baseline record. |

## Other-device workflow

Use the pushed main branch for current work:

```powershell
git clone https://github.com/akhan157/RecoverySys.git
cd RecoverySys
git switch main
git pull --ff-only origin main
cd RecoverySys
npm install
```

The historical archive branches listed above preserve session context only.
Inspect them read-only and do not merge them into current product work without
a fresh review against `main`.

## Current maintenance order

1. Read `PRODUCT-STRATEGY-BRIEF.md` for product intent, requirements, metrics, and phase boundaries.
2. Read `ROADMAP.md` for the current milestone status and ordered queue.
3. Run focused checks for changed behavior, then the release matrix when a release claim is being considered.
4. Keep browser JavaScript as the production simulation authority and Python as research-only.
5. Update contracts, migrations, tests, roadmap, strategy brief, and release notes together when durable behavior changes.
6. Review the exact diff, commit the change, and push only after verification.

## Historical baseline verification evidence

These rows document the `recoverysys/integration-clean` baseline run on 2026-07-28. They are preserved for provenance, not as fresh release evidence for the current reconciliation checkout.

| Check | Result |
|---|---|
| `npm ci` | Completed. npm reported 6 high-severity dependency audit findings; no automated dependency update was applied. |
| `npm run check` | Passed: formatting, catalog validation (225 parts), lint, 14 test files / 182 tests, and Vite production build. |
| `npm run e2e` | Passed: 26 Playwright tests across Chromium desktop and mobile. |
| `npm run portable:build` on Windows | Passed. Built Tauri executable and `RecoverySys-Portable.zip`. |
| Portable ZIP | SHA-256 `AE4F772E1C6B3FB43E0A9D036EEF5502AC4274BB2231B74779F61A9E0F50726D`; deliberately untracked. |
| macOS universal build | Pending verification on macOS host. |

The Windows build left `RecoverySys-Portable.zip` untracked. `Cargo.toml` showed an index/line-ending status entry with no content diff; neither file is part of the integration branch commit.

## Safety rules

- Stage only `RecoverySys/**` and explicitly approved `.github/workflows/**` paths.
- Never merge a raw backup branch or bulk session branch.
- Never `git add .` from the repository root.
- Never delete worktrees, branches, stashes, ZIP artifacts, or local project folders until reviewed and explicitly approved.
- Generated Tauri schemas must be regenerated through the build, not manually copied.
