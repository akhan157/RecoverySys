/**
 * RecoverySys Engine API client.
 *
 * Auto-detects the Python engine via /api/health. Falls back to the
 * built-in JS simulation when the engine is unavailable.
 *
 * The engine URL can be overridden via localStorage('recoverysys-engine-url')
 * or defaults to the hosted instance.
 */

const DEFAULT_ENGINE_URL = 'http://localhost:8000'
const STORAGE_KEY = 'recoverysys-engine-url'
const HEALTH_TIMEOUT_MS = 3000

let _engineUrl = null
let _engineAvailable = null // null = not checked, true/false = result

/**
 * Get the configured engine URL.
 */
function getEngineUrl() {
  if (_engineUrl) return _engineUrl
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) { _engineUrl = stored; return _engineUrl }
  } catch { /* silent */ }
  _engineUrl = DEFAULT_ENGINE_URL
  return _engineUrl
}

/**
 * Check if the Python engine is available. Result is cached for the session.
 * @returns {Promise<{available: boolean, version: string|null}>}
 */
export async function checkEngine() {
  if (_engineAvailable !== null) {
    return { available: _engineAvailable, version: _engineAvailable ? '0.1.0' : null }
  }

  const url = getEngineUrl()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS)
    const res = await fetch(`${url}/api/health`, { signal: controller.signal })
    clearTimeout(timeout)

    if (res.ok) {
      const data = await res.json()
      _engineAvailable = data.status === 'ok'
      return { available: true, version: data.version || '0.1.0' }
    }
  } catch { /* engine not reachable */ }

  _engineAvailable = false
  return { available: false, version: null }
}

/**
 * Run a simulation via the Python engine API.
 * @param {Object} params - { specs, config, customMotor }
 * @returns {Promise<Object|null>} Engine response or null on failure
 */
