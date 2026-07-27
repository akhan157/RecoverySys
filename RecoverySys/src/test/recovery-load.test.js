import { describe, expect, it } from 'vitest'
import {
  computeDrogueDeploymentVelocity,
  computeMainSnatchLoad,
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
