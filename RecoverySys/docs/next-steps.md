# RecoverySys next steps

Tagged test candidate: **1.3.0-rc.1**, 2026-10-19. See the release qualification record for measured results. Historical implementation notes are in `history/next-steps-through-2026-10-19.md`.

## Post-candidate main (2026-10-31, not yet a release)

The current `main` contains unreleased review fixes beyond the tagged rc.1 artifact:

- 410 unit/component tests across 42 files and 90 desktop/mobile browser runs (45 workflows in each project) pass locally on Node 26; CI runs Node 22.
- Full check (`format`, catalog/corpus validation, lint, unit tests, production build) passes.
- New browser coverage: supplier budgeting, custom-part CRUD, motor search, simulation failure, JSON source identity, flight-log dedupe/evidence/delete, storage migration, corrupt-store preservation, demo Save protection, share-link Save/Start-Fresh, packing not-evaluated, and unmatched-value reload behavior.
- Known retained limitations: compatibility samples drogue descent at a fixed 5,000 ft while simulation samples the phase midpoint; drogue-only landing energy uses the mid-phase rate while compatibility samples ground level; the suggestion panel ranks drogue rates at sea level. These are disclosed model choices, not accepted evidence.
- The supplier workflow was manually disabled on 2026-10-23 and re-enabled on 2026-10-31. A manual dispatch then refreshed all 103 offers for all three suppliers with zero failures; the remaining freshness risk is workflow availability plus GitHub raw-content cache delay.
- The deployed Pages build is older than `main` and still carries the rc.1 version label; it is not a qualification of these changes. `npm run verify:pages` reports that stale deployment, while the same check passes against a local production preview. The deploy workflow now runs the check after publishing.

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
1. Manual Windows/macOS workflow trials and 10–15 observed rocketeer workflows using `v1-field-trial.md`.
2. Independent physics review: the existing 14 cases remain review-only; zero accepted comparison cases and zero real-flight cases. Review the new standalone analytic report, including its tolerance findings.
3. Review 37 manufacturer engineering candidates / 35 proposed field differences before any catalog change. Expand supplier coverage only when exact product/variant identity is established.
4. Recheck the development dependency advisories before stable promotion. The 2026-10-31 audit reports one high (`vite@7.3.6`, fix available within range) and seven moderate (eslint tooling, `fast-uri`, `minimatch`) development findings; the production dependency audit reports zero. Tailwind is no longer the advisory source.

Model changes and a Python-engine decision remain evidence-led follow-up work. Browser JavaScript remains authoritative. Revisit visualization only after a useful assembly-review task and prototype have been reviewed.
