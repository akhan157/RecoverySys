# Historical record — Fruity catalog review, 2026-11-07

Scope record: `SCOPE.md` in this directory.
Detailed packet: `RecoverySys/validation/catalog-review/review-2026-11-07/`.

## Outcome

- Base SHA: `56a3ea865b782547cc09ee72aeeb398e34ebdef9` (`main`).
- 35 historical field proposals audited.
- 8 rows are exact prior 2026-11-05 decisions and were not re-decided:
  2 `cfc-030-n` `retain-rounded`; 6 `ifc-030-sl` `hold`.
- 27 rows were reviewed here:
  - 22 `retain-rounded`;
  - 3 `reject-substitution` (`ifc-036-sl` SUL values);
  - 1 `recommend-change-rounded` (`ifc-096-s` 46 → 462 g);
  - 1 `hold-source` (`cfc-018-n` 48 vs 60 g contradiction).
- Recommended catalog edits: 1 (`ifc-096-s` only). No edit was made.
- All 35 historical `old` values still match current `PARTS`.
- All 35 rows have a source URL and hash (new 2026-11-07 capture or prior
  2026-11-05 capture).

## Key findings

- `ifc-096-s`: exact `IFC-96-S-YB` page says 16.3 oz = 462.097 g; current 46 g
  is a likely missing-digit defect. Parent review required before any edit.
- `ifc-036-sl`: historical mapping used the Iris 36 **Ultralight** page
  (`IFC-36-SUL-OB`, 49 g, 1.8 × 3.6). The exact Iris 36 **Light** page
  (`IFC-36-SL-OB`, 60.8 g, 1.9 × 4.2) matches current catalog values. Reject
  the SUL substitution; catalog display name is misleading and out of scope.
- `cfc-018-n`: page says `1.7 oz (60 grams)`; 1.7 oz = 48.19 g. Keep 48 g and
  hold pending clarification.
- `cfc-030-s` / `cfc-036-s`: 1–2 g display-rounding conflicts only; retain
  current 60 g / 94 g and record uncertainty.
- Six prior `ifc-030-sl` holds remain unresolved; not re-litigated. The 36 in
  case found the Light page under a different handle; a separate task could
  search the 30 in Light page.

## Evidence

Validator and tests:

```bash
node RecoverySys/validation/catalog-review/review-2026-11-07/validate-review.mjs
# 1647 passed, 0 failed
node --test --test-concurrency=2 RecoverySys/validation/catalog-review/review-2026-11-07/validate-review.test.mjs
# 9 passed, 0 failed
```

Capture method: 20/21 direct shop product requests returned HTTP 429 on
2026-11-07. One page was captured directly (HTTP 200, raw HTML). The other 23
pages use `r.jina.ai` as a read-only reader; every target reported a 403 warning
but returned the manufacturer page text. Hashes verify captured bytes, not live
freshness. Raw captures stay outside git under
`$HOME/RecoverySys-artifacts/catalog-review-2026-11-07/`.

## Boundaries

No production catalog, physics, threshold, catalog version, historical capture,
release/qualification record, register, task board or handoff edit. No push,
tag, PR or release. No manufacturer-verified promotion. Parent reviews and
decides any later catalog edit.
