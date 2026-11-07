# SCOPE — historical Fruity catalog review (2026-11-07)

Status: Gate-1 scope record for the bounded research lane.
Author: research sub-agent. Reviewer/parent decides any later catalog edit.
No production catalog, physics or historical record is changed by this lane.

## Pin

- Worktree: `/home/ak/.t3/worktrees/RecoverySys/t3-7642bb71`
- Branch: `t3/fruity-catalog-review`
- Base/HEAD: `56a3ea865b782547cc09ee72aeeb398e34ebdef9` (= `main`)
- Current catalog at this pin: `RecoverySys/src/data/parts.js`
  (225 entries, 205 unique part IDs; chute parts have one `main_chute` and one
  `drogue_chute` entry with identical specs).

## Input artifacts (repo-relative, SHA-256 at this pin)

| Artifact | Role | SHA-256 |
|---|---|---|
| `RecoverySys/validation/catalog-review/fruity-2026-10-19-diff.json` | 35 historical field proposals under review | `56b925dde02bea3d0097715bd315ee24c4f275d38124a308bb588820625620bc` |
| `RecoverySys/validation/catalog-review/fruity-2026-10-19.json` | 37 historical candidate records that generated the diff (source hashes, units, packing assumptions) | `488c6f469a82886a3fd01b66de85a0af2508d96dab772ee6c01ff21e4efbdd6f` |
| `RecoverySys/validation/catalog-review/online-2026-11-05/DECISION-PROPOSALS.json` | 14 recent proposals, including the 8 exact overlaps | `a74d41f1677fd15702ae272303c9cb16fc2ac1de94c656041638671e1648f448` |
| `RecoverySys/validation/catalog-review/online-2026-11-05/sources.json` | Recent primary-source metadata and capture hashes | `0fccb8c947464e88f95a57b86bb01fc13dbbcb11a51dfb1947ccec6c5e4eb6d0` |
| `RecoverySys/validation/catalog-review/primary-pages-2026-11-05.json` | Recent page observations (6 Fruity records + 2 Rocketman records) | `1f589fe1d7c6b17efc3c9167ca647df69673ff00baba429bc302e7ec34fbb286` |
| `RecoverySys/validation/catalog-review/primary-pages-2026-11-05-diff.json` | Recent 14-row diff | `61040c048b0b9ba861876e9a3e0e4792c0b20aa3b221f362e4d7124fca197f58` |
| `RecoverySys/docs/history/online-validation-2026-11-05/CATALOG-EVIDENCE.json` | Reviewer decisions: 2 retain-rounded, 6 hold, 6 reject; 0 accepted engineering values | `1b3171da3b14a58579f250f4075dbf2b156e0087ba08146f9db9c687dc3414b0` |
| `RecoverySys/src/data/parts.js` | Current production catalog (read-only) | `520ef5ccb3b2115bdc6dc0cab5e29c83ae34b2f1e5686cfe38d16f6b04d08f20` |
| `RecoverySys/src/data/supplierMappings.json` | Historical part→Fruity handle mapping used by the 2026-10-19 extraction | `7fc6c20d28645206ab84a4a7dc790884ed0a22a1c46f80ec3bc6500e2f2155c6` |
| `RecoverySys/scripts/stage-fruity-engineering.mjs` | Generator of the historical records (uses mapping + feed `body_html`) | `c537baae39dc4afbef50e6c1fccc365b296dc39a54974d1be90483cd961fae68` |
| `RecoverySys/src/lib/supplierEngineering.js` | Explicit-field extractor (`Packing Volume`, `Weight`, `Cd`) | `07af63064a22bd40b398a6b6416351ba7b234c3f162a172756f4f46216052b27` |

Existing captures outside git (reusable, hash-verified):

