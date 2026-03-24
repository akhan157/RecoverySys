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
  const T = 288.15 - 0.0065 * alt_m          // temperature K (lapse rate 6.5 K/km)
  return 1.225 * Math.pow(T / 288.15, 4.256) // ISA density ratio
}

/**
 * Compute terminal descent rate in ft/s for a parachute given chute specs
 * and rocket mass in kg.
 */
export function computeDescentRate(chuteSpecs, mass_kg) {
  const { diameter_in, cd } = chuteSpecs
  const radius_m = (diameter_in * 0.0254) / 2
  const area_m2  = Math.PI * radius_m * radius_m
  const v_mps    = Math.sqrt((2 * mass_kg * G) / (RHO_SL * cd * area_m2))
  return v_mps * FPS_PER_MPS
}

/**
 * Numerically integrate the powered + coast phases to find apogee.
 *
 * Powered phase (0 → burn_s):
 *   - Constant average thrust = impulse_ns / burn_s
 *   - Mass decreases linearly from total_mass to dry_mass
 *   - Aerodynamic drag applied throughout
 *
 * Coast phase (burn_s → apogee):
 *   - No thrust, constant dry_mass
 *   - Aerodynamic drag + gravity until v ≤ 0
 *
 * Returns apogee_m.
 */
function integrateAscent(impulse_ns, total_mass_kg, burn_s, area_m2, cd) {
  // Propellant mass via Tsiolkovsky / Isp estimate
  const prop_mass_kg = Math.min(
    impulse_ns / (APCP_ISP * G),
    total_mass_kg * 0.55   // cap at 55% of total (realistic for HPR)
  )
  const dry_mass_kg  = total_mass_kg - prop_mass_kg
  const avg_thrust   = impulse_ns / burn_s

  const dt = 0.05   // 50 ms time step — accurate enough, fast enough
  let v   = 0       // m/s upward
  let alt = 0       // m

  // ── Powered phase ────────────────────────────────────────────────────────────
  let t = 0
  while (t < burn_s) {
    const step  = Math.min(dt, burn_s - t)
    const m     = total_mass_kg - prop_mass_kg * (t / burn_s)
    const rho   = airDensity(alt)
    const drag  = 0.5 * rho * cd * area_m2 * v * Math.abs(v)
    const a     = (avg_thrust - drag - m * G) / m
    v   += a * step
    alt += v * step
    t   += step
  }

  // ── Coast phase ──────────────────────────────────────────────────────────────
  while (v > 0) {
    const rho  = airDensity(alt)
    const drag = 0.5 * rho * cd * area_m2 * v * v   // drag always opposes motion
    const a    = -(drag + dry_mass_kg * G) / dry_mass_kg
    v   += a * dt
    alt += v * dt
  }

  return Math.max(0, alt)
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

  if (burn_s > 0 && od_in > 0) {
    const radius_m = (od_in * 0.0254) / 2
    const area_m2  = Math.PI * radius_m * radius_m
    apogee_m      = integrateAscent(impulse, mass_kg, burn_s, area_m2, cd)
    apogee_method = 'integrated'    // ±10–15%
  } else if (burn_s > 0) {
    // No OD: use a default 4" airframe for drag area
    const area_m2 = Math.PI * (2 * 0.0254) * (2 * 0.0254)
    apogee_m      = integrateAscent(impulse, mass_kg, burn_s, area_m2, cd)
    apogee_method = 'integrated-no-od'
  } else {
    // Fallback heuristic when burn time is unknown
    const v_eff   = (impulse / mass_kg) * 0.5
    apogee_m      = (v_eff * v_eff) / (2 * G)
    apogee_method = 'heuristic'     // ±30%
  }

  const apogee_ft = apogee_m * FT_PER_M
  if (apogee_ft <= deploy_ft) return null

  // ── Descent rates ─────────────────────────────────────────────────────────────
  const drogue_fps = config.drogue_chute
    ? computeDescentRate(config.drogue_chute.specs, mass_kg)
    : 100    // ballistic near-free-fall

  const main_fps = config.main_chute
    ? computeDescentRate(config.main_chute.specs, mass_kg)
    : null

  // ── Phase timings ────────────────────────────────────────────────────────────
  const phase1_dist_ft = apogee_ft - deploy_ft
  const phase1_time_s  = phase1_dist_ft / drogue_fps
  const phase2_time_s  = main_fps ? deploy_ft / main_fps : null
  const total_time_s   = phase2_time_s != null ? phase1_time_s + phase2_time_s : null

  // ── Drift ─────────────────────────────────────────────────────────────────────
  const wind_fps = wind_mph * 5280 / 3600
  const drift_ft = wind_fps * (total_time_s ?? phase1_time_s)

  // ── Timeline ──────────────────────────────────────────────────────────────────
  const timeline = buildTimeline({ apogee_ft, drogue_fps, main_fps, deploy_ft, phase1_time_s, phase2_time_s })

  return {
    apogee_ft:      Math.round(apogee_ft),
    apogee_method,
    drogue_fps:     Math.round(drogue_fps),
    main_fps:       main_fps != null ? Math.round(main_fps * 10) / 10 : null,
    phase1_time_s:  Math.round(phase1_time_s),
    phase2_time_s:  phase2_time_s != null ? Math.round(phase2_time_s) : null,
    total_time_s:   total_time_s != null ? Math.round(total_time_s) : null,
    drift_ft:       Math.round(drift_ft),
    deploy_ft,
    timeline,
  }
}

function buildTimeline({ apogee_ft, drogue_fps, main_fps, deploy_ft, phase1_time_s, phase2_time_s }) {
  const points = []

  const steps1 = Math.max(30, Math.ceil(phase1_time_s / 2))
  for (let i = 0; i <= steps1; i++) {
    const t   = (i / steps1) * phase1_time_s
    const alt = apogee_ft - drogue_fps * t
    points.push({ t, alt: Math.max(deploy_ft, alt) })
  }

  if (main_fps != null && phase2_time_s != null) {
    const steps2 = Math.max(15, Math.ceil(phase2_time_s / 2))
    for (let i = 1; i <= steps2; i++) {
      const frac = i / steps2
      const t    = phase1_time_s + frac * phase2_time_s
      const alt  = deploy_ft - main_fps * frac * phase2_time_s
      points.push({ t, alt: Math.max(0, alt) })
    }
  }

  return points
}
