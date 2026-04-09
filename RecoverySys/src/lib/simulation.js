const G           = 9.81     // m/s²
const FT_PER_M    = 3.28084  // ft per metre (same ratio as fps per m/s)
const N_PER_LBF   = 4.448    // Newtons per pound-force (exact: 4.44822)
const MPH_TO_FPS  = 5280 / 3600   // mph → ft/s
const APCP_ISP    = 195      // s — typical APCP specific impulse (Isp)
const CD_DEFAULT  = 0.50    // typical subsonic HPR rocket drag coefficient
const RHO_SL      = 1.225   // kg/m³ — sea-level air density (ISA)

/**
 * International Standard Atmosphere (ISA) — troposphere only (< 11,000 m).
 * Returns air density in kg/m³ at a given altitude in metres.
 * More accurate than a constant 1.225 for flights above ~3,000 ft.
 */
function airDensity(alt_m) {
  // ISA troposphere valid to 11,000 m; clamp above that to avoid NaN from negative T
  const alt_clamped = Math.min(Math.max(0, alt_m), 11000)
  const T = 288.15 - 0.0065 * alt_clamped    // temperature K (lapse rate 6.5 K/km)
  return 1.225 * Math.pow(T / 288.15, 4.256) // ISA density ratio
}

/**
 * Compute terminal descent rate in ft/s for a parachute given chute specs,
 * rocket mass in kg, and optional deployment altitude in feet (default 0 = sea level).
 * Using the actual deploy altitude gives a more accurate (faster) descent rate at altitude.
 */
export function computeDescentRate(chuteSpecs, mass_kg, altitude_ft = 0) {
  const { diameter_in, cd } = chuteSpecs
  if (!cd || cd <= 0 || !diameter_in || diameter_in <= 0) return 0
  const radius_m = (diameter_in * 0.0254) / 2
  const area_m2  = Math.PI * radius_m * radius_m
  const rho      = airDensity(altitude_ft / FT_PER_M)
  const v_mps    = Math.sqrt((2 * mass_kg * G) / (rho * cd * area_m2))
  return v_mps * FT_PER_M
}

/**
 * Numerically integrate the powered + coast phases to find apogee.
 * Collects ascent trajectory points sampled every ~0.5 s for charting.
 *
 * Returns { apogee_m, burnout_t_s, ascentTimeline: [{t, alt}] }
 * where alt is in feet and t is seconds from liftoff.
 */
function integrateAscent(impulse_ns, total_mass_kg, burn_s, area_m2, cd) {
  // Propellant mass via Tsiolkovsky / Isp estimate
  const prop_mass_kg = Math.min(
    impulse_ns / (APCP_ISP * G),
    total_mass_kg * 0.55   // cap at 55% of total (realistic for HPR)
  )
  const dry_mass_kg  = total_mass_kg - prop_mass_kg
  const avg_thrust   = impulse_ns / burn_s

  const dt = 0.05   // 50 ms time step
  let v   = 0       // m/s upward
  let alt = 0       // m
  let t   = 0       // s from liftoff

  const ascentTimeline = [{ t: 0, alt: 0 }]  // start on the pad
  let lastSampled = 0

  const V_MAX = 3400  // m/s — ~Mach 10 hard cap; beyond this the sim is unphysical

  // ── Powered phase ────────────────────────────────────────────────────────────
  while (t < burn_s) {
    const step  = Math.min(dt, burn_s - t)
    const m     = total_mass_kg - prop_mass_kg * (t / burn_s)
    const rho   = airDensity(alt)
    const drag  = 0.5 * rho * cd * area_m2 * v * Math.abs(v)
    const a     = (avg_thrust - drag - m * G) / m
    v   += a * step
    alt += v * step
    t   += step
    // Guard: if NaN/Infinity crept in (e.g. extreme mass/impulse ratio), abort
    if (!isFinite(v) || !isFinite(alt) || Math.abs(v) > V_MAX) return { apogee_m: NaN, burnout_t_s: t, ascentTimeline }
    if (t - lastSampled >= 0.5) {
      ascentTimeline.push({ t: +t.toFixed(2), alt: Math.max(0, alt) * FT_PER_M })
      lastSampled = t
    }
  }
  const burnout_t_s = +t.toFixed(2)

  // ── Coast phase ──────────────────────────────────────────────────────────────
  let coast_iters = 0
  while (v > 0 && coast_iters < 100000) {
    coast_iters++
    const rho  = airDensity(alt)
    const drag = 0.5 * rho * cd * area_m2 * v * v   // drag always opposes motion
    const a    = -(drag + dry_mass_kg * G) / dry_mass_kg
    v   += a * dt
    alt += v * dt
    t   += dt
    if (!isFinite(v) || !isFinite(alt)) return { apogee_m: NaN, burnout_t_s, ascentTimeline }
    if (t - lastSampled >= 0.5) {
      ascentTimeline.push({ t: +t.toFixed(2), alt: Math.max(0, alt) * FT_PER_M })
      lastSampled = t
    }
  }

  const apogee_m = Math.max(0, alt)
  // Ensure the apogee point is always the last entry
  ascentTimeline.push({ t: +t.toFixed(2), alt: apogee_m * FT_PER_M })

  return { apogee_m, burnout_t_s, ascentTimeline }
}

