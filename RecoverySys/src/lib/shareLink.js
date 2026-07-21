import { normalizePayload, isValidCustomPart } from './payloadBoundary.js'
import { SCHEMA_VERSION } from './schema.js'

export const SHARE_PARAM = 'c'

export function encodeSharePayload({ config, specs, customMotor }) {
  const configIds = Object.fromEntries(
    Object.entries(config).map(([cat, part]) => [
      cat,
      part ? (part.id?.startsWith('custom-') ? part : { id: part.id }) : null,
    ])
  )
  return btoa(
    encodeURIComponent(
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, config: configIds, specs, customMotor })
    )
  )
}

export function buildShareUrl(encoded) {
  return `${location.origin}${location.pathname}?${SHARE_PARAM}=${encodeURIComponent(encoded)}`
}

export function decodeSharePayload(encoded, options) {
  try {
    if (typeof encoded !== 'string' || encoded.length > 700000) return null
    const decoded = decodeURIComponent(atob(decodeURIComponent(encoded)))
    if (decoded.length > 512 * 1024) return null
    return normalizePayload(JSON.parse(decoded), options)
  } catch {
    return null
  }
}

export { isValidCustomPart }
