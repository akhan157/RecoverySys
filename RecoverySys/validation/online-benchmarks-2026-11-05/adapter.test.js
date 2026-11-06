import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { compareMetric, compareProposalReference } from './adapter.js'

const references = JSON.parse(
  execFileSync('python3', [fileURLToPath(new URL('./reference_calculator.py', import.meta.url))], {
    encoding: 'utf8',
  })
).references
const proposalsDir = new URL('./proposals/', import.meta.url)
const proposals = readdirSync(proposalsDir).map((file) =>
  JSON.parse(readFileSync(new URL(file, proposalsDir)))
)

for (const reference of Object.values(references)) {
  test(`Frozen proposal agrees with independent reference: ${reference.benchmarkId}`, () => {
    const result = compareProposalReference(
      proposals.find((item) => item.id === reference.benchmarkId),
      reference
    )
    assert.deepEqual(result, { pass: true, errors: [] })
  })
}

const reference = references['isa-troposphere-analytic-2500m']
for (const [name, mutate, expectedError] of [
  [
    'altered expected value',
    (proposal) => {
      proposal.expected.metrics.find((item) => item.name === 'pressure_Pa').value = 80000
    },
    'pressure_Pa:value',
  ],
  [
    'altered input',
    (proposal) => {
      proposal.inputs.altitude_m = 762
    },
    'inputs',
  ],
  [
    'wrong unit',
    (proposal) => {
      proposal.expected.metrics[0].unit = 'C'
    },
    'temperature_K:unit-or-missing',
  ],
  [
    'widened tolerance',
    (proposal) => {
      proposal.expected.metrics[0].tolerance.absolute = 100
    },
    'temperature_K:tolerance',
  ],
  [
    'wrong model',
    (proposal) => {
      proposal.model.version = 'another-model'
    },
    'model',
  ],
  [
    'duplicate metric',
    (proposal) => {
      proposal.expected.metrics.push(structuredClone(proposal.expected.metrics[0]))
    },
    'metric-set',
  ],
]) {
  test(`Rejects proposal drift: ${name}`, () => {
    const proposal = structuredClone(proposals.find((item) => item.id === reference.benchmarkId))
    mutate(proposal)
    const result = compareProposalReference(proposal, reference)
    assert.equal(result.pass, false)
    assert.ok(result.errors.includes(expectedError))
  })
}

test('Invalid or unbounded tolerances and nonfinite values cannot pass', () => {
  for (const tolerance of [
    undefined,
    {},
    { relative: Infinity },
    { absolute: -1 },
    { relative: NaN },
  ]) {
    assert.equal(compareMetric(1, 1, tolerance).pass, false)
  }
  assert.equal(compareMetric(NaN, 1, { absolute: 1 }).pass, false)
  assert.equal(compareMetric(1, Infinity, { absolute: 1 }).pass, false)
  assert.equal(compareMetric(0, 0, { relative: 0.01 }).pass, true)
  assert.equal(compareMetric(1, 0, { relative: 0.01 }).pass, false)
})
