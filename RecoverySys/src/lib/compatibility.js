import { computeDescentRate } from './simulation.js'
import { WARN_LEVELS, PHYSICS } from './constants.js'
import { parseSpec } from './schema.js'

/**
 * Compatibility rules engine.
 *
 * Pass 1 + Pass 2 reviews flagged the previous structure (a single 483-LOC
 * imperative if-tree inside checkCompatibility) as the largest "function
 * doing too many jobs" smell in the codebase. This version keeps the same
 * public API but splits into:
 *
 *   - buildContext({config, specs})
 *       Derives every value the rules read (mass_kg, g_factor, deploy_alt,
 *       bay volumes, etc.) once at the top. Replaces the five copies of
 *       `parseFloat(specs.main_deploy_alt_ft) || 500` and friends.
 *
 *   - rule_*(ctx) functions
 *       Each rule family is a named function that takes ctx and returns
 *       `Warning[]`. Rules can be reordered, individually unit-tested, and
 *       new ones appended without growing the orchestrator.
 *
 *   - RULES array
 *       Ordered list of rule functions. Some rules read warnings emitted
 *       by earlier rules (the quick-links-vs-cord rule suppresses itself
 *       if a quick-links mass-error already fired) — for those, the rule
 *       takes (ctx, warningsSoFar). Order is preserved.
 *
 *   - checkCompatibility({config, specs})
 *       The orchestrator: build context, walk rules, return collected
 *       warnings. Public API unchanged.
 *
 * Magic numbers live in module-scope const blocks instead of being
 * scattered through rule bodies — Pass 2 specifically flagged the duplicate
 * 9.81/9.80665 and the inline 75/100/30/150 thresholds.
 */

const G_ACCEL = PHYSICS.G
const FT_PER_M  = PHYSICS.FT_PER_M
const N_PER_LBF = 1 / PHYSICS.LBS_PER_N

// Default values used when a spec is blank / out-of-range. These drove the
// repeated `|| 500` and `|| 0` fallbacks in the imperative version.
const DEFAULT_DEPLOY_ALT_FT = 500
const MID_DROGUE_ALT_FT     = 5000   // air ~15% thinner here vs sea level

// Rule thresholds — moving these out of rule bodies so a future tuning
// doesn't require finding them inside an if/else maze.
const PACKING_EFFICIENCY     = 0.70  // real-world packing is ~70% of ideal linear stacking
const KE_WARN_FTLBF          = 75    // NAR/TRA guideline
const KE_ERROR_FTLBF         = 100
const MAIN_FPS_WARN          = 15
const MAIN_FPS_ERROR         = 20
const MAIN_FPS_DRIFT_RISK    = 5
const DROGUE_FPS_TOO_SLOW    = 30
const DROGUE_FPS_TOO_FAST    = 150
const DEPLOY_ALT_LOW_WARN    = 200
const DEPLOY_ALT_HIGH_WARN   = 10000
const SF_MARGINAL_RATIO      = 1.5   // strength check warns if rated < required × this
const SF_MARGINAL_RATIO_QL   = 1.2   // looser ratio for ql-vs-cord (links rarely exceed cord by much)
const PACKING_TIGHT_RATIO    = 0.85  // bay volume warns above this fraction of capacity
const SHAPE_OPENING_FACTOR_Cx = { flat: 1.8, elliptical: 1.6, conical: 1.5, cruciform: 2.2, toroidal: 1.4 }
const Cx_DEFAULT             = 1.8
const QL_OPENING_RATIO       = 3     // quick-link opening ≈ 3× wire gauge

// Mass tiers for harness-length minimum (matches NAR/TRA L1/L2/L3 guidance).
const HARNESS_MIN_LENGTH_FT = (mass_kg) =>
  mass_kg >= 10 ? 15 : mass_kg >= 2.5 ? 10 : 5

// ── Context ─────────────────────────────────────────────────────────────────

