import { computeDescentRate } from './simulation.js'

const G_ACCEL = 9.81

/**
 * Evaluate all compatibility rules for the current config + specs.
 *
 * Returns an array of warning objects:
 *   { level: 'warn' | 'error', slot: string, message: string }
 */
export function checkCompatibility({ config, specs }) {
  const warnings = []

  const mass_g         = parseFloat(specs.rocket_mass_g)
  const airframe_od    = parseFloat(specs.airframe_od_in)
  const airframe_id    = parseFloat(specs.airframe_id_in) || (airframe_od > 0 ? airframe_od - 0.5 : 0)
  const bay_length     = parseFloat(specs.bay_length_in)
  const bay_obstruction = Math.max(0, parseFloat(specs.bay_obstruction_in) || 0)
  const usable_bay     = bay_length > 0 ? Math.max(0, bay_length - bay_obstruction) : 0
  const mass_kg        = mass_g > 0 ? mass_g / 1000 : null

  // Ejection G-factor: user-supplied value takes precedence; auto-default is 20G (L1/L2)
  // or 30G for L3-class rockets (≥10 kg). Matches NAR/TRA guidelines.
  const g_factor_user = parseFloat(specs.ejection_g_factor)
  const g_factor      = (g_factor_user > 0) ? Math.max(5, g_factor_user) : (mass_kg != null && mass_kg >= 10 ? 30 : 20)

  // ── Main chute ──────────────────────────────────────────────────────────────
  if (config.main_chute) {
    const { packed_diam_in, diameter_in, cd } = config.main_chute.specs

    // Packed diameter vs airframe inner bore
    if (airframe_id > 0 && packed_diam_in >= airframe_id) {
      warnings.push({
        level: 'error',
        slot: 'main_chute',
        message: `Main chute packed diameter (${packed_diam_in}") exceeds bay inner diameter (${airframe_id.toFixed(2)}") — won't fit`,
      })
    }

    // Descent rate check — use actual deploy altitude for density correction
    if (mass_kg) {
      const deploy_alt = parseFloat(specs.main_deploy_alt_ft) || 500
      const fps = computeDescentRate({ diameter_in, cd }, mass_kg, deploy_alt)
      if (fps > 20) {
        warnings.push({
          level: 'error',
          slot: 'main_chute',
          message: `Main descent rate ${fps.toFixed(1)} fps exceeds 20 fps — hard landing risk`,
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

    // Packed diameter vs airframe inner bore
    if (airframe_id > 0 && packed_diam_in >= airframe_id) {
      warnings.push({
        level: 'error',
        slot: 'drogue_chute',
        message: `Drogue packed diameter (${packed_diam_in}") exceeds bay inner diameter (${airframe_id.toFixed(2)}") — won't fit`,
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

  // ── Shock cord strength ──────────────────────────────────────────────────────
  if (config.shock_cord && mass_kg) {
    const { strength_lbs, material, length_ft } = config.shock_cord.specs
    const is_l3 = mass_kg >= 10  // L3-class threshold: ~22 lbs / 10 kg

    // G-factor: use user-supplied value (from RocketSpecs), or auto-default (30G L3, 20G L1/L2)
    const required_lbs = (mass_kg * G_ACCEL * g_factor) / 4.448

    if (strength_lbs < required_lbs) {
      warnings.push({
        level: 'error',
        slot: 'shock_cord',
        message: `Shock cord rated ${strength_lbs} lbs may fail at ejection (need ~${Math.ceil(required_lbs)} lbs at ${g_factor}G for ${mass_kg.toFixed(1)} kg rocket)`,
      })
    } else if (strength_lbs < required_lbs * 1.5) {
      warnings.push({
        level: 'warn',
        slot: 'shock_cord',
        message: `Shock cord rated ${strength_lbs} lbs — marginal safety factor at ${g_factor}G ejection load (~${Math.ceil(required_lbs)} lbs required)`,
      })
    }

    // Kevlar inelasticity advisory for L3 rockets
    // Kevlar stretches only ~3% vs nylon's ~15% — snatch force at chute deployment
    // can be 3–5× higher than an equivalent-rated nylon cord.
    // NAR/TRA recommend Kevlar cords be rated ≥2× the calculated minimum for L3.
    if (material === 'kevlar' && is_l3) {
      const recommended_lbs = Math.ceil(required_lbs * 2)
      if (strength_lbs < recommended_lbs) {
        warnings.push({
          level: 'warn',
          slot: 'shock_cord',
          message: `Kevlar is nearly inelastic — snatch force at chute deployment can be 3–5× higher than static load. For L3, use a Kevlar cord rated ≥${recommended_lbs} lbs (2× minimum) or switch to tubular nylon.`,
        })
      }
    }

    // Cord/harness length check — tiered by rocket class
    // Short cords don't give the chute enough room to fully deploy before going taut,
    // amplifying snatch load.
    if (length_ft != null) {
      const min_length = mass_kg >= 10 ? 15 : mass_kg >= 2.5 ? 10 : 5
      if (length_ft < min_length) {
        warnings.push({
          level: 'warn',
          slot: 'shock_cord',
          message: `Harness length ${length_ft}ft may be insufficient — minimum ${min_length}ft recommended for this rocket class`,
        })
      }
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

  // ── Quick links vs ejection load (independent of shock cord) ────────────────
  if (config.quick_links && mass_kg) {
    const ql_lbs = config.quick_links.specs.strength_lbs
    const required_lbs = (mass_kg * G_ACCEL * g_factor) / 4.448
    if (ql_lbs < required_lbs) {
      warnings.push({
        level: 'error',
        slot: 'quick_links',
        message: `Quick links rated ${ql_lbs} lbs may fail at ejection (need ~${Math.ceil(required_lbs)} lbs at ${g_factor}G)`,
      })
    } else if (ql_lbs < required_lbs * 1.5) {
      warnings.push({
        level: 'warn',
        slot: 'quick_links',
        message: `Quick links rated ${ql_lbs} lbs — marginal safety factor at ${g_factor}G ejection load`,
      })
    }
  }

  // ── Quick links vs shock cord strength ───────────────────────────────────────
  // Skip if the mass-check above already issued an error on this slot (avoids duplicate errors)
  if (config.quick_links && config.shock_cord && !warnings.some(w => w.slot === 'quick_links' && w.level === 'error')) {
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

  // ── Chute-mounted device vs main deploy altitude ─────────────────────────────
  // Devices like the Jolly Logic Chute Release have a max programmable altitude.
  // Warn if the planned deploy altitude is outside the device's operable range.
  if (config.chute_device?.specs.deploy_alt_max_ft) {
    const deploy_ft = parseFloat(specs.main_deploy_alt_ft)
    const { deploy_alt_min_ft, deploy_alt_max_ft } = config.chute_device.specs
    if (deploy_ft > deploy_alt_max_ft) {
      warnings.push({
        level: 'error',
        slot: 'chute_device',
        message: `${config.chute_device.name} max altitude is ${deploy_alt_max_ft.toLocaleString()} ft — deploy altitude ${deploy_ft.toLocaleString()} ft exceeds it`,
      })
    } else if (deploy_ft < deploy_alt_min_ft) {
      warnings.push({
        level: 'warn',
        slot: 'chute_device',
        message: `${config.chute_device.name} minimum altitude is ${deploy_alt_min_ft} ft — deploy altitude ${deploy_ft} ft is below it`,
      })
    }
  }

  // ── Deployment bag vs main chute ─────────────────────────────────────────────
  if (config.deployment_bag && config.main_chute) {
    const bag_max = config.deployment_bag.specs.max_chute_diam_in
    const chute_d = config.main_chute.specs.diameter_in
    if (chute_d > bag_max) {
      warnings.push({
        level: 'warn',
        slot: 'deployment_bag',
        message: `${config.deployment_bag.name} (max ${bag_max}" chute) may be too small for ${chute_d}" main — chute may not pack cleanly`,
      })
    }
  }

  // ── Swivel vs ejection load ───────────────────────────────────────────────────
  if (config.swivel && mass_kg) {
    const rated     = config.swivel.specs.rated_lbs
    const req_lbs   = (mass_kg * G_ACCEL * g_factor) / 4.448
    if (rated < req_lbs) {
      warnings.push({
        level: 'error',
        slot: 'swivel',
        message: `Swivel rated ${rated} lbs may fail at ejection (need ~${Math.ceil(req_lbs)} lbs at ${g_factor}G for ${mass_kg.toFixed(1)} kg rocket)`,
      })
    } else if (rated < req_lbs * 1.5) {
      warnings.push({
        level: 'warn',
        slot: 'swivel',
        message: `Swivel rated ${rated} lbs — marginal safety factor at ${g_factor}G ejection load (~${Math.ceil(req_lbs)} lbs required)`,
      })
    }
  }

  // ── Bay volume / stacked length ──────────────────────────────────────────────
  // Sum the estimated packed height of every component in the bay.
  // Component heights with real data come from parts specs; electronics use
  // conservative fixed estimates since we don't carry board dimensions.
  if (bay_length > 0) {
    let stacked = 0
    if (config.main_chute?.specs.packed_length_in)    stacked += config.main_chute.specs.packed_length_in
    if (config.drogue_chute?.specs.packed_length_in)  stacked += config.drogue_chute.specs.packed_length_in
    if (config.shock_cord?.specs.packed_height_in)    stacked += config.shock_cord.specs.packed_height_in
    if (config.chute_protector)                       stacked += config.chute_protector.specs.packed_height_in ?? 0.5
    if (config.deployment_bag)                        stacked += config.deployment_bag.specs.packed_height_in
    if (config.quick_links)                           stacked += 0.5   // small hardware, negligible
    if (config.swivel)                                stacked += config.swivel.specs.packed_height_in ?? 0.25
    if (config.chute_device)                          stacked += 1.0   // clips to harness, ~1"

    if (stacked > 0) {
      const obstr = bay_obstruction > 0 ? ` (${bay_obstruction}" reserved for obstructions)` : ''
      const pct   = usable_bay > 0 ? Math.round((stacked / usable_bay) * 100) : 100
      if (stacked > usable_bay) {
        warnings.push({
          level: 'error',
          slot: 'bay_length',
          message: `Components total ~${stacked.toFixed(1)}" but only ${usable_bay.toFixed(1)}" usable in ${bay_length}" bay${obstr} — won't close`,
        })
      } else if (stacked > usable_bay * 0.85) {
        warnings.push({
          level: 'warn',
          slot: 'bay_length',
          message: `Bay is ${pct}% full (~${stacked.toFixed(1)}" of ${usable_bay.toFixed(1)}" usable${obstr}) — very tight, consider a longer bay`,
        })
      }
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
    config.main_chute || config.drogue_chute || config.shock_cord ||
    config.chute_protector || config.deployment_bag || config.quick_links ||
    config.swivel || config.chute_device
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
