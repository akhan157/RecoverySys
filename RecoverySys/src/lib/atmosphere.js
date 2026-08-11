const G = 9.80665
export const FEET_PER_METER = 3.28084
const GAMMA = 1.4
const R_AIR = 287.058

export const ATMOSPHERE_MODEL = 'isa-troposphere-v1'

/** International Standard Atmosphere through the troposphere, capped at 11 km. */
export function isa(altitude_m) {
  const h = Math.min(Math.max(0, Number(altitude_m) || 0), 11000)
  const T = 288.15 - 0.0065 * h
  const P = 101325 * Math.pow(T / 288.15, 5.2559)
  const rho = P / (R_AIR * T)
  const a = Math.sqrt(GAMMA * R_AIR * T)
  return { rho, T, P, a }
}

export function airDensity(altitude_m) {
  return isa(altitude_m).rho
}

export function densityAtAltitudeFt(altitude_ft) {
  return airDensity(Number(altitude_ft) / FEET_PER_METER)
}

export const standardGravity = G
