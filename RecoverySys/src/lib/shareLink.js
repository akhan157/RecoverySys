import { normalizePayload, isValidCustomPart, SHARE_LINK_LIMITS } from './payloadBoundary.js'
import { makeConfigPayload } from './payloadBoundary.js'

export const SHARE_PARAM = 'c'

// Pre-decode guardrails shared with the payload boundary. The authoritative
// size gate is PAYLOAD_LIMITS.jsonBytes inside normalizePayload; these bounds
// only cap the decoding work done before that gate runs and must stay above
// the worst-case encoding of a legal payload (see payloadBoundary.js).
const MAX_SHARE_ENCODED_CHARS = SHARE_LINK_LIMITS.encodedChars
const MAX_SHARE_DECODED_CHARS = SHARE_LINK_LIMITS.decodedChars

export function encodeSharePayload(state) {
  return btoa(encodeURIComponent(JSON.stringify(makeConfigPayload(state))))
}

export function buildShareUrl(encoded) {
  return `${location.origin}${location.pathname}?${SHARE_PARAM}=${encodeURIComponent(encoded)}`
}

export function decodeSharePayload(encoded, options) {
  try {
    if (typeof encoded !== 'string' || encoded.length > MAX_SHARE_ENCODED_CHARS) return null
    const decoded = decodeURIComponent(atob(decodeURIComponent(encoded)))
    if (decoded.length > MAX_SHARE_DECODED_CHARS) return null
    return normalizePayload(JSON.parse(decoded), options)
  } catch {
    return null
  }
}

export { isValidCustomPart }
