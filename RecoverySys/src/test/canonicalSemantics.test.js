import { describe, expect, it } from 'vitest'
import { ASSESSMENT_STATUS, EVIDENCE_STATE, VALIDITY, buildAssessment } from '../lib/assessment.js'
import { buildResultEnvelope } from '../lib/resultIntegrity.js'
import { CRITERION_IDS, evaluateCriterion } from '../lib/criteria.js'
import { presentCriterion } from '../lib/criterionPresentation.js'
import { buildFinding, compatibilityFindingCode, normalizeFinding } from '../lib/findings.js'

describe('canonical assessment contract', () => {
  it('keeps missing values explicitly not evaluated', () => {
    expect(buildAssessment({ domain: 'recovery', output: 'main_fps' })).toMatchObject({
      status: ASSESSMENT_STATUS.NOT_EVALUATED,
      evaluated: false,
      valid: false,
      validity: VALIDITY.NOT_EVALUATED,
      evidenceState: EVIDENCE_STATE.NOT_EVALUATED,
      reasonCodes: ['NOT_EVALUATED'],
    })
  })

  it('distinguishes current and stale evaluated outputs', () => {
    expect(
      buildAssessment({
        domain: 'recovery',
        output: 'main_fps',
        value: 12,
        unit: 'ft/s',
        fresh: true,
      })
    ).toMatchObject({
      status: ASSESSMENT_STATUS.CURRENT,
      freshness: ASSESSMENT_STATUS.CURRENT,
      validity: VALIDITY.VALID,
      value: 12,
      unit: 'ft/s',
    })
    expect(buildAssessment({ value: 12, fresh: false }).status).toBe(ASSESSMENT_STATUS.STALE)
  })
})
describe('canonical result envelope', () => {
  it('attaches screen-independent assessments to a result envelope', () => {
    const envelope = buildResultEnvelope(
      { apogee_ft: 4200, landing_ke_ftlbf: 32 },
      { specs: {}, config: {}, customMotor: null },
      1
    )
    expect(envelope.assessments.apogee_ft).toMatchObject({
      outputId: 'apogee_ft',
      value: 4200,
      unit: 'ft',
      status: ASSESSMENT_STATUS.CURRENT,
      method: { id: 'browser-js-recovery', version: 'isa-apogee-descent-v1' },
    })
    expect(envelope.assessments.main_fps.status).toBe(ASSESSMENT_STATUS.NOT_EVALUATED)
  })

  it('carries unrounded drift inputs and revision through the result envelope', () => {
    const result = { apogee_ft: 4200, apogee_method: 'rk4', deploy_ft: 500 }
    Object.defineProperty(result, '_driftSimulation', {
      value: { apogee_ft: 4200.4, deploy_ft: 500, drogue_fps: 70.7, main_fps: 15.34 },
      enumerable: false,
    })
    const envelope = buildResultEnvelope(result, { specs: {}, config: {} }, 9)

    expect(envelope.provenance.inputRevision).toBe(9)
    expect(envelope._driftSimulation).toEqual({
      apogee_ft: 4200.4,
      deploy_ft: 500,
      drogue_fps: 70.7,
      main_fps: 15.34,
    })
    // Presentation values must not be replaced by the raw drift inputs.
    expect(envelope.apogee_ft).toBe(4200)
  })

  it('carries raw criterion inputs through the result envelope', () => {
    const result = { apogee_ft: 4200, main_fps: 20, landing_ke_ftlbf: 100 }
    Object.defineProperty(result, '_criteriaInputs', {
      value: { main_fps: 19.994, landing_ke_ftlbf: 99.61 },
      enumerable: false,
    })
    const envelope = buildResultEnvelope(result, { specs: {}, config: {} }, 1)
    expect(envelope._criteriaInputs).toEqual({ main_fps: 19.994, landing_ke_ftlbf: 99.61 })
    expect(envelope.main_fps).toBe(20)
  })
})

