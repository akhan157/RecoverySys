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
 * Interpolate wind speed & direction at a given altitude from a set of wind layers.
 * Layers are sorted by altitude; below the lowest layer uses the lowest value,
 * above the highest uses the highest value.
 *
 * Each layer: { alt_ft, speed_mph, direction_deg }
 * Returns { speed_mph, direction_deg }
 */
function interpolateWind(alt_ft, layers) {
  if (!layers || layers.length === 0) return { speed_mph: 0, direction_deg: 0 }
  if (layers.length === 1) return { speed_mph: layers[0].speed_mph, direction_deg: layers[0].direction_deg }

  // Sort by altitude
  const sorted = [...layers].sort((a, b) => a.alt_ft - b.alt_ft)

  // Below lowest layer
  if (alt_ft <= sorted[0].alt_ft) return { speed_mph: sorted[0].speed_mph, direction_deg: sorted[0].direction_deg }
  // Above highest layer
  if (alt_ft >= sorted[sorted.length - 1].alt_ft) {
    const top = sorted[sorted.length - 1]
    return { speed_mph: top.speed_mph, direction_deg: top.direction_deg }
  }

  // Find bracketing layers
  for (let i = 0; i < sorted.length - 1; i++) {
    if (alt_ft >= sorted[i].alt_ft && alt_ft <= sorted[i + 1].alt_ft) {
      const lo = sorted[i], hi = sorted[i + 1]
      const frac = (alt_ft - lo.alt_ft) / (hi.alt_ft - lo.alt_ft)
      // Linear interpolation for speed
      const speed_mph = lo.speed_mph + frac * (hi.speed_mph - lo.speed_mph)
      // Angular interpolation for direction (shortest path around 360°)
      let dDir = hi.direction_deg - lo.direction_deg
      if (dDir > 180) dDir -= 360
      if (dDir < -180) dDir += 360
      const direction_deg = ((lo.direction_deg + frac * dDir) % 360 + 360) % 360
      return { speed_mph, direction_deg }
    }
  }
  const last = sorted[sorted.length - 1]
  return { speed_mph: last.speed_mph, direction_deg: last.direction_deg }
}

/**
 * Parse wind layers from specs. Supports up to 3 layers (surface, mid, aloft).
 * Falls back to the single wind_speed_mph / wind_direction_deg if no layers are set.
 * Returns array of { alt_ft, speed_mph, direction_deg } sorted by altitude.
 */
export function parseWindLayers(specs) {
  const layers = []

  // Layer 0 — Surface
  const s0_speed = parseFloat(specs.wind_speed_mph)
  const s0_dir   = parseFloat(specs.wind_direction_deg)
  if (s0_speed > 0 && isFinite(s0_dir)) {
    layers.push({
      alt_ft: parseFloat(specs.wind_surface_alt_ft) || 0,
      speed_mph: s0_speed,
      direction_deg: s0_dir,
    })
  }

  // Layer 1 — Mid altitude
  const s1_speed = parseFloat(specs.wind_mid_speed_mph)
  const s1_dir   = parseFloat(specs.wind_mid_direction_deg)
  const s1_alt   = parseFloat(specs.wind_mid_alt_ft)
  if (s1_speed > 0 && s1_alt > 0) {
    layers.push({ alt_ft: s1_alt, speed_mph: s1_speed, direction_deg: isFinite(s1_dir) ? s1_dir : 0 })
  }

  // Layer 2 — Aloft
  const s2_speed = parseFloat(specs.wind_aloft_speed_mph)
  const s2_dir   = parseFloat(specs.wind_aloft_direction_deg)
  const s2_alt   = parseFloat(specs.wind_aloft_alt_ft)
  if (s2_speed > 0 && s2_alt > 0) {
    layers.push({ alt_ft: s2_alt, speed_mph: s2_speed, direction_deg: isFinite(s2_dir) ? s2_dir : 0 })
  }

  return layers.sort((a, b) => a.alt_ft - b.alt_ft)
}

/**
 * Project a point from (lat, lon) given a bearing (degrees) and distance (metres).
 * Returns { lat, lon } in decimal degrees.
 */
function projectPoint(lat_deg, lon_deg, bearing_deg, dist_m) {
  const R    = 6371000
  const lat1 = lat_deg * Math.PI / 180
  const lon1 = lon_deg * Math.PI / 180
  const brng = bearing_deg * Math.PI / 180
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dist_m / R) +
    Math.cos(lat1) * Math.sin(dist_m / R) * Math.cos(brng)
  )
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(dist_m / R) * Math.cos(lat1),
    Math.cos(dist_m / R) - Math.sin(lat1) * Math.sin(lat2)
  )
  return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI }
}

/**
 * Compute predicted drift using altitude-binned wind layers.
 * Steps the rocket down in altitude increments, sampling wind at each altitude
 * to accumulate X/Y displacement (east/north components).
 *
 * Returns { drift_ft, drift_m, bearing_deg, land_lat, land_lon,
 *           drogue_drift_ft, main_drift_ft, drogue_time_s, main_time_s,
 *           drogue_vector, main_vector } or null.
 */
