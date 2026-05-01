import React, { useReducer, useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { PARTS, CATEGORIES, SLOT_IDS, EMPTY_CONFIG } from './data/parts.js'
import { runSimulation } from './lib/simulation.js'
import { checkCompatibility } from './lib/compatibility.js'
import {
  loadSaved, loadCustomParts, rehydrateCustomMotor,
  saveConfigToStorage,
} from './lib/storage.js'
import useDarkMode from './hooks/useDarkMode.js'
import useCustomParts from './hooks/useCustomParts.js'
import { encodeSharePayload, buildShareUrl, decodeSharePayload, SHARE_PARAM } from './lib/shareLink.js'
import {
  SAVE_STATES, SHARE_STATES, TOAST_LEVELS,
  SAVE_FLASH_MS, SAVE_RESET_MS, SHARE_RESET_MS,
} from './lib/constants.js'
import { getDefaultSpecs } from './lib/schema.js'
import MissionControlLayout from './components/MissionControlLayout.jsx'
import ToastContainer from './components/ToastContainer.jsx'
import DemoBanner from './components/DemoBanner.jsx'

// Prefetch the Leaflet chunk during browser idle time after initial load so
// clicking the DISPERSION tab feels instant instead of waiting for the bundle.
function prefetchLeaflet() {
  if (typeof window === 'undefined') return
  const run = () => { import('leaflet').catch(() => { /* offline — retry on-demand */ }) }
  if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: 3000 })
  else setTimeout(run, 1500)
}

// ── State ────────────────────────────────────────────────────────────────────

// Specs shape now lives in lib/schema.js. We snapshot it once on module load
// — a fresh object is built so callers can mutate without touching the schema.
const DEFAULT_SPECS = getDefaultSpecs()

// ── Demo config ──────────────────────────────────────────────────────────────
// Loaded when the app is opened with ?demo=1 (e.g. from the landing page LAUNCH
// button). Showcases a typical L2 single-deploy w/ Chute Release setup so first
// visitors see the tool in action instead of a blank slate.
const DEMO_PART_IDS = {
  main_chute:      'fr3-16-60',       // Front Range 60" Elliptical
  drogue_chute:    'cfc-018-n',       // Fruity Chutes 18" Classic Elliptical
  shock_cord:      'sc-kev-half-20',  // 1/2" Kevlar, 20 ft
  chute_protector: 'tfr-nomex-12',    // 12" Nomex protector
  deployment_bag:  'dbag-12',         // 12" deployment bag
  quick_links:     'ql-14-zinc',      // 1/4" zinc quick link
  swivel:          'sw-bb-half',      // 1/2" ball-bearing swivel
  chute_device:    'jl-chute-release',// Jolly Logic Chute Release
}

const DEMO_SPECS = {
  rocket_mass_g:          '4500',
  motor_total_impulse_ns: '2560',     // mid-J motor
  burn_time_s:            '1.8',
  airframe_id_in:         '4',
  bay_length_in:          '12',
  drag_cd:                '0.6',
  wind_speed_mph:         '8',
  wind_direction_deg:     '270',
  main_deploy_alt_ft:     '700',
  ejection_g_factor:      '',
  bay_obstruction_vol_in3: '',
  launch_lat:             '35.3456',    // FAR (Friends of Amateur Rocketry), Mojave
  launch_lon:             '-117.8083',
  wind_surface_alt_ft:    '',
  wind_mid_speed_mph:     '',
  wind_mid_direction_deg: '',
  wind_mid_alt_ft:        '',
  wind_aloft_speed_mph:   '',
  wind_aloft_direction_deg: '',
  wind_aloft_alt_ft:      '',
}