// Safety factor thresholds by material (nylon stretches more = absorbs more energy = lower threshold ok)
const SF_THRESHOLDS = {
  nylon:  { pass: 4, warn: 2 },
  kevlar: { pass: 8, warn: 4 },   // kevlar: ~3% elongation, almost no energy absorption
}

/**
 * Compute shock cord load analysis at ejection.
 *
 * peak_load_lbs  = mass_kg × G_factor × 9.81 / N_PER_LBF   (static impulse model)
 * k_N_per_m      = (strength_lbs × 4.448) / (length_ft × 0.3048 × elongation_pct / 100)
 * strain_energy_J = peak_load_N² / (2 × k)
 * safety_factor  = strength_lbs / peak_load_lbs
 *
 * Returns null if cord specs are missing or invalid.
 */
export function computeShockLoad(cordSpecs, mass_kg, g_factor) {
  if (!cordSpecs) return null
  const { strength_lbs, length_ft, elongation_pct, material } = cordSpecs
  if (!strength_lbs || !length_ft || !elongation_pct || mass_kg <= 0 || !g_factor || g_factor <= 0) return null

  const peak_load_N   = mass_kg * g_factor * G
  const peak_load_lbs = peak_load_N / N_PER_LBF

  const k_N_per_m     = (strength_lbs * N_PER_LBF) / (length_ft * 0.3048 * (elongation_pct / 100))
  const strain_energy_J = (peak_load_N * peak_load_N) / (2 * k_N_per_m)

  const safety_factor = strength_lbs / peak_load_lbs

  const thresholds = SF_THRESHOLDS[material] ?? SF_THRESHOLDS.nylon
  const sf_status = safety_factor >= thresholds.pass ? 'pass'
    : safety_factor >= thresholds.warn ? 'warn'
    : 'fail'

  return {
    peak_load_lbs:   Math.round(peak_load_lbs),
    safety_factor:   Math.round(safety_factor * 10) / 10,
    strain_energy_J: Math.round(strain_energy_J * 10) / 10,
    sf_status,
    sf_thresholds:   thresholds,
    material:        material ?? 'nylon',
  }
}

/**
 * Compute predicted drift from launch site given wind and descent phases.
 *
 * Returns { drift_ft, drift_m, bearing_deg, land_lat, land_lon, … } or null.
 *   drift_ft        — total horizontal distance drifted downwind (feet)
 *   bearing_deg     — direction rocket drifts toward (downwind bearing, 0=N)
 *   land_lat/lon    — predicted landing coords (when launch_lat/lon provided)
 */
