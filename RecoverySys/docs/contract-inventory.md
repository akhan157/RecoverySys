# RecoverySys stored and transferred contract inventory

**Status:** Maintained — M0 reconciliation (2026-08-13)
**Scope:** every shape that is persisted locally or transferred across a
boundary (URL, file, print, or storage), with its owner, version identity,
migration rule, and limits. This inventory is the executable reference for
V2-00 "create a contract inventory" and M0 "inventory stored and transferred
contracts". When a contract changes, update this file, the owning module, the
migration chain, and round-trip tests in the same change.

## Runtime identities

Single source: `src/lib/constants.js` (app/simulation) and `src/lib/schema.js`
(payload), `src/lib/recoveryBrief.js` (brief), `src/lib/criteria.js`
(criteria), `validation/manifest.json` (corpus).

| Identity | Value | Owner |
|---|---|---|
| App release | `1.2.0.1` | `src/lib/constants.js`, `package.json` |
| Payload schema | `1` (`SCHEMA_VERSION`) | `src/lib/schema.js` |
| Simulation schema | `1` (`SIMULATION_SCHEMA_VERSION`) | `src/lib/constants.js` |
| Simulation model | `browser-js-recovery` / `isa-apogee-descent-v1` | `src/lib/constants.js` |
| Simulation assumptions | `recovery-assumptions-v1` | `src/lib/constants.js` |
| Simulation method | `deterministic-physics` | `src/lib/constants.js` |
| Recovery Brief | `recovery-brief-v1` | `src/lib/recoveryBrief.js` |
| Criteria policy | `recovery-criteria-v1` | `src/lib/criteria.js` |
| Validation corpus | `0.2.0` | `validation/manifest.json` |
| Confidence rules | *(no exported version — open gate)* | `src/lib/confidence.js` |

The manifest and checked-in corpus cases record the same browser model,
model version, and assumptions version as the runtime. A model, assumptions,
schema, catalog, or app change must bump the relevant identity so stale
results are detected (`src/lib/simulationIdentity.js`,
`src/lib/resultIntegrity.js`).

## Payload boundary and size limits

Owner: `src/lib/payloadBoundary.js`. All payloads that cross a boundary
(storage, share URL, JSON file) pass through the same decode → migrate →
validate → normalize pipeline (`decodeMigrateValidateNormalize`), which is the
sole authority on shape and size.

| Limit | Value | Applies to |
|---|---|---|
| `jsonBytes` | 300 000 | decoded config payload (UTF-8) |
| `customPartsJsonBytes` | 300 000 | custom-parts array (UTF-8) |
| `customParts` | 200 | custom parts per user catalog |
| `customNameChars` | 200 | custom part name |
| `motorCurvePoints` | 10 000 | custom motor `.eng` curve points |
| `encodedChars` (share) | 1 200 000 | share-link pre-decode guardrail |
| `decodedChars` (share) | 524 288 (`512 × 1024` UTF-16 units) | share-link pre-decode guardrail |

The share-link guardrails (`SHARE_LINK_LIMITS`) only cap decoding work before
the canonical `jsonBytes` gate runs; they are derived so a payload at the
`jsonBytes` limit is never rejected by a pre-check (worst case:
300 000 bytes × 3 percent-escape × 4/3 base64 = 1 200 000 characters).

## LocalStorage contracts

| Key | Shape | Owner | Version | Migration rule |
|---|---|---|---|---|
| `recoverysys-config` | `{ schemaVersion, config, specs, customMotor }` | `src/lib/storage.js` → `payloadBoundary.js` | `SCHEMA_VERSION` (`1`) | `runMigrations` walks the v0→v1 chain on load; future versions rejected with a specific message |
| `recoverysys-custom-parts` | array of custom part objects | `src/lib/storage.js` | unversioned array; validated by `isValidCustomPart` + `SLOT_IDS` | invalid entries filtered; oversized/too many rejected (`canPersistCustomParts`) |
| `recoverysys-theme` | `'dark' \| 'light'` | `src/lib/storage.js`, `src/hooks/useDarkMode.js` | unversioned scalar | unknown values fall back to `prefers-color-scheme` |
| `recoverysys-flight-log` | array of flight entries | `src/lib/flightEvidence.js` | `FLIGHT_LOG_SCHEMA_VERSION` (`2`) | `migrateFlightEntry` upgrades each entry on load/save; entries are frozen |

Migration chain (`src/lib/migrations.js`) is forward-only and idempotent:
v0 (unversioned historical payloads) → v1 rewrites `airframe_od_in` →
`airframe_id_in` and stamps `schemaVersion`. Missing version is treated as v0;
`isPayloadFromFuture` rejects payloads newer than this build.

## Share-link contract (`?c=`)

Owner: `src/lib/shareLink.js`, `src/hooks/useShareLinkLoader.js`,
`src/lib/payloadBoundary.js`.

- Encoded shape: `{ schemaVersion, config, specs, customMotor }`, where config
  entries are `null`, `{ id }` for catalog parts, or the full object for
  `custom-` prefixed parts.
- Wire format: `btoa(encodeURIComponent(JSON.stringify(payload)))`, placed in
  `?c=` after one more `encodeURIComponent` (`buildShareUrl`).
