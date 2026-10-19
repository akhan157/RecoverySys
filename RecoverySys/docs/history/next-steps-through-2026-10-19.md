# RecoverySys — Next Steps

**Snapshot:** 2026-08-17 · `origin/main` @ `a5b07cc` (local in sync)

## Status: what is shipped and verified

- OpenRocket `.ork` snapshot import feature is complete and pushed:
  - `f4c5d98` — feature: bounded local parser (1.10/1.11), review UI, config/stage/
    geometry/mass selection, stale-result handling, imported-source provenance,
    six provenance-recorded fixtures, parser/UI/reducer tests, exchange design doc,
    and the select-contrast CSS fix.
  - `a5b07cc` — hardening: thrustcurve members enumerated by name, never
    decompressed (closes the zip-bomb gap found in post-push review).
- Verified on this machine:
  - Parser suite 6/6 · import/stale 14/14 · transfer-parity 45/45.
  - Full `npm run check` + production build + `git diff --check` green.
  - Browser workflow: preview → select → accept → `RESULT_STALE` + `IMPORTED_SOURCE`.
  - All fixture SHA-256 values match the manifest.
- Working tree clean except user-owned `untitled.md` (untouched).

## Open gates (not code-completable on this machine alone)

### 1. Real-world validation corpus (primary external-evidence gate)

Goal (from `docs/universal-rocketry-exchange-design.md` success criteria):

- 25–40 real `.ork` files covering single-stage, multi-stage, mass overrides,
  multiple motor configurations, and unusual component layouts.
- ≥90% of supported-version files produce a useful preview.
- No unnoticed motor/recovery/payload/stage mass double-counting.
- Ambiguous mass and geometry are never silently accepted.
- ≥80% of proposed mapped fields accepted without correction.
- Median setup time reduced ≥50% (or a meaningful 3–5 minutes).
- ≥70% of test users prefer the import flow for their next vehicle.
- 10–15 observed rocketeer workflows; independent reviewer metadata.

Sourcing approach (parser coverage now, observed workflows still external):

- Pull real `.ork` files from public rocketry GitHub repos with pinned commit
  SHA-256 provenance. This grows parser coverage toward the target but does NOT
  substitute for observed-user-workflow and independent-review evidence.
- Each added fixture gets: source repo URL, source path, commit/revision, SHA-256,
  and a trait list, recorded in `src/test/fixtures/openrocket/manifest.json`.
- Only add fixtures that parse to a supported version with a useful preview;
  files that fail closed are excluded, not weakened.

### 2. Transfer-parity full matrix

- Review complete; no code defect found. JSON export/import, share-link, storage,
  print Brief/Checklist, and Flight Log preserve current/stale, units, provenance,
  and observation-vs-prediction separation.
- Open decision: **should imported-source provenance persist beyond session state?**
  - Recommendation: yes — persist it as read-only metadata in the saved payload so
    a refreshed plan keeps its "imported from .ork" identity (filename, hash, version,
    accepted config/stage, acceptedAt). Keep it out of current/stale authority: a
    fresh simulation is still required after import.
  - Do NOT persist the full candidate list or saved OpenRocket results.

### 3. Supported-runtime + platform qualification (M6)

- Clean Node 22 install: `npm ci && npm run check && npm run e2e`.
- Windows portable: launch + hash on Windows.
- macOS: verify the universal build on a real macOS host before claiming support.
- Full CI matrix on the supported Node line.

## Deferred tracks (only after the above)

- **M7** evidence-led model decisions (reproduce → verify units → measure impact →
  decide → update model identity, assumptions, corpus, stale behavior, tests, docs).
- **M8** Python engine architecture decision (research comparator / optional
  high-fidelity / replacement authority), cross-engine comparison, security review,
  packaged-artifact qualification. Browser JS stays authoritative until justified.
- **M9** longer-term expansion (catalog review tooling → dry-run sourcing →
  human-approved updates → controlled refreshes; no silent overwrites).

## How to run each gate

```bash
# Full local release gate (this machine)
npm run check && git diff --check

# Supported-runtime qualification (clean Node 22)
npm ci
npm run check
npm run e2e
```

## Trust gaps that must stay visible

- Scalar apogee estimates can be materially inaccurate without a trusted thrust curve.
- Drift and dispersion remain simplified estimates, not measured confidence intervals.
- Load screening is not a universal dynamic snatch-load truth model.
- Catalog values may be stale or unverified without per-part source review.
- The validation corpus is too small and lacks accepted comparison and real-flight cases.
- Local-first data stays on the device unless the user explicitly exports or shares it.

## Direction agreed 2026-10-18

The user confirmed these priorities in the Claude Code session, then continued
in Codex after that session reached its usage limit:

- Provide a switchable 2D / rotatable CAD-style 3D recovery-bay view. Both views
  should share a dimensional model, show missing dimensions explicitly, and
  present nominal packed envelopes rather than claim validated physical fit.
  Rotation, zoom, reset camera, part selection and readable labels are the
  initial interaction targets. Full vehicle CAD editing is outside this scope.
