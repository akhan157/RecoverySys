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
