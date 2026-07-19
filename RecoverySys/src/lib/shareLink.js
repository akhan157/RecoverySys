// ── Share link encode / decode ──────────────────────────────────────────────
//
// URL-encoded config: btoa(encodeURIComponent(JSON.stringify(payload))). Only
// part IDs are serialized (not full objects) so URLs stay compact. Receiver
// re-hydrates parts by looking them up in its own catalog + custom parts list.

import { decodeShareEncoded, makeConfigPayload } from './payloadBoundary.js'

export const SHARE_PARAM = 'c'

// Serialize part references: catalog parts as { id }, custom parts as full objects.
export function encodeSharePayload({ config, specs, customMotor }) {
  const configIds = Object.fromEntries(
    Object.entries(config).map(([cat, part]) => {
      if (!part) return [cat, null]
      // Inline custom parts so recipients can rehydrate without sender's localStorage
      if (part.id?.startsWith('custom-')) return [cat, part]
      return [cat, { id: part.id }]
    })
  )
  return btoa(
    encodeURIComponent(JSON.stringify(makeConfigPayload({ config: configIds, specs, customMotor })))
  )
}

export function buildShareUrl(encoded) {
  return `${location.origin}${location.pathname}?${SHARE_PARAM}=${encodeURIComponent(encoded)}`
}

// Decode + validate a share link against known schema (slot IDs, spec keys).
// Returns { config, specs, customMotor, catalogMissing, customMissing } or null if malformed.
// - config: { [slotId]: part | null } — all slots present, unknown parts null
// - specs: merged over defaults, unknown keys dropped
// - catalogMissing: count of catalog parts no longer in the catalog
// - customMissing: count of custom parts (non-shareable — custom parts live in receiver's localStorage)
export function decodeSharePayload(encoded, { allParts, slotIds, emptyConfig }) {
  const decoded = decodeShareEncoded(encoded, { allParts, slotIds, emptyConfig })
  return decoded.ok ? decoded : null
}
