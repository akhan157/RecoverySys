import { runSimulation } from './simulation.js'
import { evaluateMissionEnvelope, ENVELOPE_STATUS } from './missionEnvelope.js'
import {
  SIMULATION_ASSUMPTIONS_VERSION,
  SIMULATION_MODEL_ID,
  SIMULATION_MODEL_VERSION,
} from './constants.js'

const SENSITIVITY_ANALYSIS_VERSION = 'sensitivity-one-at-a-time-v2'
const RANGE_BASIS_VERSION = 'sensitivity-range-v1'
const OUTPUT_KEYS = Object.freeze(['apogee_ft', 'drift_ft', 'main_fps', 'landing_ke_ftlbf'])

const VARIATIONS = [
  {
    key: 'rocket_mass_g',
    label: 'Rocket mass',
    unit: 'g',
    deltas: [-0.1, 0, 0.1],
    description: 'Loaded mass varied ±10%.',
  },
  {
    key: 'drag_cd',
    label: 'Drag coefficient',
    unit: '',
    deltas: [-0.2, 0, 0.2],
    description: 'Drag coefficient varied ±20%.',
  },
  {
    key: 'main_deploy_alt_ft',
    label: 'Main deployment altitude',
    unit: 'ft',
    deltas: [-200, 0, 200],
    description: 'Main deployment altitude varied ±200 ft.',
  },
]