- Decode path: length guardrails (`SHARE_LINK_LIMITS`) → base64/percent
  decode → `normalizePayload` (canonical `jsonBytes` gate, migration,
  future-version rejection, spec/config normalization).
- Rejection behavior: malformed/unsafe/future/oversized payloads → `null` →
  error toast; catalog parts no longer in the catalog → warning toast with
  count; inlined custom parts merge into the local catalog once, skipping
  existing ids.
- Limits: pre-decode `encodedChars` 1 200 000 / `decodedChars` 512 KiB;
  authoritative `jsonBytes` 300 000.

## JSON export/import contract

Owner: `src/lib/payloadBoundary.js` (`encodeJsonPayload`),
`src/components/tabs/ExportTab.jsx`.

- Export: `{ _format: 'recoverysys-config-v1', schemaVersion, config, specs,
  customMotor }`, pretty-printed; filename `recoverysys-config-YYYY-MM-DD.json`.
- Import: `_format` must equal `recoverysys-config-v1`; size checked against
  `PAYLOAD_LIMITS.jsonBytes` with a user-visible message; payload then runs
  the same decode → migrate → validate → normalize pipeline as storage and
  share links.
- Imported sessions disable auto-persist until the explicit Save button is
  clicked so a fresh import cannot silently overwrite the saved local session
  (`src/hooks/usePersistence.js`).

## Simulation result envelope

Owner: `src/lib/resultIntegrity.js`, `src/lib/simulationIdentity.js`,
`src/lib/assessment.js`.

- `buildResultEnvelope(result, inputs, inputRevision)` wraps the simulation
  result with `assessments` and `provenance`.
- Provenance fields: `inputFingerprint` (canonical sorted JSON of inputs),
  `inputRevision`/`inputKey` (`sim-<fvn-1a hash>`), `modelId`,
  `modelVersion`, `assumptionsVersion`, `schemaVersion`, `appVersion`,
  `method`, `generatedAt`.
- Freshness: `isResultFresh` / `isSimulationStale` compare every identity
  field plus the input key/fingerprint against the current authority. A
  result with missing provenance is stale. Stale/missing results are unusable
  for conclusions, comparisons, briefs, and flight-log predictions.
- Result `schemaVersion` is carried inside provenance; there is no separate
  persisted result envelope format (results are recomputed or stored inside
  flight records as immutable snapshots).

## Recovery Brief view model

Owner: `src/lib/recoveryBrief.js`, `src/components/tabs/RecoveryBriefTab.jsx`.

- `buildRecoveryBrief` returns `recovery-brief-v1`-shaped data: status
  (`not-run`/`current`/`stale`), envelope results, evidence coverage
  (deliberately E0 review-only for the current corpus), confidence state with
  reason codes, selected hardware, unresolved checks, and generated-at
  identity.
- Screen surface (`RecoveryBriefTab.jsx`) renders the brief; print surface
  (`src/components/PrintChecklist.jsx`) renders separate artifacts.

## Print artifacts

Owner: `src/components/PrintChecklist.jsx`, `src/components/MissionControlLayout.jsx`.

- `printMode` is `'brief'` or `'checklist'`; each mode exposes only its
  `print-artifact--brief` / `print-artifact--checklist` sections in print
  media (qualified by Playwright print-media E2E and
  `PrintChecklist.brief.test.jsx`).
- Stale estimates are withheld from print; brief/checklist agree on identity,
  status, and unresolved checks. Full screen/export/import/share and Flight
  Log parity remains an open M4 gate.

## Flight records

Owner: `src/lib/flightEvidence.js`, `src/components/tabs/FlightLogTab.jsx`.

- Stored under `recoverysys-flight-log` as an array of frozen entries:
  `schemaVersion` (2), `id`, `createdAt`, `predicted` (immutable simulation
  snapshot, only when fresh), `simulationProvenance`, `specs_snapshot`,
  `observationProvenance` (source, recordedAt, method), `instrumentation`,
  `missingData`, `corpusEvidence: false`.
- JSON transfer: `{ type: 'recoverysys-flight-records', exportVersion: 1,
  entries }`; import validates type, export version, and array shape before
  migrating each entry. Flight records are observations, never accepted
  corpus evidence (`corpusEvidence` is forced false).

## Validation corpus

Owner: `validation/manifest.json`, `validation/corpus/*.json`,
`scripts/validate-corpus.js`.

- Manifest `corpusVersion` `0.2.0`; 14 review-only cases (no accepted
  comparison or real-flight cases). Each case records model identity,
  assumptions version, units, decision rule, and tolerance basis.
- `validate:corpus` (part of `npm run check`) validates schema, unique ids,
  manifest references, model identity, and non-finite outputs; only accepted
  cases gate numerical agreement.

## Catalog

Owner: `src/data/parts.js` (225 parts), `parts-schema.json`,
`scripts/validate-parts.js`, `src/data/catalogProvenance.js`.

- Built-in parts are static JS; custom parts are user-supplied and labeled as
  such in the UI. Catalog provenance is manufacturer-level and unverified for
  individual parts; unverified data cannot yield `Supported` confidence.
- `validate:parts` runs in `npm run check`.

## Dependency audit

Dependency audit findings are tracked separately from feature work in
`docs/session-reconciliation.md`; no broad automatic upgrades are applied
inside feature work.
