import {
  VERSION,
  SIMULATION_SCHEMA_VERSION,
  SIMULATION_MODEL_VERSION,
  SIMULATION_METHOD,
} from './constants.js'

function stable(value) {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(stable)
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((k) => [k, stable(value[k])])
  )
}

function hash(text) {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

export function canonicalSimulationInput({ specs = {}, config = {}, customMotor = null } = {}) {
  return JSON.stringify(stable({ specs, config, customMotor }))
}

export function simulationInputKey(input) {
  return `sim-${hash(canonicalSimulationInput(input))}`
}

export function simulationRevision(input) {
  return simulationInputKey(input)
}

export function captureSimulationProvenance(input, generatedAt = new Date().toISOString()) {
  return {
    inputKey: simulationInputKey(input),
    revision: simulationRevision(input),
    modelVersion: SIMULATION_MODEL_VERSION,
    schemaVersion: SIMULATION_SCHEMA_VERSION,
    appVersion: VERSION,
    method: SIMULATION_METHOD,
    generatedAt,
  }
}

export function isSimulationStale(simulation, input) {
  return (
    !!simulation &&
    (!simulation.provenance || simulation.provenance.inputKey !== simulationInputKey(input))
  )
}

export function simulationStatus(simulation, input) {
  if (!simulation) return { current: false, stale: false }
  const stale = isSimulationStale(simulation, input)
  return { current: !stale, stale }
}
