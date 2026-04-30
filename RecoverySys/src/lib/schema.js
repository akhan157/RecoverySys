/**
 * Single source of truth for the rocket-specs object shape.
 *
 * Background: before this file existed, DEFAULT_SPECS was inlined in App.jsx,
 * spec key validation was duplicated in storage.js (`k in DEFAULT_SPECS`) and
 * shareLink.js (`Object.keys(defaultSpecs)`), and consumers (compatibility.js,
 * simulation.js, SuggestPanel.jsx) each ran their own `parseFloat(specs.X) || 0`
 * with subtly different fallback semantics. Adding or renaming a field meant
 * editing ~6 places. This module collapses that to one declaration.
 *
 * Specs are stored as STRINGS in app state (each field is bound to a UI input).
 * Coercion to numbers happens at consumer boundaries via `coerceSpec`.
 */

// SCHEMA_VERSION bumps on any breaking change to the persisted shape — used
// by migrations.js when localStorage / share-link payloads need rewriting.
// Reserved for future use; current persisted payloads are unversioned and
// load as v1 by default.
export const SCHEMA_VERSION = 1

// Field metadata. `default` is what UI inputs initialize to (always strings).
// `unit` is documentation-only for now; future work can use it to render
// labels and run unit-conversion at the boundary.
export const SPECS_SCHEMA = Object.freeze({
  rocket_mass_g: {
    type: 'number', unit: 'g', default: '',
    label: 'Rocket mass', min: 0, exclusiveMin: true,
  },
  motor_total_impulse_ns: {
    type: 'number', unit: 'N·s', default: '',
    label: 'Motor total impulse', min: 0, exclusiveMin: true,
  },
  burn_time_s: {
    type: 'number', unit: 's', default: '',
    label: 'Burn time', min: 0, exclusiveMin: true,
  },
  airframe_id_in: {
    type: 'number', unit: 'in', default: '',
    label: 'Airframe ID', min: 0, exclusiveMin: true,
    note: 'Inner diameter — used for both packing volume and drag area; ' +
          'wall thickness is negligible for HPR sim per design decision.',
  },
  bay_length_in: {
    type: 'number', unit: 'in', default: '',
    label: 'Bay length', min: 0, exclusiveMin: true,
  },
  drag_cd: {
    type: 'number', unit: 'dimensionless', default: '',
    label: 'Drag coefficient', min: 0, exclusiveMin: true,
  },
  wind_speed_mph: {
    type: 'number', unit: 'mph', default: '',
    label: 'Surface wind speed', min: 0,
  },
  wind_direction_deg: {
    type: 'number', unit: 'deg', default: '',
    label: 'Surface wind direction', min: 0, max: 360,
    note: '0=N, 90=E, 180=S, 270=W',
  },
  main_deploy_alt_ft: {
    type: 'number', unit: 'ft', default: '500',
    label: 'Main deploy altitude', min: 0, exclusiveMin: true,
  },
  ejection_g_factor: {
    type: 'number', unit: 'G', default: '',
    label: 'Ejection G-factor', min: 0, exclusiveMin: true,
    note: 'Blank or non-positive = auto (20G for <10kg, 30G for ≥10kg L3-class). ' +
          'parseSpec returns null for ≤0, letting all three consumers ' +
          '(compatibility, simulation, SuggestPanel) fall through to the same default.',
  },
  bay_obstruction_vol_in3: {
    type: 'number', unit: 'in³', default: '',
    label: 'Bay obstruction volume', min: 0,
  },
  launch_lat: {
    type: 'number', unit: 'deg', default: '',
    label: 'Launch latitude', min: -90, max: 90,
  },
  launch_lon: {
    type: 'number', unit: 'deg', default: '',
    label: 'Launch longitude', min: -180, max: 180,
  },
  // Wind layers — surface uses wind_speed_mph / wind_direction_deg; these
  // add mid and aloft layers for a proper layered wind profile.
  wind_surface_alt_ft: {
    type: 'number', unit: 'ft', default: '', label: 'Surface wind altitude', min: 0,
  },
  wind_mid_speed_mph: {
    type: 'number', unit: 'mph', default: '', label: 'Mid wind speed', min: 0,
  },
  wind_mid_direction_deg: {
    type: 'number', unit: 'deg', default: '', label: 'Mid wind direction', min: 0, max: 360,
  },
  wind_mid_alt_ft: {
    type: 'number', unit: 'ft', default: '', label: 'Mid wind altitude', min: 0,
  },
  wind_aloft_speed_mph: {
    type: 'number', unit: 'mph', default: '', label: 'Aloft wind speed', min: 0,
  },
  wind_aloft_direction_deg: {
    type: 'number', unit: 'deg', default: '', label: 'Aloft wind direction', min: 0, max: 360,
  },
  wind_aloft_alt_ft: {
    type: 'number', unit: 'ft', default: '', label: 'Aloft wind altitude', min: 0,
  },
})

/**
 * Build a fresh DEFAULT_SPECS object from the schema. Returned object is a
 * mutable plain object (callers spread into reducer state).
 */
export function getDefaultSpecs() {
  const out = {}
  for (const [key, def] of Object.entries(SPECS_SCHEMA)) {
    out[key] = def.default
  }
  return out
}

/**
 * Set of valid spec keys — used by storage and share-link to filter unknown
 * keys out of persisted payloads.
 */
export const SPEC_KEYS = Object.freeze(new Set(Object.keys(SPECS_SCHEMA)))

export function isValidSpecKey(key) {
  return SPEC_KEYS.has(key)
}

/**
 * Coerce a raw spec value (string from a UI input or persisted payload) to its
 * declared type. Returns null when coercion fails — consumers that previously
 * used `parseFloat(specs.X) || 0` should switch to `coerceSpec('X', specs.X) ?? 0`
 * so explicit zero is distinguishable from missing.
 *
 * Does NOT clamp to schema range — use parseSpec for that.
 */
export function coerceSpec(key, raw) {
  const def = SPECS_SCHEMA[key]
  if (!def) return null
  if (raw == null || raw === '') return null
  if (def.type === 'number') {
    const n = parseFloat(raw)
    return Number.isFinite(n) ? n : null
  }
  return raw
}

/**
 * Coerce + clamp a spec value to the schema's [min, max] range. This is the
 * function consumers should use to read user-provided spec values.
 *
 * Why clamp at the consumer instead of at SET_SPEC: preserving the user's
 * exact typed input in the form field is important UX (silently rewriting
 * "-50" to "0" while they're typing is jarring). Consumer-side clamping
 * still kills the actual bugs — Pass 2 red-team found that (a) compatibility.js
 * and simulation.js disagree on what to do with negative ejection_g_factor,
 * (b) custom drogue with cd ≈ 0 produces denormal floats that crash the
 * dispersion map, (c) extreme wind values can cause infinite descent loops.
 * Routing every numeric read through parseSpec makes those impossible.
 *
 * Returns null when the input is missing, non-numeric, or violates an
 * exclusiveMin constraint at exactly the boundary value.
 */
export function parseSpec(key, raw) {
  const def = SPECS_SCHEMA[key]
  if (!def) return null
  const n = coerceSpec(key, raw)
  if (n == null || def.type !== 'number') return n
  // Reject exactly-zero when the schema forbids it — e.g. cd_drag = 0 makes
  // descent rate Infinity, which then propagates NaN through Monte Carlo.
  if (def.exclusiveMin && def.min != null && n <= def.min) return null
  let clamped = n
  if (def.min != null && clamped < def.min) clamped = def.min
  if (def.max != null && clamped > def.max) clamped = def.max
  return clamped
}