function buildContext({ config, specs }) {
  const mass_g          = parseFloat(specs.rocket_mass_g)
  const airframe_id     = parseFloat(specs.airframe_id_in)  || 0
  const bay_length      = parseFloat(specs.bay_length_in)   || 0
  const bay_cross_area  = airframe_id > 0 ? Math.PI * Math.pow(airframe_id / 2, 2) : 0
  const bay_volume      = bay_cross_area > 0 && bay_length > 0 ? bay_cross_area * bay_length : 0
  const obstruction_vol = Math.max(0, parseFloat(specs.bay_obstruction_vol_in3) || 0)
  const usable_volume   = bay_volume > 0 ? Math.max(0, bay_volume - obstruction_vol) : 0
  const mass_kg         = mass_g > 0 ? mass_g / 1000 : null
  const deploy_alt_ft   = parseFloat(specs.main_deploy_alt_ft) || DEFAULT_DEPLOY_ALT_FT
  const deploy_alt_raw  = parseFloat(specs.main_deploy_alt_ft)  // unguarded for sanity rule

  // parseSpec returns null for ≤0 (treated as "auto") — keeps simulation,
  // compatibility, and SuggestPanel in lockstep.
  const g_factor_user = parseSpec('ejection_g_factor', specs.ejection_g_factor)
  const g_factor      = g_factor_user != null
    ? Math.max(5, g_factor_user)
    : (mass_kg != null && mass_kg >= 10 ? 30 : 20)

  // Required ejection-pull load in pound-force; used by shock-cord, quick-link,
  // swivel strength rules. Null when mass is missing (rules guard on this).
  const required_lbs = mass_kg != null ? (mass_kg * G_ACCEL * g_factor) / N_PER_LBF : null

  return {
    config, specs,
    mass_g, mass_kg,
    airframe_id, bay_length, bay_cross_area, bay_volume,
    obstruction_vol, usable_volume,
    g_factor, required_lbs,
    deploy_alt_ft, deploy_alt_raw,
  }
}

// ── Rule helpers ────────────────────────────────────────────────────────────

const err  = (slot, message) => ({ level: WARN_LEVELS.ERROR, slot, message })
const warn = (slot, message) => ({ level: WARN_LEVELS.WARN,  slot, message })

// Generic strength check: flags ERROR if rated < required, WARN if marginal.
// Returns 0-2 warnings; used by shock_cord, quick_links, swivel ejection-load checks.
function strengthCheck({ slot, rated_lbs, required_lbs, label, suffix = '', g_factor }) {
  if (!Number.isFinite(rated_lbs) || !Number.isFinite(required_lbs)) return []
  if (rated_lbs < required_lbs) {
    return [err(slot, `${label} rated ${rated_lbs} lbs may fail at ejection (need ~${Math.ceil(required_lbs)} lbs at ${g_factor}G${suffix})`)]
  }
  if (rated_lbs < required_lbs * SF_MARGINAL_RATIO) {
    return [warn(slot, `${label} rated ${rated_lbs} lbs — marginal safety factor at ${g_factor}G ejection load (~${Math.ceil(required_lbs)} lbs required)`)]
  }
  return []
}

// ── Rules ───────────────────────────────────────────────────────────────────

function rule_deployAltSanity(ctx) {
  const { deploy_alt_raw } = ctx
  if (!Number.isFinite(deploy_alt_raw)) return []
  if (deploy_alt_raw <= 0) {
    return [err('main_chute', `Deploy altitude ${deploy_alt_raw} ft is invalid — must be above ground level`)]
  }
  if (deploy_alt_raw < DEPLOY_ALT_LOW_WARN) {
    return [warn('main_chute', `Deploy altitude ${deploy_alt_raw} ft is dangerously low — minimum ${DEPLOY_ALT_LOW_WARN} ft recommended for reliable chute inflation`)]
  }
  if (deploy_alt_raw > DEPLOY_ALT_HIGH_WARN) {
    return [warn('main_chute', `Deploy altitude ${deploy_alt_raw.toLocaleString()} ft is unusually high — verify this is intentional`)]
  }
  return []
}

function rule_mainDescentRate(ctx) {
  const { config, mass_kg, deploy_alt_ft } = ctx
  if (!config.main_chute || !mass_kg) return []
  const { diameter_in, cd } = config.main_chute.specs
  const fps = computeDescentRate({ diameter_in, cd }, mass_kg, deploy_alt_ft)
  if (fps > MAIN_FPS_ERROR) return [err('main_chute', `Main descent rate ${fps.toFixed(1)} fps exceeds ${MAIN_FPS_ERROR} fps — hard landing risk`)]
  if (fps > MAIN_FPS_WARN)  return [warn('main_chute', `Main descent rate ${fps.toFixed(1)} fps is above ${MAIN_FPS_WARN} fps — consider a larger chute`)]
  if (fps < MAIN_FPS_DRIFT_RISK) return [warn('main_chute', `Main descent rate ${fps.toFixed(1)} fps is very slow — high drift risk`)]
  return []
}