- `$HOME/RecoverySys-artifacts/online-validation-2026-11-05/catalog/`
  - `fruitychutes-cfc-30-n-standard.md` — `38d6c353ab835a8523d6086d29a60a8eb8be4bfab7a7939a7ab2dfdbb537a54f`
  - `fruitychutes-cfc-30-s-compact.md` — `14b04c142289ca09977cab1c565fc17067d867e417148e5823fb939c507116ea`
  - `fruitychutes-ifc-30-s-compact.md` — `f0b4436486fd2952ed6c28c6b497bf6f5a558dad454f6434a4994d6a3cb7b06a`
  - `fruitychutes-ifc-30-sul-ultralight.md` — `a58bbac41e333da174b7ef4c0a6e46ed6b8b5d37038b06066c12fc7caec036a9`

New raw captures for this lane go outside git under
`$HOME/RecoverySys-artifacts/catalog-review-2026-11-07/`.

## Row split (35 rows, derived from exact `(partId, category, field)` keys)

Verified at scope time: every historical `old` value still equals the current
`PARTS` value, so no row is already superseded by a production edit.

### A. Already resolved by 2026-11-05 decisions — 8 rows (do not relitigate)

| Rows | Part / fields | Prior proposal(s) | Prior disposition |
|---|---|---|---|
| 1–2 | `cfc-030-n` `weight_g` (main, drogue) | `PROP-20261105-01`, `-02` | `retain-rounded` (88 g) |
| 5–10 | `ifc-030-sl` `packed_diam_in`, `packed_length_in`, `weight_g` (main, drogue) | `PROP-20261105-03` … `-08` | `hold` (exact `IFC-30-SL` identity unconfirmed) |

These rows are recorded with their prior decision and are not re-decided here.
The 6 Rocketman `reject` proposals from 2026-11-05 are adjacent work, not part
of the 35 Fruity rows, so they are not an overlap.

### B. Remaining locally researchable — 27 rows (23 distinct products)

| # | partId | category | field | old | proposed | bucket | prior |
|---:|---|---|---|---:|---:|---|---|
| 3 | cfc-030-s | main_chute | weight_g | 60 | 59 | remaining | — |
| 4 | cfc-030-s | drogue_chute | weight_g | 60 | 59 | remaining | — |
| 11 | ifc-030-s | main_chute | weight_g | 53 | 53.4 | remaining | — |
| 12 | ifc-030-s | drogue_chute | weight_g | 53 | 53.4 | remaining | — |
| 13 | cfc-036-n | main_chute | weight_g | 128 | 127.5728540625 | remaining | — |
| 14 | cfc-036-s | main_chute | weight_g | 94 | 92 | remaining | — |
| 15 | ifc-036-n | main_chute | weight_g | 142 | 141.747615625 | remaining | — |
| 16 | ifc-036-sl | main_chute | packed_diam_in | 1.9 | 1.8 | remaining | — |
| 17 | ifc-036-sl | main_chute | packed_length_in | 4.2 | 3.6 | remaining | — |
| 18 | ifc-036-sl | main_chute | weight_g | 60 | 49 | remaining | — |
| 19 | cfc-042-n | main_chute | weight_g | 162 | 161.5922818125 | remaining | — |
| 20 | cfc-048-n | main_chute | weight_g | 207 | 206.9515188125 | remaining | — |
| 21 | ifc-048-n | main_chute | weight_g | 213 | 212.6214234375 | remaining | — |
| 22 | ifc-048-s | main_chute | weight_g | 122 | 121.9029494375 | remaining | — |
| 23 | cfc-060-n | main_chute | weight_g | 283 | 283.49523125 | remaining | — |
| 24 | ifc-060-n | main_chute | weight_g | 309 | 309.0098020625 | remaining | — |
| 25 | ifc-060-s | main_chute | weight_g | 193 | 192.77675725 | remaining | — |
| 26 | ifc-072-n | main_chute | weight_g | 380 | 379.88360987500005 | remaining | — |
| 27 | ifc-072-s | main_chute | weight_g | 249 | 249.47580350000004 | remaining | — |
| 28 | ifc-084-n | main_chute | weight_g | 539 | 538.640939375 | remaining | — |
| 29 | ifc-084-s | main_chute | weight_g | 380 | 379.88360987500005 | remaining | — |
| 30 | ifc-096-n | main_chute | weight_g | 709 | 708.738078125 | remaining | — |
| 31 | ifc-096-s | main_chute | weight_g | 46 | 462.0972269375 | remaining | — |
| 32 | ifc-120-n | main_chute | weight_g | 1021 | 1020.5828325 | remaining | — |
| 33 | ifc-120-s | main_chute | weight_g | 624 | 623.6895087500001 | remaining | — |
| 34 | cfc-012-s | drogue_chute | weight_g | 24 | 24.2 | remaining | — |
| 35 | cfc-018-n | drogue_chute | weight_g | 48 | 60 | remaining | — |