describe('canonical criteria', () => {
  it.each([
    [15, 'nominal'],
    [15.0001, 'fast'],
    [20, 'fast'],
    [20.0001, 'hard-landing'],
    [5, 'nominal'],
    [4.999, 'slow-drift'],
  ])('uses exact main descent boundaries for %s', (value, category) => {
    expect(evaluateCriterion(CRITERION_IDS.MAIN_DESCENT_RATE, value).category).toBe(category)
  })

  it('returns criterion provenance and not-evaluated state for unknown values', () => {
    expect(evaluateCriterion(CRITERION_IDS.LANDING_ENERGY, null)).toMatchObject({
      criterionId: CRITERION_IDS.LANDING_ENERGY,
      evaluated: false,
      category: 'not-evaluated',
      policyVersion: expect.any(String),
    })
  })
})

describe('shared criterion presentation', () => {
  it.each([
    [
      { evaluated: false, category: 'not-evaluated', severity: 'neutral', reasonCode: 'MISSING' },
      {
        status: 'neutral',
        token: 'CRITERION_NOT_EVALUATED',
        label: 'NOT EVALUATED',
        evaluated: false,
      },
    ],
    [
      { evaluated: true, category: 'nominal', severity: 'none' },
      {
        status: 'ok',
        token: 'CRITERION_NOMINAL',
        label: 'WITHIN TESTED CRITERION',
        evaluated: true,
      },
    ],
    [
      { evaluated: true, category: 'fast', severity: 'warn' },
      { status: 'warn', token: 'CRITERION_REVIEW', label: 'REVIEW REQUIRED', evaluated: true },
    ],
    [
      { evaluated: true, category: 'hard-landing', severity: 'error' },
      {
        status: 'error',
        token: 'CRITERION_EXCEEDED',
        label: 'CRITERION EXCEEDED',
        evaluated: true,
      },
    ],
  ])('maps canonical criterion state %j consistently', (criterion, expected) => {
    expect(presentCriterion(criterion)).toMatchObject(expected)
  })

  it('preserves the exact evaluator boundary state for a criterion presentation', () => {
    expect(presentCriterion(evaluateCriterion(CRITERION_IDS.MAIN_DESCENT_RATE, 20))).toMatchObject({
      status: 'warn',
      token: 'CRITERION_REVIEW',
      label: 'REVIEW REQUIRED',
    })
    expect(
      presentCriterion(evaluateCriterion(CRITERION_IDS.MAIN_DESCENT_RATE, 20.0001))
    ).toMatchObject({
      status: 'error',
      token: 'CRITERION_EXCEEDED',
      label: 'CRITERION EXCEEDED',
    })
  })
})

it('projects canonical criterion states to MetricCard status values', () => {
  expect(
    [
      presentCriterion({ evaluated: false }),
      presentCriterion({ evaluated: true, category: 'nominal', severity: 'none' }),
      presentCriterion({ evaluated: true, category: 'fast', severity: 'warn' }),
      presentCriterion({ evaluated: true, category: 'hard-landing', severity: 'error' }),
    ].map(({ metricStatus, metricLabel }) => ({ metricStatus, metricLabel }))
  ).toEqual([
    { metricStatus: 'neutral', metricLabel: 'NOT EVALUATED' },
    { metricStatus: 'ok', metricLabel: 'OK' },
    { metricStatus: 'marginal', metricLabel: 'MARGINAL' },
    { metricStatus: 'fail', metricLabel: 'FAIL' },
  ])
})

describe('stable finding contract', () => {
  it('does not derive compatibility identity from dynamic values', () => {
    const first = compatibilityFindingCode(
      'main_chute',
      'Main descent rate 15.1 fps is above 15 fps'
    )
    const second = compatibilityFindingCode(
      'main_chute',
      'Main descent rate 17.4 fps is above 15 fps'
    )
    expect(first).toBe('compatibility.main_chute.main-descent-rate-fast')
    expect(second).toBe(first)
  })

  it('normalizes authored findings without dropping legacy warning fields', () => {
    expect(
      normalizeFinding({
        code: 'recovery.main.invalid',
        slot: 'main_chute',
        level: 'error',
        message: 'Review main deployment altitude.',
        inputPaths: ['specs.main_deploy_alt_ft'],
      })
    ).toMatchObject({
      code: 'recovery.main.invalid',
      state: 'evaluated',
      consequence: 'Review main deployment altitude.',
      inputPaths: ['specs.main_deploy_alt_ft'],
    })
    expect(() => buildFinding({ message: 'missing code' })).toThrow('Finding code is required')
  })
})