export function computeDrift({ simulation, specs }) {
  if (!simulation) return null

  const wind_mph   = parseFloat(specs.wind_speed_mph)
  const wind_deg   = parseFloat(specs.wind_direction_deg)  // met convention: direction wind comes FROM
  const launch_lat = parseFloat(specs.launch_lat)
  const launch_lon = parseFloat(specs.launch_lon)

  if (!wind_mph || wind_mph <= 0) return null

  const wind_fps = wind_mph * MPH_TO_FPS   // mph → ft/s

  const { drogue_fps, main_fps, apogee_ft, deploy_ft } = simulation
  if (!drogue_fps || !apogee_ft) return null

  // Drogue phase: apogee → main deploy altitude
  const drogue_span    = Math.max(0, apogee_ft - (deploy_ft || 500))
  const drogue_time_s  = drogue_fps > 0 ? drogue_span / drogue_fps : 0
  const drogue_drift_ft = wind_fps * drogue_time_s

  // Main phase: main deploy altitude → ground
  const main_span    = deploy_ft || 500
  const main_time_s  = (main_fps && main_fps > 0) ? main_span / main_fps : 0
  const main_drift_ft = wind_fps * main_time_s

  const drift_ft = drogue_drift_ft + main_drift_ft
  const drift_m  = drift_ft / FT_PER_M

  // Wind direction (met convention): wind FROM wind_deg → rocket drifts TOWARD (wind_deg + 180) % 360
  // If wind direction not provided, bearing is unknown (null) — never default to north (misleading)
  const bearing_deg = isFinite(wind_deg) ? (wind_deg + 180) % 360 : null

  // Great-circle landing coords — only computable when bearing is known
  let land_lat = null, land_lon = null
  if (bearing_deg !== null && isFinite(launch_lat) && isFinite(launch_lon) && drift_m > 0) {
    const R    = 6371000  // Earth radius m
    const lat1 = launch_lat * Math.PI / 180
    const lon1 = launch_lon * Math.PI / 180
    const brng = bearing_deg * Math.PI / 180
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(drift_m / R) +
                           Math.cos(lat1) * Math.sin(drift_m / R) * Math.cos(brng))
    const lon2 = lon1 + Math.atan2(
      Math.sin(brng) * Math.sin(drift_m / R) * Math.cos(lat1),
      Math.cos(drift_m / R) - Math.sin(lat1) * Math.sin(lat2)
    )
    land_lat = lat2 * 180 / Math.PI
    land_lon = lon2 * 180 / Math.PI
  }

  return {
    drift_ft:        Math.round(drift_ft),
    drift_m:         Math.round(drift_m),
    drogue_drift_ft: Math.round(drogue_drift_ft),
    main_drift_ft:   Math.round(main_drift_ft),
    drogue_time_s:   Math.round(drogue_time_s),
    main_time_s:     Math.round(main_time_s),
    bearing_deg,
    land_lat,
    land_lon,
  }
}

/**
 * Run the simulation.
 *
 * Apogee method:
 *   With burn_time_s → numerical integration (±10–15%)
 *   Without           → impulse/mass heuristic (±30%)
 *
 * Returns null if required inputs are missing/invalid.
 */
