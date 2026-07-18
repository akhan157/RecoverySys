import { getDefaultSpecs, SPEC_KEYS, SCHEMA_VERSION, parseSpec } from './schema.js'
import { runMigrations, isPayloadFromFuture } from './migrations.js'

// Payloads can arrive from URLs, files, or browser storage. Keep the limits
// deliberately finite so decoding never becomes an unbounded allocation.
export const PAYLOAD_LIMITS = Object.freeze({
  encodedChars: 400_000,
  jsonBytes: 300_000,
  customPartsJsonBytes: 300_000,
  customParts: 200,
  customNameChars: 200,
  motorCurvePoints: 10_000,
})

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null

function byteLength(value) {
  return textEncoder ? textEncoder.encode(value).length : value.length * 2
}

function failure(code, message = code) {
  return { ok: false, error: { code, message } }
}

export function isValidCustomPart(part, slotIds = []) {
  return !!part && typeof part === 'object' && !Array.isArray(part) &&
    typeof part.id === 'string' && part.id.startsWith('custom-') && part.id.length <= 200 &&
    typeof part.name === 'string' && part.name.length > 0 && part.name.length <= PAYLOAD_LIMITS.customNameChars &&
    typeof part.category === 'string' && slotIds.includes(part.category) &&
    part.specs && typeof part.specs === 'object' && !Array.isArray(part.specs)
}

export function validateCustomMotor(motor) {
  if (!motor || typeof motor !== 'object' || Array.isArray(motor)) return null
  if (typeof motor.designation !== 'string' || motor.designation.length === 0 || motor.designation.length > 200) return null
  if (!Array.isArray(motor.curve) || motor.curve.length < 2 || motor.curve.length > PAYLOAD_LIMITS.motorCurvePoints) return null
  let previous = -Infinity
  for (const point of motor.curve) {
    if (!point || !Number.isFinite(point.t) || !Number.isFinite(point.thrust_N) || point.t <= previous || point.t < 0 || point.thrust_N < 0) return null
    previous = point.t
  }
  if (!Number.isFinite(motor.totalImpulse_ns) || motor.totalImpulse_ns <= 0) return null
  if (!Number.isFinite(motor.burnTime_s) || motor.burnTime_s <= 0) return null
  return motor
}

function decodeInput(input) {
  if (typeof input === 'object' && input !== null) return input
  if (typeof input !== 'string' || byteLength(input) > PAYLOAD_LIMITS.jsonBytes) return null
  try { return JSON.parse(input) } catch { return null }
}

function normalizeSpecs(rawSpecs) {
  const specs = getDefaultSpecs()
  if (rawSpecs == null) return specs
  if (typeof rawSpecs !== 'object' || Array.isArray(rawSpecs)) return null
  for (const [key, value] of Object.entries(rawSpecs)) {
    if (!SPEC_KEYS.has(key)) continue
    if (value === '' || value == null) { specs[key] = ''; continue }
    if (typeof value === 'boolean' || (typeof value !== 'string' && typeof value !== 'number')) return null
    const parsed = parseSpec(key, value)
    if (parsed == null) return null
    specs[key] = String(parsed)
  }
  return specs
}

function normalizeConfig(rawConfig, { allParts = [], slotIds = [], emptyConfig = {} }) {
  if (rawConfig == null) return { ...emptyConfig, catalogMissing: 0, customMissing: 0, inlinedCustomParts: [] }
  if (typeof rawConfig !== 'object' || Array.isArray(rawConfig)) return null
  const validCategories = slotIds.length > 0 ? new Set(slotIds) : null
  const config = { ...emptyConfig }
  let catalogMissing = 0
  let customMissing = 0
  const inlinedCustomParts = []
  for (const [category, part] of Object.entries(rawConfig)) {
    if (validCategories && !validCategories.has(category)) return null
    if (part == null) continue
    if (typeof part !== 'object' || Array.isArray(part) || typeof part.id !== 'string' || part.id.length === 0) return null
    if (part.category != null && part.category !== category) return null
    if (part.id.startsWith('custom-')) {
      if (isValidCustomPart(part, slotIds.length > 0 ? slotIds : [category]) && part.category === category) {
        config[category] = part
        if (!inlinedCustomParts.some(p => p.id === part.id)) inlinedCustomParts.push(part)
      } else customMissing++
    } else {
      const found = allParts.find(candidate => candidate.id === part.id && candidate.category === category)
      if (found) config[category] = found
      else catalogMissing++
    }
  }
  return { config, catalogMissing, customMissing, inlinedCustomParts }
}

/** The sole payload boundary: decode, migrate, validate, and normalize. */
export function decodeMigrateValidateNormalize(input, options = {}) {
  const raw = decodeInput(input)
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') return failure('malformed', 'Payload is not a JSON object')
  if (byteLength(JSON.stringify(raw)) > PAYLOAD_LIMITS.jsonBytes) return failure('oversized', 'Payload exceeds the supported size limit')
  if (isPayloadFromFuture(raw)) return failure('future-version', 'Payload was created by a newer RecoverySys version')
  const migrated = runMigrations(structuredClone(raw))
  if (!Number.isInteger(migrated.schemaVersion) || migrated.schemaVersion !== SCHEMA_VERSION) return failure('unsupported-version', 'Payload schema cannot be migrated')
  const normalizedConfig = normalizeConfig(migrated.config, options)
  if (!normalizedConfig) return failure('invalid-category-or-config', 'Payload contains an invalid category or part')
  const specs = normalizeSpecs(migrated.specs)
  if (!specs) return failure('invalid-specs', 'Payload contains invalid specification values')
  const customMotor = migrated.customMotor == null ? null : validateCustomMotor(migrated.customMotor)
  if (migrated.customMotor != null && !customMotor) return failure('invalid-motor', 'Payload contains an invalid custom motor')
  return { ok: true, schemaVersion: SCHEMA_VERSION, config: normalizedConfig.config, specs, customMotor, ...normalizedConfig }
}

export function decodeShareEncoded(encoded, options = {}) {
  if (typeof encoded !== 'string' || encoded.length > PAYLOAD_LIMITS.encodedChars) return failure('oversized', 'Share payload exceeds the supported size limit')
  try {
    return decodeMigrateValidateNormalize(JSON.parse(decodeURIComponent(atob(decodeURIComponent(encoded)))), options)
  } catch { return failure('malformed', 'Share payload is malformed') }
}

export function makeConfigPayload({ config, specs, customMotor }) {
  return { schemaVersion: SCHEMA_VERSION, config, specs, customMotor: customMotor ?? null }
}

export function encodeJsonPayload(state) {
  const config = Object.fromEntries(
    Object.entries(state.config ?? {}).map(([category, part]) => [category, part ? { id: part.id } : null]),
  )
  return JSON.stringify({ _format: 'recoverysys-config-v1', ...makeConfigPayload({ ...state, config }) }, null, 2)
}
