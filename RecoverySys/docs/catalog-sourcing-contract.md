# Catalog sourcing contract

**Status:** M1 provenance contract (definition). No automated sourcing is
implemented; this document defines the metadata shape and review rules that
any future automated catalog sourcing must satisfy before it may update
`src/data/parts.js`.

**Owners:** `src/data/catalogProvenance.js` (registry and shape validator),
`scripts/validate-parts.js` (gate), `scripts/report-catalog-provenance.js`
(report).

## Purpose

RecoverySys ships a 225-part static catalog whose values feed compatibility,
packing, and load-screening conclusions. A provenance record must answer, for
every catalog family: where the data entered the product, when, with what
status, and — if it is claimed verified — who reviewed it and when.

Schema validity is not manufacturer accuracy. A well-formed `unverified`
record remains unverified; nothing in this contract turns a valid record into
an approval.

## Record shape

One record per manufacturer in `MANUFACTURER_PROVENANCE`:

| Field | Type | Rule |
|---|---|---|
| `title` | string | Required, non-empty. Human-readable source description. |
| `url` | string \| null | If present, must be an `http(s)` URL. |
| `status` | string | `verified` or `unverified`. |
| `accessed` | string \| null | If present, ISO date `YYYY-MM-DD` when the source was consulted. |
| `sourceType` | string | `catalog-import`, `manufacturer-spec`, `field-measurement`, or `unknown`. |
| `reviewedBy` | string | Required when `status` is `verified`. Reviewer identity. |
| `reviewedAt` | string | Required when `status` is `verified`. ISO date `YYYY-MM-DD`. |

The vocabulary and rules above are enforced by
`validateCatalogProvenance()` in `src/data/catalogProvenance.js`, which runs
as part of `npm run validate:parts`. Diagnostics name the manufacturer so a
bad record is actionable without a catalog-wide search.

## Status lifecycle

- `unverified` — default for all current records. Values were imported, not
  confirmed against a current primary source.
- `verified` — a named reviewer confirmed the record against the cited source
  on `reviewedAt`. Requires `reviewedBy` and `reviewedAt`; both are checked by
  the validator. Verification is per-record and does not cascade to other
  records or imply current manufacturer approval.
- A source that was verified but has since changed must be re-reviewed and
  re-dated; stale `accessed`/`reviewedAt` dates are a reason to downgrade back
  to `unverified`.

## Rules for automated sourcing (future work)

Automated sourcing is deferred until this contract and the M6 privacy,
security, and release gates are satisfied. When it is built, it must:

1. **Stage as catalog review tooling first:** review source records, view
   stale or missing provenance, and compare catalog values against source
   records before any write path exists.
2. **Dry-run with field-level diffs:** every proposed change is presented as a
   per-field diff (old value, new value, source URL, fetch date) with no
   silent overwrite of catalog data.
3. **Require human approval:** no catalog update is applied without an
   explicit review action; review decisions are recorded.
4. **Obey source constraints:** respect rate limits, terms, and access
   controls; store `url` and `accessed` per fetched record.
5. **Track version history:** each applied update records what changed, from
   which source, when, and who approved it.
6. **Never imply endorsement:** sourced values do not imply manufacturer
   endorsement, accuracy, availability, or flight suitability, and no UI text
   may suggest otherwise.
7. **Keep custom parts separate:** user-supplied parts remain labeled
   user-supplied and never inherit manufacturer provenance.

## Non-goals

- This contract does not certify any part, approve any launch, or replace
  manufacturer instructions, engineering analysis, or field procedures.
- It does not license automated scraping; compliance with source terms and
  law is the responsibility of any future implementation.
