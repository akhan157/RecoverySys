export const CATALOG_PROVENANCE_VERSION = 'catalog-provenance-v1'

// Contract vocabulary for provenance records (see docs/catalog-sourcing-contract.md).
// `verified` additionally requires reviewedBy and reviewedAt on the record.
export const PROVENANCE_STATUSES = Object.freeze(['verified', 'unverified'])
export const SOURCE_TYPES = Object.freeze([
  'catalog-import',
  'manufacturer-spec',
  'field-measurement',
  'unknown',
])

const URL_PATTERN = /^https?:\/\/\S+$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const source = (title, url = null, status = 'unverified') => ({
  title,
  url,
  status,
  accessed: null,
  sourceType: 'catalog-import',
})

// This registry records where a catalog family entered RecoverySys. It does not
// assert that values are current manufacturer specifications. Individual parts
// remain unverified until their source and access date are reviewed.
export const MANUFACTURER_PROVENANCE = Object.freeze({
  'b2 Rocketry Company': source('OpenRocket component database', null),
  'Front Range Rocket Recovery': source('OpenRocket component database', null),
  'Fruity Chutes': source('OpenRocket component database', null),
  Rocketman: source('OpenRocket component database', null),
  Spherachutes: source('OpenRocket component database', null),
  'Top Flight Recovery': source('OpenRocket component database', null),
  'Jolly Logic': source('OpenRocket component database', null),
  Perfectflite: source('OpenRocket component database', null),
  Generic: source('RecoverySys generic placeholder data', null),
})

export function provenanceForPart(part) {
  const provenance = MANUFACTURER_PROVENANCE[part?.manufacturer]
  return provenance ? { ...provenance } : null
}

/**
 * Validates the provenance registry shape: title presence, http(s) URL or
 * null, status vocabulary, ISO access date or null, source-type vocabulary,
 * and the review metadata that a `verified` record must carry.
 *
 * Returns actionable diagnostics keyed by manufacturer so a bad record can be
 * fixed without a catalog-wide search. This validates the contract, not
 * manufacturer accuracy: a well-formed `unverified` record is still
 * unverified.
 */
export function validateCatalogProvenance(registry = MANUFACTURER_PROVENANCE) {
  const diagnostics = []
  for (const [manufacturer, record] of Object.entries(registry ?? {})) {
    if (!record || typeof record !== 'object') {
      diagnostics.push(`manufacturer ${manufacturer}: provenance record must be an object`)
      continue
    }
    if (typeof record.title !== 'string' || record.title.trim() === '')
      diagnostics.push(`manufacturer ${manufacturer}: title must be a non-empty string`)
    if (record.url != null && !URL_PATTERN.test(record.url))
      diagnostics.push(`manufacturer ${manufacturer}: url must be an http(s) URL or null`)
    if (!PROVENANCE_STATUSES.includes(record.status))
      diagnostics.push(
        `manufacturer ${manufacturer}: status must be one of ${PROVENANCE_STATUSES.join(', ')}`
      )
    if (record.accessed != null && !ISO_DATE_PATTERN.test(record.accessed))
      diagnostics.push(
        `manufacturer ${manufacturer}: accessed must be an ISO date (YYYY-MM-DD) or null`
      )
    if (!SOURCE_TYPES.includes(record.sourceType))
      diagnostics.push(
        `manufacturer ${manufacturer}: sourceType must be one of ${SOURCE_TYPES.join(', ')}`
      )
    if (record.status === 'verified') {
      if (typeof record.reviewedBy !== 'string' || record.reviewedBy.trim() === '')
        diagnostics.push(`manufacturer ${manufacturer}: verified status requires reviewedBy`)
      if (typeof record.reviewedAt !== 'string' || !ISO_DATE_PATTERN.test(record.reviewedAt))
        diagnostics.push(
          `manufacturer ${manufacturer}: verified status requires reviewedAt ISO date`
        )
    }
  }
  return { valid: diagnostics.length === 0, diagnostics }
}
