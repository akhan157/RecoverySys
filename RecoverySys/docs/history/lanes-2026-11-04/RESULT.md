# Recovery-chain lanes — result (2026-11-04)

Base `ff9f429`. Merged on local `main` at `a5f81e1`. Not pushed, not deployed.
Lanes ran serially because all three edit the Recovery Brief, print checklist
and compatibility surfaces.

| Lane | Author commit | Orchestrator fixes | Merge |
|---|---|---|---|
| recovery-mass-rollup | `1313477` | `d507910`, `414a0ee` | `e8a4dd3` |
| deployment-sequence | `b8b6add` | `b2f519e`, `d5772fd` | `688c073` |
| load-path-margins | `4125664` | `f91cfc8` | `a5f81e1` |

Author model for all lanes: `opencode-go/deepseek-v4.1-flash`, variant max.
Orchestrator/reviewer: `claude-opus-5-5`. No author accepted its own work.

## What each lane delivers

- **Recovery mass roll-up** (`src/lib/recoveryMass.js`): sums selected
  catalog `weight_g`, lists missing weights, compares with entered rocket mass.
  One new WARN rule `recovery-mass-exceeds-rocket-mass`. Simulated mass and
  load math are unchanged.
- **Deployment sequence** (`src/lib/deploymentSequence.js`): architecture
  (dual deploy, chute release, single deploy, drogue only, none) and ordered
  events from the current simulation result only. Mirrors the simulation's
  modeled quirks (100 ft/s no-drogue stand-in, drogue-only below deploy
  altitude) and discloses them.
- **Load-path margins** (`src/lib/loadPath.js`): ejection pull,
  elongation-amplified snatch, main snatch proxy and main opening shock, each
  read from the exact code paths the compatibility rules use, against cord,
  links and swivel. Existing compatibility output byte-identical (author probe
  over 32 combinations; unchanged existing tests).

## Checks run on merged `a5f81e1`

- `npm run format:check`, `lint`, `validate:parts` (225 parts),
  `validate:corpus` (14 cases), `npx vitest run --maxWorkers=2`
  (48 files, 469 tests), `build`, `verify:build` — all pass.
- `npx playwright test --workers=2` against the production build: 92/92.
- Built surface in Chromium (vite preview) at 1440 px and 375 px: demo plan
  and a fresh no-burn-time plan; no console/page errors, no horizontal page
  scroll; screenshots reviewed.

## Not done

- No push, deploy, tag or release.
- No new compatibility rules for the load-path view-only findings (see
  REVIEW.md); owner decision.
- Catalog part quantities (e.g. a "×2" link pair) remain one entry per slot.
