import { describe, expect, it } from 'vitest'
import {
  FINDING_STATES,
  RESULT_USABILITY_STATES,
  buildAnalysisReviewModel,
  buildCausalityRows,
  buildResultUsability,
  buildTestedResponse,
} from '../lib/analysisReview.js'

const currentResult = {
  apogee_ft: 4200,
  apogee_t_s: 18,
  drogue_fps: 72,
  main_fps: 14.2,
  drift_ft: 640,
  landing_ke_ftlbf: 62,
  provenance: { inputKey: 'sim-current', modelVersion: 'v1' },
}

const currentInput = {
  simulation: currentResult,
  resultFresh: true,
  warnings: [
    {
      code: 'compatibility.main_chute.high-descent-rate',
      slot: 'main_chute',
      level: 'warn',
      message: 'Main descent rate is above the reviewed limit.',
    },
    {
      code: 'compatibility.shock_cord.low-margin',
      slot: 'shock_cord',
      level: 'error',
      message: 'Shock cord margin is below the reviewed limit.',
    },
    {
      code: 'evidence.main-chute-missing',
      slot: 'main_chute',
      state: 'not-evaluated',
      message: 'No accepted evidence is available for this part.',
    },
  ],
  sensitivity: {
    status: 'complete',
    method: 'Deterministic one-at-a-time variations',
    rows: [
      {
        key: 'rocket_mass_g',
        label: 'Rocket mass',
        status: 'partially-tested',
        ranges: { apogee_ft: { min: 4000, max: 4400 } },
        variants: [
          { label: 'Base', valid: true, output: { apogee_ft: 4200 } },
          { label: '+10%', valid: false, reason: 'Outside result envelope' },
        ],
      },
    ],
  },
  assumptions: [{ id: 'isa', label: 'ISA atmosphere', value: 'Troposphere model' }],
}

describe('buildResultUsability', () => {
  it('distinguishes not-run, stale, and current without inferring from warnings', () => {
    expect(buildResultUsability({ warnings: [] }).status).toBe(RESULT_USABILITY_STATES.NOT_RUN)
    expect(buildResultUsability({ simulation: currentResult, resultFresh: false }).status).toBe(
      RESULT_USABILITY_STATES.STALE
    )
    expect(buildResultUsability({ simulation: currentResult, resultFresh: true })).toMatchObject({
      status: RESULT_USABILITY_STATES.CURRENT,
      reasonCode: 'CURRENT_RESULT',
    })
  })
})

describe('buildAnalysisReviewModel', () => {
  it('returns stable priority ordering, counts, actions, estimates, and detail refs', () => {
    const model = buildAnalysisReviewModel(currentInput)

    expect(model.reviewSummary).toMatchObject({
      errorCount: 1,
      warningCount: 1,
      notEvaluatedCount: 1,
      posture: 'error',
    })
    expect(model.causalityRows.map((row) => row.findingState)).toEqual([
      FINDING_STATES.ERROR,
      FINDING_STATES.WARNING,
      FINDING_STATES.NOT_EVALUATED,
    ])
    expect(model.causalityRows[0]).toMatchObject({
      driver: 'shock_cord',
      affectedOutcome: 'Deployment load path',
      actionDestination: 'config.shock_cord',
      priority: 1,
      finding: { state: FINDING_STATES.ERROR },
    })
    expect(model.keyEstimates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'apogee_ft', value: 4200, unit: 'ft' }),
        expect.objectContaining({ id: 'landing_ke_ftlbf', value: 62, unit: 'ft-lbf' }),
      ])
    )
    expect(model.testedResponse).toMatchObject({
      status: 'complete',
      method: 'Deterministic one-at-a-time variations',
    })
    expect(model.testedResponse.rows[0].variants[1]).toMatchObject({
      state: 'unusable',
      valid: false,
    })
    expect(model.detailRefs).toEqual([
      expect.objectContaining({ id: 'isa', type: 'assumption', reference: 'Troposphere model' }),
      expect.objectContaining({
        id: 'provenance',
        type: 'provenance',
        reference: currentResult.provenance,
      }),
    ])
  })

  it('preserves canonical severity when evaluated findings carry a state envelope', () => {
    const model = buildAnalysisReviewModel({
      simulation: currentResult,
      resultFresh: true,
      warnings: [
        { state: 'evaluated', level: 'error', message: 'Error finding' },
        { state: 'evaluated', severity: 'warn', message: 'Warning finding' },
      ],
    })

    expect(model.reviewSummary).toMatchObject({
      errorCount: 1,
      warningCount: 1,
      posture: 'error',
    })
    expect(model.causalityRows.map((row) => row.findingState)).toEqual([
      FINDING_STATES.ERROR,
      FINDING_STATES.WARNING,
    ])
  })

  it('counts unknown findings as unresolved review items', () => {
    const model = buildAnalysisReviewModel({
      simulation: currentResult,
      resultFresh: true,
      warnings: [{ state: 'unknown', message: 'Criterion could not be resolved.' }],
    })

    expect(model.reviewSummary).toMatchObject({
      evaluated: false,
      notEvaluatedCount: 1,
      unknownCount: 1,
      posture: 'not-evaluated',
    })
    expect(model.causalityRows[0]).toMatchObject({
      findingState: FINDING_STATES.UNKNOWN,
      evaluated: false,
    })
  })
  it('does not present an empty warning list as a positive review result', () => {
    const model = buildAnalysisReviewModel({
      simulation: currentResult,
      resultFresh: true,
      warnings: [],
    })

    expect(model.reviewSummary).toMatchObject({
      posture: 'not-evaluated',
      evaluated: false,
      notEvaluatedCount: 0,
    })
    expect(model.causalityRows).toEqual([])
  })

  it('preserves explicit relationship contracts and sorts by declared priority', () => {
    const rows = buildCausalityRows({
      relationships: [
        {
          id: 'later',
          key: 'wind_speed_mph',
          priority: 20,
          driver: 'Wind',
          outcome: 'Drift',
          state: 'unknown',
        },
        {
          id: 'first',
          priority: 1,
          driver: 'Main chute',
          affectedOutcome: 'Landing rate',
          state: 'warning',
          actionDestination: 'config.main_chute',
        },
      ],
    })

    expect(rows.map((row) => row.id)).toEqual(['first', 'later'])
    expect(rows[1]).toMatchObject({
      findingState: FINDING_STATES.UNKNOWN,
      actionDestination: 'specs.wind_speed_mph',
    })
  })
})

describe('buildTestedResponse', () => {
  it('returns an explicit not-evaluated state when no response data exists', () => {
    expect(buildTestedResponse({})).toEqual({
      status: 'not-evaluated',
      reason: 'No per-output response evaluation is available.',
      method: null,
      rows: [],
    })
  })
})
