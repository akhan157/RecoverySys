import { captureSimulationProvenance } from './simulationIdentity.js'

export const FLIGHT_LOG_SCHEMA_VERSION = 2
export const FLIGHT_LOG_STORAGE_KEY = 'recoverysys-flight-log'
export const FLIGHT_RECORDS_EXPORT_VERSION = 1
export const CANDIDATE_EVIDENCE_EXPORT_VERSION = 1

const OBSERVATION_SOURCES = new Set(['manual', 'altimeter', 'tracker', 'video', 'other', 'unknown'])
const REVIEWER_STATUSES = new Set(['unreviewed', 'under-review', 'accepted', 'rejected'])
const DEFAULT_REVIEWER_STATUS = 'unreviewed'

// Canonical per-metric units shared by observations, predictions, and the
// transfer envelopes. Descent rates are ft/s everywhere the app presents a
// decision criterion (assessment.js, criteria.js); a legacy entry that
// predates explicit units is backfilled from this map so exported records
// never carry ambiguous or missing units.
const OBSERVATION_UNITS = Object.freeze({
  apogee_ft: 'ft',
  drift_ft: 'ft',
  drogue_fps: 'ft/s',
  main_fps: 'ft/s',
  landing_ke_ftlbf: 'ft-lbf',
})

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
  const units = {}
  for (const key of Object.keys(OBSERVATION_UNITS)) {
    units[key] = typeof entry.units?.[key] === 'string' ? entry.units[key] : OBSERVATION_UNITS[key]
  }
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
    units,
    conditions: typeof entry.conditions === 'string' ? entry.conditions : '',
    reviewerStatus: REVIEWER_STATUSES.has(entry.reviewerStatus)
      ? entry.reviewerStatus
      : DEFAULT_REVIEWER_STATUS,
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
    conditions: typeof form.conditions === 'string' ? form.conditions : '',
    reviewerStatus: DEFAULT_REVIEWER_STATUS,
  })
  return migrated
}

/**
 * Immutable prediction identity for a flight entry: the input key stamped
 * into the simulation provenance snapshot at record time. It is always
 * derived from the carried provenance, never accepted from the wire.
 */
export function predictionIdentity(entry) {
  return entry?.simulationProvenance?.inputKey ?? null
}

/**
 * Candidate-evidence transfer envelope. Distinct from plain observation
 * records: every entry carries source, canonical units, conditions,
 * reviewer status, and the immutable prediction identity derived from its
 * simulation provenance snapshot. Entries without a prediction identity
 * are excluded — an observation with no traceable prediction cannot be
 * candidate evidence.
 */
export function exportCandidateEvidence(entries) {
  const records = entries
    .map((entry) => {
      const migrated = migrateFlightEntry(entry)
      if (!migrated) return null
      return { ...migrated, predictionIdentity: predictionIdentity(migrated) }
    })
    .filter((record) => record != null && record.predictionIdentity != null)
  return JSON.stringify({
    type: 'recoverysys-candidate-evidence',
    exportVersion: CANDIDATE_EVIDENCE_EXPORT_VERSION,
    entries: records,
  })
}

/**
 * Candidate-evidence intake. Validates the envelope, migrates each entry,
 * and re-derives the prediction identity from the carried provenance so a
 * transferred claim can never re-identify a prediction it does not contain.
 * Entries that cannot be tied to a prediction snapshot are dropped.
 */
export function importCandidateEvidence(text) {
  let payload
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error('Invalid candidate evidence JSON')
  }
  if (
    payload?.type !== 'recoverysys-candidate-evidence' ||
    payload.exportVersion !== CANDIDATE_EVIDENCE_EXPORT_VERSION ||
    !Array.isArray(payload.entries)
  ) {
    throw new Error('Unsupported candidate evidence format')
  }
  return payload.entries
    .map((entry) => {
      const migrated = migrateFlightEntry(entry)
      if (!migrated) return null
      const identity = predictionIdentity(migrated)
      return identity == null ? null : { ...migrated, predictionIdentity: identity }
    })
    .filter(Boolean)
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
