# RecoverySys Session Reconciliation

## Safe continuation point

- Product baseline: `27b666e`.
- Normal continuation branch: `recoverysys/integration-clean`.
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

## Session decisions already established

| Session group | Decision |
|---|---|
| Trust/hardening branches | Baseline already contains integrated successors. Do not cherry-pick old whole commits; add only a focused tested fix when baseline audit proves a missing behavior. |
| Windows/macOS portable work | Baseline contains current packaging scripts/config. Do not stage local ZIPs, `.ignore`, or generated schema noise. Verify platform builds separately. |
| Branding, README, hygiene, GitHub refresh | Baseline already includes their meaningful content. Keep only docs that match verified behavior. |
| Transparency candidates | Choose one method-details concept before integration. Method Dossier and Method Details compete; Guided Review is a separate onboarding choice. |

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

1. Run the baseline checks: `npm ci`, `npm run check`, `npm run e2e` from `RecoverySys/`.
2. Create a keep/replace/discard ledger for every candidate file.
3. Choose one transparency design; copy/rebuild only that selected behavior into `recoverysys/integration-clean` with tests.
4. Verify Windows portable build; verify macOS build on a Mac before claiming release support.
5. Update README, desktop documentation, roadmap, and changelog only after code/build verification.
6. Review the exact diff against `27b666e`, push `recoverysys/integration-clean`, then merge into `main` only after approval.

## Baseline verification evidence

Run in `recoverysys/integration-clean` on 2026-07-28:

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
