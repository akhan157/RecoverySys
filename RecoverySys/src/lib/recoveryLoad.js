export const MAIN_SNATCH_MODEL = 'linear-elastic-energy-v1'

const G = 9.80665
const FT_PER_M = 3.28084
const N_PER_LBF = 4.448
const R_AIR = 287.05

const finitePositive = (value) => {
  const n = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

function densityAtAltitude(altitude_ft) {
  const h = Math.min(Math.max(0, altitude_ft / FT_PER_M), 11000)
  const temperature = 288.15 - 0.0065 * h
  const pressure = 101325 * Math.pow(temperature / 288.15, 5.2559)
  return pressure / (R_AIR * temperature)
}

export function computeDrogueDeploymentVelocity(drogueSpecs, mass_kg, deploy_alt_ft) {
  const mass = finitePositive(mass_kg)
  const altitude = finitePositive(deploy_alt_ft)
  const diameter = finitePositive(drogueSpecs?.diameter_in)
  const cd = finitePositive(drogueSpecs?.cd)
  if (!mass || !altitude || !diameter || !cd) return null
  const radius_m = (diameter * 0.0254) / 2
  const area_m2 = Math.PI * radius_m * radius_m
  const velocity_mps = Math.sqrt((2 * mass * G) / (densityAtAltitude(altitude) * cd * area_m2))
  return Number.isFinite(velocity_mps) ? velocity_mps * FT_PER_M : null
}

const unavailable = (reason, limitations = []) => ({
  model: MAIN_SNATCH_MODEL,
  status: 'unavailable',
  reason,
  limitations,
})

export function computeMainSnatchLoad({
  config = {},
  mass_kg,
  deploy_alt_ft,
  approach_velocity_fps,
} = {}) {
  if (!config.main_chute) return unavailable('single-deploy-no-main')
  if (!config.drogue_chute) return unavailable('single-deploy-no-drogue')
  const cord = config.shock_cord?.specs
  if (!cord) return unavailable('missing-cord')
  const mass = finitePositive(mass_kg)
  const deploy = finitePositive(deploy_alt_ft)
  const velocity = finitePositive(approach_velocity_fps)
  const strength_lbs = finitePositive(cord.strength_lbs)
  const length_ft = finitePositive(cord.length_ft)
  const elongation_pct = finitePositive(cord.elongation_pct)
  if (!mass || !deploy || !velocity || !strength_lbs || !length_ft || !elongation_pct)
    return unavailable('invalid-cord-or-input-values')

  const break_extension_m = length_ft * 0.3048 * (elongation_pct / 100)
  const strength_N = strength_lbs * N_PER_LBF
  const secant_stiffness_N_per_m = strength_N / break_extension_m
  const event_energy_J = 0.5 * mass * Math.pow(velocity / FT_PER_M, 2)
  const capacity_energy_J = 0.5 * secant_stiffness_N_per_m * break_extension_m ** 2
  const predicted_extension_m = Math.sqrt((2 * event_energy_J) / secant_stiffness_N_per_m)
  const peak_force_proxy_lbs = (secant_stiffness_N_per_m * predicted_extension_m) / N_PER_LBF
  const rating_margin = strength_lbs / peak_force_proxy_lbs
  const energy_margin = capacity_energy_J / event_energy_J
  const status = rating_margin < 1 ? 'exceeds_rating' : rating_margin < 2 ? 'marginal' : 'screened'

  return {
    model: MAIN_SNATCH_MODEL,
    status,
    reason: null,
    data_quality: 'generic-assumption',
    approach_velocity_fps: velocity,
    approach_velocity_source: 'drogue-terminal-at-main-deploy-altitude',
    break_extension_m,
    secant_stiffness_N_per_m,
    event_energy_J,
    predicted_extension_m,
    peak_force_proxy_lbs,
    rating_margin,
    energy_margin,
    limitations: [
      'Secant linear-elastic approximation using catalog strength and elongation.',
      'Not a certification, safe-load, or peak-load determination.',
    ],
  }
}

/**
 * Black powder ejection charge sizing based on ideal gas law and compartment volume.
 * Formula: m_bp = (P_target * V_compartment) / (R_bp * T_bp)
 *
 * Combustion constants for FFFFg black powder (Nakka / Info-Central rocketry standard):
 *   R = 22.16 ft·lbf / (lbm·°R)
 *   T = 3307 °R (~1560 °C)
 *   R * T = 73,283.12 ft·lbf / lbm
 *   In rocketry units (in·lbf / gram):
 *   (73,283.12 * 12 in/ft) / (453.59237 g/lbm) = 1938.74 in·lbf / gram.
 *
 * Pin Shear Strengths:
 *   #2-56 nylon screw: ~30 lbf shear per pin
 *   #4-40 nylon screw: ~55 lbf shear per pin
 *
 * Ground testing with an altimeter / test blast is ALWAYS required before flight.
 */
export const C_BP_IN_LBF_PER_GRAM = 1938.74
export const MAX_SAFE_SEPARATION_PSI = 35.0
export const MIN_NOMINAL_SEPARATION_PSI = 12.0

export function computeEjectionCharge({
  compartment_vol_in3,
  airframe_id_in,
  shear_pins_count = 0,
  pin_type = '2-56',
  target_psi_override = null,
} = {}) {
  const vol = finitePositive(compartment_vol_in3)
  const id = finitePositive(airframe_id_in)
  if (!vol || !id) return null

  const area_in2 = Math.PI * Math.pow(id / 2, 2)
  const pins = Math.max(0, parseInt(shear_pins_count, 10) || 0)
  const shearPerPin = pin_type === '4-40' ? 55 : 30 // lbf

  let target_psi = 15.0
  let overpressure_risk = false
  let insufficient_force = false

  const override = finitePositive(target_psi_override)
  if (override) {
    target_psi = override
  } else if (pins > 0) {
    // 15 lbf baseline friction + 50% margin over pin shear force
    const required_force_lbf = (pins * shearPerPin + 15) * 1.5
    const required_psi = required_force_lbf / area_in2
    if (required_psi > MAX_SAFE_SEPARATION_PSI) {
      overpressure_risk = true
      insufficient_force = true
      target_psi = required_psi // Report actual needed PSI rather than silently failing to separate
    } else {
      target_psi = Math.max(MIN_NOMINAL_SEPARATION_PSI, required_psi)
    }
  }

  const charge_grams = (target_psi * vol) / C_BP_IN_LBF_PER_GRAM

  return {
    compartment_vol_in3: vol,
    airframe_id_in: id,
    cross_section_area_in2: Math.round(area_in2 * 100) / 100,
    target_psi: Math.round(target_psi * 10) / 10,
    charge_grams: Math.round(charge_grams * 100) / 100,
    charge_grams_backup: Math.round(charge_grams * 1.25 * 100) / 100,
    pins_count: pins,
    pin_type,
    separation_force_lbf: Math.round(target_psi * area_in2),
    overpressure_risk,
    insufficient_force,
    warning: insufficient_force
      ? `Required separation pressure (${target_psi.toFixed(0)} PSI) exceeds ${MAX_SAFE_SEPARATION_PSI} PSI airframe safety limit. Reduce shear pin count.`
      : null,
  }
}
