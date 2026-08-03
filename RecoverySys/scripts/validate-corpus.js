import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv from 'ajv/dist/2020.js'
import {
  SIMULATION_ASSUMPTIONS_VERSION,
  SIMULATION_MODEL_ID,
  SIMULATION_MODEL_VERSION,
} from '../src/lib/constants.js'
import { airDensity, computeDescentRate, computeDrift } from '../src/lib/simulation.js'
import { computeShockLoad } from '../src/lib/simulation.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CORPUS_DIR = path.join(ROOT, 'validation', 'corpus')
const MANIFEST_PATH = path.join(ROOT, 'validation', 'manifest.json')
const SCHEMA_PATH = path.join(CORPUS_DIR, 'schema.json')

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const compare = (actual, expected, tolerance) => {
  const difference = Math.abs(actual - expected)
  const absolutePass = tolerance.absolute == null || difference <= tolerance.absolute
  const relativePass =
    tolerance.relative == null ||
    difference <= Math.abs(expected || 1) * tolerance.relative
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
  const seen = new Set()

  if (!modelMatches(manifest.model)) diagnostics.push('manifest model identity does not match production')
  if (!Array.isArray(manifest.cases)) diagnostics.push('manifest cases must be an array')

  for (const { file, testCase } of cases) {
    if (!validate(testCase)) {
      for (const error of validate.errors ?? []) diagnostics.push(`${file}${error.instancePath} ${error.message}`)
      continue
    }
    if (seen.has(testCase.id)) diagnostics.push(`${file}: duplicate case id ${testCase.id}`)
    seen.add(testCase.id)
    if (!manifest.cases?.includes(testCase.id)) diagnostics.push(`${file}: ${testCase.id} missing from manifest`)
    if (!modelMatches(testCase.model)) diagnostics.push(`${file}: model identity does not match production`)

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

  for (const id of manifest.cases ?? []) if (!seen.has(id)) diagnostics.push(`manifest: case ${id} has no corpus file`)
  return { valid: diagnostics.length === 0, diagnostics, cases: cases.length }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateCorpus()
  if (result.valid) console.log(`validation corpus valid (${result.cases} cases; review cases do not gate agreement)`)
  else {
    console.error(result.diagnostics.join('\n'))
    process.exitCode = 1
  }
}
