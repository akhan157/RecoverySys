const G           = 9.81     // m/s²
const FT_PER_M    = 3.28084
const FPS_PER_MPS = 3.28084
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
  return v_mps * FPS_PER_MPS
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
  const od_in     = parseFloat(specs.airframe_od_in)
  const cd        = parseFloat(specs.drag_cd) || CD_DEFAULT
  const wind_mph  = parseFloat(specs.wind_speed_mph) || 0
  const deploy_ft = parseFloat(specs.main_deploy_alt_ft) || 500

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
  if (apogee_ft <= deploy_ft) return null

  // ── Descent rates — density-corrected at actual deployment altitude ───────────
  // Main: deploys at deploy_ft; drogue: average across its phase (apogee → deploy)
  const mid_drogue_ft = (apogee_ft + deploy_ft) / 2

  const drogue_fps = config.drogue_chute
    ? computeDescentRate(config.drogue_chute.specs, mass_kg, mid_drogue_ft)
    : 100    // ballistic near-free-fall

  const main_fps = config.main_chute
    ? computeDescentRate(config.main_chute.specs, mass_kg, deploy_ft)
    : null

  // ── Phase timings ────────────────────────────────────────────────────────────
  const phase1_dist_ft = apogee_ft - deploy_ft
  const phase1_time_s  = phase1_dist_ft / drogue_fps
  const phase2_time_s  = main_fps ? deploy_ft / main_fps : null
  const total_time_s   = phase2_time_s != null ? phase1_time_s + phase2_time_s : null

  // ── Drift ─────────────────────────────────────────────────────────────────────
  const wind_fps       = wind_mph * 5280 / 3600
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