function rule_landingKE(ctx) {
  const { config, mass_kg, deploy_alt_ft } = ctx
  if (!mass_kg) return []
  let landing_fps = null
  if (config.main_chute) {
    landing_fps = computeDescentRate(config.main_chute.specs, mass_kg, deploy_alt_ft)
  } else if (config.drogue_chute) {
    landing_fps = computeDescentRate(config.drogue_chute.specs, mass_kg)
  }
  if (!landing_fps || landing_fps <= 0) return []
  const landing_mps = landing_fps / FT_PER_M
  const ke_ftlbf = 0.5 * mass_kg * landing_mps * landing_mps * PHYSICS.J_TO_FTLBF
  if (ke_ftlbf > KE_ERROR_FTLBF) {
    return [err('main_chute', `Landing KE ~${Math.round(ke_ftlbf)} ft-lbf exceeds ${KE_ERROR_FTLBF} ft-lbf — high risk of damage or injury`)]
  }
  if (ke_ftlbf > KE_WARN_FTLBF) {
    return [warn('main_chute', `Landing KE ~${Math.round(ke_ftlbf)} ft-lbf exceeds ${KE_WARN_FTLBF} ft-lbf guideline — consider a larger main chute`)]
  }
  return []
}

function rule_drogueDescentRate(ctx) {
  const { config, mass_kg, deploy_alt_ft } = ctx
  if (!config.drogue_chute || !mass_kg) return []
  const { diameter_in, cd } = config.drogue_chute.specs
  const mid_alt = Math.max(deploy_alt_ft, MID_DROGUE_ALT_FT)
  const fps = computeDescentRate({ diameter_in, cd }, mass_kg, mid_alt)
  if (fps < DROGUE_FPS_TOO_SLOW) {
    return [warn('drogue_chute', `Drogue descent rate ${fps.toFixed(1)} fps is too slow — excessive drift before main deploy`)]
  }
  if (fps > DROGUE_FPS_TOO_FAST) {
    return [warn('drogue_chute', `Drogue descent rate ${fps.toFixed(1)} fps is very fast — high ejection shock load`)]
  }
  return []
}

function rule_openingShock(ctx) {
  const { config, mass_kg, deploy_alt_ft } = ctx
  if (!config.drogue_chute || !config.main_chute || !mass_kg) return []
  const drogue_at_deploy = computeDescentRate(config.drogue_chute.specs, mass_kg, deploy_alt_ft)
  const drogue_mps = drogue_at_deploy / FT_PER_M
  // ISA density at deploy altitude
  const _T  = 288.15 - 0.0065 * Math.min(deploy_alt_ft / FT_PER_M, 11000)
  const rho_deploy = (101325 * Math.pow(_T / 288.15, 5.2559)) / (287.058 * _T)
  const main_r_m   = (config.main_chute.specs.diameter_in * PHYSICS.IN_TO_M) / 2
  const main_area  = Math.PI * main_r_m * main_r_m
  const Cx         = SHAPE_OPENING_FACTOR_Cx[config.main_chute.specs.shape] || Cx_DEFAULT
  const F_open_N   = 0.5 * rho_deploy * drogue_mps * drogue_mps * config.main_chute.specs.cd * main_area * Cx
  const F_open_lbs = F_open_N / N_PER_LBF
  const cord_lbs   = config.shock_cord?.specs.strength_lbs
  const ql_lbs     = config.quick_links?.specs.strength_lbs
  const weakest    = Math.min(cord_lbs ?? Infinity, ql_lbs ?? Infinity)
  if (weakest === Infinity) return []
  if (F_open_lbs > weakest) {
    return [err('main_chute', `Main chute opening shock ~${Math.round(F_open_lbs)} lbs at ${drogue_at_deploy.toFixed(0)} fps may exceed hardware rated ${Math.round(weakest)} lbs — consider a deployment bag or reefing`)]
  }
  if (F_open_lbs > weakest * 0.7) {
    return [warn('main_chute', `Main chute opening shock ~${Math.round(F_open_lbs)} lbs at ${drogue_at_deploy.toFixed(0)} fps is close to hardware limit (${Math.round(weakest)} lbs)`)]
  }
  return []
}

