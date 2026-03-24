import { computeDescentRate } from './simulation.js'

/**
 * Evaluate all compatibility rules for the current config + specs.
 *
 * Returns an array of warning objects:
 *   { level: 'warn' | 'error', slot: string, message: string }
 */
export function checkCompatibility({ config, specs }) {
  const warnings = []

  const mass_g      = parseFloat(specs.rocket_mass_g)
  const airframe_od = parseFloat(specs.airframe_od_in)
  const airframe_id = parseFloat(specs.airframe_id_in) || (airframe_od > 0 ? airframe_od - 0.5 : 0)
  const bay_length  = parseFloat(specs.bay_length_in)
  const mass_kg     = mass_g > 0 ? mass_g / 1000 : null

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

  // ── Bay volume / stacked length ──────────────────────────────────────────────
  // Sum the estimated packed height of every component in the bay.
  // Component heights with real data come from parts specs; electronics use
  // conservative fixed estimates since we don't carry board dimensions.
  if (bay_length > 0) {
    let stacked = 0
    if (config.main_chute?.specs.packed_length_in)    stacked += config.main_chute.specs.packed_length_in
    if (config.drogue_chute?.specs.packed_length_in)  stacked += config.drogue_chute.specs.packed_length_in
    if (config.shock_cord?.specs.packed_height_in)    stacked += config.shock_cord.specs.packed_height_in
    if (config.chute_protector)                       stacked += 0.5   // nomex folded flat
    if (config.quick_links)                           stacked += 0.5   // small hardware, negligible
    if (config.chute_device)                          stacked += 1.0   // clips to harness, ~1"
    if (config.gps_tracker)                           stacked += 1.5   // small PCB + antenna

    if (stacked > 0) {
      const pct = Math.round((stacked / bay_length) * 100)
      if (stacked > bay_length) {
        warnings.push({
          level: 'error',
          slot: 'bay_length',
          message: `Components total ~${stacked.toFixed(1)}" stacked height but bay is only ${bay_length}" — won't close`,
        })
      } else if (stacked > bay_length * 0.85) {
        warnings.push({
          level: 'warn',
          slot: 'bay_length',
          message: `Bay is ${pct}% full (~${stacked.toFixed(1)}" of ${bay_length}") — very tight, consider a longer bay`,
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
    config.chute_protector || config.quick_links ||
    config.chute_device || config.gps_tracker
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
