import { describe, expect, it } from 'vitest'
import { PHASE2_CASES } from './fixtures/validation/phase2-cases.js'
import { SIMULATION_MODEL_VERSION } from '../lib/constants.js'
import { airDensity, computeDescentRate, computeDrift } from '../lib/simulation.js'

const finite = (value, id) => expect(Number.isFinite(value), `${id}: output must be finite`).toBe(true)

describe('Phase 2 analytic validation foundation', () => {
  it.each(PHASE2_CASES)('$id declares the current model version', (testCase) => {
    expect(testCase.kind, `${testCase.id}: case kind`).toBe('analytic')
    expect(testCase.validationType, `${testCase.id}: validation type`).toBe('analytic_regression')
    expect(testCase.modelVersion, `${testCase.id}: model version`).toBe(SIMULATION_MODEL_VERSION)
  })

  it('matches independent ISA density references', () => {
    for (const testCase of PHASE2_CASES.filter(({ id }) => id.startsWith('isa-density'))) {
      const actual = airDensity(testCase.inputs.altitude_m)
      finite(actual, testCase.id)
      expect(Math.abs(actual - testCase.expected.value), `${testCase.id}: ISA density (${testCase.expected.unit})`).toBeLessThanOrEqual(testCase.expected.tolerance)
    }
  })

  it('matches the independent terminal-descent drag equation', () => {
    const testCase = PHASE2_CASES.find(({ id }) => id.startsWith('terminal-descent'))
    const { chuteSpecs, mass_kg, altitude_ft } = testCase.inputs
    const actual = computeDescentRate(chuteSpecs, mass_kg, altitude_ft)
    finite(actual, testCase.id)
    expect(Math.abs(actual - testCase.expected.value), `${testCase.id}: descent rate (${testCase.expected.unit})`).toBeLessThanOrEqual(testCase.expected.tolerance)
  })

  it('matches deterministic layered-wind interpolation and meteorological drift convention', () => {
    const testCase = PHASE2_CASES.find(({ id }) => id.includes('layered-wind'))
    const actual = computeDrift(testCase.inputs)
    expect(actual, `${testCase.id}: drift result`).not.toBeNull()
    finite(actual.drift_ft, testCase.id)
    expect(Math.abs(actual.drift_ft - testCase.expected.value), `${testCase.id}: drift (${testCase.expected.unit})`).toBeLessThanOrEqual(testCase.expected.tolerance)
    expect(actual.bearing_deg, `${testCase.id}: wind FROM north drifts TOWARD south`).toBe(180)
    expect(computeDrift(testCase.inputs), `${testCase.id}: deterministic repeat`).toEqual(actual)
  })
})
