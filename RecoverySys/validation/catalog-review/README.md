# Engineering source review — 2026-11-05

Production catalog: 225 parts. Engineering values remain unchanged by this
packet. Commercial offers remain a separate price/stock refresh.

The historical `fruity-2026-10-19.json` contains 37 category-specific candidate
records and 35 field differences. `primary-pages-2026-11-05.json` rechecks three
manufacturer product pages (six category records) and its companion diff
contains fourteen proposed changes. These are source observations, not accepted
engineering changes. In particular the catalog `ifc-030-sl` / manufacturer
`IFC-30-SUL` variant mapping still needs a reviewer decision.

Sources inspected 2026-11-05:

- [CFC 30 nylon](https://shop.fruitychutes.com/products/30-elliptical-parachute-3-3lb-20fps): 87.9 g; nominal tight pack 2.6 in diameter by 3.0 in length. The stated Cd range is retained as a range in the review note, never silently reduced to one constant.
- [Iris 30 ultralight](https://shop.fruitychutes.com/products/iris-30-ultra-light-parachute-2-6lbs-15fps): 38 g; nominal pack 1.5 in by 4.2 in; published Cd 2.2. Packing density differs with deployment bag versus traditional folding.

- [Rocketman High Performance CD 2.2](https://www.the-rocketman.com/products/rocketman-high-performance-cd-2-2-parachutes): 24 and 36 in standard-nylon variants expose weight and packed dimensions materially different from similarly named catalog records. These may be variant mismatches, so all six field proposals remain pending identity review. The 36 in descent table and rating also disagree (7.4 versus 7 lb at 20 ft/s); neither rating is adopted.

The bulk feed `https://shop.fruitychutes.com/products.json?limit=250` returned
HTTP 429 on 2026-11-05. No complete refresh or new raw-source hash is claimed.
The page-text observations above have no raw HTML archive hash. Historical
hashes remain attached to their historical captures only.

Regenerate the proposed changes:

```bash
node scripts/review-catalog.mjs validation/catalog-review/primary-pages-2026-11-05.json
```

Remaining work: exact variant identity, field-by-field acceptance/rejection,
reviewer identity/date, a permitted retrievable source snapshot/hash, then
explicit catalog edits with prior values retained. Review the other historical
candidate records and the remaining manufacturers independently. Unknown
strength, working-load/breaking-load convention, packed dimensions and supplier
values remain unknown. No canopy shroud-line rating is a rating for the whole
recovery chain. Nominal dimensions do not establish physical fit.
