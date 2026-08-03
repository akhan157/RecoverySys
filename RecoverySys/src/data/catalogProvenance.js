export const CATALOG_PROVENANCE_VERSION = 'catalog-provenance-v1'

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
