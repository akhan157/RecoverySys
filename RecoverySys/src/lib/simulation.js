import { parseSpec } from './schema.js'

/**
 * ── Known constraints & simplifications ─────────────────────────────────────
 *
 * ASCENT
 *  1. 1-DOF vertical only — no launch angle, weathercocking, or wind-induced
 *     trajectory tilt. WHY: a 5-10° rail angle + weathercocking reduces apogee
 *     2-5% and shifts it downwind. On windy L3 flights this means your waiver
 *     ceiling check is optimistic by several hundred feet.
 *
 *  2. Cd(M) curve assumes a 4:1 ogive. WHY: a Von Karman 5:1 has ~15% less
 *     transonic drag; a blunt payload fairing has ~30% more. If your rocket
 *     goes transonic, the generic curve could mis-predict apogee by 5-10%.
 *
 *  3. Propellant mass capped at 55-60% of total mass. WHY: prevents negative
 *     dry mass from bad user input, but some experimental motors exceed this.
 *     If yours does, the sim underpredicts apogee because it thinks the rocket
 *     is heavier than it actually is post-burnout.
 *
 *  4. APCP Isp hardcoded at 195s. WHY: used to estimate propellant mass when
 *     no .eng file is imported. Sugar motors (Isp ~140s) get overestimated
 *     prop mass → lower predicted apogee. Hybrids (Isp ~230s) get the
 *     opposite. Import your .eng file to bypass this entirely.
 *
 *  5. No rail friction or launch guide losses. WHY: for small motors on heavy
 *     rockets, rail friction can eat 5-15 m/s. The sim starts at v=0 with
 *     full thrust, so it overpredicts apogee for marginal-thrust launches.
 *
 * DESCENT
 *  6. Single terminal velocity per phase — no transient acceleration after
 *     chute deploy. WHY: after ejection the rocket starts at ~0 fps and takes
 *     3-10s to reach terminal. During that time it falls slower → more time
 *     at altitude → 5-15% more drift than predicted. Biggest effect on short
 *     drogue phases (low apogee, high deploy alt).
 *
 *  7. Drogue descent rate sampled at one mid-altitude point. WHY: air density
 *     increases ~40% from 15,000 ft to ground. Terminal velocity drops
 *     accordingly. The single-point average biases phase timing by ~5%.
 *
 *  8. Parachute Cd treated as constant. WHY: real chutes oscillate ±15-30°
 *     during descent, reducing time-averaged Cd by 5-15%. A squidded
 *     (tangled/partially inflated) chute can have 30-50% less Cd. The parts
 *     catalog Cd is the manufacturer's ideal rated value.
 *
 * DRIFT
 *  9. Instant wind coupling — no horizontal inertia. WHY: the parachute must
 *     drag the rocket mass horizontally through wind shear layers. The sim
 *     assumes instant matching, slightly overestimating drift for profiles
 *     with sharp wind direction changes.
 *
 * 10. Wind profile is linearly interpolated between 3 layers. WHY: real
 *     surface layers follow a logarithmic profile (friction layer). The
 *     linear model underestimates wind speed in the first ~300 ft AGL where
 *     the rocket is closest to people and obstacles.
 *
 * SHOCK LOAD
 * 11. Static impulse model (F = m × G × g₀). WHY: real ejection is a
 *     pressure pulse where peak cord load depends on separation velocity,
 *     bay volume, and cord slack. Two rockets with the same G-factor but
 *     different bay lengths will see different peak loads. The G-factor
 *     approach is standard in HPR but can be off by ±30%.
 *
 * 12. Linear elastic cord model. WHY: nylon is nonlinear above ~10% strain
 *     — it stiffens, storing more energy than the linear model predicts.
 *     The strain energy calculation is conservative (underestimates) for
 *     high-load events near cord failure.
 *
 * OPENING SHOCK
 * 13. Cx = 1.8 for all chute shapes. WHY: flat circular chutes are ~1.8,
 *     conical ~1.5, cruciform ~2.2. A deployment bag reduces effective Cx
 *     by 30-40%. Without shape-specific data, the warning may over- or
 *     under-report the actual opening shock by ~30%.
 *
 * LANDING KE
 * 14. Uses terminal velocity at deploy altitude, not actual ground-impact
 *     speed. WHY: air is denser at ground level → actual landing speed is
 *     3-5% slower than predicted. The KE check is slightly conservative
 *     (reports higher KE than actual), which is the safe direction.
 *
 * MONTE CARLO
 * 15. Apogee perturbation is linear (apogee × impulse / mass / Cd) instead
 *     of re-integrating the ascent. WHY: re-running RK4 per MC iteration
 *     would be 500× slower. The linearization misses nonlinear threshold
 *     effects — e.g., +3% impulse pushing the rocket transonic, where the
 *     drag jump would change the sensitivity dramatically.
 *
 * 16. Wind layer perturbations are independent. WHY: real weather correlates
 *     layers (same pressure system). Independent perturbation slightly
 *     overpredicts the width of the dispersion ellipse vs. reality.
 * ────────────────────────────────────────────────────────────────────────────
 */

