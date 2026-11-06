# rc.2 bounded result

Base: `3592a95a70d1b5e634fe41517df7f15972a577db`.
Core implementation: `2da45dc140d96c4d396326d4caa66f4bf067d0df`.
Independently reviewed pin: `e7a9f3b783fa74938fb0f5cc10289aa730e298a7`.
Final application-source pin: `3bef5116a67031de33ff183c1f225dc42e1cdc19`.
Later records-only commits do not change the built application.

Prepared 1.3.0-rc.2 with current-input warnings, series-chain screening, print
and transfer parity, faster OpenRocket parsing, bounded Node majors, patched
dependency and stricter review-only corpus validation. No physics constants,
warning thresholds or production engineering catalog values were changed.

Evidence commands ran from `RecoverySys/` relative to the repository root:

- Separate Node 22.23.4 / 24.22.2 / 26.11.1 `npm ci` and `npm run check`:
  481 tests each, plus format, lint, catalog, 21-case corpus, build and identity.
  These three runs cover the reviewed core before print/cache follow-ups.
- `E2E_ARTIFACT_ONLY=1 npm run e2e`: 94/94 production Chromium
  desktop/mobile workflows at the reviewed pin; 6.6 minutes.
- Final source: Node 22 `npm run check`: 481/481 tests and all gates passed.
  The final browser subset is recorded in `EVIDENCE.json`.
- `npm audit --json` and `npm audit --omit=dev --json`: zero advisories.
  Catalog/corpus/provenance/benchmark reports generated, without acceptance.

The web archive is local, built from the final application-source pin and
retained outside git. `EVIDENCE.json` records its exact SHA-256 and path.
Post-fix print PNGs come from production Chromium. Earlier inspection PNGs,
including the notification defect, remain labeled `before-toast-fix/`.
Earlier failed browser attempts and the real warning race remain in raw logs.
The full local 94-test run is not described as a final-source 96-test run.

Online work produced primary reference notes and six category source records
with fourteen staged differences. Variant ambiguity and one conflicting
manufacturer table are explicit. A bulk feed returned HTTP 429; no complete
refresh or invented raw-page hash is claimed. All 21 corpus cases remain
review-only, zero accepted comparisons and zero real-flight cases.

The owner reported no Windows/Mac test machines or independent reviewer/trial
contacts and asked the agent to continue itself. Hosted platform builds and
launch checks proceed. Real manual platform workflows, observed rocketeer
trials and independent physical-model acceptance require evidence unavailable
in this environment. They remain blocked rather than waived. Stable promotion
and catalog approval remain in progress. No stable merge, tag, release or
deployment is declared by this result.

No self-approval: measured automated results and a bounded independent code
verdict are recorded separately. Register arithmetic and next action are in
`EVIDENCE.json` and the project handoff.

Hosted follow-up at `dafec8d1985d863169d1ba275c46ea74a7da4ea3`: all five
jobs passed, with 481 tests on each supported Node major and 96/96 browser
workflows. Windows and universal Mac archives passed packaging and 15-second
launch checks (Mac arm64 only). Downloaded hashes/CRC and Mac executable/slices
were verified locally. The web archive contains exactly the same 20 payload
files as the local build. See `REMOTE-CI.md`; manual and physical gates remain
open. Register is now 9 PASS, 2 in_progress and 4 blocked across 15 rows.