export function computeDrift({ simulation, specs }) {
  if (!simulation) return null

  const layers = parseWindLayers(specs)
  if (layers.length === 0) return null

  const launch_lat = parseFloat(specs.launch_lat)
  const launch_lon = parseFloat(specs.launch_lon)
  const hasCoords  = isFinite(launch_lat) && isFinite(launch_lon)

  const { drogue_fps, main_fps, apogee_ft, deploy_ft } = simulation
  if (!drogue_fps || !apogee_ft) return null

  const ALT_STEP = 100  // ft per integration step

  // Accumulate east/north displacement in feet
  let dx_ft = 0, dy_ft = 0  // east, north
  let drogue_dx = 0, drogue_dy = 0
  let main_dx = 0, main_dy = 0
  let drogue_time_s = 0, main_time_s = 0

  // Phase 1: Drogue — apogee → deploy_ft
  const deploy = deploy_ft || 500
  let alt = apogee_ft
  while (alt > deploy) {
    const step_ft = Math.min(ALT_STEP, alt - deploy)
    const mid_alt = alt - step_ft / 2
    const wind    = interpolateWind(mid_alt, layers)
    const wind_fps_local = wind.speed_mph * MPH_TO_FPS
    const dt      = step_ft / drogue_fps  // time to fall this step
    // Wind blows FROM direction_deg → drift TOWARD (direction_deg + 180)
    const drift_bearing = (wind.direction_deg + 180) % 360
    const bearing_rad   = drift_bearing * Math.PI / 180
    const step_east  = wind_fps_local * dt * Math.sin(bearing_rad)
    const step_north = wind_fps_local * dt * Math.cos(bearing_rad)
    drogue_dx += step_east
    drogue_dy += step_north
    drogue_time_s += dt
    alt -= step_ft
  }

  // Phase 2: Main — deploy_ft → ground
  alt = deploy
  const effective_main_fps = (main_fps && main_fps > 0) ? main_fps : drogue_fps
  while (alt > 0) {
    const step_ft = Math.min(ALT_STEP, alt)
    const mid_alt = alt - step_ft / 2
    const wind    = interpolateWind(Math.max(0, mid_alt), layers)
    const wind_fps_local = wind.speed_mph * MPH_TO_FPS
    const dt      = step_ft / effective_main_fps
    const drift_bearing = (wind.direction_deg + 180) % 360
    const bearing_rad   = drift_bearing * Math.PI / 180
    const step_east  = wind_fps_local * dt * Math.sin(bearing_rad)
    const step_north = wind_fps_local * dt * Math.cos(bearing_rad)
    main_dx += step_east
    main_dy += step_north
    main_time_s += dt
    alt -= step_ft
  }

  dx_ft = drogue_dx + main_dx
  dy_ft = drogue_dy + main_dy

  const drift_ft = Math.sqrt(dx_ft * dx_ft + dy_ft * dy_ft)
  const drift_m  = drift_ft / FT_PER_M
  const drogue_drift_ft = Math.sqrt(drogue_dx * drogue_dx + drogue_dy * drogue_dy)
  const main_drift_ft   = Math.sqrt(main_dx * main_dx + main_dy * main_dy)

  // Net bearing from displacement vector
  const bearing_deg = drift_ft > 0
    ? ((Math.atan2(dx_ft, dy_ft) * 180 / Math.PI) + 360) % 360
    : null

  // Landing coords
  let land_lat = null, land_lon = null
  if (bearing_deg !== null && hasCoords && drift_m > 0) {
    const pt = projectPoint(launch_lat, launch_lon, bearing_deg, drift_m)
    land_lat = pt.lat
    land_lon = pt.lon
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
    // Phase vectors for map rendering (east/north displacements in feet)
    drogue_vector: { dx_ft: drogue_dx, dy_ft: drogue_dy },
    main_vector:   { dx_ft: main_dx,   dy_ft: main_dy },
  }
}

/**
 * Run Monte Carlo dispersion simulation.
 * Randomizes wind speed (±30%) and direction (±15°) per layer per iteration
 * to produce a scatter of landing points.
 *
 * Returns { scatter: [{lat, lon}], ellipse: {cx, cy, rx, ry, angle}, meanDrift }
 * or null if insufficient data.
 */