const G           = 9.80665  // m/s² (standard gravity)
const FT_PER_M    = 3.28084  // ft per metre
const N_PER_LBF   = 4.448    // Newtons per pound-force
const MPH_TO_FPS  = 5280 / 3600   // mph → ft/s
const APCP_ISP    = 195      // s — typical APCP specific impulse (see constraint #4)
const CD_DEFAULT  = 0.50     // typical subsonic HPR drag coefficient
const GAMMA       = 1.4      // ratio of specific heats for air
const R_AIR       = 287.058  // J/(kg·K) — specific gas constant for dry air

// ── ISA Atmosphere ──────────────────────────────────────────────────────────

/**
 * International Standard Atmosphere (ISA) — full troposphere model.
 * Returns { rho, T, P, a } at a given altitude in metres.
 *   rho = air density (kg/m³)
 *   T   = temperature (K)
 *   P   = pressure (Pa)
 *   a   = speed of sound (m/s)
 */
function isa(alt_m) {
  const h = Math.min(Math.max(0, alt_m), 11000)
  const T = 288.15 - 0.0065 * h
  const P = 101325 * Math.pow(T / 288.15, 5.2559)
  const rho = P / (R_AIR * T)
  const a = Math.sqrt(GAMMA * R_AIR * T)
  return { rho, T, P, a }
}

function airDensity(alt_m) { return isa(alt_m).rho }

// ── Mach-dependent drag ─────────────────────────────────────────────────────

/**
 * Cd adjusted for Mach number. Piecewise curve for 4:1 ogive HPR rockets.
 * The user-entered Cd is the subsonic baseline; this scales it through the
 * transonic drag rise and supersonic regime.
 */
function cdAtMach(mach, cd_sub) { // constraint #2: generic 4:1 ogive curve
  if (mach <= 0.6) return cd_sub
  if (mach <= 0.8) return cd_sub * (1.0 + 0.1 * (mach - 0.6) / 0.2)
  if (mach <= 1.0) return cd_sub * (1.1 + 0.7 * (mach - 0.8) / 0.2)
  if (mach <= 1.2) return cd_sub * (1.8 - 0.2 * (mach - 1.0) / 0.2)
  if (mach <= 2.0) return cd_sub * (1.6 - 0.4 * (mach - 1.2) / 0.8)
  return cd_sub * 1.2
}

// ── Descent rate ────────────────────────────────────────────────────────────

export function computeDescentRate(chuteSpecs, mass_kg, altitude_ft = 0) {
  const { diameter_in, cd } = chuteSpecs
  if (!cd || cd <= 0 || !diameter_in || diameter_in <= 0) return 0
  const radius_m = (diameter_in * 0.0254) / 2
  const area_m2  = Math.PI * radius_m * radius_m
  const rho      = airDensity(altitude_ft / FT_PER_M)
  const v_mps    = Math.sqrt((2 * mass_kg * G) / (rho * cd * area_m2))
  return v_mps * FT_PER_M
}

