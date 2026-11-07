# RESULT — historical Fruity catalog review, 2026-11-07

Packet: `RecoverySys/validation/catalog-review/review-2026-11-07/`
Base: `56a3ea865b782547cc09ee72aeeb398e34ebdef9`
Author: research sub-agent. Review and acceptance are the parent's.

## Bounded outcome

- 35 historical proposals audited.
- 8 exact prior overlaps recorded, not re-decided:
  - rows 1–2 `cfc-030-n` `retain-rounded` (PROP-20261105-01/-02);
  - rows 5–10 `ifc-030-sl` `hold-identity` (PROP-20261105-03…-08).
- 27 remaining rows reviewed.
- Effective dispositions across all 35 rows:
  - `retain-rounded`: 24 (2 prior + 22 new)
  - `hold-identity`: 6 (all prior `ifc-030-sl`)
  - `reject-substitution`: 3 (`ifc-036-sl`)
  - `recommend-change-rounded`: 1 (`ifc-096-s` 46 → 462 g)
  - `hold-source`: 1 (`cfc-018-n`)
- Recommended catalog edits: 1.
- Rows without a captured source/hash: 0.
- Rows whose historical `old` still equals current `PARTS`: 35/35.

## What changed

New, uncommitted in the working tree until the packet commit:

- `RecoverySys/validation/catalog-review/review-2026-11-07/README.md`
- `RecoverySys/validation/catalog-review/review-2026-11-07/RESULT.md`
- `RecoverySys/validation/catalog-review/review-2026-11-07/RECOMMENDATIONS.json`
- `RecoverySys/validation/catalog-review/review-2026-11-07/sources.json`
- `RecoverySys/validation/catalog-review/review-2026-11-07/validate-review.mjs`
- `RecoverySys/validation/catalog-review/review-2026-11-07/validate-review.test.mjs`
- `RecoverySys/validation/catalog-review/review-2026-11-07/EVIDENCE.json`
- `RecoverySys/docs/history/catalog-review-2026-11-07/SCOPE.md`
- `RecoverySys/docs/history/catalog-review-2026-11-07/RESULT.md`

No production file changed. `git diff` on `src/data/parts.js` is empty.

Raw evidence is outside git under
`$HOME/RecoverySys-artifacts/catalog-review-2026-11-07/`:

- `capture-manifest.json` — 22 direct attempts (root + 21 products): 2 HTTP 200,
  20 HTTP 429; only the 36 in standard page parsed from the direct HTML.
- `raw/36-elliptical-parachute-4-8lb-20fps.html` — direct HTTP 200 raw Shopify
  HTML, SHA-256 `0de95b8d2d4e6542b99f84f383cdc1e8a53f5f3d852044b9146b428f0bdb8432`.
- `reader-proxy-manifest.json` — 24 reader-proxy captures, all HTTP 200 at the
  reader, each with SHA-256; every target reported a 403 warning.
- `reader-proxy/*.md` — 24 captured manufacturer page texts.

## Parent actions (recommendation only)

1. **One edit candidate:** `ifc-096-s` `weight_g` 46 → 462. The exact
   `IFC-96-S-YB` page states 16.3 oz; 16.3 × 28.349523125 = 462.097 g. Confirm
   the catalog entry and apply only under parent authority in a later task.
2. **No edit for `ifc-036-sl`:** reject the three SUL proposals; keep 60 g,
   1.9 in, 4.2 in. A separate metadata task may correct the display name from
   `Ultralight` to `Light` and decide 60 vs 60.8 g.
3. **Hold `cfc-018-n`:** the page says `1.7 oz (60 grams)`, which is internally
   inconsistent. Keep 48 g until the manufacturer or a second primary source
   says which value is correct.
4. **No edit for `cfc-030-s` / `cfc-036-s`:** keep 60 g and 94 g as the
   ounce-derived integers; the printed `59 g` and `92 g` are recorded as
   display rounding. If the parent prefers the gram display, that is a
   deliberate rounding-policy change, not a silent correction.
5. **No edit for the six `ifc-030-sl` rows:** prior hold preserved.

## Checks actually run

```bash
cd <lane-worktree>/RecoverySys
node validation/catalog-review/review-2026-11-07/validate-review.mjs
# -> passed: 1647, failed: 0

node --test --test-concurrency=2 validation/catalog-review/review-2026-11-07/validate-review.test.mjs
# -> tests 9, pass 9, fail 0
```

The validator covers: input hashes, exact 35-row coverage, unique
`(partId, category, field)` keys, historical old/proposed values, current
`PARTS` values, catalog identity fields, source and artifact hash/byte
integrity, prior-overlap exactness, derived counts, area-null honesty, and
semantic guards for the key findings. The tests prove it fails on duplicate
rows, missing hashes, altered current values, missing artifacts, altered
counts, a silent `ifc-096-s` disposition flip, a missing reason and a fabricated
area value.

## Deliberately not done

- No production catalog, physics, threshold, catalog version, historical
  capture, release/qualification record, register, task board or handoff edit.
- No re-decision of the 2026-11-05 decisions.
- No manufacturer contact, bulk feed download, repeated 429 retry loop, push,
  tag, PR or release.
- No invented canopy area; the pages do not publish one.
- No manufacturer-verified status claimed.

## Open source questions

- `cfc-018-n`: which published mass is correct, 1.7 oz (48 g) or 60 g?
- `ifc-036-sl`: confirm the intended display name and 60 vs 60.8 g rounding.
- `cfc-030-s` / `cfc-036-s`: confirm the catalog's ounce-first rounding policy
  versus the page's printed gram display.
- `ifc-030-sl`: prior Light vs Ultralight identity hold remains. The 36 in case
  found the Light page under a different handle; a separate task could search
  the 30 in Light page without touching the prior decision.
- Canopy area is unpublished; a separate manufacturer spec source is needed if
  area is required.
