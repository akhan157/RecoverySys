import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv/dist/2020.js'
import {
  SIMULATION_ASSUMPTIONS_VERSION,
  SIMULATION_MODEL_ID,
  SIMULATION_MODEL_VERSION,
} from '../src/lib/constants.js'
import {
  airDensity,
  computeDescentRate,
  computeDrift,
  computeShockLoad,
  runSimulation,
} from '../src/lib/simulation.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS_DIR = path.join(ROOT, 'validation', 'corpus')
const MANIFEST_PATH = path.join(ROOT, 'validation', 'manifest.json')
const SCHEMA_PATH = path.join(CORPUS_DIR, 'schema.json')
const STATUS_ORDER = ['draft', 'review', 'accepted-for-comparison', 'superseded', 'rejected']

function reportDomainCoverage(cases) {
  const byDomain = new Map()

  for (const { testCase } of cases) {
    const entry = byDomain.get(testCase.domain) ?? {
      domain: testCase.domain,
      caseIds: [],
      outputMetrics: new Set(),
      statusCounts: Object.fromEntries(STATUS_ORDER.map((status) => [status, 0])),
      acceptedCaseIds: [],
      unreviewedCaseIds: [],
    }
    entry.caseIds.push(testCase.id)
    for (const metric of testCase.expected.metrics) entry.outputMetrics.add(metric.name)
    entry.statusCounts[testCase.status] += 1
    if (testCase.status === 'accepted-for-comparison') entry.acceptedCaseIds.push(testCase.id)
    if (testCase.status === 'draft' || testCase.status === 'review')
      entry.unreviewedCaseIds.push(testCase.id)
    byDomain.set(testCase.domain, entry)
  }

  return [...byDomain.values()]
    .sort((left, right) => left.domain.localeCompare(right.domain))
    .map(
      ({ domain, caseIds, outputMetrics, statusCounts, acceptedCaseIds, unreviewedCaseIds }) => ({
        domain,
        caseCount: caseIds.length,
        caseIds: caseIds.sort(),
        outputMetrics: [...outputMetrics].sort(),
        statusCounts,
        acceptedCaseIds: acceptedCaseIds.sort(),
        unreviewedCaseIds: unreviewedCaseIds.sort(),
      })
    )
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const compare = (actual, expected, tolerance) => {
  const difference = Math.abs(actual - expected)
  const absolutePass = tolerance.absolute == null || difference <= tolerance.absolute
  const relativePass =
    tolerance.relative == null || difference <= Math.abs(expected || 1) * tolerance.relative
  return { difference, pass: absolutePass && relativePass }
}

const evaluators = Object.freeze({
  'isa-density-sea-level': (inputs) => ({ density_kg_m3: airDensity(inputs.altitude_m) }),
  'isa-density-5000m': (inputs) => ({ density_kg_m3: airDensity(inputs.altitude_m) }),
  'terminal-descent-36in-main-sea-level': (inputs) => ({
    descent_rate_fps: computeDescentRate(inputs.chuteSpecs, inputs.mass_kg, inputs.altitude_ft),
  }),
  'layered-wind-linear-interpolation-drift': (inputs) => {
    const drift = computeDrift(inputs)
    return drift ? { drift_ft: drift.drift_ft, bearing_deg: drift.bearing_deg } : {}
  },
  'landing-energy-36in-main-sea-level': (inputs) => {
    const descentRateFps = computeDescentRate(inputs.chuteSpecs, inputs.mass_kg, inputs.altitude_ft)
    const landingSpeedMps = descentRateFps / 3.28084
    return {
      landing_ke_ftlbf: Math.round(
        0.5 * inputs.mass_kg * landingSpeedMps * landingSpeedMps * 0.7376
      ),
    }
  },
  'end-to-end-scalar-2kg-main-500ft': (inputs) => {
    const result = runSimulation(inputs)
    return result
      ? {
          apogee_ft: result.apogee_ft,
          apogee_t_s: result.apogee_t_s,
          burnout_t_s: result.burnout_t_s,
          deploy_ft: result.deploy_ft,
          landing_ke_ftlbf: result.landing_ke_ftlbf,
          total_time_s: result.total_time_s,
        }
      : {}
  },
  'end-to-end-curve-2kg-main-500ft': (inputs) => {
    const result = runSimulation(inputs)
    return result
      ? {
          apogee_ft: result.apogee_ft,
          apogee_t_s: result.apogee_t_s,
          burnout_t_s: result.burnout_t_s,
          deploy_ft: result.deploy_ft,
          landing_ke_ftlbf: result.landing_ke_ftlbf,
          total_time_s: result.total_time_s,
        }
      : {}
  },
  'terminal-descent-altitude-ft-unit-conversion': (inputs) => ({
    descent_rate_fps: computeDescentRate(inputs.chuteSpecs, inputs.mass_kg, inputs.altitude_ft),
  }),
  'terminal-descent-invalid-chute-edge': (inputs) => ({
    descent_rate_fps: computeDescentRate(inputs.chuteSpecs, inputs.mass_kg, inputs.altitude_ft),
  }),
  'terminal-descent-diameter-doubling-metamorphic': (inputs) => ({
    descent_rate_ratio:
      computeDescentRate(
        inputs.transformed.chuteSpecs,
        inputs.transformed.mass_kg,
        inputs.transformed.altitude_ft
      ) /
      computeDescentRate(inputs.base.chuteSpecs, inputs.base.mass_kg, inputs.base.altitude_ft),
  }),
  'static-ejection-load-nylon-screening': (inputs) => {
    const result = computeShockLoad(inputs.cordSpecs, inputs.mass_kg, inputs.g_factor)
    return result
      ? {
          peak_load_lbs: result.peak_load_lbs,
          safety_factor: result.safety_factor,
          strain_energy_J: result.strain_energy_J,
        }
      : {}
  },
})

function modelMatches(model) {
  return (
    model?.id === SIMULATION_MODEL_ID &&
    model?.version === SIMULATION_MODEL_VERSION &&
    model?.assumptionsVersion === SIMULATION_ASSUMPTIONS_VERSION
  )
}

export function validateCorpus() {
  const diagnostics = []
  const manifest = readJson(MANIFEST_PATH)
  const schema = readJson(SCHEMA_PATH)
  const validate = new Ajv({ allErrors: true })
    .addFormat('uri', /^https?:\/\/\S+$/)
    .addFormat('date', /^\d{4}-\d{2}-\d{2}$/)
    .compile(schema)
  const files = fs
    .readdirSync(CORPUS_DIR)
    .filter((file) => file.endsWith('.json') && file !== 'schema.json')
    .sort()
  const cases = files.map((file) => ({ file, testCase: readJson(path.join(CORPUS_DIR, file)) }))
  const validCases = []
  const seen = new Set()

  if (!modelMatches(manifest.model))
    diagnostics.push('manifest model identity does not match production')
  if (!Array.isArray(manifest.cases)) diagnostics.push('manifest cases must be an array')

  for (const { file, testCase } of cases) {
    if (!validate(testCase)) {
      for (const error of validate.errors ?? [])
        diagnostics.push(`${file}${error.instancePath} ${error.message}`)
      continue
    }
    validCases.push({ file, testCase })
    if (seen.has(testCase.id)) diagnostics.push(`${file}: duplicate case id ${testCase.id}`)
    seen.add(testCase.id)
    if (!manifest.cases?.includes(testCase.id))
      diagnostics.push(`${file}: ${testCase.id} missing from manifest`)
    if (!modelMatches(testCase.model))
      diagnostics.push(`${file}: model identity does not match production`)
    if (
      testCase.status === 'accepted-for-comparison' &&
      (!testCase.comparison.reviewedBy || !testCase.comparison.reviewedAt)
    ) {
      diagnostics.push(`${file}: accepted-for-comparison requires reviewer identity and date`)
    }

    const evaluate = evaluators[testCase.id]
    if (!evaluate) {
      diagnostics.push(`${file}: no browser-engine evaluator registered for ${testCase.id}`)
      continue
    }
    const observed = evaluate(testCase.inputs)
    for (const metric of testCase.expected.metrics) {
      const actual = observed[metric.name]
      if (!Number.isFinite(actual)) {
        diagnostics.push(`${testCase.id}/${metric.name}: observed output is not finite`)
        continue
      }
      const result = compare(actual, metric.value, metric.tolerance)
      const gatesAgreement = testCase.status === 'accepted-for-comparison'
      if (!result.pass && gatesAgreement) {
        diagnostics.push(
          `${testCase.id}/${metric.name}: expected ${metric.value} ${metric.unit}, observed ${actual}, difference ${result.difference}`
        )
      }
    }
  }

  for (const id of manifest.cases ?? [])
    if (!seen.has(id)) diagnostics.push(`manifest: case ${id} has no corpus file`)
  return {
    valid: diagnostics.length === 0,
    diagnostics,
    cases: cases.length,
    domainCoverage: reportDomainCoverage(validCases),
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateCorpus()
  if (process.argv.includes('--json')) console.log(JSON.stringify(result))
  else if (result.valid)
    console.log(
      `validation corpus valid (${result.cases} cases; review cases do not gate agreement)`
    )
  else {
    console.error(result.diagnostics.join('\n'))
    process.exitCode = 1
  }
}