// ── Thrust curve interpolation ──────────────────────────────────────────────

export function interpolateThrust(t, curve) {
  if (!curve || curve.length === 0) return 0
  if (t <= curve[0].t) return curve[0].thrust_N
  if (t >= curve[curve.length - 1].t) return 0
  for (let i = 1; i < curve.length; i++) {
    if (t <= curve[i].t) {
      const lo = curve[i - 1], hi = curve[i]
      const frac = (t - lo.t) / (hi.t - lo.t)
      return lo.thrust_N + frac * (hi.thrust_N - lo.thrust_N)
    }
  }
  return 0
}

// ── RK4 Ascent Integration ──────────────────────────────────────────────────

/**
 * Precompute cumulative impulse array for Tsiolkovsky mass depletion.
 * This lets mass_at_t track how much propellant has actually been consumed
 * based on the thrust profile, not just elapsed time.
 */
function buildCumulativeImpulse(curve) {
  const cum = [0]
  for (let i = 1; i < curve.length; i++) {
    const dt = curve[i].t - curve[i - 1].t
    cum.push(cum[i - 1] + 0.5 * (curve[i - 1].thrust_N + curve[i].thrust_N) * dt)
  }
  return cum
}

function interpCumImpulse(t, curve, cum) {
  if (t <= curve[0].t) return 0
  if (t >= curve[curve.length - 1].t) return cum[cum.length - 1]
  for (let i = 1; i < curve.length; i++) {
    if (t <= curve[i].t) {
      const frac = (t - curve[i - 1].t) / (curve[i].t - curve[i - 1].t)
      return cum[i - 1] + frac * (cum[i] - cum[i - 1])
    }
  }
  return cum[cum.length - 1]
}

/**
 * 4th-order Runge-Kutta ascent integration with:
 *   - Mach-dependent drag (transonic rise)
 *   - Tsiolkovsky mass depletion (thrust-proportional when curve provided)
 *   - Full ISA atmosphere (density + speed of sound)
 *
 * State: [altitude_m, velocity_m/s]
 * Returns { apogee_m, burnout_t_s, ascentTimeline: [{t, alt}] }
 */
