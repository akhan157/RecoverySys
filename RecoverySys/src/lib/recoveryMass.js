import { SLOT_IDS } from '../data/parts.js'
import { parseSpec } from './schema.js'

/**
 * Informational roll-up of the selected recovery hardware's catalog weights.
 *
 * This module deliberately does not feed the simulation or the compatibility
 * load math. `rocket_mass_g` is a single user-entered liftoff mass; this roll-up
 * only answers "how much of that mass is the selected recovery hardware?" so a
 * mismatch is visible before flight.
 */

export const RECOVERY_MASS_MODEL = 'recovery-mass-rollup-v1'

const finitePositive = (value) => {
  const n = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

export function computeRecoveryMass({ config = {}, specs = {} } = {}) {
  const items = SLOT_IDS.filter((slot) => config?.[slot]).map((slot) => {
    const part = config[slot]
    return {
      slot,
      name: typeof part?.name === 'string' && part.name.length > 0 ? part.name : null,
      weight_g: finitePositive(part?.specs?.weight_g),
    }
  })

  const missing = items.filter((item) => item.weight_g == null).map((item) => item.slot)
  const total_g = items.reduce((sum, item) => sum + (item.weight_g ?? 0), 0)
  const rocket_mass_g = parseSpec('rocket_mass_g', specs?.rocket_mass_g)
  const fraction_of_rocket = rocket_mass_g != null ? total_g / rocket_mass_g : null
  const exceeds_rocket_mass = rocket_mass_g != null && total_g >= rocket_mass_g
  const status = items.length === 0 ? 'unavailable' : missing.length > 0 ? 'partial' : 'evaluated'

  return {
    model: RECOVERY_MASS_MODEL,
    status,
    items,
    missing,
    total_g,
    rocket_mass_g,
    fraction_of_rocket,
    exceeds_rocket_mass,
    limitations: [
      'Quantity is one selected part per slot; the configuration does not model multiples.',
      'Total includes only catalog weights that are finite and greater than zero.',
      'Informational roll-up only — this mass is not added to the simulated rocket mass or load calculations.',
    ],
  }
}
