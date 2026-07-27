// ── LocalStorage persistence ────────────────────────────────────────────────
//
// Isolated from App.jsx so the reducer layer stays pure and the storage keys
// live in one place. All functions swallow errors — localStorage can be
// unavailable (Safari private mode, storage full, corrupt JSON) and the app
// must still boot with sane defaults.

import { SCHEMA_VERSION } from './schema.js'
import { normalizeStoredPayload, normalizeCustomParts, normalizeCustomMotor, isValidCustomPart as isValidBoundaryPart } from './payloadBoundary.js'
import { SLOT_IDS, EMPTY_CONFIG } from '../data/parts.js'

export const STORAGE_KEYS = Object.freeze({
  CONFIG: 'recoverysys-config',
  CUSTOM_PARTS: 'recoverysys-custom-parts',
  THEME: 'recoverysys-theme',
})

export function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return normalizeStoredPayload(parsed, { allParts: [], slotIds: SLOT_IDS, emptyConfig: EMPTY_CONFIG, preserveCatalogRefs: true })
  } catch { return null }
}

// Single validator for custom parts shape. Used by both loadCustomParts
// (this file) and decodeSharePayload (shareLink.js) — Pass 2 found the rule
// was duplicated with subtly different limits between the two paths. Now
// one definition. Cap on name length defends against DoS via crafted
// payloads from either source.
const MAX_CUSTOM_NAME_LEN = 200

export function isValidCustomPart(p) {
  return isValidBoundaryPart(p)
}

export function loadCustomParts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_PARTS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return normalizeCustomParts(parsed, SLOT_IDS)
  } catch { return [] }
}

// Defensive shape-check for customMotor loaded from localStorage or a share link.
// Returns null if the payload is missing required fields or malformed.
export const rehydrateCustomMotor = normalizeCustomMotor

// Persist the full config payload. Returns true if written, false if storage failed.
// schemaVersion is stamped so future schema changes can run migrations on load.
export function saveConfigToStorage({ config, specs, customMotor }) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.CONFIG,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION, config, specs, customMotor }),
    )
    return true
  } catch { return false }
}

export function saveCustomPartsToStorage(customParts) {
  try { localStorage.setItem(STORAGE_KEYS.CUSTOM_PARTS, JSON.stringify(customParts)) }
  catch { /* storage unavailable */ }
}

export function loadTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME)
    if (stored === 'dark') return true
    if (stored === 'light') return false
    // No explicit preference — respect OS setting
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  } catch { return false }
}

export function saveTheme(darkMode) {
  try { localStorage.setItem(STORAGE_KEYS.THEME, darkMode ? 'dark' : 'light') }
  catch { /* storage unavailable */ }
}