- Extend OpenRocket import to older formats, targeting 1.4–1.9 with real-file
  coverage and explicit rejection of unsupported structures. Merely expanding
  the version allowlist does not establish compatibility.
- Include supplier price and stock for budgeting and availability. Record
  currency, variant, supplier URL and retrieval time; unknown or stale stock
  must remain visible. Engineering specifications use reviewed catalog updates;
  commercial refreshes must not silently rewrite saved simulation inputs.
- The user has rocketeer contacts who can try the published V1. Observed
  workflows and Windows/macOS qualification remain external evidence gates.

Implementation sequence: preserve accepted import identity across storage and
transfer; qualify older-format import with fixtures; introduce the shared bay
geometry and 2D/3D views; add supplier adapters and timestamped commercial data.
Review PRODUCT.md and the strategy brief alongside each feature so the central
purpose remains a current, traceable recovery plan with understandable limits.

Continuation source: `.claude/claude-session-context.md` at the repository
root (Paseo activity summary, not full historical tool outputs).


## Implementation update — 2026-10-18

- Accepted OpenRocket source metadata now persists across local storage, JSON
  and share links. Reloaded inputs still need a fresh simulation.
- Formats 1.4–1.9 have authentic upstream fixtures, including XML and gzip.
  The parser accepts these bounded containers, conservatively resolves legacy
  automatic radii from agreeing adjacent explicit components, and flags review.
- Twenty-five additional public licensed design files have useful preview
  coverage with pinned revisions and hashes. Including the original user file,
  there are 26 public real-world files, plus 12 upstream/generated fixtures.
  Many new files share a design lineage; this does not satisfy observed trials.
- Switchable 2D/3D nominal bay envelopes are implemented. See
  `bay-visualization.md` for unknown dimensions and interaction scope.
- Supplier snapshots, exact commercial mappings, budgeting, a twice-daily
  workflow, and read-only engineering diffs are implemented. See
  `supplier-refresh.md`. Automatic coverage currently spans two suppliers;
  remaining vendors need source adapters, not estimated data.
- `v1-field-trial.md` defines the actual user and platform evidence still needed.
  GitHub publication, remote CI, Windows/macOS launches and observed user trials
  have not been claimed complete by these code changes.

### Local qualification result — 2026-10-18

- Official Node 22.23.3 Linux runtime, verified against upstream SHA-256;
  clean `npm ci` succeeded.
- `npm run check`: 42 test files / 386 tests passed, plus formatting, parts and
  validation-corpus gates, lint and production build.
- `npm run e2e` against that production artifact: all 66 desktop/mobile tests
  passed, including actual WebGL rendering/camera controls, graphics fallback,
  commercial refresh/failure handling and legacy gzip import/save/reload.
- Supplier dry-run: 72 offers, zero changed commercial fields, zero failures.
- Engineering review smoke check emitted per-field diffs without catalog writes.
- `git diff --check` passed. Desktop/mobile 3D screenshots were visually inspected.
- Not yet published or exercised by remote CI, Windows/macOS hosts or rocketeers.


## Spatial-model correction — 2026-10-19

The user identified that packed components are irregular, partly flexible and
may occupy more or less space than catalog dimensions suggest. The automatic
cylinder stack was removed. The view now compares an empty bay with one part
reference: rigid bounding boxes require body dimensions, flexible references
show nominal sizes or explicit recorded ranges, and combined occupied space
remains unknown. The dashboard no longer presents the old height-based model
as a physical fill gauge. Compatibility calculations are unchanged, but closure
claims and the description of the 70% assumption were corrected. See
`bay-visualization.md` for the limits and requirements of a future assembly view.

Correction verification: Node 22 `npm run check` passed (42 test files / 392
tests, formatting, catalog checks, lint and production build). All 68 desktop
and mobile browser tests passed, including the new outside-bay reference,
rigid-body dimension and flexible-range checks. `git diff --check` passed.
A physical assembly record template is in `packing-trial-template.md`.


## Visualization deferred after user review — 2026-10-19

The user found the size-reference view visually poor and functionally weak.
The experiment is now removed from the dashboard, including its extra measurement
entry fields. Prototype code remains available for reconsideration, and existing
recorded custom-part measurements are preserved on edit. The production UI no
longer imports the viewer or loads Three.js. Keep the corrected packing-screen
language; deferring the picture does not validate nominal occupancy assumptions.
Future visualization work needs a concrete, useful assembly-review task and a
reviewed prototype before integration. Supplier and OpenRocket work continue as
separate useful capabilities.

Deferral verification: 392 unit tests, formatting, lint, catalog checks and the
production build passed. All 14 focused desktop/mobile Analysis, supplier and
OpenRocket workflow tests passed. The production artifact contains no 3D viewer
chunk. Shared panel styling and existing custom-part measurements are retained.
