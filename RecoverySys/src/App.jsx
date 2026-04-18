import React, { useReducer, useEffect, useCallback, useRef, useState, useMemo } from 'react'

// Prefetch the Leaflet chunk during browser idle time after initial load so
// clicking the DISPERSION tab feels instant instead of waiting for the bundle.
// Uses requestIdleCallback to avoid blocking the main thread during hydration.
function prefetchLeaflet() {
  if (typeof window === 'undefined') return
  const run = () => { import('leaflet').catch(() => { /* offline — retry on-demand */ }) }
  if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}
import { PARTS, CATEGORIES, SLOT_IDS, EMPTY_CONFIG } from './data/parts.js'
import { runSimulation } from './lib/simulation.js'
import { checkCompatibility } from './lib/compatibility.js'
import MissionControlLayout from './components/MissionControlLayout.jsx'
import ToastContainer from './components/ToastContainer.jsx'
// ── State ────────────────────────────────────────────────────────────────────

const DEFAULT_SPECS = {
  rocket_mass_g:          '',
  motor_total_impulse_ns: '',
  burn_time_s:            '',
  airframe_id_in:         '',
  bay_length_in:          '',
  drag_cd:                '',
  wind_speed_mph:         '',
  wind_direction_deg:     '',   // 0=N, 90=E, 180=S, 270=W
  main_deploy_alt_ft:     '500',
  ejection_g_factor:      '',   // blank = auto (20G for <10 kg, 30G for ≥10 kg L3)
  bay_obstruction_vol_in3: '',  // volume (in³) of obstructions inside the bay (sleds, hardpoints, etc.)
  launch_lat:             '',   // launch site latitude (decimal degrees)
  launch_lon:             '',   // launch site longitude (decimal degrees)
  // Wind layers — mid & aloft (surface uses wind_speed_mph / wind_direction_deg above)
  wind_surface_alt_ft:    '',   // surface layer altitude (default 0)
  wind_mid_speed_mph:     '',   // mid-altitude wind speed
  wind_mid_direction_deg: '',   // mid-altitude wind direction
  wind_mid_alt_ft:        '',   // mid-altitude layer height
  wind_aloft_speed_mph:   '',   // aloft wind speed
  wind_aloft_direction_deg: '', // aloft wind direction
  wind_aloft_alt_ft:      '',   // aloft layer height
}

function loadSaved() {
  try {
    const raw = localStorage.getItem('recoverysys-config')
    if (!raw) return null
    const saved = JSON.parse(raw)
    // v1.1.x migration: airframe_od_in → airframe_id_in (wall thickness negligible for sim)
    if (saved?.specs?.airframe_od_in != null && saved?.specs?.airframe_id_in == null) {
      saved.specs.airframe_id_in = saved.specs.airframe_od_in
      delete saved.specs.airframe_od_in   // remove ghost key so it doesn't pollute state.specs
    }
    return saved
  } catch { return null }
}

function loadCustomParts() {
  try {
    const raw = localStorage.getItem('recoverysys-custom-parts')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Reject any entry missing the minimum shape required by PartsBrowser + rehydrate
    // Also require specs to be a non-null object — partSpecLine accesses spec fields directly
    // and will throw TypeError if specs is undefined/null (e.g. from manual localStorage edits)
    return parsed.filter(p =>
      p &&
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      typeof p.category === 'string' &&
      p.specs !== null &&
      typeof p.specs === 'object'
    )
  } catch { return [] }
}

// Defensive shape-check for customMotor loaded from localStorage or a share link.
// Returns null if the payload is missing required fields or malformed — the user's
// manually-entered motor_total_impulse_ns/burn_time_s stay as the fallback.
function rehydrateCustomMotor(m) {
  if (!m || typeof m !== 'object') return null
  if (typeof m.designation !== 'string' || m.designation.length === 0) return null
  if (!Array.isArray(m.curve) || m.curve.length < 2) return null
  // Validate a sample: each point must have numeric t and thrust_N
  for (const p of m.curve) {
    if (!p || typeof p.t !== 'number' || typeof p.thrust_N !== 'number') return null
    if (!isFinite(p.t) || !isFinite(p.thrust_N)) return null
  }
  if (!isFinite(m.totalImpulse_ns) || m.totalImpulse_ns <= 0) return null
  if (!isFinite(m.burnTime_s) || m.burnTime_s <= 0) return null
  return m
}