function buildInitialState() {
  const saved = loadSaved()
  const custom = loadCustomParts()
  const allParts = [...custom, ...PARTS]
  const rehydrate = (part) => part ? allParts.find(p => p.id === part.id && p.category === part.category) ?? null : null
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
    saveState: SAVE_STATES.IDLE,
    shareState: SHARE_STATES.IDLE,
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
    // canRun + the status-bar MOTOR display keep working unchanged.
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
    // Clearing keeps the scalar specs — user may have typed them manually or wants to continue with ThrustCurve search.
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
    // Demo "Start Fresh" — wipe slots, reset specs to defaults, clear sim.
    // Custom parts and toasts are preserved.
    case 'CLEAR_ALL':
      return {
        ...state,
        config: { ...EMPTY_CONFIG },
        specs: { ...DEFAULT_SPECS },
        customMotor: null,
        simulation: null,
        warnings: [],
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
  const leafletPrefetched  = useRef(false)

  const safeTimeout = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms)
    timeoutIds.current.push(id)
    return id
  }, [])

  useEffect(() => () => timeoutIds.current.forEach(clearTimeout), [])

  useEffect(() => {
    if (leafletPrefetched.current) return   // StrictMode double-invoke idempotent
    leafletPrefetched.current = true
    prefetchLeaflet()
  }, [])

  // Dark mode (persisted to localStorage; applies data-theme="dark" to <html>)
  const [darkMode, setDarkMode] = useDarkMode()

  // Custom parts (persisted; merged with PARTS into allParts; CRUD cleans
  // up matching config slots when parts are deleted or edited).
  const {
    customParts, setCustomParts, allParts,
    addCustomPart, deleteCustomPart, editCustomPart,
  } = useCustomParts({ config: state.config, dispatch })

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

  const removePart       = useCallback((category) => dispatch({ type: 'REMOVE_PART', category }), [])
  const setSpec          = useCallback((key, value) => dispatch({ type: 'SET_SPEC', key, value }), [])
  const setCategory      = useCallback((cat) => dispatch({ type: 'SET_CATEGORY', category: cat }), [])
  const setCustomMotor   = useCallback((motor) => dispatch({ type: 'SET_CUSTOM_MOTOR', motor }), [])
  const clearCustomMotor = useCallback(() => dispatch({ type: 'CLEAR_CUSTOM_MOTOR' }), [])
  const loadConfig = useCallback(({ config, specs, customMotor }) => {
    dispatch({ type: 'LOAD_SHARE', config, specs, customMotor })
  }, [])

  const addToast = useCallback((level, message) => {
    dispatch({ type: 'ADD_TOAST', id: ++toastCounter.current, toast: { level, message } })
  }, [])

  const runSim = useCallback(() => {
    dispatch({ type: 'START_SIM' })
    const result = runSimulation({ specs: state.specs, config: state.config, customMotor: state.customMotor })
    dispatch({ type: 'SET_SIM', simulation: result })
    if (result === null) {
      addToast(TOAST_LEVELS.ERROR, 'Simulation failed — main deploy altitude may exceed apogee, or chute specs are invalid. Lower deploy altitude or increase motor impulse.')
    }
  }, [state.specs, state.config, state.customMotor, addToast])

  const saveConfig = useCallback(() => {
    dispatch({ type: 'SET_SAVE_STATE', state: SAVE_STATES.SAVING })
    const ok = saveConfigToStorage({ config: state.config, specs: state.specs, customMotor: state.customMotor })
    if (ok) {
      safeTimeout(() => dispatch({ type: 'SET_SAVE_STATE', state: SAVE_STATES.SAVED }), SAVE_FLASH_MS)
      safeTimeout(() => dispatch({ type: 'SET_SAVE_STATE', state: SAVE_STATES.IDLE  }), SAVE_RESET_MS)
    } else {
      dispatch({ type: 'SET_SAVE_STATE', state: SAVE_STATES.IDLE })
      addToast(TOAST_LEVELS.ERROR, 'Save failed — storage full')
    }
  }, [state.config, state.specs, state.customMotor, safeTimeout, addToast])

  const copyShareLink = useCallback(() => {
    try {
      const encoded = encodeSharePayload({ config: state.config, specs: state.specs, customMotor: state.customMotor })
      const url = buildShareUrl(encoded)
      // Only show "Copied!" after the write actually succeeds.
      navigator.clipboard.writeText(url).then(() => {
        dispatch({ type: 'SET_SHARE_STATE', state: SHARE_STATES.COPIED })
        safeTimeout(() => dispatch({ type: 'SET_SHARE_STATE', state: SHARE_STATES.IDLE }), SHARE_RESET_MS)
      }).catch(() => {
        addToast(TOAST_LEVELS.ERROR, 'Copy failed — try again')
      })
    } catch {
      // Synchronous failure — clipboard API unavailable
      addToast(TOAST_LEVELS.ERROR, 'Copy failed — try again')
    }
  }, [state.config, state.specs, state.customMotor, safeTimeout, addToast])

  const removeToast = useCallback((id) => dispatch({ type: 'REMOVE_TOAST', id }), [])

  // ── Session restore toast ─────────────────────────────────────────────────
  useEffect(() => {
    if (restoredToastFired.current) return   // idempotent under React 18 StrictMode double-invoke
    restoredToastFired.current = true
    try {
      const params = new URLSearchParams(location.search)
      if (params.get(SHARE_PARAM)) return   // share link active — URL state takes precedence
      if (params.get('demo') === '1') return // demo will override saved session — no "restored" toast
      const raw = localStorage.getItem('recoverysys-config')
      if (raw && JSON.parse(raw)) {
        addToast(TOAST_LEVELS.OK, 'Restored your last session.')
      }
    } catch { /* silent */ }
  }, [addToast])

  // ── Share link loader ────────────────────────────────────────────────────
  useEffect(() => {
    const c = new URLSearchParams(location.search).get(SHARE_PARAM)
    if (!c) return
    const decoded = decodeSharePayload(c, {
      allParts, slotIds: SLOT_IDS, emptyConfig: EMPTY_CONFIG,
    })
    if (!decoded) return   // malformed — silently ignore
    dispatch({
      type: 'LOAD_SHARE',
      config: decoded.config,
      specs: decoded.specs,
      customMotor: decoded.customMotor,
    })
    if (decoded.catalogMissing > 0) {
      addToast(TOAST_LEVELS.WARN, `${decoded.catalogMissing} part${decoded.catalogMissing > 1 ? 's' : ''} from this link are no longer in the catalog.`)
    }
    if (decoded.inlinedCustomParts?.length > 0) {
      let importedCount = 0
      setCustomParts(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        const newParts = decoded.inlinedCustomParts.filter(p => !existingIds.has(p.id))
        importedCount = newParts.length
        return importedCount > 0 ? [...prev, ...newParts] : prev
      })
      if (importedCount > 0) {
        addToast(TOAST_LEVELS.OK, `Imported ${importedCount} custom part${importedCount > 1 ? 's' : ''} from share link.`)
      }
    }
    if (decoded.customMissing > 0) {
      addToast(TOAST_LEVELS.WARN, `${decoded.customMissing} custom part${decoded.customMissing > 1 ? 's' : ''} in this link can't be loaded.`)
    }
    // allParts / addToast intentionally read once at mount — link is parsed exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Demo mode ─────────────────────────────────────────────────────────────
  // Triggered by ?demo=1 (e.g. landing page LAUNCH button). Loads a sample
  // L2 config so first-time visitors see the tool populated. The banner offers
  // a one-click "Start Fresh" to clear everything.
  const [demoMode, setDemoMode] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(location.search).get('demo') === '1'
  )
  const demoLoaded = useRef(false)

  useEffect(() => {
    if (demoLoaded.current) return        // StrictMode-safe single load
    if (!demoMode) return
    if (new URLSearchParams(location.search).get(SHARE_PARAM)) return  // share link wins
    demoLoaded.current = true

    const config = Object.fromEntries(
      SLOT_IDS.map(slot => [slot, allParts.find(p => p.id === DEMO_PART_IDS[slot] && p.category === slot) ?? null])
    )
    // Run sim synchronously before dispatching so both config and results land in
    // the same render batch. Using safeTimeout would be killed by StrictMode's
    // unmount/remount cycle clearing all tracked timeouts.
    const result = runSimulation({ specs: DEMO_SPECS, config, customMotor: null })
    dispatch({
      type: 'LOAD_SHARE',
      config,
      specs: { ...DEMO_SPECS },
      customMotor: null,
    })
    if (result) dispatch({ type: 'SET_SIM', simulation: result })
    // allParts read once at mount — demo is loaded exactly once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoMode])

  const exitDemo = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' })
    setDemoMode(false)
    // Strip ?demo=1 from URL so a refresh won't re-load the demo.
    try {
      const url = new URL(location.href)
      url.searchParams.delete('demo')
      history.replaceState(null, '', url.pathname + url.search + url.hash)
    } catch { /* silent — browsers without history API */ }
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {demoMode && <DemoBanner onExit={exitDemo} />}
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
        editCustomPart={editCustomPart}
        setCustomMotor={setCustomMotor}
        clearCustomMotor={clearCustomMotor}
        loadConfig={loadConfig}
        addToast={addToast}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      <ToastContainer toasts={state.toasts} onRemove={removeToast} />
    </>
  )
}
