# RecoverySys release qualification record — M6 gate audit

**Checkpoint:** `akhan157/recoverysys-m6-qualification` (post-M5 qualification increment)
**App release:** `1.2.0.1`
**Audit date:** 2026-08-13
**Runtimes used:** Node `v22.16.0` (npm `10.9.2`) for the supported-runtime gate; Node `v26.4.0` (npm `12.0.2`) is the local development line

This is the M6 release-readiness audit run after the M5 guided-first-plan
qualification. It reviews the release gates in
[`ROADMAP.md`](../ROADMAP.md#m6---release-qualification) and the 2026-08-11
qualification record against the current branch, verifies every code-reachable
gate, implements the code-reachable release blockers found, and documents the
remaining external or deferred gates. It is a development/release-qualification
record, not a supported-platform or evidence-qualified release claim. The
browser JavaScript implementation remains the sole production simulation
authority; the Python `engine/` package remains research-only and disconnected.

## M6 release gate review

The M6 gate list from the roadmap, mapped to this audit:

| Roadmap gate | Result | Evidence in this audit |
| --- | --- | --- |
| Clean-install checks on the supported Node 22 runtime | Pass (focused) | `npm ci` on Node `v22.16.0`; `validate:parts`, `validate:corpus`, `npm run build`, 170 release-relevant unit tests, 18 targeted E2E executions all pass (below). Full `npm run check` + full `npm run e2e` matrix still runs in CI (`check.yml` pins Node 22). |
| Representative fresh, stale, invalid, out-of-envelope, conditional, sensitivity-flagged, insufficient workflows | Pass (targeted) | `staleResultClosure.test.jsx`, `PrintChecklist.brief.test.jsx`, `analysisSurfaceClosure.test.jsx`, `ConfidenceStatus.test.jsx`, `canonicalSemantics.test.js`, `sensitivity.test.js` pass under Node 22; E2E brief current/stale and print separation pass. |
| Import/export/share migration matrix, print artifact inspection, no current/stale or unit mismatch | Pass (targeted) | E2E fresh-receiver share-link, JSON export/import round trip, invalid-import rejection, flight-log persistence pass on desktop + Pixel 5; unit tests `share-link`, `persistence`, `ExportTab`, `FlightLogTab`, `flightEvidence`, `payload-boundary` pass. Broader candidate-evidence intake matrix remains an M4 open item. |
| Windows portable artifact launches and its hash is recorded | External gate | CI (`check.yml`, `deploy.yml` `windows-portable`) builds and asserts archive contents (`RecoverySys.exe`, `README.txt`, no nested ZIP) on `windows-latest` with Node 22. A fresh Windows launch and recorded hash on the integrated checkpoint remains required; no Linux-runner verification is possible. |
| macOS artifact verified on macOS | External gate | CI (`macos-portable`) builds the universal app and asserts both `arm64`/`x86_64` slices plus `codesign --verify --deep --strict`. No macOS host has launched the app; macOS support remains unverified and unclaimed. |
| Accessibility review complete | Pass (targeted) | Keyboard guided critical path, Analysis keyboard + reduced motion + focus return, and no page/console/same-origin errors verified in E2E (desktop + Pixel 5); `analysis-primitives`, `snatch-screening-components`, `staleResultClosure` unit tests pass. |
| Copy review complete | Pass after fixes | Prohibited/overstated language scanned across `src/` and `landing/`; fixes applied in this audit (see below). Unit tests assert the absence of `SAFE`/`flight ready`/`ALL_SYSTEMS_NOMINAL` and the presence of confidence-interval disclaimers. |
| Privacy review complete | Pass after fix | Network surfaces enumerated (below); in-app OpenStreetMap disclosure added in this audit. No backend, no telemetry, no configuration transmission (SECURITY.md posture holds). |
| Provenance review complete | Pass | `npm run report:catalog-provenance` runs: 225 parts, 9 manufacturer groups, 0 missing records, all `unverified` (manufacturer-level). UI exposes `CATALOG DATA · UNVERIFIED`; E2E verifies the hardware-review provenance surface. |
| Documentation, changelog, release notes, version identities match shipped artifacts | Pass after documentation | App release `1.2.0.1` is single-sourced in `src/lib/constants.js` and matches `package.json`, `VERSION`, `CHANGELOG.md`, `README.md`, and `PRODUCT-STRATEGY-BRIEF.md`. Tauri desktop packages carry semver `1.2.0` (Tauri/Cargo require semver; see version-identity note below). Landing build marker updated from the stale `BUILD_20260427`. |

## Verified local gates under Node 22

Executed on 2026-08-13 with a clean install on Node `v22.16.0` / npm `10.9.2`
(the CI-supported runtime line; `package.json` `engines` allow
`^20.19.0 || ^22.13.0 || >=24.0.0`).

| Gate | Command | Result |
| --- | --- | --- |
| Clean dependency install | `npm ci` | Pass (428 packages) |
| Parts catalog | `npm run validate:parts` | Pass; 225 parts |
| Validation corpus | `npm run validate:corpus` | Pass; 14 cases, review cases do not gate agreement |
| Catalog provenance report | `npm run report:catalog-provenance` | Pass; 225 parts, 9 groups, all unverified, 0 missing |
| Production build | `npm run build` | Pass (116 modules; dist emitted) |
| Transfer parity unit tests | `npx vitest run src/test/share-link.test.js src/test/persistence.test.jsx src/test/ExportTab.test.jsx src/test/FlightLogTab.test.jsx src/test/flightEvidence.test.js src/test/payload-boundary.test.js` | 6 files, 46 tests pass |
| Stale/print/accessibility/claim unit tests | `npx vitest run src/test/staleResultClosure.test.jsx src/test/PrintChecklist.brief.test.jsx src/test/analysis-primitives.test.jsx src/test/analysisSurfaceClosure.test.jsx src/test/ConfidenceStatus.test.jsx src/test/snatch-screening-components.test.jsx src/test/canonicalSemantics.test.js src/test/sensitivity.test.js src/test/simulationIdentity.test.js` | 9 files, 72 tests pass |
| Provenance/corpus unit tests | `npx vitest run src/test/catalogProvenance.test.js src/test/catalogProvenanceReport.test.js src/test/parts-catalog.test.js src/test/parts-validator.test.js src/test/validation-corpus.test.js src/test/validation-phase2.test.js src/test/missionEnvelope.test.js src/test/evidenceCoverage.test.js` | 8 files, 52 tests pass |
| Transfer-parity E2E | `E2E_ARTIFACT_ONLY=1 npx playwright test e2e/phase1.spec.js -g "share link|JSON import|flight log"` | 6/6 (desktop + Pixel 5) |
| Transfer/print E2E | `E2E_ARTIFACT_ONLY=1 npx playwright test e2e/phase2.spec.js -g "keyboard|reduced motion|JSON download|brief and print"` | 4/4 (desktop + Pixel 5) |
| Keyboard E2E | `E2E_ARTIFACT_ONLY=1 npx playwright test e2e/phase1.spec.js -g "keyboard"` | 4/4 (desktop + Pixel 5) |
| Analysis keyboard/focus E2E | `E2E_ARTIFACT_ONLY=1 npx playwright test e2e/analysis-surface.spec.js -g "keyboard|reduced motion|focuses the target"` | 4/4 (desktop + Pixel 5) |

The full CI-equivalent matrix (`npm run check`, then `npm run e2e` with
`E2E_ARTIFACT_ONLY=1`) still runs as the supported-runtime release gate; CI
(`.github/workflows/check.yml`) pins Node 22 and covers it on every push/PR.

## Code-reachable release blockers found and fixed in this audit

### Prohibited-claim / copy gate

The M2/M6 exit criteria prohibit `SAFE`, `REVIEWED`, `PRELIMINARY CHECKS PASS`,
and unsupported confidence-interval language. The app UI was clean (verified by
unit tests and grep), but the shipped landing page (`landing/assets/landing-scroll.jsx`)
carried several violations:

- **"Import .eng thrust curves for ±2-3% apogee accuracy."** — internal model
  characterizations disagree (the `simulation.js` comment claims ±2-3% with a
  curve / ±5-8% RK4 without; the changelog claims ±3-5% with a curve; the
  user-facing RocketSpecs UI claims `±10–15%` integrated / `±30%` fallback), and
  no corpus case is accepted evidence — corpus tolerances are comparison
  criteria, not accuracy claims. The landing now says curve import *replaces
  scalar-thrust assumptions* with no unsupported numeric accuracy claim. The
  internal comment/UI divergence is a known documentation-consistency item for a
  later M7-style model-evidence pass.
- **"Landing scatter with 95% confidence ellipse ... so you know the landing
  zone before you fly."** — the ellipse is explicitly *not* a confidence
  interval in the dispersion contract (`summarizeDispersionRun`:
  "reproducibility contract, not a confidence interval and not a real-world
  accuracy claim"). Copy reworded to "95% scatter ellipse ... Scatter is modeled
  variation, not a measured confidence interval"; the overclaim "so you know the
  landing zone before you fly" removed. The in-map legend title `CONFIDENCE`
  renamed `MODELED_SCATTER`; the stats row now reads `95% scatter ellipse`.
- **`✓ SAFETY_FACTOR_PASS` / `✓ LANDING_KE_OK` rows** — aligned with the app's
  canonical criterion language (`WITHIN TESTED CRITERION`): now
  `SHOCK_CORD_WITHIN_CRITERION` / `LANDING_KE_WITHIN_GUIDELINE` with threshold
  wording ("above the 4.0× threshold").
- **"189-part catalog"** — stale (the catalog validates at 225 parts). Updated.
- **`BUILD_20260427`** — stale build marker (two occurrences). Updated to
  `BUILD_20260813`.

App-side: the DispersionMap popup label "95% Confidence Ellipse" now reads
"95% Scatter Ellipse" with the qualification "Modeled scatter, not a measured
confidence interval."

### Privacy gate

The app has three network surfaces, all user-visible or explicit:

1. Google Fonts (preconnect + stylesheet in `index.html`; font files from
   `fonts.gstatic.com`), CSP-scoped.
2. OpenStreetMap tiles + Leaflet CSS (SRI-pinned) in the Dispersion tab. Viewing
   the map with launch coordinates sends those coordinates to
   `tile.openstreetmap.org` as tile requests.
3. ThrustCurve.org motor search (explicit user action; AbortController-guarded;
   CSP `connect-src`).

There is no backend, telemetry, or configuration upload; SECURITY.md states
"RecoverySys does not provide a backend or transmit configuration data as part
of normal use." The tile-server disclosure was not visible in the UI, so a
one-line disclosure was added to the DispersionMap panel: "Map tiles load from
OpenStreetMap — viewing the map sends launch coordinates to the tile server."

### Version-identity gate

App release `1.2.0.1` is single-sourced in `src/lib/constants.js`
(`VERSION`, `VERSION_DISPLAY = 'V1.2'`) and matches `package.json`, the `VERSION`
file, `CHANGELOG.md`, `README.md`, and `PRODUCT-STRATEGY-BRIEF.md`. The Tauri
desktop configuration (`src-tauri/tauri.conf.json`) and `Cargo.toml` package
version `1.2.0`: Tauri and Cargo require strict semver, which a four-part
`1.2.0.1` does not satisfy. The mapping is now documented in
[`DESKTOP.md`](../DESKTOP.md): the desktop artifact version is the semver
normalization of app release `1.2.0.1` (first three components). The landing
build marker was stale and is corrected. CI asserts desktop artifact contents on
Windows and slice/signature integrity on macOS.

## External gates (not code-reachable; remain open)

- **Windows portable launch + hash:** CI builds and asserts archive contents,
  but a fresh Windows launch with a recorded hash of `RecoverySys-Portable.zip`
  on this integrated checkpoint still requires a Windows host.
- **macOS host verification:** no macOS host has launched
  `RecoverySys-macos-universal.zip`; macOS support remains unverified and is not
  claimed. CI verifies universal slices and ad-hoc code signature only.
- **Independent evidence:** the 14 corpus cases remain review-only; no accepted
  comparison, independent reviewer metadata, trusted simulator artifact,
  manufacturer/test dataset, or traceable real-flight observation exists.
- **Broader M4 transfer parity:** fresh-receiver share/JSON/print parity is
  verified; the full screen/export/import/share/Flight Log parity matrix and the
  candidate-evidence export/external-review intake loop remain open.
- **Supported-runtime full matrix:** this audit verified focused gates on Node
  22; the complete `npm run check` + full `npm run e2e` clean-install run on the
  integrated branch remains a release gate (CI executes it).

## Deferred tracks (kept explicitly external)

- **M7 evidence-led model decisions:** deferred until reproducible,
  decision-relevant gaps exist. No model changes were made in this audit.
- **M8 Python engine:** the FastAPI/SciPy `engine/` package remains research-only,
  disconnected from the frontend, and not bundled into desktop builds. No
  cross-engine comparison, versioned contract, or security review was performed
  in this audit; the browser implementation remains the sole authority.
- **M9 expansion:** no committed expansion work; automatic parts sourcing
  remains deferred until the M1 provenance contract and M6 privacy/security/
  release gates are satisfied.
