# RecoverySys next steps

Working candidate: **1.3.0-rc.2** (2026-11-05; qualification in progress).

2026-11-07: rc.2 is live on Pages, verified against deployment `60b9864`.
A private rc.2 draft prerelease now contains the tested archives from `dafec8d`
and their checksum manifest. Further accuracy rework is deferred by the owner;
no physics gate is relabeled as passed. See
[release preparation review](history/release-prep-2026-11-07/REVIEW.md).
Published candidate: **1.3.0-rc.1**. Stable promotion remains open.

Current execution records:

- [Release gates and manual platform template](release-gates-1.3.0.md)
- [Current qualification](release-qualification-2026-11-05.md)
- [Primary-source research](online-evidence-2026-11-05.md)

Tagged test candidate: **1.3.0-rc.1**, 2026-10-19. See the release qualification record for measured results. Historical implementation notes are in `history/next-steps-through-2026-10-19.md`.

## Recovery-chain additions (2026-11-04; integrated and deployed at `3a98e9a`)

Three presentation features merged on `main` (`a5f81e1`), each built in its own lane, reviewed and fixed by the orchestrator: recovery hardware mass roll-up, deployment sequence, and whole-chain load-path margins. Checks on the merged tree: 469 unit/component tests in 48 files, format/lint/catalog/corpus/build/build-identity, and 92/92 desktop/mobile browser workflows against the production build. Records: `history/lanes-2026-11-04/`.

The owner authorized completion on 2026-11-05. The working rc.2 adds series-chain
warnings for quick links/swivel versus elongation snatch and the main-snatch
proxy, and for swivel versus opening shock. Existing thresholds are retained. Compatibility findings now derive synchronously
from current inputs, closing the prior fast-run/export warning gap.
See [release gates](release-gates-1.3.0.md) and the
[2026-11-05 qualification](release-qualification-2026-11-05.md).

## Post-candidate main (2026-10-31, not yet a release)

The current `main` contains unreleased review fixes beyond the tagged rc.1 artifact:

- 414 unit/component tests across 42 files and 92 desktop/mobile browser runs (46 workflows in each project) pass locally on Node 26 and in the Pages deploy workflow; CI runs Node 22.
- Full check (`format`, catalog/corpus validation, lint, unit tests, production build) passes.
- New browser coverage: supplier budgeting, custom-part CRUD, motor search, simulation failure, JSON source identity, flight-log dedupe/evidence/delete, storage migration, corrupt-store preservation, demo Save protection, share-link Save/Start-Fresh, packing not-evaluated, and unmatched-value reload behavior.
- Known retained limitations: compatibility samples drogue descent at a fixed 5,000 ft while simulation samples the phase midpoint; drogue-only landing energy uses the mid-phase rate while compatibility samples ground level; the suggestion panel ranks drogue rates at sea level. These are disclosed model choices, not accepted evidence.
- The supplier workflow was manually disabled on 2026-10-23 and re-enabled on 2026-10-31. A manual dispatch then refreshed all 103 offers for all three suppliers with zero failures; the remaining freshness risk is workflow availability plus GitHub raw-content cache delay.
- The latest verified application deployment is `3a98e9a` (2026-11-04; supplier-only commits followed) and carries the rc.1 version label; it is not a qualification of these changes. `npm run verify:pages` passes against the live site, and the deploy workflow runs the same check after publishing.

Implemented in this candidate:

- Bounded OpenRocket 1.4–1.11 import, with accepted source identity preserved through storage, JSON and share links.
- 38 import fixtures, including 26 real-world files. Many share a design lineage; these are not independent user trials or physics validation.
- Timestamped supplier price/stock and budgeting, explicit unknown/stale data, and commercial refresh tooling. Engineering changes remain read-only review proposals.
- Packing language describes heuristic screening rather than measured capacity or physical fit.
- The rejected 2D/3D prototype is archived under `experiments/bay-view`; it is absent from the V1 interface and production bundle.

Verified candidate preparation:

- Clean supported Node 22 install, 386 tests, formatting/lint/catalog/corpus checks and production build.
- All 62 desktop/mobile browser workflows, locally and in remote Linux CI.
- Windows portable and macOS universal artifacts, SHA-256 hashes and 15-second process-launch smoke checks in CI. Manual platform workflows remain open.
- PR #15 merged; the web candidate is deployed and verified. Test-release downloads have matching local/CI/GitHub SHA-256 digests. Supplier automation passed its first remote refresh.

Remaining external/review evidence:

1. Automated desktop workflows now run on every push (see `history/desktop-e2e-2026-11-07/`): the shipped Windows portable exe and a feature-flagged macOS test build of the same source. Still open: a human Windows/macOS walkthrough, Intel Mac launch, Windows signing (owner to apply to SignPath Foundation; macOS stays ad-hoc signed), and 10–15 observed rocketeer workflows using `v1-field-trial.md`.
2. Independent physics review: the current 21 cases remain review-only; zero accepted comparison cases and zero real-flight cases. Review the new standalone analytic report, including its tolerance findings.
3. The 35 historical manufacturer field proposals now have parent dispositions in `history/catalog-review-2026-11-07/REVIEW.md`. Source/identity holds remain; the owner-approved IFC-96-S mass correction is integrated from `f072909`. Saved catalog selections pick up the new weight on reload; custom copies retain entered values. Archived rc.2 downloads predate that correction and are flagged in the draft release notes. Expand supplier coverage only when exact product/variant identity is established.
4. Recheck dependency advisories immediately before stable promotion. The 2026-11-05 rc.2 lockfile patches `fast-uri` to 3.1.9; full and production npm audits report zero advisories.

Model changes and a Python-engine decision remain evidence-led follow-up work. Browser JavaScript remains authoritative. Revisit visualization only after a useful assembly-review task and prototype have been reviewed.
