// ── LocalStorage persistence ────────────────────────────────────────────────
import { SCHEMA_VERSION, SPEC_KEYS, getDefaultSpecs, parseSpec } from './schema.js'
import { runMigrations } from './migrations.js'
import {
  normalizeStoredPayload,
  normalizeImportedSource,
  normalizeCustomParts,
  normalizeCustomMotor,
  isValidCustomPart as isValidBoundaryPart,
  utf8ByteLength,
} from './payloadBoundary.js'
import { PARTS, SLOT_IDS, EMPTY_CONFIG } from '../data/parts.js'
import { PAYLOAD_LIMITS } from './payloadBoundary.js'

export const STORAGE_KEYS = Object.freeze({
  CONFIG: 'recoverysys-config',
  CUSTOM_PARTS: 'recoverysys-custom-parts',
  THEME: 'recoverysys-theme',
})

/**
 * Coerce persisted/user-entered spec strings into a boundary-valid shape.
 *
 * Inputs can temporarily hold `0` or another value that a consumer's
 * `parseSpec` rejects (for example while replacing a field). The strict
 * payload boundary rejects the whole plan in that case, so storage sanitizes
 * invalid individual fields to blank on write and on read. One bad field must
 * never discard the rest of the saved plan.
 */
function sanitizeSpecs(specs) {
  const out = getDefaultSpecs()
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return out
  for (const [key, value] of Object.entries(specs)) {
    if (!SPEC_KEYS.has(key)) continue
    if (value === '' || value == null) {
      out[key] = ''
      continue
    }
    if (typeof value !== 'string' && typeof value !== 'number') continue
    const parsed = parseSpec(key, value)
    out[key] = parsed == null ? '' : String(parsed)
  }
  return out
}

export function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG)
    if (!raw || utf8ByteLength(raw) > PAYLOAD_LIMITS.jsonBytes) return null
    const migrated = runMigrations(structuredClone(JSON.parse(raw)))
    if (!migrated || typeof migrated !== 'object' || Array.isArray(migrated)) return null
    return normalizeStoredPayload(
      {
        ...migrated,
        specs: sanitizeSpecs(migrated.specs),
        customMotor: normalizeCustomMotor(migrated.customMotor),
      },
      {
        allParts: PARTS,
        slotIds: SLOT_IDS,
        emptyConfig: EMPTY_CONFIG,
      }
    )
  } catch {
    return null
  }
}

export function isValidCustomPart(part) {
  return isValidBoundaryPart(part, new Set(SLOT_IDS))
}

/**
 * Read the custom-parts store without collapsing an unreadable value into an
 * empty list. `ok:false` means the caller must not overwrite the stored bytes;
 * otherwise a corrupt/oversized store would be destroyed on the next write.
 */
export function readCustomParts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_PARTS)
    if (!raw) return { ok: true, parts: [] }
    if (utf8ByteLength(raw) > PAYLOAD_LIMITS.customPartsJsonBytes) return { ok: false, parts: [] }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return { ok: false, parts: [] }
    const parts = normalizeCustomParts(parsed, SLOT_IDS)
    return { ok: parts.length === parsed.length, parts }
  } catch {
    return { ok: false, parts: [] }
  }
}

export function loadCustomParts() {
  return readCustomParts().parts
}

export function canPersistCustomParts(customParts) {
  if (!Array.isArray(customParts) || customParts.length > PAYLOAD_LIMITS.customParts) return false
  try {
    return utf8ByteLength(JSON.stringify(customParts)) <= PAYLOAD_LIMITS.customPartsJsonBytes
  } catch {
    return false
  }
}

export const rehydrateCustomMotor = normalizeCustomMotor

export function saveConfigToStorage({ config, specs, customMotor, importedSource }) {
  try {
    const serialized = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      config,
      specs: sanitizeSpecs(specs),
      // An invalid motor must not poison the rest of the saved plan.
      customMotor: normalizeCustomMotor(customMotor),
      importedSource: normalizeImportedSource(importedSource),
    })
    // Refuse to write a payload our own loader would reject as oversized.
    if (utf8ByteLength(serialized) > PAYLOAD_LIMITS.jsonBytes) return false
    localStorage.setItem(STORAGE_KEYS.CONFIG, serialized)
    return true
  } catch {
    return false
  }
}

export function saveCustomPartsToStorage(customParts) {
  if (!canPersistCustomParts(customParts)) return false
  try {
    const normalized = normalizeCustomParts(customParts, SLOT_IDS)
    // A write that would silently drop entries is a failure, not a success.
    if (normalized.length !== customParts.length) return false
    const serialized = JSON.stringify(normalized)
    if (utf8ByteLength(serialized) > PAYLOAD_LIMITS.customPartsJsonBytes) return false
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