function integrateAscent(impulse_ns, total_mass_kg, burn_s, area_m2, cd_sub, curve = null, propMass_kg_override = null) {
  const prop_mass_kg = propMass_kg_override != null && propMass_kg_override > 0
    ? Math.min(propMass_kg_override, total_mass_kg * 0.60)  // constraint #3: cap prevents negative dry mass
    : Math.min(impulse_ns / (APCP_ISP * G), total_mass_kg * 0.55) // constraint #4: Isp=195 assumes APCP
  const dry_mass_kg = total_mass_kg - prop_mass_kg
  const avg_thrust  = impulse_ns / burn_s
  const useCurve    = Array.isArray(curve) && curve.length >= 2

  // Precompute cumulative impulse for Tsiolkovsky mass tracking
  let cumImpulse = null
  let totalCurveImpulse = impulse_ns
  if (useCurve) {
    cumImpulse = buildCumulativeImpulse(curve)
    const last = cumImpulse[cumImpulse.length - 1]
    if (last > 0) totalCurveImpulse = last
  }

  function massAt(t) {
    if (t >= burn_s) return dry_mass_kg
    if (useCurve) {
      const burned = interpCumImpulse(t, curve, cumImpulse)
      return total_mass_kg - prop_mass_kg * Math.min(burned / totalCurveImpulse, 1.0)
    }
    return total_mass_kg - prop_mass_kg * (t / burn_s)
  }

  function thrustAt(t) {
    if (t >= burn_s) return 0
    return useCurve ? interpolateThrust(t, curve) : avg_thrust
  }

  // Derivative: d[h, v]/dt = [v, (T - D - mg) / m]
  function deriv(t, h, v) {
    const atm = isa(Math.max(0, h))
    const m   = massAt(t)
    const F_thrust = thrustAt(t)
    const speed    = Math.abs(v)
    const mach     = atm.a > 0 ? speed / atm.a : 0
    const cd_eff   = cdAtMach(mach, cd_sub)
    const F_drag   = 0.5 * atm.rho * cd_eff * area_m2 * v * Math.abs(v)
    const dv = (F_thrust - F_drag - m * G) / m  // constraint #1: vertical only, #5: no rail losses
    return { dh: v, dv }
  }

  const dt = 0.02  // 20ms RK4 step
  let t   = 0
  let h   = 0  // m
  let v   = 0  // m/s

  const V_MAX = 3400
  const ascentTimeline = [{ t: 0, alt: 0 }]
  let lastSampled = 0

  // RK4 integration loop
  const maxTime = burn_s + 300
  while (t < maxTime) {
    // Apogee: velocity crosses zero after burnout
    if (t > burn_s && v <= 0) break

    const step = Math.min(dt, burn_s - t > 0 && burn_s - t < dt ? burn_s - t : dt)

    // RK4 stages
    const k1 = deriv(t, h, v)
    const k2 = deriv(t + step / 2, h + k1.dh * step / 2, v + k1.dv * step / 2)
    const k3 = deriv(t + step / 2, h + k2.dh * step / 2, v + k2.dv * step / 2)
    const k4 = deriv(t + step, h + k3.dh * step, v + k3.dv * step)

    h += (step / 6) * (k1.dh + 2 * k2.dh + 2 * k3.dh + k4.dh)
    v += (step / 6) * (k1.dv + 2 * k2.dv + 2 * k3.dv + k4.dv)
    t += step

    if (!isFinite(v) || !isFinite(h) || Math.abs(v) > V_MAX) {
      return { apogee_m: NaN, burnout_t_s: t, ascentTimeline }
    }

    if (t - lastSampled >= 0.5) {
      ascentTimeline.push({ t: +t.toFixed(2), alt: Math.max(0, h) * FT_PER_M })
      lastSampled = t
    }
  }

  const apogee_m = Math.max(0, h)
  ascentTimeline.push({ t: +t.toFixed(2), alt: apogee_m * FT_PER_M })
  const burnout_t_s = +Math.min(burn_s, t).toFixed(2)

  return { apogee_m, burnout_t_s, ascentTimeline }
}

// ── Shock load ──────────────────────────────────────────────────────────────

const SF_THRESHOLDS = {
  nylon:  { pass: 4, warn: 2 },
  kevlar: { pass: 8, warn: 4 },
}

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

// ── Wind interpolation ──────────────────────────────────────────────────────

