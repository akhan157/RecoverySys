import { computeDescentRate } from './simulation.js'

/**
 * Evaluate all compatibility rules for the current config + specs.
 *
 * Returns an array of warning objects:
 *   { level: 'warn' | 'error', slot: string, message: string }
 */
export function checkCompatibility({ config, specs }) {
  const warnings = []

  const mass_g       = parseFloat(specs.rocket_mass_g)
  const airframe_od  = parseFloat(specs.airframe_od_in)
  const mass_kg      = mass_g > 0 ? mass_g / 1000 : null

  // ── Main chute ──────────────────────────────────────────────────────────────
  if (config.main_chute) {
    const { packed_diam_in, diameter_in, cd } = config.main_chute.specs

    // Packed diameter vs airframe
    if (airframe_od > 0 && packed_diam_in >= airframe_od - 0.5) {
      warnings.push({
        level: 'error',
        slot: 'main_chute',
        message: `Main chute packed diameter (${packed_diam_in}") is too large for ${airframe_od}" airframe — won't fit bay`,
      })
    }

    // Descent rate check
    if (mass_kg) {
      const fps = computeDescentRate({ diameter_in, cd }, mass_kg)
      if (fps > 20) {
        warnings.push({
          level: 'error',
          slot: 'main_chute',
          message: `Main descent rate ${fps.toFixed(1)} fps exceeds 20 fps — landing impact too hard`,
        })
      } else if (fps > 15) {
        warnings.push({
          level: 'warn',
          slot: 'main_chute',
          message: `Main descent rate ${fps.toFixed(1)} fps is above 15 fps — consider a larger chute`,
        })
      } else if (fps < 5) {
        warnings.push({
          level: 'warn',
          slot: 'main_chute',
          message: `Main descent rate ${fps.toFixed(1)} fps is very slow — high drift risk`,
        })
      }
    }
  }

  // ── Drogue chute ────────────────────────────────────────────────────────────
  if (config.drogue_chute) {
    const { packed_diam_in, diameter_in, cd } = config.drogue_chute.specs

    // Packed diameter vs airframe
    if (airframe_od > 0 && packed_diam_in >= airframe_od - 0.5) {
      warnings.push({
        level: 'error',
        slot: 'drogue_chute',
        message: `Drogue packed diameter (${packed_diam_in}") is too large for ${airframe_od}" airframe`,
      })
    }

    // Drogue descent rate — should be fast (50–120 fps) to minimize drift before main deploy
    if (mass_kg) {
      const fps = computeDescentRate({ diameter_in, cd }, mass_kg)
      if (fps < 30) {
        warnings.push({
          level: 'warn',
          slot: 'drogue_chute',
          message: `Drogue descent rate ${fps.toFixed(1)} fps is too slow — excessive drift before main deploy`,
        })
      } else if (fps > 150) {
        warnings.push({
          level: 'warn',
          slot: 'drogue_chute',
          message: `Drogue descent rate ${fps.toFixed(1)} fps is very fast — high ejection shock load`,
        })
      }
    }
  }

  // ── Battery vs flight computer ───────────────────────────────────────────────
  if (config.battery && config.flight_computer) {
    const batt_v = config.battery.specs.voltage
    const { min_voltage, max_voltage } = config.flight_computer.specs

    if (batt_v < min_voltage) {
      warnings.push({
        level: 'error',
        slot: 'battery',
        message: `${config.battery.name} (${batt_v}V) is below ${config.flight_computer.name} minimum (${min_voltage}V)`,
      })
    } else if (batt_v > max_voltage) {
      warnings.push({
        level: 'error',
        slot: 'battery',
        message: `${config.battery.name} (${batt_v}V) exceeds ${config.flight_computer.name} maximum (${max_voltage}V) — will damage altimeter`,
      })
    }
  }

  // ── Shock cord strength ──────────────────────────────────────────────────────
  if (config.shock_cord && mass_kg) {
    const { strength_lbs } = config.shock_cord.specs
    // Required: survive 20G ejection shock
    const required_lbs = (mass_kg * G_ACCEL * 20) / 4.448
    if (strength_lbs < required_lbs) {
      warnings.push({
        level: 'error',
        slot: 'shock_cord',
        message: `Shock cord rated ${strength_lbs} lbs may fail at ejection (need ~${Math.ceil(required_lbs)} lbs for 20G load)`,
      })
    } else if (strength_lbs < required_lbs * 1.5) {
      warnings.push({
        level: 'warn',
        slot: 'shock_cord',
        message: `Shock cord rated ${strength_lbs} lbs — marginal safety factor at 20G ejection load`,
      })
    }
  }

  // ── Chute protector vs main chute ────────────────────────────────────────────
  if (config.chute_protector && config.main_chute) {
    const { size_in, max_chute_diam_in } = config.chute_protector.specs
    const { diameter_in } = config.main_chute.specs
    if (diameter_in > max_chute_diam_in) {
      warnings.push({
        level: 'error',
        slot: 'chute_protector',
        message: `${config.chute_protector.name} (max ${max_chute_diam_in}" chute) is too small for ${diameter_in}" main — chute may be scorched`,
      })
    }
  }

  // ── Quick links vs shock cord strength ───────────────────────────────────────
  if (config.quick_links && config.shock_cord) {
    const ql_lbs = config.quick_links.specs.strength_lbs
    const sc_lbs = config.shock_cord.specs.strength_lbs
    if (ql_lbs < sc_lbs) {
      warnings.push({
        level: 'error',
        slot: 'quick_links',
        message: `Quick links rated ${ql_lbs} lbs are weaker than shock cord (${sc_lbs} lbs) — links will fail first`,
      })
    } else if (ql_lbs < sc_lbs * 1.2) {
      warnings.push({
        level: 'warn',
        slot: 'quick_links',
        message: `Quick links (${ql_lbs} lbs) are only marginally stronger than shock cord (${sc_lbs} lbs)`,
      })
    }
  }

  // ── GPS tracker voltage vs battery ───────────────────────────────────────────
  if (config.gps_tracker && config.battery) {
    const batt_v = config.battery.specs.voltage
    const { voltage_min, voltage_max } = config.gps_tracker.specs
    if (batt_v < voltage_min) {
      warnings.push({
        level: 'error',
        slot: 'gps_tracker',
        message: `${config.battery.name} (${batt_v}V) is below ${config.gps_tracker.name} minimum (${voltage_min}V)`,
      })
    } else if (batt_v > voltage_max) {
      warnings.push({
        level: 'error',
        slot: 'gps_tracker',
        message: `${config.battery.name} (${batt_v}V) exceeds ${config.gps_tracker.name} maximum (${voltage_max}V) — will damage tracker`,
      })
    }
  }

  // ── Single-deploy warning ────────────────────────────────────────────────────
  if (config.main_chute && !config.drogue_chute) {
    warnings.push({
      level: 'warn',
      slot: 'drogue_chute',
      message: 'No drogue chute — single deploy. Rocket will free-fall to main deploy altitude.',
    })
  }

  // ── No main chute ────────────────────────────────────────────────────────────
  // Only warn once the user has configured at least one other component —
  // avoids a red error on a completely blank/default state.
  const hasAnyComponent = !!(
    config.main_chute || config.drogue_chute ||
    config.flight_computer || config.battery || config.shock_cord ||
    config.chute_protector || config.quick_links || config.gps_tracker
  )
  if (!config.main_chute && hasAnyComponent) {
    warnings.push({
      level: 'error',
      slot: 'main_chute',
      message: 'No main parachute selected — recovery system incomplete',
    })
  }

  return warnings
}

const G_ACCEL = 9.81

/**
 * Returns the compatibility status for a single slot.
 * 'ok' | 'warn' | 'error' | 'neutral'
 */
export function slotStatus(slot, warnings) {
  const slotWarnings = warnings.filter(w => w.slot === slot)
  if (slotWarnings.some(w => w.level === 'error')) return 'error'
  if (slotWarnings.some(w => w.level === 'warn'))  return 'warn'
  return 'ok'
}