function buildInitialState() {
  const saved = loadSaved()
  const custom = loadCustomParts()
  const allParts = [...custom, ...PARTS]
  const rehydrate = (part) => part ? allParts.find(p => p.id === part.id) ?? null : null
  return {
    config: Object.fromEntries(SLOT_IDS.map(id => [id, rehydrate(saved?.config?.[id])])),
    specs: { ...DEFAULT_SPECS, ...Object.fromEntries(Object.entries(saved?.specs ?? {}).filter(([k]) => k in DEFAULT_SPECS)) },
    // Imported .eng motor file data: null when using the ThrustCurve search or manual entry.
    // Shape: { designation, curve: [{t, thrust_N}], totalImpulse_ns, burnTime_s,
    //         peakThrust_N, propellant_kg, total_kg, diameter_mm, length_mm, delays, manufacturer }
    customMotor: rehydrateCustomMotor(saved?.customMotor),
    activeCategory: SLOT_IDS[0],
    simulation: null,
    simRunning: false,
    warnings: [],
    toasts: [],
    saveState: 'idle',
    shareState: 'idle',
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SELECT_PART':
      return { ...state, config: { ...state.config, [action.category]: action.part }, simulation: null }
    case 'REMOVE_PART':
      return { ...state, config: { ...state.config, [action.category]: null }, simulation: null }
    case 'SET_SPEC':
      return { ...state, specs: { ...state.specs, [action.key]: action.value }, simulation: null }
    // Loading a custom motor also mirrors its totalImpulse/burnTime into specs so
    // that canRun + the status-bar MOTOR display keep working unchanged.
    case 'SET_CUSTOM_MOTOR':
      return {
        ...state,
        customMotor: action.motor,
        specs: {
          ...state.specs,
          motor_total_impulse_ns: String(Math.round(action.motor.totalImpulse_ns)),
          burn_time_s: String(action.motor.burnTime_s.toFixed(2)),
        },
        simulation: null,
      }
    // Clearing the motor keeps the scalar specs — user may have typed them manually
    // before or want to continue with ThrustCurve search.
    case 'CLEAR_CUSTOM_MOTOR':
      return { ...state, customMotor: null, simulation: null }
    case 'SET_CATEGORY':
      return { ...state, activeCategory: action.category }
    case 'SET_WARNINGS':
      return { ...state, warnings: action.warnings }
    case 'START_SIM':
      return { ...state, simRunning: true }
    case 'SET_SIM':
      return { ...state, simulation: action.simulation, simRunning: false }
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, { ...action.toast, id: action.id }] }
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }
    case 'SET_SAVE_STATE':
      return { ...state, saveState: action.state }
    case 'SET_SHARE_STATE':
      return { ...state, shareState: action.state }
    // Atomically replace config + specs from a share link.
    // Doing this in one action prevents the receiver's localStorage-restored values
    // from bleeding through for slots/keys that are null or absent in the payload.
    case 'LOAD_SHARE':
      return {
        ...state,
        config: action.config,
        specs: action.specs,
        customMotor: action.customMotor ?? null,
        simulation: null,
      }
    default:
      return state
  }
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState)
  const debounceRef       = useRef(null)
  const toastCounter      = useRef(0)
  const timeoutIds        = useRef([])
  const restoredToastFired = useRef(false)   // guard against React 18 StrictMode double-invoke

  const safeTimeout = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms)
    timeoutIds.current.push(id)
    return id
  }, [])

  useEffect(() => {
    return () => timeoutIds.current.forEach(clearTimeout)
  }, [])

  // Warm the Leaflet chunk during idle time so the Dispersion tab opens instantly.
  useEffect(() => { prefetchLeaflet() }, [])

  // ── Dark mode ─────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = React.useState(() => {
    try {
      const stored = localStorage.getItem('recoverysys-theme')
      if (stored === 'dark') return true
      if (stored === 'light') return false
      // No explicit preference stored — respect OS setting
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
    } catch { return false }
  })
  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    try { localStorage.setItem('recoverysys-theme', darkMode ? 'dark' : 'light') } catch { /* storage unavailable */ }
  }, [darkMode])

  // ── Custom parts ──────────────────────────────────────────────────────────
  const [customParts, setCustomParts] = useState(loadCustomParts)

  const allParts = useMemo(() => [...customParts, ...PARTS], [customParts])

  useEffect(() => {
    try { localStorage.setItem('recoverysys-custom-parts', JSON.stringify(customParts)) } catch { /* storage unavailable */ }
  }, [customParts])

  const addCustomPart = useCallback((part) => {
    setCustomParts(prev => [...prev, part])
  }, [])

  const deleteCustomPart = useCallback((id) => {
    setCustomParts(prev => prev.filter(p => p.id !== id))
    // Clear the config slot if the deleted part is currently selected
    Object.entries(state.config).forEach(([category, selected]) => {
      if (selected?.id === id) dispatch({ type: 'REMOVE_PART', category })
    })
  }, [state.config])

  // ── Compatibility ─────────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const warnings = checkCompatibility({ config: state.config, specs: state.specs })
      dispatch({ type: 'SET_WARNINGS', warnings })
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [state.config, state.specs])

  // ── Actions ───────────────────────────────────────────────────────────────
  const selectPart = useCallback((part) => {
    dispatch({ type: 'SELECT_PART', category: part.category, part })
    dispatch({ type: 'SET_CATEGORY', category: part.category })
  }, [])

  const removePart    = useCallback((category) => dispatch({ type: 'REMOVE_PART', category }), [])
  const setSpec       = useCallback((key, value) => dispatch({ type: 'SET_SPEC', key, value }), [])
  const setCategory   = useCallback((cat) => dispatch({ type: 'SET_CATEGORY', category: cat }), [])
  const setCustomMotor   = useCallback((motor) => dispatch({ type: 'SET_CUSTOM_MOTOR', motor }), [])
  const clearCustomMotor = useCallback(() => dispatch({ type: 'CLEAR_CUSTOM_MOTOR' }), [])
  const addToast = useCallback((level, message) => {
    dispatch({ type: 'ADD_TOAST', id: ++toastCounter.current, toast: { level, message } })
  }, [])
  const runSim = useCallback(() => {
    dispatch({ type: 'START_SIM' })
    const result = runSimulation({ specs: state.specs, config: state.config, customMotor: state.customMotor })
    dispatch({ type: 'SET_SIM', simulation: result })
    // runSimulation returns null for: apogee ≤ deploy_ft, degenerate drogue specs,
    // NaN propagation. Without a surface here the user sees an empty chart with no
    // explanation — indistinguishable from "haven't run yet".
    if (result === null) {
      dispatch({ type: 'ADD_TOAST', id: ++toastCounter.current, toast: {
        message: 'Simulation failed — main deploy altitude may exceed apogee, or chute specs are invalid. Lower deploy altitude or increase motor impulse.',
        level: 'error',
      }})
    }
  }, [state.specs, state.config, state.customMotor])

  const saveConfig = useCallback(() => {
    dispatch({ type: 'SET_SAVE_STATE', state: 'saving' })
    let ok = false
    try {
      localStorage.setItem(
        'recoverysys-config',
        JSON.stringify({ config: state.config, specs: state.specs, customMotor: state.customMotor }),
      )
      ok = true
    } catch { /* storage full */ }
    if (ok) {
      safeTimeout(() => dispatch({ type: 'SET_SAVE_STATE', state: 'saved' }), 400)
      safeTimeout(() => dispatch({ type: 'SET_SAVE_STATE', state: 'idle' }), 2400)
    } else {
      dispatch({ type: 'SET_SAVE_STATE', state: 'idle' })
      dispatch({ type: 'ADD_TOAST', id: ++toastCounter.current, toast: { message: 'Save failed — storage full', level: 'error' } })
    }
  }, [state.config, state.specs, state.customMotor, safeTimeout])

  const copyShareLink = useCallback(() => {
    try {
      // Serialize only part IDs (not full objects) to keep URLs compact
      const configIds = Object.fromEntries(
        Object.entries(state.config).map(([cat, part]) => [cat, part ? { id: part.id } : null])
      )
      const payload = { config: configIds, specs: state.specs, customMotor: state.customMotor }
      const encoded = btoa(encodeURIComponent(JSON.stringify(payload)))
      const url = `${location.origin}${location.pathname}?c=${encodeURIComponent(encoded)}`
      // Only show "Copied!" after the write actually succeeds.
      // Previously this dispatched 'copied' immediately and caught failure with a toast,
      // showing "Copied!" even when the clipboard write failed.
      navigator.clipboard.writeText(url).then(() => {
        dispatch({ type: 'SET_SHARE_STATE', state: 'copied' })
        safeTimeout(() => dispatch({ type: 'SET_SHARE_STATE', state: 'idle' }), 2000)
      }).catch(() => {
        // Async clipboard failure (e.g. permission denied in restricted context)
        dispatch({ type: 'ADD_TOAST', id: ++toastCounter.current, toast: { message: 'Copy failed — try again', level: 'error' } })
      })
    } catch {
      // Synchronous failure — clipboard API unavailable
      dispatch({ type: 'ADD_TOAST', id: ++toastCounter.current, toast: { message: 'Copy failed — try again', level: 'error' } })
    }
  }, [state.config, state.specs, state.customMotor, safeTimeout])

  const removeToast = useCallback((id) => dispatch({ type: 'REMOVE_TOAST', id }), [])

  useEffect(() => {
    if (restoredToastFired.current) return   // idempotent under React 18 StrictMode double-invoke
    restoredToastFired.current = true
    try {
      if (new URLSearchParams(location.search).get('c')) return   // share link active — skip restore toast, URL state takes precedence
      const raw = localStorage.getItem('recoverysys-config')
      if (raw && JSON.parse(raw)) {
        dispatch({ type: 'ADD_TOAST', id: ++toastCounter.current, toast: { message: 'Restored your last session.', level: 'ok' } })
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const c = params.get('c')
    if (!c) return
    try {
      const payload = JSON.parse(decodeURIComponent(atob(decodeURIComponent(c))))
      const validCategories = new Set(SLOT_IDS)
      const validSpecKeys   = new Set(Object.keys(DEFAULT_SPECS))

      // Build a complete config + specs from the payload, then dispatch LOAD_SHARE in
      // one atomic action. This prevents the receiver's localStorage-restored state
      // from bleeding through for slots (null in payload) or spec keys absent from payload.
      const newConfig = { ...EMPTY_CONFIG }
      let catalogMissing = 0
      let customMissing  = 0

      if (payload.config) {
        Object.entries(payload.config).forEach(([cat, part]) => {
          if (!validCategories.has(cat)) return
          if (part) {
            const found = allParts.find(p => p.id === part.id)
            if (found) newConfig[cat] = found
            else if (part.id?.startsWith('custom-')) customMissing++
            else catalogMissing++
            // If not found, slot stays null (clean slate) — not the receiver's local part
          }
          // null part → slot stays null; no bleed-through from receiver's localStorage
        })
      }

      // Merge shared specs on top of DEFAULT_SPECS (keys absent from payload stay at default)
      const newSpecs = { ...DEFAULT_SPECS }
      if (payload.specs) {
        Object.entries(payload.specs).forEach(([key, value]) => {
          if (!validSpecKeys.has(key)) return
          newSpecs[key] = value
        })
      }

      // Pass customMotor through rehydrate to defensively reject malformed payloads
      const sharedMotor = rehydrateCustomMotor(payload.customMotor)

      dispatch({ type: 'LOAD_SHARE', config: newConfig, specs: newSpecs, customMotor: sharedMotor })

      if (catalogMissing > 0) {
        dispatch({ type: 'ADD_TOAST', id: ++toastCounter.current, toast: {
          message: `${catalogMissing} part${catalogMissing > 1 ? 's' : ''} from this link are no longer in the catalog.`,
          level: 'warn',
        }})
      }
      if (customMissing > 0) {
        dispatch({ type: 'ADD_TOAST', id: ++toastCounter.current, toast: {
          message: `${customMissing} custom part${customMissing > 1 ? 's' : ''} in this link can't be shared — add them manually.`,
          level: 'warn',
        }})
      }
    } catch { /* malformed */ }
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <MissionControlLayout
        state={state}
        allParts={allParts}
        customParts={customParts}
        selectPart={selectPart}
        removePart={removePart}
        setSpec={setSpec}
        setCategory={setCategory}
        runSim={runSim}
        saveConfig={saveConfig}
        copyShareLink={copyShareLink}
        addCustomPart={addCustomPart}
        deleteCustomPart={deleteCustomPart}
        setCustomMotor={setCustomMotor}
        clearCustomMotor={clearCustomMotor}
        addToast={addToast}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      <ToastContainer toasts={state.toasts} onRemove={removeToast} />
    </>
  )
}
