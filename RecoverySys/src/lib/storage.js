// ── LocalStorage persistence ────────────────────────────────────────────────
import { SCHEMA_VERSION } from './schema.js'
import { normalizeStoredPayload, normalizeCustomParts, normalizeCustomMotor, isValidCustomPart as isValidBoundaryPart } from './payloadBoundary.js'
import { PARTS, SLOT_IDS, EMPTY_CONFIG } from '../data/parts.js'
import { PAYLOAD_LIMITS } from './payloadBoundary.js'

export const STORAGE_KEYS = Object.freeze({ CONFIG: 'recoverysys-config', CUSTOM_PARTS: 'recoverysys-custom-parts', THEME: 'recoverysys-theme' })

export function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG)
    if (!raw) return null
    return normalizeStoredPayload(JSON.parse(raw), { allParts: PARTS, slotIds: SLOT_IDS, emptyConfig: EMPTY_CONFIG })
  } catch { return null }
}

export function isValidCustomPart(part) { return isValidBoundaryPart(part, new Set(SLOT_IDS)) }

export function loadCustomParts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_PARTS)
    return normalizeCustomParts(raw ? JSON.parse(raw) : [], SLOT_IDS)
  } catch { return [] }
}

export function canPersistCustomParts(customParts) {
  if (!Array.isArray(customParts) || customParts.length > PAYLOAD_LIMITS.customParts) return false
  try {
    return JSON.stringify(customParts).length <= PAYLOAD_LIMITS.customPartsJsonBytes
  } catch { return false }
}

export const rehydrateCustomMotor = normalizeCustomMotor

export function saveConfigToStorage({ config, specs, customMotor }) {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify({ schemaVersion: SCHEMA_VERSION, config, specs, customMotor }))
    return true
  } catch { return false }
}

export function saveCustomPartsToStorage(customParts) {
  if (!canPersistCustomParts(customParts)) return false
  try {
    const normalized = normalizeCustomParts(customParts, SLOT_IDS)
    const serialized = JSON.stringify(normalized)
    if (serialized.length > PAYLOAD_LIMITS.customPartsJsonBytes) return false
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PARTS, serialized)
    return true
  } catch { return false }
}

export function loadTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.THEME)
    if (stored === 'dark') return true
    if (stored === 'light') return false
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  } catch { return false }
}

export function saveTheme(darkMode) {
  try { localStorage.setItem(STORAGE_KEYS.THEME, darkMode ? 'dark' : 'light') } catch { /* storage unavailable */ }
}
