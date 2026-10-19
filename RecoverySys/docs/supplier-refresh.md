# Supplier prices, stock and engineering review

The dashboard's PRICE & STOCK panel starts with a bundled snapshot and performs
no supplier request on mount. **Check price & stock** downloads the latest
published commercial snapshot from this repository's main branch on GitHub.
No rocket inputs or selected part IDs are sent. Planning and the bundled snapshot
work offline. The public raw-content path is explicitly allowed in index.html's
Content Security Policy. A fork can set `VITE_SUPPLIER_SNAPSHOT_URL`; its host must
also be permitted by the deployment CSP.

## Refresh and publication

From `RecoverySys/`:

```sh
npm run suppliers:preview
npm run suppliers:refresh
```

Preview emits field-level commercial diffs without writing. Refresh atomically
writes `public/supplier-prices.json`. The GitHub workflow
`../.github/workflows/supplier-snapshots.yml` refreshes twice daily (UTC) and on
manual dispatch, committing only that JSON file. It needs repository Actions
write permission and a branch policy permitting the bot's snapshot commits.
It becomes active after these changes are pushed; it has not been run remotely.
The app reads the raw snapshot directly because commits made with GITHUB_TOKEN
do not trigger a second deployment workflow. Existing installed/offline builds
retain bundled data until the user explicitly checks.

Rocketman, Spherachutes and Fruity Chutes feeds currently cover 103 distinct catalog IDs, using
explicit handles and variant IDs in `src/data/supplierMappings.json`. A product
or option identity change requires mapping review; price text embedded in an
option name is ignored for identity comparisons. Currency is read from the
supplier's cart endpoint, never guessed. Stock is reported as available,
unavailable or unknown, with the source URL and retrieval timestamp.

Unavailable suppliers retain their original data and timestamp. A refresh with
any missing mapping/fetch failure exits nonzero and records the failures; the
workflow preserves successful supplier updates and uploads its report. It does
not advance timestamps for failed products. Data older than 24 hours, or dated
more than five minutes in the future, is stale. Stale prices are displayed but
excluded from subtotal calculations. Currency subtotals remain separate; no
exchange rate is invented. Totals assume one item per selected slot and exclude
tax, shipping and extra hardware quantities. An incomplete subtotal is labeled.

Other manufacturers and unmatched variants show price/stock unknown and a
supplier link when one is known. They are not estimated or reported as in stock.
Remaining suppliers and ambiguous Fruity Chutes variants still need reviewed
source adapters and exact identity mappings before automatic coverage can be
claimed. The implementation does not scrape arbitrary supplier HTML.

## Engineering values

Commercial refreshes never update `parts.js`, custom parts, simulation identity,
or saved inputs. Engineering source records can be reviewed with:

```sh
npm run catalog:review -- source-records.json
```

Input is an array of `{ partId, category, url, accessed, specs }`; `accessed` is
`YYYY-MM-DD` and each `specs` field uses RecoverySys's existing field/unit name.
The tool produces old/proposed/source/date diffs only. It has no apply mode.
Human review, catalog versioning, source constraints and simulation currentness
rules in `catalog-sourcing-contract.md` still govern any engineering update.

## Coverage and candidate review packet (2026-10-19)

Run `npm run suppliers:coverage` for mapped and unknown IDs by manufacturer.
The current packet is under `validation/catalog-review/`. Fruity Chutes
engineering extraction stages only explicit weight, packed dimensions and single
Cd statements from a downloaded public product feed. Ranges are omitted. Every
record retains source URL, date, source-body SHA-256, source units and packing
assumptions. These are unaccepted proposals, not verified engineering values.

```sh
npm run catalog:stage:fruity -- downloaded-products.json > candidates.json
npm run catalog:review -- candidates.json
```

The 36-inch compact product has ambiguous variants and is deliberately unmapped.
Commercial snapshot coverage is 103 of 205 distinct IDs (225 category entries).
