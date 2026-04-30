import { computeDescentRate } from './simulation.js'
import { WARN_LEVELS, PHYSICS } from './constants.js'
import { parseSpec } from './schema.js'

const G_ACCEL = PHYSICS.G

/**
 * Evaluate all compatibility rules for the current config + specs.
 *
 * Returns an array of warning objects:
 *   { level: 'warn' | 'error', slot: string, message: string }
 */
export function checkCompatibility({ config, specs }) {
  const warnings = []

  const mass_g          = parseFloat(specs.rocket_mass_g)
  const airframe_id     = parseFloat(specs.airframe_id_in)  || 0
  const bay_length      = parseFloat(specs.bay_length_in)   || 0
  const bay_cross_area  = airframe_id > 0 ? Math.PI * Math.pow(airframe_id / 2, 2) : 0
  const bay_volume      = bay_cross_area > 0 && bay_length > 0 ? bay_cross_area * bay_length : 0
  const obstruction_vol = Math.max(0, parseFloat(specs.bay_obstruction_vol_in3) || 0)
  const usable_volume   = bay_volume > 0 ? Math.max(0, bay_volume - obstruction_vol) : 0
  const mass_kg         = mass_g > 0 ? mass_g / 1000 : null

  // Ejection G-factor: user-supplied value takes precedence; auto-default is 20G (L1/L2)
  // or 30G for L3-class rockets (≥10 kg). Matches NAR/TRA guidelines.
  // parseSpec returns null for ≤0 (treated as "auto") — keeps simulation,
  // compatibility, and SuggestPanel in lockstep instead of each disagreeing
  // about what a negative input means.
  const g_factor_user = parseSpec('ejection_g_factor', specs.ejection_g_factor)
  const g_factor      = g_factor_user != null
    ? Math.max(5, g_factor_user)
    : (mass_kg != null && mass_kg >= 10 ? 30 : 20)

  // ── Deploy altitude sanity ───────────────────────────────────────────────────
  const deploy_ft_raw = parseFloat(specs.main_deploy_alt_ft)
  if (isFinite(deploy_ft_raw)) {
    if (deploy_ft_raw <= 0) {
      warnings.push({
        level: WARN_LEVELS.ERROR,
        slot: 'main_chute',
        message: `Deploy altitude ${deploy_ft_raw} ft is invalid — must be above ground level`,
      })
    } else if (deploy_ft_raw < 200) {
      warnings.push({
        level: WARN_LEVELS.WARN,
        slot: 'main_chute',
        message: `Deploy altitude ${deploy_ft_raw} ft is dangerously low — minimum 200 ft recommended for reliable chute inflation`,
      })
    } else if (deploy_ft_raw > 10000) {
      warnings.push({
        level: WARN_LEVELS.WARN,
        slot: 'main_chute',
        message: `Deploy altitude ${deploy_ft_raw.toLocaleString()} ft is unusually high — verify this is intentional`,
      })
    }
  }

  // ── Main chute ──────────────────────────────────────────────────────────────
  if (config.main_chute) {
    const { diameter_in, cd } = config.main_chute.specs

    // Descent rate check — use actual deploy altitude for density correction
    if (mass_kg) {
      const deploy_alt = parseFloat(specs.main_deploy_alt_ft) || 500
      const fps = computeDescentRate({ diameter_in, cd }, mass_kg, deploy_alt)
      if (fps > 20) {
        warnings.push({
          level: WARN_LEVELS.ERROR,
          slot: 'main_chute',
          message: `Main descent rate ${fps.toFixed(1)} fps exceeds 20 fps — hard landing risk`,
        })
      } else if (fps > 15) {
        warnings.push({
          level: WARN_LEVELS.WARN,
          slot: 'main_chute',
          message: `Main descent rate ${fps.toFixed(1)} fps is above 15 fps — consider a larger chute`,
        })
      } else if (fps < 5) {
        warnings.push({
          level: WARN_LEVELS.WARN,
          slot: 'main_chute',
          message: `Main descent rate ${fps.toFixed(1)} fps is very slow — high drift risk`,
        })
      }
    }
  }

  // ── Landing kinetic energy ────────────────────────────────────────────────
  // KE = 0.5 * m * v². NAR/TRA guideline: < 75 ft-lbf for safe recovery.
  if (mass_kg) {
    const FT_PER_M = 3.28084
    let landing_fps = null
    if (config.main_chute) {
      const deploy_alt = parseFloat(specs.main_deploy_alt_ft) || 500
      landing_fps = computeDescentRate(config.main_chute.specs, mass_kg, deploy_alt)
    } else if (config.drogue_chute) {
      landing_fps = computeDescentRate(config.drogue_chute.specs, mass_kg)
    }
    if (landing_fps && landing_fps > 0) {
      const landing_mps = landing_fps / FT_PER_M
      const ke_ftlbf = 0.5 * mass_kg * landing_mps * landing_mps * 0.7376
      if (ke_ftlbf > 100) {
        warnings.push({
          level: WARN_LEVELS.ERROR,
          slot: 'main_chute',
          message: `Landing KE ~${Math.round(ke_ftlbf)} ft-lbf exceeds 100 ft-lbf — high risk of damage or injury`,
        })
      } else if (ke_ftlbf > 75) {
        warnings.push({
          level: WARN_LEVELS.WARN,
          slot: 'main_chute',
          message: `Landing KE ~${Math.round(ke_ftlbf)} ft-lbf exceeds 75 ft-lbf guideline — consider a larger main chute`,
        })
      }
    }
  }

  // ── Drogue chute ────────────────────────────────────────────────────────────
  if (config.drogue_chute) {
    const { diameter_in, cd } = config.drogue_chute.specs

    // Drogue descent rate — evaluate at mid-altitude between a typical apogee and deploy.
    // Without running the full sim here, use 5000 ft as a reasonable mid-drogue altitude
    // for the density correction (air is ~15% thinner → descent ~8% faster than sea level).
    if (mass_kg) {
      const deploy_alt = parseFloat(specs.main_deploy_alt_ft) || 500
      const mid_drogue_ft = Math.max(deploy_alt, 5000)
      const fps = computeDescentRate({ diameter_in, cd }, mass_kg, mid_drogue_ft)
      if (fps < 30) {
        warnings.push({
          level: WARN_LEVELS.WARN,
          slot: 'drogue_chute',
          message: `Drogue descent rate ${fps.toFixed(1)} fps is too slow — excessive drift before main deploy`,
        })
      } else if (fps > 150) {
        warnings.push({
          level: WARN_LEVELS.WARN,
          slot: 'drogue_chute',
          message: `Drogue descent rate ${fps.toFixed(1)} fps is very fast — high ejection shock load`,
        })
      }
    }
  }

  // ── Main chute opening shock ──────────────────────────────────────────────
  // When drogue is fast and main chute opens, the transient snatch force can
  // exceed the steady-state terminal load by 2-4×. Estimate opening shock as:
  //   F_open = q × Cd × A × Cx   where q = 0.5 × rho × v²
  //   Cx ≈ 1.8 (opening shock factor for flat/conical HPR chutes)
  // Compare against shock cord and quick link ratings.
  if (config.drogue_chute && config.main_chute && mass_kg) {
    const deploy_alt = parseFloat(specs.main_deploy_alt_ft) || 500
    const drogue_at_deploy = computeDescentRate(config.drogue_chute.specs, mass_kg, deploy_alt)
    const drogue_mps = drogue_at_deploy / 3.28084
    // ISA density: P/(R*T) with P = 101325*(T/288.15)^5.2559, R = 287.058
    const _T = 288.15 - 0.0065 * Math.min(deploy_alt / 3.28084, 11000)
    const rho_deploy = (101325 * Math.pow(_T / 288.15, 5.2559)) / (287.058 * _T)
    const main_r_m   = (config.main_chute.specs.diameter_in * 0.0254) / 2
    const main_area   = Math.PI * main_r_m * main_r_m
    // Shape-specific opening shock factor (Cx)
    const CX_BY_SHAPE = { flat: 1.8, elliptical: 1.6, conical: 1.5, cruciform: 2.2, toroidal: 1.4 }
    const Cx = CX_BY_SHAPE[config.main_chute.specs.shape] || 1.8
    const F_open_N   = 0.5 * rho_deploy * drogue_mps * drogue_mps * config.main_chute.specs.cd * main_area * Cx
    const F_open_lbs = F_open_N / 4.448

    // Warn if opening shock exceeds cord or link rating
    const cord_lbs = config.shock_cord?.specs.strength_lbs
    const ql_lbs   = config.quick_links?.specs.strength_lbs
    const weakest  = Math.min(cord_lbs || Infinity, ql_lbs || Infinity)
    if (weakest < Infinity && F_open_lbs > weakest) {
      warnings.push({
        level: WARN_LEVELS.ERROR,
        slot: 'main_chute',
        message: `Main chute opening shock ~${Math.round(F_open_lbs)} lbs at ${drogue_at_deploy.toFixed(0)} fps may exceed hardware rated ${Math.round(weakest)} lbs — consider a deployment bag or reefing`,
      })
    } else if (weakest < Infinity && F_open_lbs > weakest * 0.7) {
      warnings.push({
        level: WARN_LEVELS.WARN,
        slot: 'main_chute',
        message: `Main chute opening shock ~${Math.round(F_open_lbs)} lbs at ${drogue_at_deploy.toFixed(0)} fps is close to hardware limit (${Math.round(weakest)} lbs)`,
      })
    }
  }

  // ── Shock cord strength ──────────────────────────────────────────────────────
  if (config.shock_cord && mass_kg) {
    const { strength_lbs, material, length_ft } = config.shock_cord.specs

    // G-factor: use user-supplied value (from RocketSpecs), or auto-default (30G L3, 20G L1/L2)
    const required_lbs = (mass_kg * G_ACCEL * g_factor) / 4.448

    // Compute strain energy for display: E = F²/(2k) where k = (strength × 4.448)/(length × 0.3048 × elongation/100)
    const { elongation_pct: elong } = config.shock_cord.specs
    let strainNote = ''
    if (elong > 0 && length_ft > 0) {
      const peak_N = mass_kg * g_factor * G_ACCEL
      const k = (strength_lbs * 4.448) / (length_ft * 0.3048 * (elong / 100))
      const strain_J = (peak_N * peak_N) / (2 * k)
      strainNote = ` Strain energy: ${strain_J.toFixed(1)} J.`
    }

    if (strength_lbs < required_lbs) {
      warnings.push({
        level: WARN_LEVELS.ERROR,
        slot: 'shock_cord',
        message: `Shock cord rated ${strength_lbs} lbs may fail at ejection (need ~${Math.ceil(required_lbs)} lbs at ${g_factor}G for ${mass_kg.toFixed(1)} kg rocket).${strainNote}`,
      })
    } else if (strength_lbs < required_lbs * 1.5) {
      warnings.push({
        level: WARN_LEVELS.WARN,
        slot: 'shock_cord',
        message: `Shock cord rated ${strength_lbs} lbs — marginal safety factor at ${g_factor}G ejection load (~${Math.ceil(required_lbs)} lbs required).${strainNote}`,
      })
    }

    // Dynamic snatch force multiplier from cord elongation.
    // When a cord goes taut at velocity v, the peak dynamic load scales inversely
    // with how much the cord stretches: F_dynamic ≈ F_static × sqrt(1 / elongation).
    // Nylon (22% elongation): multiplier ≈ 2.1×
    // Kevlar (3% elongation): multiplier ≈ 5.8×
    // This replaces the old hardcoded 2× Kevlar rule with actual physics.
    const { elongation_pct } = config.shock_cord.specs
    if (elongation_pct > 0) {
      const snatch_multiplier = Math.sqrt(1 / (elongation_pct / 100))
      const dynamic_load_lbs = required_lbs * snatch_multiplier
      if (strength_lbs < dynamic_load_lbs) {
        const mult_str = snatch_multiplier.toFixed(1)
        warnings.push({
          level: material === 'kevlar' ? WARN_LEVELS.ERROR : WARN_LEVELS.WARN,
          slot: 'shock_cord',
          message: `${material === 'kevlar' ? 'Kevlar' : 'Cord'} with ${elongation_pct}% elongation amplifies snatch force ~${mult_str}× (${Math.round(dynamic_load_lbs)} lbs dynamic vs. ${Math.ceil(required_lbs)} lbs static). Cord rated ${strength_lbs} lbs may fail. ${material === 'kevlar' ? 'Switch to tubular nylon or rate ≥' + Math.ceil(dynamic_load_lbs) + ' lbs.' : 'Consider a longer cord or higher rating.'}`,
        })
      } else if (strength_lbs < dynamic_load_lbs * 1.5) {
        warnings.push({
          level: WARN_LEVELS.WARN,
          slot: 'shock_cord',
          message: `Snatch force at ${elongation_pct}% elongation is ~${snatch_multiplier.toFixed(1)}× static load (~${Math.round(dynamic_load_lbs)} lbs) — marginal safety factor for ${strength_lbs} lbs cord`,
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
          level: WARN_LEVELS.WARN,
          slot: 'shock_cord',
          message: `Harness length ${length_ft}ft may be insufficient — minimum ${min_length}ft recommended for this rocket class`,
        })
      }
    }
  }

  // ── Chute material vs cord material mismatch ─────────────────────────────────
  // Nylon chute + Kevlar cord = mismatched elasticity. Kevlar won't stretch to
  // absorb opening shock, transferring full snatch load to the nylon canopy
  // attachment points — a known failure mode (canopy rips at shroud lines).
  if (config.shock_cord?.specs.material === 'kevlar' && config.main_chute?.specs.material === 'nylon') {
    warnings.push({
      level: WARN_LEVELS.WARN,
      slot: 'shock_cord',
      message: 'Kevlar cord with nylon chute — mismatched elasticity. Kevlar transfers full snatch load to nylon canopy attachment points. Consider tubular nylon cord or adding a Kevlar shock cord protector/bungee section.',
    })
  }

  // ── Chute protector vs main chute ────────────────────────────────────────────
  if (config.chute_protector && config.main_chute) {
    const { size_in, max_chute_diam_in } = config.chute_protector.specs
    const { diameter_in } = config.main_chute.specs
    if (diameter_in > max_chute_diam_in) {
      warnings.push({
        level: WARN_LEVELS.ERROR,
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
        level: WARN_LEVELS.ERROR,
        slot: 'quick_links',
        message: `Quick links rated ${ql_lbs} lbs may fail at ejection (need ~${Math.ceil(required_lbs)} lbs at ${g_factor}G)`,
      })
    } else if (ql_lbs < required_lbs * 1.5) {
      warnings.push({
        level: WARN_LEVELS.WARN,
        slot: 'quick_links',
        message: `Quick links rated ${ql_lbs} lbs — marginal safety factor at ${g_factor}G ejection load`,
      })
    }
  }

  // ── Quick links vs shock cord strength ───────────────────────────────────────
  // Skip if the mass-check above already issued an error on this slot (avoids duplicate errors)
  if (config.quick_links && config.shock_cord && !warnings.some(w => w.slot === 'quick_links' && w.level === WARN_LEVELS.ERROR)) {
    const ql_lbs = config.quick_links.specs.strength_lbs
    const sc_lbs = config.shock_cord.specs.strength_lbs
    if (ql_lbs < sc_lbs) {
      warnings.push({
        level: WARN_LEVELS.ERROR,
        slot: 'quick_links',
        message: `Quick links rated ${ql_lbs} lbs are weaker than shock cord (${sc_lbs} lbs) — links will fail first`,
      })
    } else if (ql_lbs < sc_lbs * 1.2) {
      warnings.push({
        level: WARN_LEVELS.WARN,
        slot: 'quick_links',
        message: `Quick links (${ql_lbs} lbs) are only marginally stronger than shock cord (${sc_lbs} lbs)`,
      })
    }
  }

  // ── Quick link size vs shock cord width ──────────────────────────────────────
  // Quick link opening must be large enough for the cord to thread through.
  // A link's size_in is its wire gauge — the opening is roughly 3× that.
  if (config.quick_links && config.shock_cord?.specs.width_in) {
    const ql_opening = config.quick_links.specs.size_in * 3  // approximate opening
    const cord_width = config.shock_cord.specs.width_in
    if (ql_opening < cord_width) {
      warnings.push({
        level: WARN_LEVELS.ERROR,
        slot: 'quick_links',
        message: `Quick link opening (~${ql_opening.toFixed(2)}") is too small for ${cord_width}" cord — cord won't thread through`,
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
        level: WARN_LEVELS.ERROR,
        slot: 'chute_device',
        message: `${config.chute_device.name} max altitude is ${deploy_alt_max_ft.toLocaleString()} ft — deploy altitude ${deploy_ft.toLocaleString()} ft exceeds it`,
      })
    } else if (deploy_ft < deploy_alt_min_ft) {
      warnings.push({
        level: WARN_LEVELS.WARN,
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
        level: WARN_LEVELS.WARN,
        slot: 'deployment_bag',
        message: `${config.deployment_bag.name} (max ${bag_max}" chute) may be too small for ${chute_d}" main — chute may not pack cleanly`,
      })
    }
    // Axial length check: chute packed length should fit inside the bag's depth.
    // Bag packed_height_in is outer height; internal depth is ~80% of that.
    const bag_depth = config.deployment_bag.specs.packed_height_in * 0.8
    const chute_len = config.main_chute.specs.packed_length_in
    if (bag_depth > 0 && chute_len > 0 && chute_len > bag_depth * 1.5) {
      warnings.push({
        level: WARN_LEVELS.WARN,
        slot: 'deployment_bag',
        message: `Main chute packed length ${chute_len}" may not fit in ${config.deployment_bag.name} (est. ${bag_depth.toFixed(1)}" internal depth) — chute may stick out, defeating controlled deployment`,
      })
    }
  }

  // ── Swivel vs ejection load ───────────────────────────────────────────────────
  if (config.swivel && mass_kg) {
    const rated     = config.swivel.specs.rated_lbs
    const req_lbs   = (mass_kg * G_ACCEL * g_factor) / 4.448
    if (rated < req_lbs) {
      warnings.push({
        level: WARN_LEVELS.ERROR,
        slot: 'swivel',
        message: `Swivel rated ${rated} lbs may fail at ejection (need ~${Math.ceil(req_lbs)} lbs at ${g_factor}G for ${mass_kg.toFixed(1)} kg rocket)`,
      })
    } else if (rated < req_lbs * 1.5) {
      warnings.push({
        level: WARN_LEVELS.WARN,
        slot: 'swivel',
        message: `Swivel rated ${rated} lbs — marginal safety factor at ${g_factor}G ejection load (~${Math.ceil(req_lbs)} lbs required)`,
      })
    }
  }

  // ── Packed diameter fit check ────────────────────────────────────────────────
  // A chute's packed diameter must be ≤ airframe ID or it won't slide into the tube.
  if (airframe_id > 0) {
    for (const [slot, item] of [['main_chute', config.main_chute], ['drogue_chute', config.drogue_chute]]) {
      const pd = item?.specs.packed_diam_in
      if (pd && pd > airframe_id) {
        warnings.push({
          level: WARN_LEVELS.ERROR,
          slot,
          message: `${item.name} packed diameter ${pd}" exceeds airframe ID ${airframe_id}" — won't fit in tube`,
        })
      }
    }
  }

  // ── Bay volume / stacked volume ──────────────────────────────────────────────
  // Chutes stack axially and fill the tube cross-section — volume = bay_cross_area × packed_length.
  // Real packing is 60-75% efficient due to irregular shapes and dead space around
  // components. A 0.70 packing efficiency factor converts ideal linear stacking to
  // realistic usable volume.
  if (bay_volume > 0) {
    const PACKING_EFFICIENCY = 0.70  // real-world packing is ~70% of ideal linear stacking
    const effective_usable = usable_volume * PACKING_EFFICIENCY

    const chuteVol = (chuteSpecs) => {
      if (!chuteSpecs?.packed_length_in) return 0
      return bay_cross_area * chuteSpecs.packed_length_in
    }

    let stacked_vol = 0
    stacked_vol += chuteVol(config.main_chute?.specs)
    stacked_vol += chuteVol(config.drogue_chute?.specs)

    // Hardware items (chute protector, deployment bag, swivel) also occupy axial bay space
    if (config.chute_protector?.specs.packed_height_in)
      stacked_vol += bay_cross_area * config.chute_protector.specs.packed_height_in
    if (config.deployment_bag?.specs.packed_height_in)
      stacked_vol += bay_cross_area * config.deployment_bag.specs.packed_height_in
    if (config.swivel?.specs.packed_height_in)
      stacked_vol += bay_cross_area * config.swivel.specs.packed_height_in
    if (config.shock_cord?.specs.packed_height_in)
      stacked_vol += bay_cross_area * config.shock_cord.specs.packed_height_in

    if (stacked_vol > 0) {
      const obstrNote = obstruction_vol > 0 ? ` (${obstruction_vol.toFixed(1)} in³ obstructions subtracted)` : ''
      const pct = usable_volume > 0 ? Math.round((stacked_vol / effective_usable) * 100) : 100
      if (stacked_vol > effective_usable) {
        warnings.push({
          level: WARN_LEVELS.ERROR,
          slot: 'bay_volume',
          message: `Packed components ~${stacked_vol.toFixed(0)} in³ exceed ~${effective_usable.toFixed(0)} in³ effective bay capacity (70% packing efficiency of ${usable_volume.toFixed(0)} in³${obstrNote}) — won't close`,
        })
      } else if (stacked_vol > effective_usable * 0.85) {
        warnings.push({
          level: WARN_LEVELS.WARN,
          slot: 'bay_volume',
          message: `Bay is ${pct}% of effective capacity (~${stacked_vol.toFixed(0)} in³ of ~${effective_usable.toFixed(0)} in³ at 70% packing efficiency${obstrNote}) — very tight`,
        })
      }
    }
  }

  // ── Single-deploy warning ────────────────────────────────────────────────────
  if (config.main_chute && !config.drogue_chute) {
    warnings.push({
      level: WARN_LEVELS.WARN,
      slot: 'drogue_chute',
      message: 'No drogue chute — single deploy. Rocket will free-fall to main deploy altitude.',
    })
  }

  // ── Dual-deploy transition gap warning ──────────────────────────────────────
  // Between drogue release and main inflation, the rocket is in freefall.
  // A deployment bag gives controlled line-stretch deployment, reducing this gap.
  // Without one, the main may open at drogue descent speed → high opening shock.
  if (config.drogue_chute && config.main_chute && !config.deployment_bag) {
    warnings.push({
      level: WARN_LEVELS.WARN,
      slot: 'deployment_bag',
      message: 'Dual-deploy without a deployment bag — main chute opens uncontrolled at drogue speed. A d-bag reduces opening shock by 30-40% via controlled line deployment.',
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
      level: WARN_LEVELS.ERROR,
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
  if (slotWarnings.some(w => w.level === WARN_LEVELS.ERROR)) return 'error'
  if (slotWarnings.some(w => w.level === WARN_LEVELS.WARN))  return 'warn'
  return 'ok'
}
