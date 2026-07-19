// ── LocalStorage persistence ────────────────────────────────────────────────
//
// Isolated from App.jsx so the reducer layer stays pure and the storage keys
// live in one place. All functions swallow errors — localStorage can be
// unavailable (Safari private mode, storage full, corrupt JSON) and the app
// must still boot with sane defaults.

import { PARTS, SLOT_IDS, EMPTY_CONFIG } from '../data/parts.js'
import {
  decodeMigrateValidateNormalize,
  makeConfigPayload,
  PAYLOAD_LIMITS,
  isValidCustomPart as isValidBoundaryCustomPart,
  validateCustomMotor,
} from './payloadBoundary.js'

export const STORAGE_KEYS = Object.freeze({
  CONFIG: 'recoverysys-config',
  CUSTOM_PARTS: 'recoverysys-custom-parts',
  THEME: 'recoverysys-theme',
})

export function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG)
    if (!raw) return null
    const custom = loadCustomParts()
    const decoded = decodeMigrateValidateNormalize(raw, {
      allParts: [...custom, ...PARTS],
      slotIds: SLOT_IDS,
      emptyConfig: EMPTY_CONFIG,
    })
    return decoded.ok ? decoded : null
  } catch {
    return null
  }
}

// Single validator for custom parts shape. Used by both loadCustomParts
// (this file) and decodeSharePayload (shareLink.js) — Pass 2 found the rule
// was duplicated with subtly different limits between the two paths. Now
// one definition. Cap on name length defends against DoS via crafted
// payloads from either source.
export function isValidCustomPart(p) {
  return isValidBoundaryCustomPart(p, p?.category ? [p.category] : [])
}

export function loadCustomParts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_PARTS)
    if (!raw) return []
    if (serializedByteLength(raw) > PAYLOAD_LIMITS.customPartsJsonBytes) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length > PAYLOAD_LIMITS.customParts) return []
    return parsed.filter(isValidCustomPart)
  } catch {
    return []
  }
}

function serializedByteLength(value) {
  return typeof TextEncoder !== 'undefined'
    ? new TextEncoder().encode(value).length
    : value.length * 2
}

export function canPersistCustomParts(customParts) {
  try {
    if (!Array.isArray(customParts) || customParts.length > PAYLOAD_LIMITS.customParts) return false
    return serializedByteLength(JSON.stringify(customParts)) <= PAYLOAD_LIMITS.customPartsJsonBytes
  } catch {
    return false
  }
}

// Defensive shape-check for customMotor loaded from localStorage or a share link.
// Returns null if the payload is missing required fields or malformed.
export function rehydrateCustomMotor(m) {
  return validateCustomMotor(m)
}

// Persist the full config payload. Returns true if written, false if storage failed.
// schemaVersion is stamped so future schema changes can run migrations on load.
export function saveConfigToStorage({ config, specs, customMotor }) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.CONFIG,
      JSON.stringify(makeConfigPayload({ config, specs, customMotor }))
    )
    return true
  } catch {
    return false
  }
}

export function saveCustomPartsToStorage(customParts) {
  try {
    if (!canPersistCustomParts(customParts)) return false
    const serialized = JSON.stringify(customParts)
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PARTS, serialized)
    return true
  } catch {
    return false
  }
}

export function loadTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME)
    if (stored === 'dark') return true
    if (stored === 'light') return false
    // No explicit preference — respect OS setting
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  } catch {
    return false
  }
}

export function saveTheme(darkMode) {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, darkMode ? 'dark' : 'light')
  } catch {
    /* storage unavailable */
  }
}
