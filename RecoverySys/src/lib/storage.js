// ── LocalStorage persistence ────────────────────────────────────────────────
//
// Isolated from App.jsx so the reducer layer stays pure and the storage keys
// live in one place. All functions swallow errors — localStorage can be
// unavailable (Safari private mode, storage full, corrupt JSON) and the app
// must still boot with sane defaults.

import { SCHEMA_VERSION } from './schema.js'
import { runMigrations } from './migrations.js'

export const STORAGE_KEYS = Object.freeze({
  CONFIG: 'recoverysys-config',
  CUSTOM_PARTS: 'recoverysys-custom-parts',
  THEME: 'recoverysys-theme',
})

export function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG)
    if (!raw) return null
    return runMigrations(JSON.parse(raw))
  } catch { return null }
}

export function loadCustomParts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_PARTS)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Reject any entry missing the minimum shape required by PartsBrowser + rehydrate.
    // Also require specs to be a non-null object — partSpecLine accesses spec fields
    // directly and will throw if specs is undefined/null (e.g. manual edits).
    return parsed.filter(p =>
      p &&
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      typeof p.category === 'string' &&
      p.specs !== null &&
      typeof p.specs === 'object'
    )
  } catch { return [] }
}

// Defensive shape-check for customMotor loaded from localStorage or a share link.
// Returns null if the payload is missing required fields or malformed.
export function rehydrateCustomMotor(m) {
  if (!m || typeof m !== 'object') return null
  if (typeof m.designation !== 'string' || m.designation.length === 0) return null
  if (!Array.isArray(m.curve) || m.curve.length < 2) return null
  for (const p of m.curve) {
    if (!p || typeof p.t !== 'number' || typeof p.thrust_N !== 'number') return null
    if (!isFinite(p.t) || !isFinite(p.thrust_N)) return null
  }
  if (!isFinite(m.totalImpulse_ns) || m.totalImpulse_ns <= 0) return null
  if (!isFinite(m.burnTime_s) || m.burnTime_s <= 0) return null
  return m
}

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
