import { normalizeCalculationInputs } from './schema.js'
import { computePackingVolume } from './compatibility.js'
import { WARN_LEVELS, PHYSICS } from './constants.js'

const Cx_MAP = { flat: 1.8, elliptical: 1.6, conical: 1.5, cruciform: 2.2, toroidal: 1.4 }

// ISA Troposphere air density helper (approximate for analysis dossier)
function isaDensityAtFt(alt_ft) {
  const alt_m = Math.max(0, alt_ft * PHYSICS.M_PER_FT)
  const T0 = 288.15
  const L = 0.0065
  const p0 = 101325
  const R = 287.058
  const g = PHYSICS.G
  if (alt_m > 11000) return 0.3639 // tropopause cap
  const T = T0 - L * alt_m
  const p = p0 * Math.pow(T / T0, g / (R * L))
  return p / (R * T)
}

/**
 * Build the canonical Analysis Review view model.
 * Pure function: deterministic, UI-independent, zero React dependencies.
 */
export function buildAnalysisReview({
  specs = {},
  config = {},
  customMotor = null,
  simulation = null,
  resultFresh = false,
  warnings = [],
}) {
  const isFresh = Boolean(simulation && resultFresh)
  const isStale = Boolean(simulation && !resultFresh)

  const usabilityState = isFresh ? 'CURRENT' : isStale ? 'STALE' : 'NOT_RUN'
  const methodIdentity = customMotor
    ? `THRUST CURVE / ${customMotor.designation || 'CUSTOM MOTOR'}`
    : simulation?.apogee_method?.toUpperCase() || 'NOT RUN'

  const errors = warnings.filter((w) => w.level === WARN_LEVELS.ERROR)
  const warnList = warnings.filter((w) => w.level === WARN_LEVELS.WARN)

  const reviewCounts = {
    errors: errors.length,
    warnings: warnList.length,
    total: warnings.length,
  }

  // If no simulation or stale, key outputs cannot establish definitive conclusions
  if (!isFresh) {
    const primaryReason = isStale
      ? 'Current result is stale because rocket specs or recovery hardware changed. Rerun simulation before relying on this analysis.'
      : 'No current simulation result is available yet. Run simulation to evaluate causality and response.'

    return {
      usabilityState,
      methodIdentity,
      primaryReason,
      reviewCounts,
      causalityRows: [],
      keyEstimates: null,
      methodDossier: null,
    }
  }

  // ── Derived Physics Calculations ──────────────────────────────────────────
  const { mass_kg, g_factor } = normalizeCalculationInputs(specs)
  const static_N = mass_kg * g_factor * PHYSICS.G
  const static_lbs = static_N * PHYSICS.LBS_PER_N

  const cord = config.shock_cord?.specs ?? null
  const cord_strength = cord?.strength_lbs ?? null
  const cord_sf = cord_strength && static_lbs > 0 ? cord_strength / static_lbs : null

  const main = config.main_chute?.specs ?? null
  const deploy_ft = simulation.deploy_ft || 500
  const drogue_fps = simulation.drogue_fps || 0
  let opening_shock_lbs = null
  if (main && drogue_fps > 0) {
    const rho = isaDensityAtFt(deploy_ft)
    const r_m = (main.diameter_in * PHYSICS.IN_TO_M) / 2
    const area_m2 = Math.PI * r_m * r_m
    const Cx = Cx_MAP[main.shape] ?? 1.8
    const v_mps = drogue_fps * PHYSICS.M_PER_FT
    const F_N = Cx * 0.5 * rho * v_mps * v_mps * area_m2
    opening_shock_lbs = F_N * PHYSICS.LBS_PER_N
  }

  const landing_fps = simulation.main_fps ?? simulation.drogue_fps ?? 0
  const ke_ftlbf = simulation.landing_ke_ftlbf ?? 0
  const snatch = simulation.main_snatch ?? null
  const packing = computePackingVolume({ config, specs })

  // ── Causality Board Rows Construction ─────────────────────────────────────
  // Decision chain: UNRESOLVED INPUT / ASSUMPTION -> AFFECTED OUTCOME -> FINDING -> NEXT ACTION
  const causalityRows = []

  // 1. Main Parachute & Descent Landing Energy
  if (main) {
    const fpsExceeded = landing_fps > 20
    const keExceeded = ke_ftlbf >= 100
    const fpsWarning = landing_fps > 15
    const keWarning = ke_ftlbf >= 75

    let severity = 'nominal'
    let findingText = `${landing_fps.toFixed(1)} ft/s · ${ke_ftlbf.toFixed(1)} ft-lbf landing KE`
    let actionLabel = 'Review main parachute selection'

    if (fpsExceeded || keExceeded) {
      severity = 'error'
      findingText = `Criterion exceeded: ${landing_fps.toFixed(1)} ft/s (>20 fps limit) or ${ke_ftlbf.toFixed(1)} ft-lbf KE (≥100 ft-lbf)`
      actionLabel = 'Select larger main parachute to reduce landing energy'
    } else if (fpsWarning || keWarning) {
      severity = 'warn'
      findingText = `Marginal landing speed: ${landing_fps.toFixed(1)} ft/s (15–20 fps range) or ${ke_ftlbf.toFixed(1)} ft-lbf KE`
      actionLabel = 'Consider larger canopy if landing on hard terrain'
    }

    causalityRows.push({
      id: 'main_descent_causality',
      driver: `${config.main_chute?.name || 'Main Parachute'} (${main.diameter_in}" diameter, Cd ${main.cd})`,
      driverPath: 'config.main_chute',
      affectedOutcome: 'Terminal Descent Velocity & Impact Energy',
      finding: findingText,
      severity,
      actionLabel,
      actionTarget: 'config.main_chute',
    })
  } else {
    causalityRows.push({
      id: 'no_main_causality',
      driver: 'Missing Main Parachute',
      driverPath: 'config.main_chute',
      affectedOutcome: 'Ground Impact Speed',
      finding: 'Critical: vehicle will impact ground at drogue terminal speed',
      severity: 'error',
      actionLabel: 'Add main parachute to configuration',
      actionTarget: 'config.main_chute',
    })
  }

  // 2. Shock Cord & Ejection / Snatch Loads
  if (cord) {
    const isSnatchExceeded = snatch?.status === 'exceeds_rating'
    const isStaticLow = cord_sf != null && cord_sf < (cord.material === 'nylon' ? 4 : 8)
    let severity = 'nominal'
    let findingText = `Static safety factor ${cord_sf ? cord_sf.toFixed(1) + '×' : '—'} · rated ${cord_strength} lbs`
    let actionLabel = 'Inspect shock cord harness strength'

    if (isSnatchExceeded) {
      severity = 'error'
      findingText = `Snatch model peak demand exceeds rated strength (${cord_strength} lbs)`
      actionLabel = 'Upgrade shock cord strength or lengthen harness'
    } else if (isStaticLow) {
      severity = 'warn'
      findingText = `Safety factor ${cord_sf?.toFixed(1)}× below recommended minimum`
      actionLabel = 'Review harness material and rating'
    }

    causalityRows.push({
      id: 'shock_cord_causality',
      driver: `${config.shock_cord?.name || 'Shock Cord'} (${cord.material || 'cord'}) at ${g_factor}G ejection`,
      driverPath: 'config.shock_cord',
      affectedOutcome: 'Ejection Impulse & Main Snatch Load',
      finding: findingText,
      severity,
      actionLabel,
      actionTarget: 'config.shock_cord',
    })
  }

  // 3. Main Deploy Altitude & Opening Shock
  if (simulation.deploy_ft != null) {
    const highOpeningShock =
      opening_shock_lbs && cord_strength && opening_shock_lbs > cord_strength * 0.7
    causalityRows.push({
      id: 'deploy_alt_causality',
      driver: `Main Deploy Altitude (${simulation.deploy_ft} ft AGL) & Drogue Speed (${drogue_fps.toFixed(1)} fps)`,
      driverPath: 'specs.main_deploy_alt_ft',
      affectedOutcome: 'Opening Shock Dynamic Pulse & Main Drift Initiation',
      finding: opening_shock_lbs
        ? `Est. opening shock ~${opening_shock_lbs.toFixed(0)} lbs${highOpeningShock ? ' (high relative to cord)' : ' (within typical margin)'}`
        : 'Deployment altitude sets drogue-to-main transition velocity',
      severity: highOpeningShock ? 'warn' : 'nominal',
      actionLabel: 'Review main deploy altitude and deployment bag',
      actionTarget: 'specs.main_deploy_alt_ft',
    })
  }

  // 4. Wind Profile & Lateral Drift
  if (specs.wind_speed_mph != null) {
    const drift_ft = simulation.drift_ft ?? 0
    const highDrift = drift_ft > 3000
    causalityRows.push({
      id: 'wind_drift_causality',
      driver: `Wind Profile (${specs.wind_speed_mph} mph surface) & Total Fall Time (${Math.round(simulation.total_time_s || 0)}s)`,
      driverPath: 'specs.wind_speed_mph',
      affectedOutcome: 'Lateral Drift Displacement & Recovery Walk Radius',
      finding: `Predicted drift ~${drift_ft.toLocaleString()} ft (${(drift_ft / 5280).toFixed(2)} mi)${highDrift ? ' — long walk distance' : ''}`,
      severity: highDrift ? 'warn' : 'nominal',
      actionLabel: 'Review wind speed assumptions and launch coordinates',
      actionTarget: 'specs.wind_speed_mph',
    })
  }

  // 5. Recovery Bay Packing Volume
  if (packing.bay_known) {
    const isOverflow = packing.fraction != null && packing.fraction > 1.0
    const isTight = packing.fraction != null && packing.fraction > 0.85
    causalityRows.push({
      id: 'packing_causality',
      driver: `Airframe ID ${specs.airframe_id_in}" × Length ${specs.bay_length_in}" (${packing.effective_in3.toFixed(1)} in³ usable)`,
      driverPath: 'specs.bay_length_in',
      affectedOutcome: 'Bay Volume Packing Clearance & Closure Feasibility',
      finding: isOverflow
        ? `Overfilled: components ~${packing.stacked_in3.toFixed(1)} in³ exceed ${packing.effective_in3.toFixed(1)} in³ effective capacity`
        : isTight
          ? `Tight packing: ${Math.round((packing.fraction || 0) * 100)}% of effective capacity utilized`
          : `Nominal volume: ~${packing.stacked_in3.toFixed(1)} in³ (${Math.round((packing.fraction || 0) * 100)}% of capacity)`,
      severity: isOverflow ? 'error' : isTight ? 'warn' : 'nominal',
      actionLabel: 'Review bay dimensions or select compact hardware',
      actionTarget: 'specs.bay_length_in',
    })
  }

  // Sort rows: errors first, then warnings, then nominal
  causalityRows.sort((a, b) => {
    const score = (s) => (s === 'error' ? 3 : s === 'warn' ? 2 : 1)
    return score(b.severity) - score(a.severity)
  })

  // ── Key Estimates ─────────────────────────────────────────────────────────
  const keyEstimates = {
    apogee_ft: simulation.apogee_ft,
    main_fps: simulation.main_fps,
    drogue_fps: simulation.drogue_fps,
    drift_ft: simulation.drift_ft,
    total_time_s: simulation.total_time_s,
    landing_ke_ftlbf: ke_ftlbf,
    static_lbs,
    opening_shock_lbs,
  }

  // ── Method Dossier (Audit Details) ────────────────────────────────────────
  const methodDossier = {
    ascentMethod: methodIdentity,
    isaDensitySeaLevel: isaDensityAtFt(0),
    isaDensityDeploy: isaDensityAtFt(deploy_ft),
    mass_kg,
    g_factor,
    staticImpulseFormula: 'F = m × G × g₀',
    terminalVelocityFormula: 'vt = √(2mg / (ρ · A · Cd))',
    kineticEnergyFormula: 'KE = ½ · m · v²',
  }

  return {
    usabilityState,
    methodIdentity,
    primaryReason: null,
    reviewCounts,
    causalityRows,
    keyEstimates,
    methodDossier,
  }
}
