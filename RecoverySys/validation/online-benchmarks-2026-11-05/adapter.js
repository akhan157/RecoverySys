/**
 * Production Code Adapter for Online Physics Benchmarks (2026-11-05).
 *
 * This adapter imports the actual exported public production APIs:
 *   - isa, airDensity from src/lib/atmosphere.js
 *   - computeDescentRate, computeDrift from src/lib/simulation.js
 *   - computeMainSnatchLoad from src/lib/recoveryLoad.js
 *
 * It executes the functions with test inputs, packages observed outputs,
 * and provides comparison logic using preset tolerances.
 */

import { isa, airDensity } from '../../src/lib/atmosphere.js'
import { computeDescentRate, computeDrift } from '../../src/lib/simulation.js'
import { computeMainSnatchLoad } from '../../src/lib/recoveryLoad.js'

export const PRODUCTION_MODEL_ID = 'browser-js-recovery'
export const PRODUCTION_MODEL_VERSION = 'isa-apogee-descent-v1'
export const PRODUCTION_ASSUMPTIONS_VERSION = 'recovery-assumptions-v1'

const FT_PER_M = 3.28084

/**
 * Compare an observed metric against an expected value and tolerance.
 * Tolerance can have 'relative' (e.g. 0.0001) or 'absolute' (e.g. 1.0).
 */
export function compareMetric(observed, expected, tolerance) {
  if (observed == null || !Number.isFinite(observed)) {
    return {
      observed: null,
      expected,
      difference: null,
      threshold: tolerance?.relative ?? tolerance?.absolute ?? null,
      toleranceType: tolerance?.relative != null ? 'relative' : 'absolute',
      basis: tolerance?.basis ?? 'analyst-derived',
      pass: false,
      reason: 'observed-value-non-finite-or-null',
    }
  }

  if (expected == null || !Number.isFinite(expected)) {
    return {
      observed,
      expected,
      difference: null,
      threshold: tolerance?.relative ?? tolerance?.absolute ?? null,
      toleranceType: tolerance?.relative != null ? 'relative' : 'absolute',
      basis: tolerance?.basis ?? 'analyst-derived',
      pass: false,
      reason: 'expected-value-non-finite-or-null',
    }
  }

  if (tolerance?.relative != null) {
    const diff = Math.abs(observed - expected) / Math.abs(expected)
    const threshold = tolerance.relative
    const pass = diff <= threshold
    return {
      observed,
      expected,
      difference: diff,
      threshold,
      toleranceType: 'relative',
      basis: tolerance.basis ?? 'analyst-derived',
      pass,
    }
  }

  if (tolerance?.absolute != null) {
    const diff = Math.abs(observed - expected)
    const threshold = tolerance.absolute
    const pass = diff <= threshold
    return {
      observed,
      expected,
      difference: diff,
      threshold,
      toleranceType: 'absolute',
      basis: tolerance.basis ?? 'analyst-derived',
      pass,
    }
  }

  // Exact comparison fallback
  const diff = Math.abs(observed - expected)
  return {
    observed,
    expected,
    difference: diff,
    threshold: 0,
    toleranceType: 'exact',
    basis: tolerance?.basis ?? 'analyst-derived',
    pass: diff === 0,
  }
}

/**
 * Benchmark 1: 2,500m Atmosphere evaluation.
 */
export function evaluateAtmosphere(inputs) {
  try {
    if (inputs?.altitude_m == null || !Number.isFinite(inputs.altitude_m)) {
      return { status: 'error', reason: 'non-finite-or-missing-altitude-input', metrics: {} }
    }
    const res = isa(inputs.altitude_m)
    if (!res || !Number.isFinite(res.T) || !Number.isFinite(res.P) || !Number.isFinite(res.rho)) {
      return { status: 'error', reason: 'non-finite-atmosphere-result', metrics: {} }
    }
    return {
      status: 'evaluated',
      metrics: {
        temperature_K: res.T,
        pressure_Pa: res.P,
        density_kg_m3: res.rho,
      },
      raw: res,
    }
  } catch (err) {
    return { status: 'error', reason: err.message, metrics: {} }
  }
}


/**
 * Benchmark 2: 48-inch nominal area terminal descent evaluation.
 */
export function evaluateTerminalDescent(inputs) {
  try {
    const rateFps = computeDescentRate(inputs.chuteSpecs, inputs.mass_kg, inputs.altitude_ft ?? 0)
    if (!Number.isFinite(rateFps) || rateFps <= 0) {
      return { status: 'error', reason: 'non-finite-descent-rate', metrics: {} }
    }
    const velocityMps = rateFps / FT_PER_M
    const energyJ = 0.5 * inputs.mass_kg * velocityMps * velocityMps
    return {
      status: 'evaluated',
      metrics: {
        descent_rate_fps: rateFps,
        landing_energy_J: energyJ,
      },
      raw: { rateFps, velocityMps, energyJ },
    }
  } catch (err) {
    return { status: 'error', reason: err.message, metrics: {} }
  }
}

/**
 * Benchmark 3: Constant wind drift evaluation.
 */
export function evaluateDrift(inputs) {
  try {
    const res = computeDrift({
      simulation: inputs.simulation,
      specs: inputs.specs,
    })
    if (!res || !Number.isFinite(res.drift_ft) || !Number.isFinite(res.bearing_deg)) {
      return { status: 'error', reason: 'null-or-non-finite-drift-result', metrics: {} }
    }
    return {
      status: 'evaluated',
      metrics: {
        drift_ft: res.drift_ft,
        bearing_deg: res.bearing_deg,
      },
      raw: res,
    }
  } catch (err) {
    return { status: 'error', reason: err.message, metrics: {} }
  }
}

/**
 * Benchmark 4: Secant linear-elastic snatch arithmetic proxy evaluation.
 */
export function evaluateSnatch(inputs) {
  try {
    const res = computeMainSnatchLoad({
      config: inputs.config,
      mass_kg: inputs.mass_kg,
      deploy_alt_ft: inputs.deploy_alt_ft,
      approach_velocity_fps: inputs.approach_velocity_fps,
    })
    if (
      !res ||
      res.status === 'unavailable' ||
      !Number.isFinite(res.peak_force_proxy_lbs) ||
      !Number.isFinite(res.rating_margin) ||
      !Number.isFinite(res.energy_margin)
    ) {
      return {
        status: res?.status ?? 'error',
        reason: res?.reason ?? 'invalid-snatch-result',
        metrics: {},
      }
    }
    return {
      status: 'evaluated',
      metrics: {
        peak_force_proxy_lbs: res.peak_force_proxy_lbs,
        rating_margin: res.rating_margin,
        energy_margin: res.energy_margin,
      },
      raw: res,
    }
  } catch (err) {
    return { status: 'error', reason: err.message, metrics: {} }
  }
}
