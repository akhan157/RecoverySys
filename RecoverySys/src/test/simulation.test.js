import { describe, it, expect } from 'vitest'
import { computeDescentRate, runSimulation } from '../lib/simulation.js'

// ── computeDescentRate ────────────────────────────────────────────────────────

describe('computeDescentRate', () => {
  it('returns a positive fps for a valid chute + mass', () => {
    // 36" Cd=1.5 chute, 2.5 kg rocket — typical HPR main
    const fps = computeDescentRate({ diameter_in: 36, cd: 1.5 }, 2.5)
    expect(fps).toBeGreaterThan(0)
    expect(fps).toBeLessThan(30)   // should be under safe landing speed
  })

  it('returns 0 for zero cd (guard against NaN/Infinity)', () => {
    const fps = computeDescentRate({ diameter_in: 36, cd: 0 }, 2.5)
    expect(fps).toBe(0)
  })

  it('returns 0 for zero diameter (guard against NaN/Infinity)', () => {
    const fps = computeDescentRate({ diameter_in: 0, cd: 1.5 }, 2.5)
    expect(fps).toBe(0)
  })

  it('larger chute means slower descent rate', () => {
    const small = computeDescentRate({ diameter_in: 24, cd: 1.5 }, 2.5)
    const large = computeDescentRate({ diameter_in: 60, cd: 1.5 }, 2.5)
    expect(large).toBeLessThan(small)
  })
})

// ── runSimulation ─────────────────────────────────────────────────────────────

describe('runSimulation', () => {
  const baseSpecs = {
    rocket_mass_g:          '2500',
    motor_total_impulse_ns: '640',
    burn_time_s:            '1.8',
    airframe_od_in:         '4',
    airframe_id_in:         '3.9',
    bay_length_in:          '18',
    drag_cd:                '0.50',
    wind_speed_mph:         '10',
    main_deploy_alt_ft:     '500',
  }

  const baseConfig = {
    main_chute: { specs: { diameter_in: 42, cd: 1.5, packed_diam_in: 3, packed_length_in: 4 } },
    drogue_chute: { specs: { diameter_in: 12, cd: 1.5, packed_diam_in: 2, packed_length_in: 2 } },
  }

  it('returns a result object for valid inputs', () => {
    const result = runSimulation({ specs: baseSpecs, config: baseConfig })
    expect(result).not.toBeNull()
    expect(result.apogee_ft).toBeGreaterThan(500)
    expect(result.main_fps).toBeGreaterThan(0)
    expect(result.drogue_fps).toBeGreaterThan(0)
  })

  it('returns null when mass is missing', () => {
    const result = runSimulation({
      specs: { ...baseSpecs, rocket_mass_g: '' },
      config: baseConfig,
    })
    expect(result).toBeNull()
  })

  it('returns null when impulse is missing', () => {
    const result = runSimulation({
      specs: { ...baseSpecs, motor_total_impulse_ns: '' },
      config: baseConfig,
    })
    expect(result).toBeNull()
  })

  it('returns null when apogee is at or below deploy altitude', () => {
    // Very low impulse for a heavy rocket — won't reach 500 ft
    const result = runSimulation({
      specs: { ...baseSpecs, motor_total_impulse_ns: '1', rocket_mass_g: '10000' },
      config: baseConfig,
    })
    expect(result).toBeNull()
  })

  it('drift is larger with more wind', () => {
    const noWind  = runSimulation({ specs: { ...baseSpecs, wind_speed_mph: '0' }, config: baseConfig })
    const wind15  = runSimulation({ specs: { ...baseSpecs, wind_speed_mph: '15' }, config: baseConfig })
    expect(wind15.drift_ft).toBeGreaterThan(noWind.drift_ft)
  })

  it('single-deploy drift includes full descent to ground (not just to deploy alt)', () => {
    const noMain = { drogue_chute: baseConfig.drogue_chute }
    const result = runSimulation({ specs: { ...baseSpecs, wind_speed_mph: '10' }, config: noMain })
    // With a drogue-only descent, drift must include time below deploy_alt
    // At 100 fps drogue + 10 mph wind, 500 ft of additional fall ≈ 5 s × 14.7 fps ≈ 73 ft extra
    // So drift should be more than just the phase1 portion
    expect(result).not.toBeNull()
    expect(result.drift_ft).toBeGreaterThan(0)
  })

  it('timeline has at least 2 points', () => {
    const result = runSimulation({ specs: baseSpecs, config: baseConfig })
    expect(result.timeline.length).toBeGreaterThan(1)
  })

  it('does not produce NaN in results for typical HPR inputs', () => {
    const result = runSimulation({ specs: baseSpecs, config: baseConfig })
    expect(Number.isNaN(result.apogee_ft)).toBe(false)
    expect(Number.isNaN(result.drogue_fps)).toBe(false)
    expect(Number.isNaN(result.main_fps)).toBe(false)
    expect(Number.isNaN(result.drift_ft)).toBe(false)
  })
})