function rule_shockCordStrength(ctx) {
  const { config, mass_kg, g_factor, required_lbs } = ctx
  if (!config.shock_cord || !mass_kg) return []
  const { strength_lbs, material, length_ft, elongation_pct } = config.shock_cord.specs

  // Strain energy display string (computed once, reused in static-load warning text).
  let strainNote = ''
  if (elongation_pct > 0 && length_ft > 0) {
    const peak_N    = mass_kg * g_factor * G_ACCEL
    const k         = (strength_lbs * N_PER_LBF) / (length_ft * PHYSICS.M_PER_FT * (elongation_pct / 100))
    const strain_J  = (peak_N * peak_N) / (2 * k)
    strainNote = ` Strain energy: ${strain_J.toFixed(1)} J.`
  }

  const out = []
  if (strength_lbs < required_lbs) {
    out.push(err('shock_cord', `Shock cord rated ${strength_lbs} lbs may fail at ejection (need ~${Math.ceil(required_lbs)} lbs at ${g_factor}G for ${mass_kg.toFixed(1)} kg rocket).${strainNote}`))
  } else if (strength_lbs < required_lbs * SF_MARGINAL_RATIO) {
    out.push(warn('shock_cord', `Shock cord rated ${strength_lbs} lbs — marginal safety factor at ${g_factor}G ejection load (~${Math.ceil(required_lbs)} lbs required).${strainNote}`))
  }

  // Dynamic snatch force multiplier from cord elongation.
  // F_dynamic ≈ F_static × sqrt(1 / elongation). Replaces the old hardcoded 2× Kevlar rule.
  if (elongation_pct > 0) {
    const snatch_multiplier = Math.sqrt(1 / (elongation_pct / 100))
    const dynamic_load_lbs  = required_lbs * snatch_multiplier
    if (strength_lbs < dynamic_load_lbs) {
      out.push({
        level: material === 'kevlar' ? WARN_LEVELS.ERROR : WARN_LEVELS.WARN,
        slot: 'shock_cord',
        message: `${material === 'kevlar' ? 'Kevlar' : 'Cord'} with ${elongation_pct}% elongation amplifies snatch force ~${snatch_multiplier.toFixed(1)}× (${Math.round(dynamic_load_lbs)} lbs dynamic vs. ${Math.ceil(required_lbs)} lbs static). Cord rated ${strength_lbs} lbs may fail. ${material === 'kevlar' ? 'Switch to tubular nylon or rate ≥' + Math.ceil(dynamic_load_lbs) + ' lbs.' : 'Consider a longer cord or higher rating.'}`,
      })
    } else if (strength_lbs < dynamic_load_lbs * SF_MARGINAL_RATIO) {
      out.push(warn('shock_cord', `Snatch force at ${elongation_pct}% elongation is ~${snatch_multiplier.toFixed(1)}× static load (~${Math.round(dynamic_load_lbs)} lbs) — marginal safety factor for ${strength_lbs} lbs cord`))
    }
  }

  // Cord/harness length tier check
  if (length_ft != null) {
    const min_length = HARNESS_MIN_LENGTH_FT(mass_kg)
    if (length_ft < min_length) {
      out.push(warn('shock_cord', `Harness length ${length_ft}ft may be insufficient — minimum ${min_length}ft recommended for this rocket class`))
    }
  }
  return out
}

function rule_chuteCordMaterialMismatch(ctx) {
  const { config } = ctx
  if (config.shock_cord?.specs.material === 'kevlar' && config.main_chute?.specs.material === 'nylon') {
    return [warn('shock_cord', 'Kevlar cord with nylon chute — mismatched elasticity. Kevlar transfers full snatch load to nylon canopy attachment points. Consider tubular nylon cord or adding a Kevlar shock cord protector/bungee section.')]
  }
  return []
}

function rule_chuteProtector(ctx) {
  const { config } = ctx
  if (!config.chute_protector || !config.main_chute) return []
  const { max_chute_diam_in } = config.chute_protector.specs
  const { diameter_in } = config.main_chute.specs
  if (max_chute_diam_in != null && diameter_in > max_chute_diam_in) {
    return [err('chute_protector', `${config.chute_protector.name} (max ${max_chute_diam_in}" chute) is too small for ${diameter_in}" main — chute may be scorched`)]
  }
  return []
}

function rule_quickLinksEjectionLoad(ctx) {
  const { config, mass_kg, g_factor, required_lbs } = ctx
  if (!config.quick_links || !mass_kg) return []
  return strengthCheck({
    slot: 'quick_links',
    rated_lbs: config.quick_links.specs.strength_lbs,
    required_lbs,
    label: 'Quick links',
    g_factor,
  })
}

