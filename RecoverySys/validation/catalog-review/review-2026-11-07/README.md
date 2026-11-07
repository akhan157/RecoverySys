> Parent review qualification (2026-11-07): this is a recommendation packet,
> not manufacturer verification. The three CFC-30-S/CFC-36-S retain-current
> rows have unresolved source-unit discrepancies; no measured ± uncertainty or
> catalog-wide rounding policy was established. Author summaries below are
> retained as history; parent dispositions are in the review record.

# Historical Fruity catalog review — 2026-11-07

Status: bounded research packet. Recommendations only. This author cannot
self-accept, cannot promote manufacturer-verified status, and did not edit the
production catalog, physics, thresholds, catalog version, historical captures,
release/qualification records, register, task board or handoff.

## Pin

- Worktree: `/home/ak/.t3/worktrees/RecoverySys/t3-7642bb71`
- Branch: `t3/fruity-catalog-review`
- Base / HEAD: `56a3ea865b782547cc09ee72aeeb398e34ebdef9` (= `main`)
- Production catalog: `RecoverySys/src/data/parts.js` (225 entries, 205 unique
  IDs; chute IDs can have one `main_chute` and one `drogue_chute` row).

## What this packet does

It audits all 35 field proposals in
`RecoverySys/validation/catalog-review/fruity-2026-10-19-diff.json` against the
current production `PARTS`, the already-archived 2026-11-05 captures, and exact
current Fruity Chutes product pages captured on 2026-11-07.

The 8 rows already decided by the 2026-11-05 packet are recorded, not
re-decided. The 27 remaining rows are reviewed here. Each row records old,
current and proposed values, category, field, stable identity tuple, source
URL/hash, conflicts, disposition and reason.

## Results (counts derived from the 35 rows)

| Bucket | Rows | Meaning |
|---|---:|---|
| Already resolved on 2026-11-05 | 8 | 2 `cfc-030-n` `retain-rounded` + 6 `ifc-030-sl` `hold` |
| Reviewed here | 27 | remaining historical rows |
| **Effective dispositions** | **35** | |
| `retain-rounded` | 24 | 2 prior + 22 new; no catalog edit |
| `hold-identity` | 6 | all prior `ifc-030-sl` holds |
| `reject-substitution` | 3 | `ifc-036-sl` SUL values rejected |
| `recommend-change-rounded` | 1 | `ifc-096-s` 46 → 462 g |
| `hold-source` | 1 | `cfc-018-n` 48 vs 60 g conflict |
| Recommended catalog edits | 1 | parent review required |

No row is missing a captured source. All 35 historical `old` values still equal
the current `PARTS` values, so no row was already superseded by a production
edit.

### Exact overlap with the 2026-11-05 decisions

| Historical rows | Proposal IDs | Prior decision |
|---|---|---|
| 1–2 `cfc-030-n` `weight_g` (main, drogue) | `PROP-20261105-01`, `-02` | `retain-rounded` (88 g) |
| 5–10 `ifc-030-sl` six fields | `PROP-20261105-03` … `-08` | `hold` (exact `IFC-30-SL` unconfirmed) |

That is 8 exact overlaps. The 6 Rocketman `reject` proposals from 2026-11-05
are adjacent work, not part of these 35 rows; they are not counted as overlaps.

## Key findings

1. **`ifc-096-s` is the one clear catalog defect (1 row).** The exact
   `IFC-96-S-YB` page states `Weight: 16.3 oz`; 16.3 oz × 28.349523125 =
   462.097 g. Current catalog `46 g` is implausible beside the 96 in standard
   (709 g) and 84 in compact (380 g). Recommendation: parent reviews a
   `weight_g 46 → 462` edit. No edit was made here.

2. **`ifc-036-sl` is a wrong-variant substitution (3 rows).** The historical
   mapping used the Iris 36 **Ultralight** page (`IFC-36-SUL-OB`: 49 g,
   1.8 × 3.6 in). The exact Iris 36 **Light** page (`IFC-36-SL-OB`: 2.1 oz /
   60.8 g, 1.9 × 4.2 in, 6 gores) matches the catalog's 60 g / 1.9 × 4.2.
   Reject the SUL values and retain current values. The catalog display name
   says `36" Iris Ultralight`, which is misleading; renaming is out of scope.

