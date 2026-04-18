/**
 * RASP .eng motor file parser.
 *
 * Format reference: https://www.thrustcurve.org/info/raspformat.html
 * Used by OpenMotor exports, ThrustCurve.org downloads, OpenRocket, RockSim.
 *
 * Example file:
 *   ; AeroTech K550W
 *   K550W 54 410 P .919 1.838 AT
 *      0.04  220
 *      0.20  850
 *      3.05    0
 *
 * Header fields (7, space-separated):
 *   designation  diameter_mm  length_mm  delays  propellant_kg  total_kg  manufacturer
 *
 * Data lines: <time_s> <thrust_N>. Implicit (0, 0) start. Final point must be zero thrust.
 */

/**
 * Parse a .eng file string.
 * @param {string} text - Raw file contents.
 * @returns {{ success: true, data: MotorData } | { success: false, error: string }}
 *
 * MotorData shape:
 *   {
 *     designation: string,       // e.g. "K550W"
 *     diameter_mm: number,       // motor diameter
 *     length_mm: number,         // motor length
 *     delays: string,            // e.g. "P" or "6-10-14"
 *     propellant_kg: number,
 *     total_kg: number,
 *     manufacturer: string,      // e.g. "AT" (AeroTech)
 *     curve: Array<{t: number, thrust_N: number}>,
 *     totalImpulse_ns: number,   // trapezoidal integral of the curve
 *     burnTime_s: number,        // time of last non-zero thrust sample
 *     peakThrust_N: number,
 *   }
 */
export function parseEng(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { success: false, error: 'Empty file' }
  }

  // Normalize line endings (Windows CRLF, old Mac CR → LF)
  const normalized = text.replace(/\r\n?/g, '\n')

  // Strip comments (lines starting with ';') and blank lines; keep original indices for diagnostics
  const lines = normalized
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith(';'))

  if (lines.length < 2) {
    return { success: false, error: 'File has no header and data lines' }
  }

  // Parse header (7 whitespace-separated fields)
  const headerParts = lines[0].split(/\s+/)
  if (headerParts.length < 7) {
    return {
      success: false,
      error: `Header has ${headerParts.length} fields, expected 7 (designation diameter_mm length_mm delays propellant_kg total_kg manufacturer)`,
    }
  }

  const [designation, diamStr, lenStr, delays, propStr, totalStr, ...manuParts] = headerParts
  const diameter_mm = parseFloat(diamStr)
  const length_mm   = parseFloat(lenStr)
  const propellant_kg = parseFloat(propStr)
  const total_kg      = parseFloat(totalStr)
  const manufacturer  = manuParts.join(' ')

  if (!isFinite(diameter_mm) || diameter_mm <= 0) {
    return { success: false, error: `Invalid diameter: "${diamStr}"` }
  }
  if (!isFinite(length_mm) || length_mm <= 0) {
    return { success: false, error: `Invalid length: "${lenStr}"` }
  }
  if (!isFinite(propellant_kg) || propellant_kg <= 0) {
    return { success: false, error: `Invalid propellant mass: "${propStr}"` }
  }
  if (!isFinite(total_kg) || total_kg <= 0) {
    return { success: false, error: `Invalid total mass: "${totalStr}"` }
  }
  if (total_kg < propellant_kg) {
    return { success: false, error: `Total mass (${total_kg} kg) < propellant mass (${propellant_kg} kg)` }
  }

  // Parse data lines
  const curve = []
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/\s+/)
    if (parts.length < 2) {
      return { success: false, error: `Line ${i + 1}: expected "time thrust", got "${lines[i]}"` }
    }
    const t = parseFloat(parts[0])
    const thrust_N = parseFloat(parts[1])
    if (!isFinite(t) || t < 0) {
      return { success: false, error: `Line ${i + 1}: invalid time "${parts[0]}"` }
    }
    if (!isFinite(thrust_N) || thrust_N < 0) {
      return { success: false, error: `Line ${i + 1}: invalid thrust "${parts[1]}"` }
    }
    if (curve.length > 0 && t <= curve[curve.length - 1].t) {
      return {
        success: false,
        error: `Line ${i + 1}: time ${t}s is not strictly after previous sample ${curve[curve.length - 1].t}s`,
      }
    }
    curve.push({ t, thrust_N })
  }

  if (curve.length < 2) {
    return { success: false, error: 'Need at least 2 data points' }
  }
  if (curve[curve.length - 1].thrust_N !== 0) {
    return {
      success: false,
      error: `Final sample must be zero thrust (got ${curve[curve.length - 1].thrust_N} N at t=${curve[curve.length - 1].t}s)`,
    }
  }

  // Prepend implicit (0, 0) if the first sample isn't at t=0
  if (curve[0].t > 0) {
    curve.unshift({ t: 0, thrust_N: 0 })
  }

  // Trapezoidal integration for total impulse (N·s)
  let totalImpulse_ns = 0
  for (let i = 1; i < curve.length; i++) {
    const dt = curve[i].t - curve[i - 1].t
    const avg = (curve[i].thrust_N + curve[i - 1].thrust_N) / 2
    totalImpulse_ns += avg * dt
  }

  // Burn time: time of last non-zero thrust sample
  let burnTime_s = 0
  for (const p of curve) {
    if (p.thrust_N > 0) burnTime_s = p.t
  }

  // Peak thrust
  let peakThrust_N = 0
  for (const p of curve) {
    if (p.thrust_N > peakThrust_N) peakThrust_N = p.thrust_N
  }

  return {
    success: true,
    data: {
      designation,
      diameter_mm,
      length_mm,
      delays,
      propellant_kg,
      total_kg,
      manufacturer,
      curve,
      totalImpulse_ns,
      burnTime_s,
      peakThrust_N,
    },
  }
}