// Skips itself if the prior quick_links mass-error already fired (avoids duplicate).
function rule_quickLinksVsCord(ctx, warningsSoFar) {
  const { config } = ctx
  if (!config.quick_links || !config.shock_cord) return []
  if (warningsSoFar.some(w => w.slot === 'quick_links' && w.level === WARN_LEVELS.ERROR)) return []
  const ql_lbs = config.quick_links.specs.strength_lbs
  const sc_lbs = config.shock_cord.specs.strength_lbs
  if (ql_lbs < sc_lbs) {
    return [err('quick_links', `Quick links rated ${ql_lbs} lbs are weaker than shock cord (${sc_lbs} lbs) — links will fail first`)]
  }
  if (ql_lbs < sc_lbs * SF_MARGINAL_RATIO_QL) {
    return [warn('quick_links', `Quick links (${ql_lbs} lbs) are only marginally stronger than shock cord (${sc_lbs} lbs)`)]
  }
  return []
}

function rule_quickLinkOpeningSize(ctx) {
  const { config } = ctx
  if (!config.quick_links || !config.shock_cord?.specs.width_in) return []
  const ql_opening = config.quick_links.specs.size_in * QL_OPENING_RATIO
  const cord_width = config.shock_cord.specs.width_in
  if (ql_opening < cord_width) {
    return [err('quick_links', `Quick link opening (~${ql_opening.toFixed(2)}") is too small for ${cord_width}" cord — cord won't thread through`)]
  }
  return []
}

function rule_chuteDeviceAltitudeBounds(ctx) {
  const { config, deploy_alt_raw } = ctx
  if (!config.chute_device?.specs.deploy_alt_max_ft) return []
  if (!Number.isFinite(deploy_alt_raw)) return []
  const { deploy_alt_min_ft, deploy_alt_max_ft } = config.chute_device.specs
  if (deploy_alt_raw > deploy_alt_max_ft) {
    return [err('chute_device', `${config.chute_device.name} max altitude is ${deploy_alt_max_ft.toLocaleString()} ft — deploy altitude ${deploy_alt_raw.toLocaleString()} ft exceeds it`)]
  }
  if (deploy_alt_raw < deploy_alt_min_ft) {
    return [warn('chute_device', `${config.chute_device.name} minimum altitude is ${deploy_alt_min_ft} ft — deploy altitude ${deploy_alt_raw} ft is below it`)]
  }
  return []
}

function rule_deploymentBagFit(ctx) {
  const { config } = ctx
  if (!config.deployment_bag || !config.main_chute) return []
  const out = []
  const bag_max = config.deployment_bag.specs.max_chute_diam_in
  const chute_d = config.main_chute.specs.diameter_in
  if (bag_max != null && chute_d > bag_max) {
    out.push(warn('deployment_bag', `${config.deployment_bag.name} (max ${bag_max}" chute) may be too small for ${chute_d}" main — chute may not pack cleanly`))
  }
  // Axial length: bag internal depth ~80% of outer height
  const bag_depth = (config.deployment_bag.specs.packed_height_in ?? 0) * 0.8
  const chute_len = config.main_chute.specs.packed_length_in
  if (bag_depth > 0 && chute_len > 0 && chute_len > bag_depth * 1.5) {
    out.push(warn('deployment_bag', `Main chute packed length ${chute_len}" may not fit in ${config.deployment_bag.name} (est. ${bag_depth.toFixed(1)}" internal depth) — chute may stick out, defeating controlled deployment`))
  }
  return out
}

function rule_swivelEjectionLoad(ctx) {
  const { config, mass_kg, g_factor, required_lbs } = ctx
  if (!config.swivel || !mass_kg) return []
  return strengthCheck({
    slot: 'swivel',
    rated_lbs: config.swivel.specs.rated_lbs,
    required_lbs,
    label: 'Swivel',
    suffix: ` for ${mass_kg.toFixed(1)} kg rocket`,
    g_factor,
  })
}

function rule_packedDiameterFit(ctx) {
  const { config, airframe_id } = ctx
  if (airframe_id <= 0) return []
  const out = []
  for (const [slot, item] of [['main_chute', config.main_chute], ['drogue_chute', config.drogue_chute]]) {
    const pd = item?.specs.packed_diam_in
    if (pd && pd > airframe_id) {
      out.push(err(slot, `${item.name} packed diameter ${pd}" exceeds airframe ID ${airframe_id}" — won't fit in tube`))
    }
  }
  return out
}