3. **`cfc-018-n` is a source contradiction (1 row).** The exact page says
   `1.7 oz (60 grams)`: 1.7 oz = 48.19 g, while 60 g = 2.12 oz. Current 48 g
   matches the ounce value and the size progression; the proposed 60 g matches
   the gram parenthetical. Hold; do not change without manufacturer
   clarification or a second primary source.

4. **`cfc-030-s` and `cfc-036-s` are display-rounding conflicts, not variant
   mismatches.** The pages print `2.1 oz (59 grams)` and `3.3 oz (92 grams)`.
   The catalog's 60 g and 94 g are the nearest-integer conversions of 2.1 oz
   (59.53 g) and 3.3 oz (93.55 g). This packet retains 60 g and 94 g under the
   catalog's integer/ounce convention and records ±1 g / ±2 g uncertainty.

5. **The other 19 remaining rows are ordinary rounded values.** Their published
   ounce values convert to the proposed decimals and round to the current
   catalog integers (e.g. 4.5 oz → 127.573 → 128 g). No change. The two
   display-rounding cases are described above; 16.3 oz is the change case.

6. **The six `ifc-030-sl` holds are preserved.** The prior packet found the
   exact `IFC-30-SL` vs `IFC-30-SUL` identity unresolved. This packet did not
   re-decide them.

## Evidence and capture method

- Raw captures are outside git under
  `$HOME/RecoverySys-artifacts/catalog-review-2026-11-07/`.
- Direct shop product URLs returned HTTP 429 on 2026-11-07 (20 of 21 product
  attempts). One page (`36-elliptical-parachute-4-8lb-20fps`) was captured
  directly with HTTP 200 and raw Shopify HTML. 22 product sources use
  `r.jina.ai` read-only reader captures; one additional reader capture is kept
  as conflict evidence for the historical `ifc-036-sl` mapping. The reader
  reported a target 403 warning but returned the manufacturer page text. A
  reader-proxy copy of the 36 in standard also exists but is not the primary
  source.
- Hashes prove captured bytes only. They do not prove live freshness beyond the
  recorded access date.
- The 2026-10-19 historical `sourceSha256` values are hashes of the Shopify feed
  `body_html`; those raw feed bytes are not in the repo or artifact store. They
  are recorded as historical provenance, not as current page captures.
- No canopy area is published on the captured pages. The packet records
  `area_published: null` with a note and does not infer area from diameter.

## Reproduce

```bash
node RecoverySys/validation/catalog-review/review-2026-11-07/validate-review.mjs
node --test --test-concurrency=2 RecoverySys/validation/catalog-review/review-2026-11-07/validate-review.test.mjs
```

The validator checks all 35 rows, exact current values against `PARTS`, source
hash/byte integrity, overlap exactness, derived counts and semantic invariants.
The test suite adds negative mutations for duplicate rows, missing hashes,
mismatched current values, missing artifacts, altered counts, silent disposition
flips, missing reasons and fabricated area.

## Remaining source questions

1. `cfc-018-n`: is the correct mass 1.7 oz (48 g) or 60 g? The exact page
   contradicts itself; need manufacturer clarification or a second primary
   source.
2. `ifc-036-sl`: correct the display name to Light (separate metadata task) and
   decide 60 vs 60.8 g under the catalog rounding policy.
3. `cfc-030-s` / `cfc-036-s`: if the parent prefers the page's printed gram
   display over the ounce-derived integer, the alternatives are 59 g and 92 g.
   This packet recommends keeping 60 g and 94 g.
4. `ifc-030-sl`: the prior hold remains; exact `IFC-30-SL` (Light) vs
   `IFC-30-SUL` (Ultralight) identity is still unresolved. The 36 in result
   shows the Light pages live under a different handle (`iris-36-light-...`)
   than the Ultralight pages; a separate task could run the same on-site search
   for the 30 in Light page. This packet did not do so because the six 30 in
   rows are prior decisions.
5. Canopy area: not published on these pages. If area is required, obtain a
   manufacturer spec sheet or other primary source; do not derive it from a
   nominal diameter.
6. Direct-source freshness: if a direct HTTP 200 capture of every page is
   required, retry after the shop rate limit clears; current reader-proxy
   captures are labelled and hashed but are not direct 200s.

## Boundaries

- No production `PARTS`, physics, threshold, catalog version, historical
  capture, release, register or handoff edit.
- No prior 2026-11-05 decision re-litigated.
- No manufacturer-verified promotion; identity confidence is limited to exact
  SKU + published specs.
- No push, tag, PR, release, deploy or external contact.
- The parent reviews this packet and decides any later catalog edit.
