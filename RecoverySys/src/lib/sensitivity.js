import { runSimulation } from './simulation.js'
import { evaluateMissionEnvelope } from './missionEnvelope.js'

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

function buildRow(definition, specs, config, customMotor, baseResult) {
  const base = numeric(specs[definition.key])
  if (base == null || base <= 0) {
    return {
      ...definition,
      status: 'unavailable',
      reason: `Enter ${definition.label.toLowerCase()} to test this variation.`,
      variants: [],
      ranges: null,
    }
  }

  const variants = definition.deltas.map((delta) => {
    const value = variantValue(base, delta, definition.key)
    const variantSpecs = copySpecs(specs, definition.key, value)
    const envelope = evaluateMissionEnvelope({ specs: variantSpecs, config, customMotor })
    const result = runSimulation({ specs: variantSpecs, config, customMotor })
    return {
      label:
        delta === 0
          ? 'Base'
          : `${delta > 0 ? '+' : ''}${definition.key === 'main_deploy_alt_ft' ? delta : Math.round(delta * 100) + '%'}`,
      value,
      valid: Boolean(result),
      envelopeStatus: envelope.status,
      envelopeReasons: envelope.reasons.map(({ code, message }) => ({ code, message })),
      output: outputFor(result),
    }
  })

  const outputs = variants.map(({ output }) => output).filter(Boolean)
  return {
    ...definition,
    status: variants.every(({ valid }) => valid) ? 'tested' : 'partially-tested',
    reason: variants.some(({ valid }) => !valid)
      ? 'One or more variants could not produce a result at this deployment relationship.'
      : null,
    variants,
    ranges: {
      apogee_ft: range(outputs.map((output) => output.apogee_ft)),
      drift_ft: range(outputs.map((output) => output.drift_ft)),
      main_fps: range(outputs.map((output) => output.main_fps)),
      landing_ke_ftlbf: range(outputs.map((output) => output.landing_ke_ftlbf)),
    },
    baseOutput: outputFor(baseResult),
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
      ranges: null,
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

export function runSensitivity({ specs = {}, config = {}, customMotor = null } = {}) {
  const baseResult = runSimulation({ specs, config, customMotor })
  if (!baseResult) {
    return {
      status: 'unavailable',
      reason: 'Run a valid base simulation before testing sensitivity.',
      rows: [],
    }
  }

  const rows = [
    ...VARIATIONS.map((definition) => buildRow(definition, specs, config, customMotor, baseResult)),
    buildWindRow(specs, config, customMotor, baseResult),
  ]
  const testedRows = rows.filter((row) => row.status !== 'unavailable')
  const influence = testedRows
    .map((row) => {
      const apogee = row.ranges?.apogee_ft
      const drift = row.ranges?.drift_ft
      const landing = row.ranges?.landing_ke_ftlbf
      const spread = [apogee, drift, landing]
        .filter(Boolean)
        .reduce((total, current) => total + current.max - current.min, 0)
      return { key: row.key, label: row.label, spread }
    })
    .sort((a, b) => b.spread - a.spread)

  return {
    status: 'complete',
    baseOutput: outputFor(baseResult),
    rows,
    influentialInputs: influence,
    method: 'Deterministic one-at-a-time variations; no random sampling or confidence interval.',
  }
}
