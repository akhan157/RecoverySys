import { describe, expect, it } from 'vitest'
import { buildAnalysisReview } from '../lib/analysisReview.js'

describe('analysisReview view model', () => {
  const baseSpecs = {
    rocket_mass_g: '2500',
    motor_total_impulse_ns: '640',
    burn_time_s: '1.8',
    airframe_id_in: '3.9',
    bay_length_in: '18',
    main_deploy_alt_ft: '500',
    wind_speed_mph: '10',
  }

  const baseConfig = {
    main_chute: {
      name: 'Standard 42"',
      specs: { diameter_in: 42, cd: 1.5, packed_diam_in: 3, packed_length_in: 4 },
    },
    drogue_chute: {
      name: 'Drogue 12"',
      specs: { diameter_in: 12, cd: 1.5, packed_diam_in: 2, packed_length_in: 2 },
    },
    shock_cord: {
      name: '1" Nylon 20ft',
      specs: { strength_lbs: 2000, material: 'nylon', length_ft: 20, packed_height_in: 2 },
    },
  }

  it('returns NOT_RUN usability state when simulation is missing', () => {
    const review = buildAnalysisReview({
      specs: baseSpecs,
      config: baseConfig,
      simulation: null,
      resultFresh: false,
    })

    expect(review.usabilityState).toBe('NOT_RUN')
    expect(review.causalityRows).toHaveLength(0)
    expect(review.keyEstimates).toBeNull()
    expect(review.primaryReason).toMatch(/No current simulation result/i)
  })

  it('returns STALE usability state when result is not fresh', () => {
    const review = buildAnalysisReview({
      specs: baseSpecs,
      config: baseConfig,
      simulation: { apogee_ft: 1500, main_fps: 16 },
      resultFresh: false,
    })

    expect(review.usabilityState).toBe('STALE')
    expect(review.causalityRows).toHaveLength(0)
    expect(review.primaryReason).toMatch(/stale because rocket specs or recovery hardware changed/i)
  })

  it('generates prioritized causality rows when result is fresh', () => {
    const review = buildAnalysisReview({
      specs: baseSpecs,
      config: baseConfig,
      simulation: {
        apogee_ft: 1800,
        main_fps: 14.5,
        drogue_fps: 65,
        deploy_ft: 500,
        drift_ft: 1200,
        total_time_s: 95,
        landing_ke_ftlbf: 38,
        apogee_method: 'integrated-curve',
      },
      resultFresh: true,
      warnings: [],
    })

    expect(review.usabilityState).toBe('CURRENT')
    expect(review.causalityRows.length).toBeGreaterThan(0)
    // First row should have required fields
    const firstRow = review.causalityRows[0]
    expect(firstRow).toHaveProperty('id')
    expect(firstRow).toHaveProperty('driver')
    expect(firstRow).toHaveProperty('affectedOutcome')
    expect(firstRow).toHaveProperty('finding')
    expect(firstRow).toHaveProperty('actionLabel')
    expect(firstRow).toHaveProperty('actionTarget')
    expect(review.keyEstimates).not.toBeNull()
    expect(review.keyEstimates.apogee_ft).toBe(1800)
  })

  it('orders error rows before warning rows', () => {
    // Config with fast landing main (error: >20 fps) and tight bay
    const smallMainConfig = {
      ...baseConfig,
      main_chute: {
        name: 'Tiny 18"',
        specs: { diameter_in: 18, cd: 1.0, packed_diam_in: 2, packed_length_in: 3 },
      },
    }

    const review = buildAnalysisReview({
      specs: baseSpecs,
      config: smallMainConfig,
      simulation: {
        apogee_ft: 1800,
        main_fps: 24.5, // >20 fps error
        drogue_fps: 65,
        deploy_ft: 500,
        drift_ft: 4000, // >3000 ft warning
        total_time_s: 95,
        landing_ke_ftlbf: 110,
        apogee_method: 'integrated',
      },
      resultFresh: true,
      warnings: [],
    })

    expect(review.causalityRows[0].severity).toBe('error')
    expect(review.causalityRows[0].actionLabel).toMatch(/Select larger main parachute/i)
  })
})