export async function runEngineSimulation({ specs, config, customMotor }) {
  const url = getEngineUrl()

  // Map RecoverySys state → engine API format
  const body = {
    rocket_mass_kg: parseFloat(specs.rocket_mass_g) / 1000 || 0,
    motor_total_impulse_ns: parseFloat(specs.motor_total_impulse_ns) || 0,
    burn_time_s: parseFloat(specs.burn_time_s) || 0,
    airframe_od_in: parseFloat(specs.airframe_id_in) || 4,
    cd: parseFloat(specs.drag_cd) || 0.5,
    main_deploy_alt_ft: parseFloat(specs.main_deploy_alt_ft) || 700,
    fidelity: 'simple',
  }

  // Map chutes from config
  if (config.main_chute?.specs) {
    body.main_chute = {
      diameter_in: config.main_chute.specs.diameter_in,
      cd: config.main_chute.specs.cd,
    }
  }
  if (config.drogue_chute?.specs) {
    body.drogue_chute = {
      diameter_in: config.drogue_chute.specs.diameter_in,
      cd: config.drogue_chute.specs.cd,
    }
  }

  // Wind layers
  const windLayers = []
  const surfSpeed = parseFloat(specs.wind_speed_mph)
  const surfDir = parseFloat(specs.wind_direction_deg)
  if (surfSpeed > 0) {
    windLayers.push({
      altitude_ft: parseFloat(specs.wind_surface_alt_ft) || 0,
      speed_mph: surfSpeed,
      direction_deg: surfDir || 0,
    })
  }
  const midSpeed = parseFloat(specs.wind_mid_speed_mph)
  if (midSpeed > 0) {
    windLayers.push({
      altitude_ft: parseFloat(specs.wind_mid_alt_ft) || 3000,
      speed_mph: midSpeed,
      direction_deg: parseFloat(specs.wind_mid_direction_deg) || 0,
    })
  }
  const aloftSpeed = parseFloat(specs.wind_aloft_speed_mph)
  if (aloftSpeed > 0) {
    windLayers.push({
      altitude_ft: parseFloat(specs.wind_aloft_alt_ft) || 10000,
      speed_mph: aloftSpeed,
      direction_deg: parseFloat(specs.wind_aloft_direction_deg) || 0,
    })
  }
  if (windLayers.length > 0) body.wind_layers = windLayers

  // Launch site
  const lat = parseFloat(specs.launch_lat)
  const lon = parseFloat(specs.launch_lon)
  if (!isNaN(lat) && !isNaN(lon)) {
    body.launch_lat = lat
    body.launch_lon = lon
    // Enable Monte Carlo when we have coordinates + wind
    if (windLayers.length > 0) {
      body.monte_carlo = { enabled: true, iterations: 500 }
    }
  }

  // Thrust curve from custom motor
  if (customMotor?.curve) {
    body.thrust_curve = customMotor.curve.map(p => ({
      t: p.t,
      thrust_N: p.thrust_N,
    }))
    if (customMotor.propellant_kg) {
      body.propellant_mass_kg = customMotor.propellant_kg
    }
  }

  try {
    const res = await fetch(`${url}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

/**
 * Transform the Python engine response into the simulation object shape
 * that FlightChart, DispersionMap, and the rest of the React app expect.
 *
 * Engine response contract (snake_case, SI-ish units matching the request):
 * {
 *   apogee_ft, apogee_t_s, burnout_t_s,
 *   apogee_method: 'rk45' | 'euler' | ...,
 *   drogue_fps, main_fps,
 *   phase1_time_s, phase2_time_s, total_time_s,
 *   deploy_ft, drift_ft,
 *   timeline: [{ t, alt }],          // seconds, feet
 *   shock_load: { peak_load_lbs, safety_factor, strain_energy_J, status } | null,
 *   monte_carlo: {                    // present only when requested
 *     scatter: [{ lat, lon }],
 *     ellipse: { cx, cy, rx, ry, angle_deg },
 *     mean_lat, mean_lon,
 *   } | null,
 *   drift: {                          // present only when wind layers given
 *     drift_ft, drift_m, bearing_deg,
 *     land_lat, land_lon,
 *     drogue_drift_ft, main_drift_ft,
 *     drogue_time_s, main_time_s,
 *     drogue_vector: { dx_ft, dy_ft },
 *     main_vector:   { dx_ft, dy_ft },
 *   } | null,
 * }
 */
export function transformEngineResponse(data) {
  if (!data || typeof data.apogee_ft !== 'number') return null

  const sim = {
    apogee_ft:     Math.round(data.apogee_ft),
    apogee_method: data.apogee_method || 'engine',
    apogee_t_s:    Math.round(data.apogee_t_s),
    burnout_t_s:   data.burnout_t_s != null ? Math.round(data.burnout_t_s) : null,
    drogue_fps:    data.drogue_fps != null ? Math.round(data.drogue_fps * 10) / 10 : null,
    main_fps:      data.main_fps != null ? Math.round(data.main_fps * 10) / 10 : null,
    phase1_time_s: Math.round(data.phase1_time_s),
    phase2_time_s: data.phase2_time_s != null ? Math.round(data.phase2_time_s) : null,
    total_time_s:  data.total_time_s != null ? Math.round(data.total_time_s) : null,
    drift_ft:      Math.round(data.drift_ft || 0),
    deploy_ft:     data.deploy_ft,
    timeline:      data.timeline || [],
    shock_load:    data.shock_load || null,
  }

  // Attach engine-computed drift so DispersionMap can use it directly
  // instead of re-computing via computeDrift()
  if (data.drift) {
    sim._engineDrift = data.drift
  }

  // Attach engine-computed Monte Carlo so DispersionMap can use it directly
  // instead of re-computing via runDispersionMonteCarlo()
  if (data.monte_carlo) {
    sim._engineMonteCarlo = {
      scatter:  data.monte_carlo.scatter,
      ellipse:  data.monte_carlo.ellipse,
      meanLat:  data.monte_carlo.mean_lat,
      meanLon:  data.monte_carlo.mean_lon,
    }
  }

  return sim
}

/**
 * Reset the engine detection cache (e.g. after changing the URL).
 */
export function resetEngineCache() {
  _engineAvailable = null
  _engineUrl = null
}