export function runSimulation({ specs, config }) {
  const mass_g    = parseFloat(specs.rocket_mass_g)
  const impulse   = parseFloat(specs.motor_total_impulse_ns)
  const burn_s    = parseFloat(specs.burn_time_s)
  const od_in     = parseFloat(specs.airframe_id_in)   // uses inner diameter as proxy for OD (wall thickness negligible for sim)
  const cd        = parseFloat(specs.drag_cd) || CD_DEFAULT
  const wind_mph  = parseFloat(specs.wind_speed_mph) || 0
  const deploy_ft = parseFloat(specs.main_deploy_alt_ft) || 500
  const g_factor  = parseFloat(specs.ejection_g_factor) || 20

  if (!mass_g || !impulse || mass_g <= 0 || impulse <= 0) return null

  const mass_kg = mass_g / 1000

  // ── Apogee ───────────────────────────────────────────────────────────────────
  let apogee_m
  let apogee_method
  let apogee_t_s   = 0     // seconds from liftoff to apogee (0 for heuristic)
  let burnout_t_s  = null  // seconds from liftoff to burnout (null for heuristic)
  let ascentTimeline = null

  if (burn_s > 0 && od_in > 0) {
    const radius_m = (od_in * 0.0254) / 2
    const area_m2  = Math.PI * radius_m * radius_m
    const result   = integrateAscent(impulse, mass_kg, burn_s, area_m2, cd)
    apogee_m       = result.apogee_m
    burnout_t_s    = result.burnout_t_s
    ascentTimeline = result.ascentTimeline
    apogee_t_s     = result.ascentTimeline[result.ascentTimeline.length - 1].t
    apogee_method  = 'integrated'    // ±10–15%
  } else if (burn_s > 0) {
    // No OD: use a default 4" airframe for drag area
    const area_m2 = Math.PI * (2 * 0.0254) * (2 * 0.0254)
    const result  = integrateAscent(impulse, mass_kg, burn_s, area_m2, cd)
    apogee_m      = result.apogee_m
    burnout_t_s   = result.burnout_t_s
    ascentTimeline = result.ascentTimeline
    apogee_t_s    = result.ascentTimeline[result.ascentTimeline.length - 1].t
    apogee_method = 'integrated-no-od'
  } else {
    // Fallback heuristic when burn time is unknown
    const v_eff   = (impulse / mass_kg) * 0.5
    apogee_m      = (v_eff * v_eff) / (2 * G)
    apogee_method = 'heuristic'     // ±30%
  }

  const apogee_ft = apogee_m * FT_PER_M
  if (!isFinite(apogee_ft) || apogee_ft <= deploy_ft) return null

  // ── Descent rates — density-corrected at actual deployment altitude ───────────
  // Main: deploys at deploy_ft; drogue: average across its phase (apogee → deploy)
  const mid_drogue_ft = (apogee_ft + deploy_ft) / 2

  const drogue_fps_raw = config.drogue_chute
    ? computeDescentRate(config.drogue_chute.specs, mass_kg, mid_drogue_ft)
    : 100    // ballistic near-free-fall
  // Guard: 0 fps (degenerate chute specs) causes division-by-zero → Infinity → infinite loop
  // in buildTimeline. Return null to surface a simFailed state rather than hanging the tab.
  if (drogue_fps_raw <= 0) return null
  const drogue_fps = drogue_fps_raw

  const main_fps = config.main_chute
    ? computeDescentRate(config.main_chute.specs, mass_kg, deploy_ft)
    : null

  // ── Phase timings ────────────────────────────────────────────────────────────
  const phase1_dist_ft = apogee_ft - deploy_ft
  const phase1_time_s  = phase1_dist_ft / drogue_fps
  const phase2_time_s  = main_fps ? deploy_ft / main_fps : null
  const total_time_s   = phase2_time_s != null ? phase1_time_s + phase2_time_s : null

  // ── Drift ─────────────────────────────────────────────────────────────────────
  const wind_fps       = wind_mph * MPH_TO_FPS
  const effective_time = main_fps
    ? (total_time_s ?? phase1_time_s)
    : phase1_time_s + (deploy_ft / drogue_fps)
  const drift_ft = wind_fps * effective_time

  // ── Round display values before building timeline so chart matches metrics ─────
  const main_fps_rounded   = main_fps != null ? Math.round(main_fps * 10) / 10 : null
  const drogue_fps_rounded = Math.round(drogue_fps)

  // ── Timeline ──────────────────────────────────────────────────────────────────
  const descentTimeline = buildTimeline({
    apogee_ft,
    drogue_fps: drogue_fps_rounded,
    main_fps:   main_fps_rounded,
    deploy_ft,
    phase1_time_s,
    phase2_time_s,
    offset: apogee_t_s,
  })

  // Combine ascent + descent (drop last ascent point = apogee to avoid duplicate)
  const timeline = ascentTimeline && ascentTimeline.length > 1
    ? [...ascentTimeline.slice(0, -1), ...descentTimeline]
    : descentTimeline

  const shock_load = computeShockLoad(
    config.shock_cord?.specs ?? null,
    mass_kg,
    g_factor,
  )

  return {
    apogee_ft:      Math.round(apogee_ft),
    apogee_method,
    apogee_t_s:     Math.round(apogee_t_s),
    burnout_t_s:    burnout_t_s != null ? Math.round(burnout_t_s) : null,
    drogue_fps:     drogue_fps_rounded,
    main_fps:       main_fps_rounded,
    phase1_time_s:  Math.round(phase1_time_s),
    phase2_time_s:  phase2_time_s != null ? Math.round(phase2_time_s) : null,
    total_time_s:   total_time_s != null ? Math.round(total_time_s) : null,
    drift_ft:       Math.round(drift_ft),
    deploy_ft,
    timeline,
    shock_load,    // null if no cord selected
  }
}

function buildTimeline({ apogee_ft, drogue_fps, main_fps, deploy_ft, phase1_time_s, phase2_time_s, offset = 0 }) {
  const points = []

  const steps1 = Math.max(30, Math.ceil(phase1_time_s / 2))
  for (let i = 0; i <= steps1; i++) {
    const t   = offset + (i / steps1) * phase1_time_s
    const alt = apogee_ft - drogue_fps * (i / steps1) * phase1_time_s
    points.push({ t, alt: Math.max(deploy_ft, alt) })
  }

  if (main_fps != null && phase2_time_s != null) {
    const steps2 = Math.max(15, Math.ceil(phase2_time_s / 2))
    for (let i = 1; i <= steps2; i++) {
      const frac = i / steps2
      const t    = offset + phase1_time_s + frac * phase2_time_s
      const alt  = deploy_ft - main_fps * frac * phase2_time_s
      points.push({ t, alt: Math.max(0, alt) })
    }
  }

  return points
}
