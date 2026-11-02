import {
  VERSION,
  SIMULATION_MODEL_ID,
  SIMULATION_MODEL_VERSION,
  SIMULATION_ASSUMPTIONS_VERSION,
  SIMULATION_SCHEMA_VERSION,
  SIMULATION_METHOD,
} from './constants.js'
import { captureSimulationProvenance, isSimulationStale } from './simulationIdentity.js'
import { buildResultAssessments } from './assessment.js'

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
    .join(',')}}`
}

export function fingerprintInputs({ specs, config, customMotor }) {
  return stable({ specs, config, customMotor: customMotor ?? null })
}

export function buildResultEnvelope(result, inputs, inputRevision) {
  if (!result) return null
  const envelope = {
    ...result,
    assessments: buildResultAssessments(result, {
      fresh: true,
    }),
    provenance: {
      inputFingerprint: fingerprintInputs(inputs),
      inputRevision,
      ...captureSimulationProvenance(inputs),
    },
  }
  // The scalar result keeps unrounded phase rates on a non-enumerable field so
  // drift consumers can avoid re-deriving from presentation-rounded values.
  // Object spread drops non-enumerable properties, so carry it explicitly.
  for (const key of ['_driftSimulation', '_criteriaInputs']) {
    if (!result[key]) continue
    Object.defineProperty(envelope, key, {
      value: result[key],
      enumerable: false,
    })
  }
  return envelope
}

export function isResultFresh(result, inputs, inputRevision) {
  if (result?.provenance?.inputKey) return !isSimulationStale(result, inputs)
  return Boolean(
    result?.provenance &&
    result.provenance.inputRevision === inputRevision &&
    result.provenance.inputFingerprint === fingerprintInputs(inputs) &&
    result.provenance.modelId === SIMULATION_MODEL_ID &&
    result.provenance.modelVersion === SIMULATION_MODEL_VERSION &&
    result.provenance.assumptionsVersion === SIMULATION_ASSUMPTIONS_VERSION &&
    result.provenance.schemaVersion === SIMULATION_SCHEMA_VERSION &&
    result.provenance.appVersion === VERSION &&
    result.provenance.method === SIMULATION_METHOD
  )
}

export function resultView(result, inputs, inputRevision) {
  return result
    ? { result, fresh: isResultFresh(result, inputs, inputRevision) }
    : { result: null, fresh: false }
}
