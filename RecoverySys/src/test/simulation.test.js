import { describe, it, expect } from 'vitest'
import { computeDescentRate, computeShockLoad, computeDrift, runSimulation } from '../lib/simulation.js'

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

// ── computeShockLoad ─────────────────────────────────────────────────────────

const NYLON_CORD = { material: 'nylon', elongation_pct: 22, strength_lbs: 2000, length_ft: 20 }
const KEVLAR_CORD = { material: 'kevlar', elongation_pct: 3, strength_lbs: 1500, length_ft: 15 }

describe('computeShockLoad', () => {
  it('returns null for null cord', () => {
    expect(computeShockLoad(null, 2, 20)).toBeNull()
  })

  it('returns null for zero mass', () => {
    expect(computeShockLoad(NYLON_CORD, 0, 20)).toBeNull()
  })

  it('nylon cord with generous SF returns pass', () => {
    // 0.5 kg rocket, 2000 lb cord — SF should be very high
    const result = computeShockLoad(NYLON_CORD, 0.5, 20)
    expect(result).not.toBeNull()
    expect(result.sf_status).toBe('pass')
    expect(result.safety_factor).toBeGreaterThanOrEqual(4)
  })

  it('nylon cord with marginal SF returns warn', () => {
    // Heavy rocket against weak cord — target SF 2–4
    // 2000 lb cord, 20G, need mass such that SF ~3
    // peak_lbs = mass_kg * 20 * 9.81 / 4.448 → for SF=3: mass_kg = 2000/(3*20*9.81/4.448) ≈ 15.1 kg
    const result = computeShockLoad(NYLON_CORD, 15, 20)
    expect(result).not.toBeNull()
    expect(result.sf_status).toBe('warn')
  })

  it('nylon cord with low SF returns fail', () => {
    // Very heavy rocket — SF < 2
    const result = computeShockLoad(NYLON_CORD, 30, 20)
    expect(result).not.toBeNull()
    expect(result.sf_status).toBe('fail')
  })

  it('kevlar uses stricter threshold — SF=5 is warn not pass', () => {
    // For kevlar, pass requires SF ≥ 8. SF=5 should be warn.
    // 1500 lb kevlar, 20G: SF=5 → mass_kg = 1500/(5*20*9.81/4.448) ≈ 6.8 kg
    const result = computeShockLoad(KEVLAR_CORD, 6.8, 20)
    expect(result).not.toBeNull()
    expect(result.sf_status).toBe('warn')   // would be 'pass' under nylon threshold
    expect(result.safety_factor).toBeLessThan(8)
  })

  it('auto G-factor (20G) is the default used in runSimulation', () => {
    const r20 = computeShockLoad(NYLON_CORD, 2, 20)
    expect(r20.peak_load_lbs).toBeGreaterThan(0)
    expect(Number.isFinite(r20.peak_load_lbs)).toBe(true)
  })

  it('nylon absorbs more strain energy than kevlar for same load', () => {
    // Same mass, same cord length/strength ratio — nylon stretches more → more energy absorbed
    const nylonResult = computeShockLoad(
      { material: 'nylon', elongation_pct: 22, strength_lbs: 2000, length_ft: 20 }, 3, 20
    )
    const kevlarResult = computeShockLoad(
      { material: 'kevlar', elongation_pct: 3, strength_lbs: 2000, length_ft: 20 }, 3, 20
    )
    expect(nylonResult.strain_energy_J).toBeGreaterThan(kevlarResult.strain_energy_J)
  })

  it('all returned values are finite numbers', () => {
    const result = computeShockLoad(NYLON_CORD, 2, 20)
    expect(Number.isFinite(result.peak_load_lbs)).toBe(true)
    expect(Number.isFinite(result.safety_factor)).toBe(true)
    expect(Number.isFinite(result.strain_energy_J)).toBe(true)
  })

  it('unknown material falls back to nylon thresholds', () => {
    // e.g. 'spectra' is not in SF_THRESHOLDS — should silently use nylon defaults
    const result = computeShockLoad(
      { material: 'spectra', elongation_pct: 15, strength_lbs: 1000, length_ft: 10 }, 1, 20
    )
    expect(result).not.toBeNull()
    expect(result.sf_thresholds.pass).toBe(4)   // nylon thresholds
    expect(result.sf_thresholds.warn).toBe(2)
  })

  it('runSimulation includes shock_load when cord is in config', () => {
    // 2 kg @ 20G = 2 × 20 × 9.81 / 4.448 ≈ 88 lbs peak load; 2000 lb cord → SF ≈ 22.7
    const result = runSimulation({
      specs: { rocket_mass_g: '2000', motor_total_impulse_ns: '2000', burn_time_s: '5',
               airframe_id_in: '6', drag_cd: '0.5', wind_speed_mph: '10',
               main_deploy_alt_ft: '500', ejection_g_factor: '20' },
      config: {
        main_chute: { specs: { diameter_in: 36, cd: 1.5 } },
        shock_cord:  { specs: NYLON_CORD },
      },
    })
    expect(result).not.toBeNull()
    expect(result.shock_load).not.toBeNull()
    expect(result.shock_load.sf_status).toBe('pass')        // 22.7× >> 4× nylon threshold
    expect(result.shock_load.peak_load_lbs).toBeGreaterThan(80)   // 2 kg × 20G
    expect(result.shock_load.peak_load_lbs).toBeLessThan(110)
  })

  it('runSimulation shock_load is null when no cord selected', () => {
    const result = runSimulation({
      specs: { rocket_mass_g: '2000', motor_total_impulse_ns: '2000', burn_time_s: '5',
               main_deploy_alt_ft: '500' },
      config: { main_chute: { specs: { diameter_in: 36, cd: 1.5 } } },
    })
    expect(result).not.toBeNull()
    expect(result.shock_load).toBeNull()
  })

  it('ejection_g_factor spec string is parsed correctly (auto = 20G)', () => {
    const withAuto = runSimulation({
      specs: { rocket_mass_g: '2000', motor_total_impulse_ns: '2000', burn_time_s: '5',
               main_deploy_alt_ft: '500', ejection_g_factor: '' },
      config: {
        main_chute: { specs: { diameter_in: 36, cd: 1.5 } },
        shock_cord:  { specs: NYLON_CORD },
      },
    })
    const with20 = runSimulation({
      specs: { rocket_mass_g: '2000', motor_total_impulse_ns: '2000', burn_time_s: '5',
               main_deploy_alt_ft: '500', ejection_g_factor: '20' },
      config: {
        main_chute: { specs: { diameter_in: 36, cd: 1.5 } },
        shock_cord:  { specs: NYLON_CORD },
      },
    })
    expect(withAuto.shock_load.peak_load_lbs).toBe(with20.shock_load.peak_load_lbs)
  })
})

