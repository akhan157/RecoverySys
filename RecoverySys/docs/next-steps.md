# RecoverySys next steps

Current candidate: **1.3.0-rc.1**, 2026-10-19. See the release qualification record for measured results. Historical implementation notes are in `history/next-steps-through-2026-10-19.md`.

Implemented in this candidate:
- Bounded OpenRocket 1.4–1.11 import, with accepted source identity preserved through storage, JSON and share links.
- 38 import fixtures, including 26 real-world files. Many share a design lineage; these are not independent user trials or physics validation.
- Timestamped supplier price/stock and budgeting, explicit unknown/stale data, and commercial refresh tooling. Engineering changes remain read-only review proposals.
- Packing language describes heuristic screening rather than measured capacity or physical fit.
- The rejected 2D/3D prototype is archived under `experiments/bay-view`; it is absent from the V1 interface and production bundle.

Remaining release evidence:
1. Clean supported Node install, complete local checks and production browser workflows for the final candidate.
2. Remote CI, Windows portable and macOS universal builds, artifact hashes and actual launch evidence. Automated builds do not replace manual platform workflow review.
3. Publish a clearly identified test release and collect 10–15 observed rocketeer workflows using `v1-field-trial.md`.
4. Independent physics review: the existing 14 cases remain review-only; there are zero accepted comparison cases and zero real-flight cases.
5. Expand supplier coverage only when exact product/variant identity is established. Review engineering source proposals before catalog changes.

Model changes and a Python-engine decision remain evidence-led follow-up work. Browser JavaScript remains authoritative. Revisit visualization only after a useful assembly-review task and prototype have been reviewed.
