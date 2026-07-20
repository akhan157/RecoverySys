import { getDefaultSpecs, SPEC_KEYS, parseSpec, SCHEMA_VERSION } from './schema.js'
import { runMigrations, isPayloadFromFuture } from './migrations.js'

export const MAX_PAYLOAD_BYTES = 512 * 1024
export const MAX_CUSTOM_PARTS = 500
export const MAX_CUSTOM_MOTOR_POINTS = 10000
export const MAX_STRING_LENGTH = 200

export function isValidCustomPart(part, validCategories) {
  return !!part && typeof part === 'object' && !Array.isArray(part) &&
    typeof part.id === 'string' && part.id.length > 0 && part.id.length <= MAX_STRING_LENGTH &&
    typeof part.name === 'string' && part.name.length > 0 && part.name.length <= MAX_STRING_LENGTH &&
    typeof part.category === 'string' && (!validCategories || validCategories.has(part.category)) &&
    part.specs !== null && typeof part.specs === 'object' && !Array.isArray(part.specs)
}

export function normalizeSpecs(raw) {
  const specs = getDefaultSpecs()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return specs
  for (const [key, value] of Object.entries(raw)) {
    if (!SPEC_KEYS.has(key)) continue
    if (typeof value !== 'string' && typeof value !== 'number') throw new Error(`invalid spec: ${key}`)
    if (value !== '' && parseSpec(key, value) == null) throw new Error(`invalid spec: ${key}`)
    specs[key] = value
  }
  return specs
}

export function normalizeCustomMotor(motor) {
  if (motor == null) return null
  if (!motor || typeof motor !== 'object' || Array.isArray(motor) ||
      typeof motor.designation !== 'string' || motor.designation.length === 0 ||
      motor.designation.length > MAX_STRING_LENGTH || !Array.isArray(motor.curve) ||
      motor.curve.length < 2 || motor.curve.length > MAX_CUSTOM_MOTOR_POINTS) return null
  if (!motor.curve.every((p, i) => p && Number.isFinite(p.t) && p.t >= 0 &&
      Number.isFinite(p.thrust_N) && p.thrust_N >= 0 && (i === 0 || p.t > motor.curve[i - 1].t))) return null
  if (!Number.isFinite(motor.totalImpulse_ns) || motor.totalImpulse_ns <= 0 ||
      !Number.isFinite(motor.burnTime_s) || motor.burnTime_s <= 0) return null
  return motor
}

function decodeAndMigrate(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('payload object required')
  if (JSON.stringify(raw).length > MAX_PAYLOAD_BYTES) throw new Error('payload too large')
  if (isPayloadFromFuture(raw)) throw new Error('future schema')
  return runMigrations(raw)
}

export function normalizePayload(raw, options = {}) {
  const { allParts = [], slotIds = [], emptyConfig = {} } = options
  const payload = decodeAndMigrate(raw)
  if (!payload.config || typeof payload.config !== 'object' || Array.isArray(payload.config)) throw new Error('invalid config')
  const validCategories = new Set(slotIds)
  const config = { ...emptyConfig }
  const diagnostics = { catalogMissing: 0, customMissing: 0, invalidParts: 0, inlinedCustomParts: [] }
  for (const [slot, ref] of Object.entries(payload.config)) {
    if (!validCategories.has(slot)) throw new Error('invalid config category')
    if (ref == null) continue
    if (typeof ref !== 'object' || typeof ref.id !== 'string' || (ref.category && ref.category !== slot)) throw new Error('invalid part reference')
    if (ref.id.startsWith('custom-')) {
      if (!isValidCustomPart(ref, validCategories) || ref.category !== slot) throw new Error('invalid custom part')
      config[slot] = ref
      if (!diagnostics.inlinedCustomParts.some(p => p.id === ref.id)) diagnostics.inlinedCustomParts.push(ref)
    } else {
      const found = allParts.find(p => p.id === ref.id && p.category === slot)
      if (found) config[slot] = found
      else diagnostics.catalogMissing++
    }
  }
  const customMotor = normalizeCustomMotor(payload.customMotor)
  if (payload.customMotor != null && !customMotor) throw new Error('invalid motor')
  return { config, specs: normalizeSpecs(payload.specs), customMotor, ...diagnostics }
}

export function normalizeCustomParts(raw, slotIds = []) {
  if (!Array.isArray(raw) || raw.length > MAX_CUSTOM_PARTS) return []
  const categories = new Set(slotIds)
  return raw.filter(part => isValidCustomPart(part, categories))
}

export function normalizeStoredPayload(raw, options) {
  try { return normalizePayload(raw, options) } catch { return null }
}

export function encodePayload(payload) {
  return btoa(encodeURIComponent(JSON.stringify({ schemaVersion: SCHEMA_VERSION, ...payload })))
}
