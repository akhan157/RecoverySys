import { runSimulation } from './simulation.js'
import { evaluateMissionEnvelope, ENVELOPE_STATUS } from './missionEnvelope.js'
import { CRITERIA_POLICY_VERSION, CRITERION_IDS, evaluateCriterion } from './criteria.js'
import {
  SIMULATION_ASSUMPTIONS_VERSION,
  SIMULATION_MODEL_ID,
  SIMULATION_MODEL_VERSION,
} from './constants.js'

const SENSITIVITY_ANALYSIS_VERSION = 'sensitivity-one-at-a-time-v3'
const RANGE_BASIS_VERSION = 'sensitivity-range-v1'

// Per-output model response covers every descent/landing output the simulation
// exposes that carries a registered decision criterion. `drogue_fps` is only
// a real response when a drogue canopy is configured; without one the
// simulation substitutes a constant fallback, so it is withheld rather than
// presented as tested response.
const OUTPUT_KEYS = Object.freeze([
  'apogee_ft',
  'drift_ft',
  'drogue_fps',
  'main_fps',
  'landing_ke_ftlbf',
])

const OUTPUT_LABELS = Object.freeze({
  apogee_ft: 'Apogee altitude',
  drift_ft: 'Landing drift',
  drogue_fps: 'Drogue descent rate',
  main_fps: 'Main descent rate',
  landing_ke_ftlbf: 'Landing kinetic energy',
})

const outputKeysFor = (config) =>
  config?.drogue_chute ? OUTPUT_KEYS : OUTPUT_KEYS.filter((key) => key !== 'drogue_fps')

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

function outputFor(result, outputKeys) {
  if (!result) return null
  return Object.fromEntries(outputKeys.map((key) => [key, result[key]]))
}

function range(values) {
  const numbers = values.filter((value) => Number.isFinite(value))
  if (!numbers.length) return null
  return { min: Math.min(...numbers), max: Math.max(...numbers) }
}

function outputDeltas(output, baselineOutput, outputKeys) {
  if (!output || !baselineOutput) return null
  return outputKeys.reduce((deltas, key) => {
    const value = numeric(output[key])
    const baseline = numeric(baselineOutput[key])
    deltas[key] = value == null || baseline == null ? null : value - baseline
    return deltas
  }, {})
}

const CRITERION_BY_OUTPUT = Object.freeze({
  main_fps: CRITERION_IDS.MAIN_DESCENT_RATE,
  landing_ke_ftlbf: CRITERION_IDS.LANDING_ENERGY,
  drogue_fps: CRITERION_IDS.DROGUE_DESCENT_RATE,
})

/**
 * Report only defensible criterion crossings: a tested variant whose canonical
 * criterion classification differs from the baseline classification, for an
 * output that actually carries a registered decision criterion. Each crossing
 * names the driver, output, criterion version, and both classifications so
 * consuming surfaces never have to reinterpret raw deltas.
 */
function criterionCrossingsFor({
  outputKey,
  driverKey,
  driverLabel,
  baselineOutput,
  variants,
}) {
  const criterionId = CRITERION_BY_OUTPUT[outputKey]
  if (!criterionId) return []
  const baseline = evaluateCriterion(criterionId, baselineOutput?.[outputKey])
  if (!baseline.evaluated) return []
  return variants.flatMap((variant) => {
    if (!variant.usable || !variant.output) return []
    const evaluated = evaluateCriterion(criterionId, variant.output[outputKey])
    if (!evaluated.evaluated || evaluated.category === baseline.category) return []
    return [
      {
        output: outputKey,
        outputLabel: OUTPUT_LABELS[outputKey] ?? outputKey,
        unit: baseline.unit,
        criterionId,
        criterionVersion: baseline.policyVersion,
        driverKey,
        driverLabel,
        variantLabel: variant.label,
        baseline: {
          value: baseline.value,
          category: baseline.category,
          severity: baseline.severity,
        },
        variant: {
          value: evaluated.value,
          category: evaluated.category,
          severity: evaluated.severity,
        },
      },
    ]
  })
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

function buildRow(definition, specs, config, customMotor, baseResult, outputKeys) {
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

  const baselineOutput = outputFor(baseResult, outputKeys)
  const variants = definition.deltas.map((delta) => {
    const value = variantValue(base, delta, definition.key)
    const variantSpecs = copySpecs(specs, definition.key, value)
    const envelope = evaluateMissionEnvelope({ specs: variantSpecs, config, customMotor })
    const result = runSimulation({ specs: variantSpecs, config, customMotor })
    const output = outputFor(result, outputKeys)
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
      deltas: outputDeltas(output, baselineOutput, outputKeys),
    }
  })

  const usableVariants = variants.filter(({ usable }) => usable)
  const unusableVariants = variants.filter(({ usable }) => !usable)
  const outputs = usableVariants.map(({ output }) => output).filter(Boolean)
  const ranges = outputKeys.reduce((result, key) => {
    result[key] = range(outputs.map((output) => output[key]))
    return result
  }, {})
  const deltas = outputKeys.reduce((result, key) => {
    result[key] = range(
      usableVariants.map((variant) => variant.deltas?.[key]).filter((value) => value != null)
    )
    return result
  }, {})

  const criterionCrossings = outputKeys.flatMap((outputKey) =>
    criterionCrossingsFor({
      outputKey,
      driverKey: definition.key,
      driverLabel: definition.label,
      baselineOutput,
      variants,
    })
  )

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
    criterionCrossings,
  }
}

function buildWindRow(specs, config, customMotor, baseResult, outputKeys) {
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
    baseResult,
    outputKeys
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

  const outputKeys = outputKeysFor(config)
  const baseOutput = outputFor(baseResult, outputKeys)
  const envelope = baselineEnvelope(specs, config, customMotor)
  const rows = [
    ...VARIATIONS.map((definition) =>
      buildRow(definition, specs, config, customMotor, baseResult, outputKeys)
    ),
    buildWindRow(specs, config, customMotor, baseResult, outputKeys),
  ]

  const criterionCrossings = rows.flatMap((row) => row.criterionCrossings ?? [])

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
      criteriaVersion: CRITERIA_POLICY_VERSION,
    },
    rows,
    criterionCrossings,
    method:
      'Deterministic one-at-a-time variations; ranges are model response, not probability or confidence intervals.',
  }
}