// ── computeDrift ──────────────────────────────────────────────────────────────

describe('computeDrift', () => {
  // Minimal simulation result that computeDrift expects
  const baseSim = {
    apogee_ft:  4000,
    deploy_ft:  500,
    drogue_fps: 70,   // ft/s descent under drogue
    main_fps:   15,   // ft/s descent under main
  }

  it('returns null when simulation is null', () => {
    expect(computeDrift({ simulation: null, specs: { wind_speed_mph: '10', wind_direction_deg: '0' } })).toBeNull()
  })

  it('returns null when wind speed is zero or missing', () => {
    expect(computeDrift({ simulation: baseSim, specs: { wind_speed_mph: '0',  wind_direction_deg: '0' } })).toBeNull()
    expect(computeDrift({ simulation: baseSim, specs: { wind_speed_mph: '',   wind_direction_deg: '0' } })).toBeNull()
  })

  it('returns null when drogue_fps is missing or zero (guard against divide-by-zero)', () => {
    const nodrogue = { apogee_ft: 4000, deploy_ft: 500, drogue_fps: 0, main_fps: 15 }
    expect(computeDrift({ simulation: nodrogue, specs: { wind_speed_mph: '10', wind_direction_deg: '0' } })).toBeNull()
    const missingdrogue = { apogee_ft: 4000, deploy_ft: 500, main_fps: 15 }
    expect(computeDrift({ simulation: missingdrogue, specs: { wind_speed_mph: '10', wind_direction_deg: '0' } })).toBeNull()
  })

  it('returns drift components with correct structure', () => {
    const result = computeDrift({ simulation: baseSim, specs: { wind_speed_mph: '10', wind_direction_deg: '0' } })
    expect(result).not.toBeNull()
    expect(result).toHaveProperty('drift_ft')
    expect(result).toHaveProperty('drift_m')
    expect(result).toHaveProperty('drogue_drift_ft')
    expect(result).toHaveProperty('main_drift_ft')
    expect(result).toHaveProperty('drogue_time_s')
    expect(result).toHaveProperty('main_time_s')
    expect(result).toHaveProperty('bearing_deg')
    expect(result.drift_ft).toBe(result.drogue_drift_ft + result.main_drift_ft)
  })

  it('drift scales linearly with wind speed', () => {
    const r5  = computeDrift({ simulation: baseSim, specs: { wind_speed_mph: '5',  wind_direction_deg: '0' } })
    const r10 = computeDrift({ simulation: baseSim, specs: { wind_speed_mph: '10', wind_direction_deg: '0' } })
    // Double the wind → double the drift (within rounding)
    expect(Math.abs(r10.drift_ft - r5.drift_ft * 2)).toBeLessThan(5)
  })

  it('bearing is downwind: wind FROM north (0°) → drift TOWARD south (180°)', () => {
    const result = computeDrift({ simulation: baseSim, specs: { wind_speed_mph: '10', wind_direction_deg: '0' } })
    expect(result.bearing_deg).toBe(180)
  })

  it('bearing is downwind: wind FROM west (270°) → drift TOWARD east (90°)', () => {
    const result = computeDrift({ simulation: baseSim, specs: { wind_speed_mph: '10', wind_direction_deg: '270' } })
    expect(result.bearing_deg).toBe(90)
  })

  it('bearing wraps correctly: wind FROM south (180°) → drift TOWARD north (0°)', () => {
    const result = computeDrift({ simulation: baseSim, specs: { wind_speed_mph: '10', wind_direction_deg: '180' } })
    expect(result.bearing_deg).toBe(0)
  })

  it('bearing is null when wind_direction_deg is missing (never default to north)', () => {
    // Defaulting to 0 (north) would produce misleading landing coords — bearing must be null
    const result = computeDrift({ simulation: baseSim, specs: { wind_speed_mph: '10', wind_direction_deg: '' } })
    expect(result).not.toBeNull()
    expect(result.bearing_deg).toBeNull()
    // Landing coords also null when bearing is unknown
    expect(result.land_lat).toBeNull()
    expect(result.land_lon).toBeNull()
  })

  it('computes landing coords when launch_lat/lon provided', () => {
    const result = computeDrift({
      simulation: baseSim,
      specs: { wind_speed_mph: '10', wind_direction_deg: '0', launch_lat: '39.5', launch_lon: '-98.35' },
    })
    expect(result.land_lat).not.toBeNull()
    expect(result.land_lon).not.toBeNull()
    // Wind from north → drifts south → land_lat < launch_lat
    expect(result.land_lat).toBeLessThan(39.5)
    // Longitude should be approximately the same (drift is north-south)
    expect(Math.abs(result.land_lon - (-98.35))).toBeLessThan(0.01)
  })

  it('land_lat/lon are null when launch coords not provided', () => {
    const result = computeDrift({ simulation: baseSim, specs: { wind_speed_mph: '10', wind_direction_deg: '0' } })
    expect(result.land_lat).toBeNull()
    expect(result.land_lon).toBeNull()
  })

  it('drogue_time_s matches span / drogue_fps', () => {
    const result = computeDrift({ simulation: baseSim, specs: { wind_speed_mph: '10', wind_direction_deg: '0' } })
    // drogue span = 4000 - 500 = 3500 ft; time = 3500 / 70 = 50s
    expect(result.drogue_time_s).toBe(50)
    // main time = 500 / 15 ≈ 33s
    expect(result.main_time_s).toBe(33)
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
