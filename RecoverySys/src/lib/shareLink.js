// ── Share link encode / decode ──────────────────────────────────────────────
//
// URL-encoded config: btoa(encodeURIComponent(JSON.stringify(payload))). Only
// part IDs are serialized (not full objects) so URLs stay compact. Receiver
// re-hydrates parts by looking them up in its own catalog + custom parts list.

import { rehydrateCustomMotor } from './storage.js'

export const SHARE_PARAM = 'c'

// Serialize only { id } for each selected part — full objects bloat the URL.
export function encodeSharePayload({ config, specs, customMotor }) {
  const configIds = Object.fromEntries(
    Object.entries(config).map(([cat, part]) => [cat, part ? { id: part.id } : null])
  )
  const payload = { config: configIds, specs, customMotor }
  return btoa(encodeURIComponent(JSON.stringify(payload)))
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
export function decodeSharePayload(encoded, { allParts, slotIds, defaultSpecs, emptyConfig }) {
  try {
    const payload = JSON.parse(decodeURIComponent(atob(decodeURIComponent(encoded))))
    const validCategories = new Set(slotIds)
    const validSpecKeys = new Set(Object.keys(defaultSpecs))

    const newConfig = { ...emptyConfig }
    let catalogMissing = 0
    let customMissing = 0

    if (payload.config) {
      Object.entries(payload.config).forEach(([cat, part]) => {
        if (!validCategories.has(cat)) return
        if (part) {
          const found = allParts.find(p => p.id === part.id)
          if (found) newConfig[cat] = found
          else if (part.id?.startsWith('custom-')) customMissing++
          else catalogMissing++
        }
        // null part → slot stays null (no bleed-through from receiver's localStorage)
      })
    }

    const newSpecs = { ...defaultSpecs }
    if (payload.specs) {
      Object.entries(payload.specs).forEach(([key, value]) => {
        if (!validSpecKeys.has(key)) return
        newSpecs[key] = value
      })
    }

    return {
      config: newConfig,
      specs: newSpecs,
      customMotor: rehydrateCustomMotor(payload.customMotor),
      catalogMissing,
      customMissing,
    }
  } catch { return null }
}