function interpolateWind(alt_ft, layers) {
  if (!layers || layers.length === 0) return { speed_mph: 0, direction_deg: 0 }
  if (layers.length === 1) return { speed_mph: layers[0].speed_mph, direction_deg: layers[0].direction_deg }

  const sorted = [...layers].sort((a, b) => a.alt_ft - b.alt_ft)
  if (alt_ft <= sorted[0].alt_ft) return { speed_mph: sorted[0].speed_mph, direction_deg: sorted[0].direction_deg }
  if (alt_ft >= sorted[sorted.length - 1].alt_ft) {
    const top = sorted[sorted.length - 1]
    return { speed_mph: top.speed_mph, direction_deg: top.direction_deg }
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    if (alt_ft >= sorted[i].alt_ft && alt_ft <= sorted[i + 1].alt_ft) {
      const lo = sorted[i], hi = sorted[i + 1]
      const frac = (alt_ft - lo.alt_ft) / (hi.alt_ft - lo.alt_ft)
      const speed_mph = lo.speed_mph + frac * (hi.speed_mph - lo.speed_mph)
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

export function parseWindLayers(specs) {
  const layers = []

  const s0_speed = parseFloat(specs.wind_speed_mph)
  const s0_dir   = parseFloat(specs.wind_direction_deg)
  if (s0_speed > 0 && isFinite(s0_dir)) {
    layers.push({
      alt_ft: parseFloat(specs.wind_surface_alt_ft) || 0,
      speed_mph: s0_speed,
      direction_deg: s0_dir,
    })
  }

  const s1_speed = parseFloat(specs.wind_mid_speed_mph)
  const s1_dir   = parseFloat(specs.wind_mid_direction_deg)
  const s1_alt   = parseFloat(specs.wind_mid_alt_ft)
  if (s1_speed > 0 && s1_alt > 0) {
    layers.push({ alt_ft: s1_alt, speed_mph: s1_speed, direction_deg: isFinite(s1_dir) ? s1_dir : 0 })
  }

  const s2_speed = parseFloat(specs.wind_aloft_speed_mph)
  const s2_dir   = parseFloat(specs.wind_aloft_direction_deg)
  const s2_alt   = parseFloat(specs.wind_aloft_alt_ft)
  if (s2_speed > 0 && s2_alt > 0) {
    layers.push({ alt_ft: s2_alt, speed_mph: s2_speed, direction_deg: isFinite(s2_dir) ? s2_dir : 0 })
  }

  return layers.sort((a, b) => a.alt_ft - b.alt_ft)
}

// ── Geo projection ──────────────────────────────────────────────────────────

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

// ── Drift ───────────────────────────────────────────────────────────────────

export function computeDrift({ simulation, specs }) {
  if (!simulation) return null

  const layers = parseWindLayers(specs)
  if (layers.length === 0) return null

  const launch_lat = parseFloat(specs.launch_lat)
  const launch_lon = parseFloat(specs.launch_lon)
  const hasCoords  = isFinite(launch_lat) && isFinite(launch_lon)

  const { drogue_fps, main_fps, apogee_ft, deploy_ft } = simulation
  if (!drogue_fps || !apogee_ft) return null

  const ALT_STEP = 100
  let dx_ft = 0, dy_ft = 0
  let drogue_dx = 0, drogue_dy = 0
  let main_dx = 0, main_dy = 0
  let drogue_time_s = 0, main_time_s = 0

  const deploy = deploy_ft || 500
  let alt = apogee_ft
  while (alt > deploy) {
    const step_ft = Math.min(ALT_STEP, alt - deploy)
    const mid_alt = alt - step_ft / 2
    const wind    = interpolateWind(mid_alt, layers)
    const wind_fps_local = wind.speed_mph * MPH_TO_FPS
    const dt      = step_ft / drogue_fps
    const drift_bearing = (wind.direction_deg + 180) % 360
    const bearing_rad   = drift_bearing * Math.PI / 180
    drogue_dx += wind_fps_local * dt * Math.sin(bearing_rad)
    drogue_dy += wind_fps_local * dt * Math.cos(bearing_rad)
    drogue_time_s += dt
    alt -= step_ft
  }

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
    main_dx += wind_fps_local * dt * Math.sin(bearing_rad)
    main_dy += wind_fps_local * dt * Math.cos(bearing_rad)
    main_time_s += dt
    alt -= step_ft
  }

  dx_ft = drogue_dx + main_dx
  dy_ft = drogue_dy + main_dy

  const drift_ft = Math.sqrt(dx_ft * dx_ft + dy_ft * dy_ft)
  const drift_m  = drift_ft / FT_PER_M
  const drogue_drift_ft = Math.sqrt(drogue_dx * drogue_dx + drogue_dy * drogue_dy)
  const main_drift_ft   = Math.sqrt(main_dx * main_dx + main_dy * main_dy)

  const bearing_deg = drift_ft > 0
    ? ((Math.atan2(dx_ft, dy_ft) * 180 / Math.PI) + 360) % 360
    : null

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
    drogue_vector: { dx_ft: drogue_dx, dy_ft: drogue_dy },
    main_vector:   { dx_ft: main_dx,   dy_ft: main_dy },
  }
}

// ── Monte Carlo Dispersion ──────────────────────────────────────────────────

/**
 * Multi-parameter Monte Carlo dispersion.
 * Perturbs: wind (±30% speed, ±15° dir), Cd (±10%), mass (±2%),
 * deploy altitude (±50 ft), motor impulse (±3%).
 *
 * constraint #15: apogee perturbation is linear scaling, not re-integrated.
 * constraint #16: wind layers perturbed independently (real weather correlates them).
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

  const ALT_STEP = 200
  const deploy = deploy_ft || 500
  const effective_main_fps = (main_fps && main_fps > 0) ? main_fps : drogue_fps

  function gaussRand() {
    let u = 0, v = 0
    while (u === 0) u = Math.random()
    while (v === 0) v = Math.random()
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }

  const scatter = []

  for (let i = 0; i < iterations; i++) {
    // Multi-parameter perturbation
    const mass_factor    = 1 + 0.02 * gaussRand()   // ±2% mass uncertainty
    const impulse_factor = 1 + 0.03 * gaussRand()   // ±3% motor lot variation
    const cd_factor      = 1 + 0.10 * gaussRand()   // ±10% Cd uncertainty
    const deploy_pert    = Math.max(100, deploy + 50 * gaussRand())  // ±50 ft altimeter error

    // Apogee scales with impulse, inversely with mass and Cd (approximate)
    const apogee_pert = apogee_ft * impulse_factor / (mass_factor * cd_factor)

    // Descent rates scale with sqrt(mass_factor) (heavier = faster descent)
    const drogue_pert = drogue_fps * Math.sqrt(mass_factor)
    const main_pert   = effective_main_fps * Math.sqrt(mass_factor)

    const perturbedLayers = baseLayers.map(layer => ({
      alt_ft: layer.alt_ft,
      speed_mph: Math.max(0, layer.speed_mph * (1 + 0.30 * gaussRand())),
      direction_deg: ((layer.direction_deg + 15 * gaussRand()) % 360 + 360) % 360,
    }))

    let dx_ft = 0, dy_ft = 0

    // Drogue phase
    let alt = apogee_pert
    while (alt > deploy_pert) {
      const step_ft = Math.min(ALT_STEP, alt - deploy_pert)
      const mid_alt = alt - step_ft / 2
      const wind = interpolateWind(mid_alt, perturbedLayers)
      const wind_fps_local = wind.speed_mph * MPH_TO_FPS
      const dt = step_ft / drogue_pert
      const drift_bearing = (wind.direction_deg + 180) % 360
      const bearing_rad = drift_bearing * Math.PI / 180
      dx_ft += wind_fps_local * dt * Math.sin(bearing_rad)
      dy_ft += wind_fps_local * dt * Math.cos(bearing_rad)
      alt -= step_ft
    }

    // Main phase
    alt = deploy_pert
    while (alt > 0) {
      const step_ft = Math.min(ALT_STEP, alt)
      const mid_alt = alt - step_ft / 2
      const wind = interpolateWind(Math.max(0, mid_alt), perturbedLayers)
      const wind_fps_local = wind.speed_mph * MPH_TO_FPS
      const dt = step_ft / main_pert
      const drift_bearing = (wind.direction_deg + 180) % 360
      const bearing_rad = drift_bearing * Math.PI / 180
      dx_ft += wind_fps_local * dt * Math.sin(bearing_rad)
      dy_ft += wind_fps_local * dt * Math.cos(bearing_rad)
      alt -= step_ft
    }

    const drift_ft_i = Math.sqrt(dx_ft * dx_ft + dy_ft * dy_ft)
    const drift_m    = drift_ft_i / FT_PER_M
    const bearing    = ((Math.atan2(dx_ft, dy_ft) * 180 / Math.PI) + 360) % 360
    if (drift_m > 0) {
      const pt = projectPoint(launch_lat, launch_lon, bearing, drift_m)
      scatter.push(pt)
    }
  }

  if (scatter.length < 10) return null

  const ellipse = fitConfidenceEllipse(scatter)
  const meanLat = scatter.reduce((s, p) => s + p.lat, 0) / scatter.length
  const meanLon = scatter.reduce((s, p) => s + p.lon, 0) / scatter.length

  return { scatter, ellipse, meanLat, meanLon }
}

// ── Confidence ellipse ──────────────────────────────────────────────────────

export function fitConfidenceEllipse(points) {
  const n = points.length
  if (n < 3) return null

  const cx = points.reduce((s, p) => s + p.lat, 0) / n
  const cy = points.reduce((s, p) => s + p.lon, 0) / n

  const m_per_deg_lat = 111320
  const m_per_deg_lon = 111320 * Math.cos(cx * Math.PI / 180)

  let sxx = 0, syy = 0, sxy = 0
  for (const p of points) {
    const x = (p.lon - cy) * m_per_deg_lon
    const y = (p.lat - cx) * m_per_deg_lat
    sxx += x * x
    syy += y * y
    sxy += x * y
  }
  sxx /= (n - 1)
  syy /= (n - 1)
  sxy /= (n - 1)

  const trace = sxx + syy
  const det   = sxx * syy - sxy * sxy
  const disc  = Math.sqrt(Math.max(0, trace * trace / 4 - det))
  const lambda1 = trace / 2 + disc
  const lambda2 = trace / 2 - disc

  const scale = Math.sqrt(5.991)
  const rx = scale * Math.sqrt(Math.max(0, lambda1))
  const ry = scale * Math.sqrt(Math.max(0, lambda2))

  const angle_rad = Math.atan2(2 * sxy, sxx - syy) / 2
  const angle_deg = (90 - angle_rad * 180 / Math.PI + 360) % 360

  return { cx, cy, rx, ry, angle_deg }
}

// ── Main simulation ─────────────────────────────────────────────────────────

/**
 * Run the simulation.
 *
 * Apogee method:
 *   With burn_time_s + curve → RK4 + Mach Cd + Tsiolkovsky mass (±2-3%)
 *   With burn_time_s         → RK4 + Mach Cd + linear mass (±5-8%)
 *   Without                  → impulse/mass heuristic (±30%)
 */
export function runSimulation({ specs, config, customMotor = null }) {
  const mass_g    = parseFloat(specs.rocket_mass_g)
  const impulse   = parseFloat(specs.motor_total_impulse_ns)
  const burn_s    = parseFloat(specs.burn_time_s)
  const od_in     = parseFloat(specs.airframe_id_in)
  const cd        = parseFloat(specs.drag_cd) || CD_DEFAULT
  const wind_mph  = parseFloat(specs.wind_speed_mph) || 0
  const deploy_ft = parseFloat(specs.main_deploy_alt_ft) || 500
  // Stays in lockstep with compatibility.js + SuggestPanel.jsx via parseSpec.
  const g_factor_user = parseSpec('ejection_g_factor', specs.ejection_g_factor)
  const g_factor      = g_factor_user ?? (mass_g / 1000 >= 10 ? 30 : 20)

  if (!mass_g || !impulse || mass_g <= 0 || impulse <= 0) return null

  const mass_kg = mass_g / 1000
  const thrustCurve = customMotor?.curve ?? null
  const propMass_kg = customMotor?.propellant_kg ?? null

  // ── Apogee ───────────────────────────────────────────────────────────────
  let apogee_m, apogee_method, apogee_t_s = 0, burnout_t_s = null, ascentTimeline = null

  if (burn_s > 0 && od_in > 0) {
    const radius_m = (od_in * 0.0254) / 2
    const area_m2  = Math.PI * radius_m * radius_m
    const result   = integrateAscent(impulse, mass_kg, burn_s, area_m2, cd, thrustCurve, propMass_kg)
    apogee_m       = result.apogee_m
    burnout_t_s    = result.burnout_t_s
    ascentTimeline = result.ascentTimeline
    apogee_t_s     = result.ascentTimeline[result.ascentTimeline.length - 1].t
    apogee_method  = thrustCurve ? 'rk4-curve' : 'rk4'
  } else if (burn_s > 0) {
    const area_m2 = Math.PI * (2 * 0.0254) * (2 * 0.0254)
    const result  = integrateAscent(impulse, mass_kg, burn_s, area_m2, cd, thrustCurve, propMass_kg)
    apogee_m      = result.apogee_m
    burnout_t_s   = result.burnout_t_s
    ascentTimeline = result.ascentTimeline
    apogee_t_s    = result.ascentTimeline[result.ascentTimeline.length - 1].t
    apogee_method = thrustCurve ? 'rk4-curve-no-od' : 'rk4-no-od'
  } else {
    const v_eff   = (impulse / mass_kg) * 0.5
    apogee_m      = (v_eff * v_eff) / (2 * G)
    apogee_method = 'heuristic'
  }

  const apogee_ft = apogee_m * FT_PER_M
  if (!isFinite(apogee_ft) || apogee_ft <= deploy_ft) return null

  // ── Descent rates (constraints #6, #7, #8) ────────────────────────────────
  // Single terminal velocity per phase; no transient acceleration modeled.
  // Drogue evaluated at mid-altitude (single density point, not stepped).
  // Chute Cd is catalog-rated, not adjusted for oscillation or Reynolds.
  const mid_drogue_ft = (apogee_ft + deploy_ft) / 2

  const drogue_fps_raw = config.drogue_chute
    ? computeDescentRate(config.drogue_chute.specs, mass_kg, mid_drogue_ft)
    : 100
  if (drogue_fps_raw <= 0) return null
  const drogue_fps = drogue_fps_raw

  const main_fps = config.main_chute
    ? computeDescentRate(config.main_chute.specs, mass_kg, deploy_ft)
    : null

  // ── Phase timings (constraint #6: no transient → time = dist / terminal) ──
  const phase1_dist_ft = apogee_ft - deploy_ft
  const phase1_time_s  = phase1_dist_ft / drogue_fps
  const phase2_time_s  = main_fps ? deploy_ft / main_fps : null
  const total_time_s   = phase2_time_s != null ? phase1_time_s + phase2_time_s : null

  // ── Drift (constraints #9, #10: instant wind coupling, linear interpolation)
  const wind_fps       = wind_mph * MPH_TO_FPS
  const effective_time = main_fps
    ? (total_time_s ?? phase1_time_s)
    : phase1_time_s + (deploy_ft / drogue_fps)
  const drift_ft = wind_fps * effective_time

  const main_fps_rounded   = main_fps != null ? Math.round(main_fps * 10) / 10 : null
  const drogue_fps_rounded = Math.round(drogue_fps)

  // ── Timeline ──────────────────────────────────────────────────────────────
  const descentTimeline = buildTimeline({
    apogee_ft,
    drogue_fps: drogue_fps_rounded,
    main_fps:   main_fps_rounded,
    deploy_ft,
    phase1_time_s,
    phase2_time_s,
    offset: apogee_t_s,
  })

  const timeline = ascentTimeline && ascentTimeline.length > 1
    ? [...ascentTimeline.slice(0, -1), ...descentTimeline]
    : descentTimeline

  // constraint #11: static impulse model; #12: linear elastic cord
  const shock_load = computeShockLoad(
    config.shock_cord?.specs ?? null,
    mass_kg,
    g_factor,
  )

  // ── Landing kinetic energy (constraint #14: uses terminal v, not ground-impact v)
  // KE = 0.5 * m * v². Landing speed is main descent rate (or drogue if no main).
  // Convert fps → m/s, compute KE in joules, then to ft-lbf (1 J = 0.7376 ft-lbf).
  // Slightly conservative: actual ground speed is 3-5% lower due to denser surface air.
  const landing_fps  = main_fps_rounded ?? drogue_fps_rounded
  const landing_mps  = landing_fps / FT_PER_M
  const landing_ke_J = 0.5 * mass_kg * landing_mps * landing_mps
  const landing_ke_ftlbf = landing_ke_J * 0.7376

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
    shock_load,
    landing_ke_ftlbf: Math.round(landing_ke_ftlbf),
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
