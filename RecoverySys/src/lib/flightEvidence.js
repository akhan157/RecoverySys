import { captureSimulationProvenance } from './simulationIdentity.js'

export const FLIGHT_LOG_SCHEMA_VERSION = 2
export const FLIGHT_LOG_STORAGE_KEY = 'recoverysys-flight-log'
export const FLIGHT_RECORDS_EXPORT_VERSION = 1

const OBSERVATION_SOURCES = new Set(['manual', 'altimeter', 'tracker', 'video', 'other', 'unknown'])

function copy(value) {
  if (value == null) return value
  return JSON.parse(JSON.stringify(value))
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  Object.values(value).forEach(freeze)
  return value
}

function listMissing(entry) {
  return ['actual_apogee_ft', 'actual_main_fps', 'actual_landing_lat', 'actual_landing_lon'].filter(
    (key) => entry[key] === '' || entry[key] == null
  )
}

export function migrateFlightEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const entry = { ...raw }
  const source = entry.observationProvenance?.source
  const instrumentation = entry.instrumentation ?? { devices: [], notes: '' }
  const missingData = Array.isArray(entry.missingData) ? [...entry.missingData] : listMissing(entry)
  return freeze({
    ...entry,
    schemaVersion: FLIGHT_LOG_SCHEMA_VERSION,
    id: entry.id ?? `flight-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    predicted: entry.predicted ? copy(entry.predicted) : null,
    specs_snapshot: copy(entry.specs_snapshot ?? {}),
    simulationProvenance: copy(entry.simulationProvenance ?? null),
    observationProvenance: {
      source: OBSERVATION_SOURCES.has(source) ? source : 'unknown',
      recordedAt: entry.observationProvenance?.recordedAt ?? entry.createdAt ?? null,
      method: entry.observationProvenance?.method ?? 'manual-entry',
    },
    instrumentation: copy(instrumentation),
    missingData,
    corpusEvidence: false,
  })
}

export function loadFlightLog(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(FLIGHT_LOG_STORAGE_KEY) || '[]')
    return (Array.isArray(parsed) ? parsed : parsed?.entries || [])
      .map(migrateFlightEntry)
      .filter(Boolean)
  } catch {
    return []
  }
}

export function saveFlightLog(entries, storage = globalThis.localStorage) {
  try {
    storage?.setItem(FLIGHT_LOG_STORAGE_KEY, JSON.stringify(entries.map(migrateFlightEntry)))
    return true
  } catch {
    return false
  }
}

export function createFlightEntry(
  form,
  { simulation = null, specs = {}, resultFresh = false } = {}
) {
  const now = new Date().toISOString()
  const migrated = migrateFlightEntry({
    ...form,
    id: `flight-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: now,
    predicted: resultFresh && simulation ? copy(simulation) : null,
    simulationProvenance:
      resultFresh && simulation
        ? copy(simulation.provenance ?? captureSimulationProvenance({ specs, config: {} }))
        : null,
    specs_snapshot: copy(specs),
    observationProvenance: {
      source: OBSERVATION_SOURCES.has(form.observation_source)
        ? form.observation_source
        : 'unknown',
      recordedAt: now,
      method: 'manual-entry',
    },
    instrumentation: {
      devices: form.instrumentation || [],
      notes: form.instrumentation_notes || '',
    },
    missingData: form.missing_data?.length ? form.missing_data : undefined,
  })
  return migrated
}

export function exportFlightRecords(entries) {
  const records = entries.map(migrateFlightEntry).filter(Boolean)
  return JSON.stringify({
    type: 'recoverysys-flight-records',
    exportVersion: FLIGHT_RECORDS_EXPORT_VERSION,
    entries: records,
  })
}

export function importFlightRecords(text) {
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error('Invalid flight records JSON')
  }
  if (
    payload?.type !== 'recoverysys-flight-records' ||
    payload.exportVersion !== FLIGHT_RECORDS_EXPORT_VERSION ||
    !Array.isArray(payload.entries)
  ) {
    throw new Error('Unsupported flight records format')
  }
  return payload.entries.map(migrateFlightEntry).filter(Boolean)
}
