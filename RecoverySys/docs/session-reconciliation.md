# RecoverySys Session Reconciliation

## Safe continuation point

- Current consolidated baseline commit: `59d2b57` (`checkpoint: add .claude/skills toolset from recoverysys/integration-clean-2`).
- Current reconciliation branch: `akhan157/recoverysys-m0-reconcile`.
- `origin/main` currently points at the same consolidated baseline; `origin/recoverysys/integration-clean` remains an integration target, not an assumption about this checkout.
- Do not merge raw backup branches into `main`.
- `main` remains unchanged during reconciliation.

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
| Transparency candidates | `MethodDetailsTab.jsx` and `GuidedReview.jsx` remain separate source candidates and are not wired into the current main tab set. Choose one transparency concept before wiring either; do not merge raw prototypes wholesale. |
| Confidence and evidence | Current code has conservative confidence/stale evaluators, but the product is wired to E0 review-only corpus coverage. Preserve `Insufficient confidence` until accepted applicable evidence exists. |
| Flight evidence | Current local flight records preserve prediction identity and remain observations; never treat them as accepted corpus evidence without external review. |

## Other-device workflow

```powershell
git clone https://github.com/akhan157/RecoverySys.git
cd RecoverySys
git fetch --all --prune
git switch --track origin/recoverysys/integration-clean
```

Inspect a preserved session without touching integration work:

```powershell
git switch --track origin/backup/recoverysys-transparency-dossier-raw-20260728
```

Return to normal integration work:

```powershell
git switch recoverysys/integration-clean
```

## Integration order

1. Treat `59d2b57` as the current consolidated baseline; run focused checks for changed behavior and reserve the full matrix for release qualification.
2. Create a keep/replace/discard ledger for every candidate file.
3. Choose one transparency design; copy/rebuild only that selected behavior into the integration target with tests.
4. Verify Windows portable build; verify macOS build on a Mac before claiming release support.
5. Update README, desktop documentation, roadmap, and changelog only after code/build verification.
6. Review the exact diff against the selected baseline, push the integration target, then merge into `main` only after approval.

## Historical baseline verification evidence

These rows document the `recoverysys/integration-clean` baseline run on 2026-07-28. They are preserved for provenance, not as fresh release evidence for the current reconciliation checkout; this task intentionally did not rerun project-wide validation.
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