function rule_bayVolumeStacked(ctx) {
  const { config, bay_volume, bay_cross_area, usable_volume, obstruction_vol } = ctx
  if (bay_volume <= 0) return []
  const effective_usable = usable_volume * PACKING_EFFICIENCY
  const chuteVol = (s) => (s?.packed_length_in ? bay_cross_area * s.packed_length_in : 0)
  let stacked_vol = chuteVol(config.main_chute?.specs) + chuteVol(config.drogue_chute?.specs)
  for (const slot of ['chute_protector', 'deployment_bag', 'swivel', 'shock_cord']) {
    const h = config[slot]?.specs.packed_height_in
    if (h) stacked_vol += bay_cross_area * h
  }
  if (stacked_vol <= 0) return []
  const obstrNote = obstruction_vol > 0 ? ` (${obstruction_vol.toFixed(1)} in³ obstructions subtracted)` : ''
  if (stacked_vol > effective_usable) {
    return [err('bay_volume', `Packed components ~${stacked_vol.toFixed(0)} in³ exceed ~${effective_usable.toFixed(0)} in³ effective bay capacity (${Math.round(PACKING_EFFICIENCY * 100)}% packing efficiency of ${usable_volume.toFixed(0)} in³${obstrNote}) — won't close`)]
  }
  if (stacked_vol > effective_usable * PACKING_TIGHT_RATIO) {
    const pct = Math.round((stacked_vol / effective_usable) * 100)
    return [warn('bay_volume', `Bay is ${pct}% of effective capacity (~${stacked_vol.toFixed(0)} in³ of ~${effective_usable.toFixed(0)} in³ at ${Math.round(PACKING_EFFICIENCY * 100)}% packing efficiency${obstrNote}) — very tight`)]
  }
  return []
}

function rule_singleDeploy(ctx) {
  const { config } = ctx
  if (config.main_chute && !config.drogue_chute) {
    return [warn('drogue_chute', 'No drogue chute — single deploy. Rocket will free-fall to main deploy altitude.')]
  }
  return []
}

function rule_dualDeployNoBag(ctx) {
  const { config } = ctx
  if (config.drogue_chute && config.main_chute && !config.deployment_bag) {
    return [warn('deployment_bag', 'Dual-deploy without a deployment bag — main chute opens uncontrolled at drogue speed. A d-bag reduces opening shock by 30-40% via controlled line deployment.')]
  }
  return []
}

function rule_noMainChute(ctx) {
  const { config } = ctx
  const hasAnyComponent = !!(
    config.main_chute || config.drogue_chute || config.shock_cord ||
    config.chute_protector || config.deployment_bag || config.quick_links ||
    config.swivel || config.chute_device
  )
  if (!config.main_chute && hasAnyComponent) {
    return [err('main_chute', 'No main parachute selected — recovery system incomplete')]
  }
  return []
}

// Ordered rule registry. Order matters for one rule (rule_quickLinksVsCord
// suppresses itself when the earlier rule_quickLinksEjectionLoad already
// fired an error on the same slot) — see the (ctx, warningsSoFar) signature
// in the orchestrator below.
const RULES = [
  rule_deployAltSanity,
  rule_mainDescentRate,
  rule_landingKE,
  rule_drogueDescentRate,
  rule_openingShock,
  rule_shockCordStrength,
  rule_chuteCordMaterialMismatch,
  rule_chuteProtector,
  rule_quickLinksEjectionLoad,
  rule_quickLinksVsCord,           // reads warningsSoFar
  rule_quickLinkOpeningSize,
  rule_chuteDeviceAltitudeBounds,
  rule_deploymentBagFit,
  rule_swivelEjectionLoad,
  rule_packedDiameterFit,
  rule_bayVolumeStacked,
  rule_singleDeploy,
  rule_dualDeployNoBag,
  rule_noMainChute,
]

/**
 * Evaluate all compatibility rules for the current config + specs.
 *
 * Returns an array of warning objects:
 *   { level: 'warn' | 'error', slot: string, message: string }
 */
export function checkCompatibility({ config, specs }) {
  const ctx = buildContext({ config, specs })
  const warnings = []
  for (const rule of RULES) {
    // Rules that read warnings emitted by earlier rules use a 2-arg signature.
    const out = rule.length === 2 ? rule(ctx, warnings) : rule(ctx)
    if (out.length > 0) warnings.push(...out)
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