### C. Genuinely external blockers at entry — 0 rows

No row is declared external before research. Two known identity hazards are
tested locally first:

1. `ifc-036-sl`: `supplierMappings.json` maps it to the Iris 36 **Ultralight**
   (`iris-36-ultra-light-parachute-4lbs-15fps`), while the part ID suffix is
   `-sl` and the 2026-11-05 packet already held the analogous `ifc-030-sl`
   mapping. If current primary sources cannot resolve Light vs Ultralight, the
   row becomes `hold-identity`, not an accepted substitution.
2. `cfc-018-n` and `ifc-096-s`: the proposed mass differs materially from the
   current integer (48 → 60 g; 46 → 462.10 g). These may be genuine catalog
   defects or extraction/mapping errors; only exact current SKU evidence can
   distinguish them.

Historical extraction context (not a conclusion): the 2026-10-19 records were
generated from a Shopify product feed by
`stage-fruity-engineering.mjs` + `extractFruityEngineering()`. The extractor
reads `Weight: ... (N grams)` first, otherwise `Weight: N oz` multiplied by
28.349523125, plus `Packing Volume: D" x L"` and `Cd of N`. So decimal values
such as `127.5728540625` are exact ounce conversions, not measured grams.

## Disposition vocabulary for this lane

- `already-decided` — prior 2026-11-05 disposition applies; no new decision.
- `retain-rounded` — current integer is the catalog rounding of the published
  value; no change.
- `recommend-change-rounded` — current integer is contradicted by an exact
  current primary source; recommend the rounded integer change (parent decides).
- `hold-identity` — exact SKU/variant identity or source is not confirmed; keep
  current value and record the exact missing input.
- `hold-source` — identity is plausible but the primary page/capture is
  unavailable or internally inconsistent; keep current value.
- `reject-substitution` — source is a demonstrably different variant/material;
  reject the proposed value.

`manufacturer-verified` is not a status this author can grant.

## Falsifiers (what would prove a recommendation wrong)

- Production `PARTS` current value differs from the recorded `currentValue`
  (checked by validator).
- Captured artifact bytes do not match the recorded SHA-256, or a row has no
  source/blocker.
- The exact manufacturer SKU does not match the catalog identity tuple
  (manufacturer + part ID + category + nominal diameter + shape/material).
- The published weight is not the source of the proposed decimal, or the
  proposed integer is not the catalog rounding of the published value.
- The page states a different material, packing method/density, or variant than
  the one the row assumes.
- A "current" claim is based only on a cached/archive copy without a dated URL;
  currentness must be labelled, not inferred.
- A row count or summary count disagrees with the 35 rows.

## Research rules

- Prefer the exact product URL recorded in `fruity-2026-10-19-diff.json`;
  otherwise use the handle in `supplierMappings.json` for the same part ID.
- Capture one page at a time. Do not use `products.json` bulk endpoints or retry
  HTTP 429 in a loop.
- Record URL, access date/time, HTTP status, title, exact SKU(s), published
  weight string, packing string, material, Cd/rating text, and artifact hash.
- Reuse the 2026-11-05 captures where they are the exact product; label them as
  prior captures, not current re-fetches.
- Do not infer a SKU from a similar name, diameter, or rounded mass.
