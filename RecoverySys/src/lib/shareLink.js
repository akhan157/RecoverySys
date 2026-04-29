// ── Share link encode / decode ──────────────────────────────────────────────
//
// URL-encoded config: btoa(encodeURIComponent(JSON.stringify(payload))). Only
// part IDs are serialized (not full objects) so URLs stay compact. Receiver
// re-hydrates parts by looking them up in its own catalog + custom parts list.

import { rehydrateCustomMotor } from './storage.js'

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
    const inlinedCustomParts = []

    const isValidCustom = (p) =>
      p && typeof p.id === 'string' && typeof p.name === 'string' && p.name.length <= 200 &&
      typeof p.category === 'string' && p.specs !== null && typeof p.specs === 'object'

    if (payload.config) {
      Object.entries(payload.config).forEach(([cat, part]) => {
        if (!validCategories.has(cat)) return
        if (part) {
          if (part.id?.startsWith('custom-') && isValidCustom(part)) {
            // Full custom part inlined in the share link — use directly
            newConfig[cat] = part
            if (!inlinedCustomParts.find(p => p.id === part.id)) {
              inlinedCustomParts.push(part)
            }
          } else {
            const found = allParts.find(p => p.id === part.id && p.category === cat)
            if (found) newConfig[cat] = found
            else if (part.id?.startsWith('custom-')) customMissing++
            else catalogMissing++
          }
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
      inlinedCustomParts,
    }
  } catch { return null }
}