function numeric(value) {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function variantValue(base, delta, key) {
  if (key === 'main_deploy_alt_ft') return Math.max(0, base + delta)
  return Math.max(Number.EPSILON, base * (1 + delta))
}

function copySpecs(specs, key, value) {
  return { ...specs, [key]: String(value) }
}

function outputFor(result) {
  if (!result) return null
  return {
    apogee_ft: result.apogee_ft,
    drift_ft: result.drift_ft,
    main_fps: result.main_fps,
    landing_ke_ftlbf: result.landing_ke_ftlbf,
  }
}

function range(values) {
  const numbers = values.filter((value) => Number.isFinite(value))
  if (!numbers.length) return null
  return { min: Math.min(...numbers), max: Math.max(...numbers) }
}

function outputDeltas(output, baselineOutput) {
  if (!output || !baselineOutput) return null
  return OUTPUT_KEYS.reduce((deltas, key) => {
    const value = numeric(output[key])
    const baseline = numeric(baselineOutput[key])
    deltas[key] = value == null || baseline == null ? null : value - baseline
    return deltas
  }, {})
}

function envelopeFor(envelope) {
  return {
    status: envelope.status,
    assumptionsVersion: envelope.assumptionsVersion,
    reasons: envelope.reasons.map(({ code, message, remediation, path }) => ({
      code,
      message,
      remediation,
      path,
    })),
  }
}

function variantStatus(result, envelope) {
  if (!result) return 'unusable'
  return envelope.status
}

function variantReason(result, envelope) {
  if (!result) return 'Simulation did not produce a valid result for this variant.'
  if (envelope.status === ENVELOPE_STATUS.OUT_OF_SCOPE) {
    return 'Variant is outside the declared mission envelope.'
  }
  return null
}

function isUsableVariant(result, envelope) {
  return Boolean(result) && envelope.status !== ENVELOPE_STATUS.OUT_OF_SCOPE
}

function buildRow(definition, specs, config, customMotor, baseResult) {
  const base = numeric(specs[definition.key])
  if (base == null || base <= 0) {
    return {
      ...definition,
      status: 'unavailable',
      reason: `Enter ${definition.label.toLowerCase()} to test this variation.`,
      variants: [],
      usableVariants: [],
      unusableVariants: [],
      ranges: null,
      deltas: null,
      criterionCrossings: [],
    }
  }

  const baselineOutput = outputFor(baseResult)
  const variants = definition.deltas.map((delta) => {
    const value = variantValue(base, delta, definition.key)
    const variantSpecs = copySpecs(specs, definition.key, value)
    const envelope = evaluateMissionEnvelope({ specs: variantSpecs, config, customMotor })
    const result = runSimulation({ specs: variantSpecs, config, customMotor })
    const output = outputFor(result)
    const usable = isUsableVariant(result, envelope)
    return {
      label:
        delta === 0
          ? 'Base'
          : `${delta > 0 ? '+' : ''}${definition.key === 'main_deploy_alt_ft' ? delta : Math.round(delta * 100) + '%'}`,
      value,
      valid: Boolean(result),
      usable,
      status: variantStatus(result, envelope),
      reason: variantReason(result, envelope),
      envelope: envelopeFor(envelope),
      envelopeStatus: envelope.status,
      envelopeReasons: envelope.reasons.map(({ code, message }) => ({ code, message })),
      output,
      deltas: outputDeltas(output, baselineOutput),
    }
  })

  const usableVariants = variants.filter(({ usable }) => usable)
  const unusableVariants = variants.filter(({ usable }) => !usable)
  const outputs = usableVariants.map(({ output }) => output).filter(Boolean)
  const ranges = OUTPUT_KEYS.reduce((result, key) => {
    result[key] = range(outputs.map((output) => output[key]))
    return result
  }, {})
  const deltas = OUTPUT_KEYS.reduce((result, key) => {
    result[key] = range(
      usableVariants.map((variant) => variant.deltas?.[key]).filter((value) => value != null)
    )
    return result
  }, {})

  return {
    ...definition,
    status: unusableVariants.length > 0 ? 'partially-tested' : 'tested',
    reason: unusableVariants.length
      ? 'One or more variants are unusable or outside the declared mission envelope.'
      : null,
    variants,
    usableVariants,
    unusableVariants,
    ranges,
    deltas,
    baseOutput: baselineOutput,
    criterionCrossings: [],
  }
}

function buildWindRow(specs, config, customMotor, baseResult) {
  const base = numeric(specs.wind_speed_mph)
  if (base == null || base <= 0) {
    return {
      key: 'wind_speed_mph',
      label: 'Surface wind speed',
      unit: 'mph',
      description: 'Not tested because no positive surface wind speed is entered.',
      status: 'unavailable',
      reason: 'Enter a positive surface wind speed to test this variation.',
      variants: [],
      usableVariants: [],
      unusableVariants: [],
      ranges: null,
      deltas: null,
      criterionCrossings: [],
    }
  }
  return buildRow(
    {
      key: 'wind_speed_mph',
      label: 'Surface wind speed',
      unit: 'mph',
      deltas: [-0.25, 0, 0.25],
      description: 'Surface wind speed varied ±25%; direction is held constant.',
    },
    specs,
    config,
    customMotor,
    baseResult
  )
}

function baselineEnvelope(specs, config, customMotor) {
  return envelopeFor(evaluateMissionEnvelope({ specs, config, customMotor }))
}

export function runSensitivity({ specs = {}, config = {}, customMotor = null } = {}) {
  const baseResult = runSimulation({ specs, config, customMotor })
  if (!baseResult) {
    return {
      status: 'unavailable',
      reason: 'Run a valid base simulation before testing sensitivity.',
      rows: [],
      criterionCrossings: [],
    }
  }

  const baseOutput = outputFor(baseResult)
  const envelope = baselineEnvelope(specs, config, customMotor)
  const rows = [
    ...VARIATIONS.map((definition) => buildRow(definition, specs, config, customMotor, baseResult)),
    buildWindRow(specs, config, customMotor, baseResult),
  ]

  return {
    status: 'complete',
    baseline: {
      identity: {
        modelId: SIMULATION_MODEL_ID,
        modelVersion: SIMULATION_MODEL_VERSION,
        assumptionsVersion: SIMULATION_ASSUMPTIONS_VERSION,
        envelopeAssumptionsVersion: envelope.assumptionsVersion,
        sensitivityVersion: SENSITIVITY_ANALYSIS_VERSION,
      },
      output: baseOutput,
      envelope,
    },
    baseOutput,
    scenario: {
      method: 'one-at-a-time',
      rangeBasisVersion: RANGE_BASIS_VERSION,
      criteriaVersion: null,
    },
    rows,
    criterionCrossings: [],
    method:
      'Deterministic one-at-a-time variations; ranges are model response, not probability or confidence intervals.',
  }
}