export function runDispersionMonteCarlo({ simulation, specs, iterations = 500 }) {
  if (!simulation) return null

  const baseLayers = parseWindLayers(specs)
  if (baseLayers.length === 0) return null

  const launch_lat = parseFloat(specs.launch_lat)
  const launch_lon = parseFloat(specs.launch_lon)
  if (!isFinite(launch_lat) || !isFinite(launch_lon)) return null

  const { drogue_fps, main_fps, apogee_ft, deploy_ft } = simulation
  if (!drogue_fps || !apogee_ft) return null

  const ALT_STEP = 200  // coarser steps for MC performance
  const deploy = deploy_ft || 500
  const effective_main_fps = (main_fps && main_fps > 0) ? main_fps : drogue_fps

  // Seeded random with Box-Muller for Gaussian noise
  function gaussRand() {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }

  const scatter = []

  for (let i = 0; i < iterations; i++) {
    // Perturb each wind layer independently
    const perturbedLayers = baseLayers.map(layer => ({
      alt_ft: layer.alt_ft,
      speed_mph: Math.max(0, layer.speed_mph * (1 + 0.30 * gaussRand())),
      direction_deg: ((layer.direction_deg + 15 * gaussRand()) % 360 + 360) % 360,
    }))

    let dx_ft = 0, dy_ft = 0

    // Drogue phase
    let alt = apogee_ft
    while (alt > deploy) {
      const step_ft = Math.min(ALT_STEP, alt - deploy)
      const mid_alt = alt - step_ft / 2
      const wind = interpolateWind(mid_alt, perturbedLayers)
      const wind_fps_local = wind.speed_mph * MPH_TO_FPS
      const dt = step_ft / drogue_fps
      const drift_bearing = (wind.direction_deg + 180) % 360
      const bearing_rad = drift_bearing * Math.PI / 180
      dx_ft += wind_fps_local * dt * Math.sin(bearing_rad)
      dy_ft += wind_fps_local * dt * Math.cos(bearing_rad)
      alt -= step_ft
    }

    // Main phase
    alt = deploy
    while (alt > 0) {
      const step_ft = Math.min(ALT_STEP, alt)
      const mid_alt = alt - step_ft / 2
      const wind = interpolateWind(Math.max(0, mid_alt), perturbedLayers)
      const wind_fps_local = wind.speed_mph * MPH_TO_FPS
      const dt = step_ft / effective_main_fps
      const drift_bearing = (wind.direction_deg + 180) % 360
      const bearing_rad = drift_bearing * Math.PI / 180
      dx_ft += wind_fps_local * dt * Math.sin(bearing_rad)
      dy_ft += wind_fps_local * dt * Math.cos(bearing_rad)
      alt -= step_ft
    }

    // Convert displacement to lat/lon
    const drift_ft = Math.sqrt(dx_ft * dx_ft + dy_ft * dy_ft)
    const drift_m  = drift_ft / FT_PER_M
    const bearing  = ((Math.atan2(dx_ft, dy_ft) * 180 / Math.PI) + 360) % 360
    if (drift_m > 0) {
      const pt = projectPoint(launch_lat, launch_lon, bearing, drift_m)
      scatter.push(pt)
    }
  }

  if (scatter.length < 10) return null

  // Compute 2σ confidence ellipse from scatter
  const ellipse = fitConfidenceEllipse(scatter)

  // Mean drift distance
  const meanLat = scatter.reduce((s, p) => s + p.lat, 0) / scatter.length
  const meanLon = scatter.reduce((s, p) => s + p.lon, 0) / scatter.length

  return { scatter, ellipse, meanLat, meanLon }
}

/**
 * Fit a 2σ (95%) confidence ellipse to a set of {lat, lon} points.
 * Returns { cx, cy, rx, ry, angle_deg } where cx/cy are center lat/lon,
 * rx/ry are semi-axes in metres, and angle_deg is rotation from north (CW).
 */
export function fitConfidenceEllipse(points) {
  const n = points.length
  if (n < 3) return null

  const cx = points.reduce((s, p) => s + p.lat, 0) / n
  const cy = points.reduce((s, p) => s + p.lon, 0) / n

  // Convert to local meters (approximate for small areas)
  const m_per_deg_lat = 111320
  const m_per_deg_lon = 111320 * Math.cos(cx * Math.PI / 180)

  // Compute covariance matrix in meters
  let sxx = 0, syy = 0, sxy = 0
  for (const p of points) {
    const x = (p.lon - cy) * m_per_deg_lon  // east
    const y = (p.lat - cx) * m_per_deg_lat  // north
    sxx += x * x
    syy += y * y
    sxy += x * y
  }
  sxx /= (n - 1)
  syy /= (n - 1)
  sxy /= (n - 1)

  // Eigenvalues of 2x2 covariance matrix
  const trace = sxx + syy
  const det   = sxx * syy - sxy * sxy
  const disc  = Math.sqrt(Math.max(0, trace * trace / 4 - det))
  const lambda1 = trace / 2 + disc
  const lambda2 = trace / 2 - disc

  // 2σ scale factor for 95% confidence (chi-squared with 2 DOF, p=0.05 → 5.991)
  const scale = Math.sqrt(5.991)

  const rx = scale * Math.sqrt(Math.max(0, lambda1))  // semi-major in metres
  const ry = scale * Math.sqrt(Math.max(0, lambda2))  // semi-minor in metres

  // Rotation angle (angle of the major axis from east, CW)
  const angle_rad = Math.atan2(2 * sxy, sxx - syy) / 2
  // Convert to degrees from north (geographic convention)
  const angle_deg = (90 - angle_rad * 180 / Math.PI + 360) % 360

  return { cx, cy, rx, ry, angle_deg }
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
  const g_factor  = Math.max(1, parseFloat(specs.ejection_g_factor) || 20)

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
  // in buildTimeline. Return null so the caller can surface a failure state.
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
