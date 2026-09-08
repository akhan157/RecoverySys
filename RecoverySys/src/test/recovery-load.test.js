import { describe, expect, it } from 'vitest'
import {
  computeDrogueDeploymentVelocity,
  computeMainSnatchLoad,
  computeEjectionCharge,
  MAIN_SNATCH_MODEL,
} from '../lib/recoveryLoad.js'

const drogue = { specs: { diameter_in: 12, cd: 1.5 } }
const main = { specs: { diameter_in: 36, cd: 1.5 } }
const config = (cord) => ({ main_chute: main, drogue_chute: drogue, shock_cord: { specs: cord } })

describe('linear elastic main snatch model', () => {
  it('uses the secant energy equation and exposes generic assumptions', () => {
    const result = computeMainSnatchLoad({
      config: config({ strength_lbs: 1000, length_ft: 10, elongation_pct: 10 }),
      mass_kg: 2,
      deploy_alt_ft: 500,
      approach_velocity_fps: 100,
    })
    const extension = 10 * 0.3048 * 0.1
    const k = (1000 * 4.448) / extension
    expect(result.model).toBe(MAIN_SNATCH_MODEL)
    expect(result.event_energy_J).toBeCloseTo(0.5 * 2 * (100 / 3.28084) ** 2)
    expect(result.secant_stiffness_N_per_m).toBeCloseTo(k)
    expect(result.predicted_extension_m).toBeCloseTo(Math.sqrt((2 * result.event_energy_J) / k))
    expect(result.data_quality).toBe('generic-assumption')
  })

  it('changes monotonically with approach velocity', () => {
    const args = {
      config: config({ strength_lbs: 1000, length_ft: 10, elongation_pct: 10 }),
      mass_kg: 2,
      deploy_alt_ft: 500,
    }
    const slow = computeMainSnatchLoad({ ...args, approach_velocity_fps: 50 })
    const fast = computeMainSnatchLoad({ ...args, approach_velocity_fps: 100 })
    expect(fast.event_energy_J).toBeGreaterThan(slow.event_energy_J)
    expect(fast.predicted_extension_m).toBeGreaterThan(slow.predicted_extension_m)
    expect(fast.peak_force_proxy_lbs).toBeGreaterThan(slow.peak_force_proxy_lbs)
  })

  it('is marginal at capacity and exceeds rating above capacity', () => {
    const args = {
      config: config({ strength_lbs: 100, length_ft: 10, elongation_pct: 10 }),
      mass_kg: 2,
      deploy_alt_ft: 500,
    }
    const extension = 10 * 0.3048 * 0.1
    const stiffness = (100 * 4.448) / extension
    const capacityVelocity = extension * Math.sqrt(stiffness / 2) * 3.28084
    const atCapacity = computeMainSnatchLoad({ ...args, approach_velocity_fps: capacityVelocity })
    const above = computeMainSnatchLoad({ ...args, approach_velocity_fps: capacityVelocity * 1.01 })
    expect(atCapacity.status).toBe('marginal')
    expect(above.status).toBe('exceeds_rating')
  })

  it('is screened at a rating margin of two', () => {
    const args = {
      config: config({ strength_lbs: 100, length_ft: 10, elongation_pct: 10 }),
      mass_kg: 2,
      deploy_alt_ft: 500,
    }
    const extension = 10 * 0.3048 * 0.1
    const stiffness = (100 * 4.448) / extension
    const velocity = (extension * Math.sqrt(stiffness / 2) * 3.28084) / 2
    expect(computeMainSnatchLoad({ ...args, approach_velocity_fps: velocity }).status).toBe(
      'screened'
    )
  })

  it('returns unavailable for single deploy and malformed cord values', () => {
    const cord = { strength_lbs: 1000, length_ft: 10, elongation_pct: 10 }
    expect(
      computeMainSnatchLoad({
        config: { main_chute: main },
        mass_kg: 2,
        deploy_alt_ft: 500,
        approach_velocity_fps: 100,
      }).status
    ).toBe('unavailable')
    const malformed = computeMainSnatchLoad({
      config: config({ ...cord, length_ft: 'not-a-number' }),
      mass_kg: 2,
      deploy_alt_ft: 500,
      approach_velocity_fps: 100,
    })
    expect(malformed.status).toBe('unavailable')
    expect(malformed.reason).toBe('invalid-cord-or-input-values')
  })

  it('computes deployment velocity at the requested altitude without rounding', () => {
    const velocity = computeDrogueDeploymentVelocity(drogue.specs, 2, 500)
    expect(velocity).toBeGreaterThan(0)
    expect(velocity).not.toBe(Math.round(velocity))
    expect(computeDrogueDeploymentVelocity(drogue.specs, 2, 5000)).not.toBe(velocity)
  })
})

describe('black powder ejection charge model', () => {
  it('computes standard 15 PSI friction-fit charge correctly with verified FFFFg gas law constant', () => {
    // 4" tube (ID 3.9"), 18" bay -> Vol ≈ 215 in³, 15 psi
    // Nakka/Info-Central gas law: R=22.16 ft·lbf/(lbm·R), T=3307R -> RT = 1938.74 in·lbf/g
    // Expected charge ≈ (15 * 215) / 1938.74 ≈ 1.66g
    const vol = Math.PI * Math.pow(3.9 / 2, 2) * 18
    const charge = computeEjectionCharge({
      compartment_vol_in3: vol,
      airframe_id_in: 3.9,
    })

    expect(charge).not.toBeNull()
    expect(charge.target_psi).toBe(15)
    expect(charge.charge_grams).toBeCloseTo(1.66, 1)
    expect(charge.charge_grams_backup).toBeGreaterThan(charge.charge_grams)
    expect(charge.separation_force_lbf).toBeCloseTo(15 * Math.PI * Math.pow(3.9 / 2, 2), 0)
    expect(charge.insufficient_force).toBe(false)
  })

  it('calculates required separation pressure from shear pins', () => {
    // 3 pins 2-56 -> force = (3*30 + 15)*1.5 = 157.5 lbf -> 157.5 / 11.95 ≈ 13.2 psi
    const vol = 200
    const charge = computeEjectionCharge({
      compartment_vol_in3: vol,
      airframe_id_in: 3.9,
      shear_pins_count: 3,
      pin_type: '2-56',
    })

    expect(charge.pins_count).toBe(3)
    expect(charge.target_psi).toBeGreaterThanOrEqual(12)
    expect(charge.charge_grams).toBeGreaterThan(0)
  })

  it('returns null on invalid or zero volume/diameter', () => {
    expect(computeEjectionCharge({ compartment_vol_in3: 0, airframe_id_in: 4 })).toBeNull()
    expect(computeEjectionCharge({ compartment_vol_in3: 100, airframe_id_in: null })).toBeNull()
  })

  it('flags overpressure and insufficient separation force when required PSI exceeds safe limit', () => {
    // 2" airframe (ID 2.0") with 4 pins #2-56 -> area = 3.14 in²
    // Force = (4*30 + 15)*1.5 = 202.5 lbf -> Required PSI = 202.5 / 3.14 ≈ 64.5 PSI (> 35 PSI limit)
    const charge = computeEjectionCharge({
      compartment_vol_in3: 50,
      airframe_id_in: 2.0,
      shear_pins_count: 4,
      pin_type: '2-56',
    })
    expect(charge.insufficient_force).toBe(true)
    expect(charge.overpressure_risk).toBe(true)
    expect(charge.warning).toContain('exceeds 35 PSI airframe safety limit')
  })
})
