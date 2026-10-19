# RecoverySys next steps

Current candidate: **1.3.0-rc.1**, 2026-10-19. See the release qualification record for measured results. Historical implementation notes are in `history/next-steps-through-2026-10-19.md`.

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
4. Qualify a Tailwind migration to clear the seven remaining development-only advisories before stable promotion; the production dependency audit is clean.

Model changes and a Python-engine decision remain evidence-led follow-up work. Browser JavaScript remains authoritative. Revisit visualization only after a useful assembly-review task and prototype have been reviewed.
