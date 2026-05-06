import React, { useReducer, useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { PARTS, CATEGORIES, SLOT_IDS, EMPTY_CONFIG } from './data/parts.js'
import { runSimulation } from './lib/simulation.js'
import {
  loadSaved, loadCustomParts, rehydrateCustomMotor,
  saveConfigToStorage,
} from './lib/storage.js'
import useDarkMode from './hooks/useDarkMode.js'
import useCustomParts from './hooks/useCustomParts.js'
import useCompatibilityWatcher from './hooks/useCompatibilityWatcher.js'
import useShareLinkLoader from './hooks/useShareLinkLoader.js'
import useDemoMode from './hooks/useDemoMode.js'
import usePersistence from './hooks/usePersistence.js'
import { encodeSharePayload, buildShareUrl, SHARE_PARAM } from './lib/shareLink.js'
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
// button). Showcases a typical L3 dual-deploy configuration at FAR Mojave so
// first-time visitors see the tool populated with a realistic high-power flight.
//
// Hardware notes:
//   - No Nomex protector: largest catalog protector covers ≤72" chutes; 96" main
//     uses deployment bag for ejection-gas protection instead (industry practice).
//   - No deployment bag: intentional — triggers the d-bag recommendation notice,
//     demonstrating the validation system. Adding dbag-18 overflows a 24" bay.
//   - 1" tubular nylon cord (2000 lbs): keeps cord rating below quick-link rating
//     (2640 lbs) so no ql-vs-cord error fires. Snatch-force marginal notice fires
//     because 11 kg × 30G × 2.13× (22% elongation) is close to 2000 lbs at 1.5× SF.
//
// Expected validation: 3 yellow notices, 0 red errors.
const DEMO_PART_IDS = {
  main_chute:      'ifc-096-n',       // Fruity Chutes 96" Iris Ultra Standard (Nylon), CD 2.2
  drogue_chute:    'cfc-030-n',       // Fruity Chutes 30" Classic Elliptical (Nylon)
  shock_cord:      'sc-tub-1-20',     // 1" Tubular Nylon 20ft, 2000 lbs
  chute_protector: null,              // No protector rated for 96" main in catalog
  deployment_bag:  null,              // Absent intentionally — triggers d-bag notice
  quick_links:     'ql-38-zinc',      // 3/8" Zinc Quick Links, 2640 lbs
  swivel:          'sw-ss-3qtr',      // 3/4" Stainless Ball Bearing Swivel, 3500 lbs
  chute_device:    'jl-chute-release',// Jolly Logic Chute Release
}

const DEMO_SPECS = {
  rocket_mass_g:          '11000',    // 11 kg — typical L3 cert rocket
  motor_total_impulse_ns: '7450',     // M class (M795 / M1450 range)
  burn_time_s:            '5.0',
  airframe_id_in:         '6',        // 6" ID — most common L3 airframe
  bay_length_in:          '24',       // 24" recovery bay → 87% packing utilization
  drag_cd:                '0.5',
  wind_speed_mph:         '10',       // FAR surface — sheltered by Rand/El Paso mountains
  wind_direction_deg:     '270',      // prevailing westerly
  main_deploy_alt_ft:     '700',
  ejection_g_factor:      '',
  bay_obstruction_vol_in3: '',
  launch_lat:             '35.3456',  // FAR (Friends of Amateur Rocketry), Mojave CA
  launch_lon:             '-117.8083',
  wind_surface_alt_ft:    '0',
  wind_mid_speed_mph:     '18',       // mid-level — above terrain shielding
  wind_mid_direction_deg: '270',
  wind_mid_alt_ft:        '3000',
  wind_aloft_speed_mph:   '28',       // aloft — slight directional shift to WSW
  wind_aloft_direction_deg: '260',
  wind_aloft_alt_ft:      '8000',
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
      // Spec edits do NOT wipe the simulation. Pass 2's perf review found
      // that flagging the sim stale on every keystroke triggered a full
      // re-render of MissionControlLayout (Dashboard + 189-card PartsBrowser
      // + FlightChart + DispersionMap). The user has to click RUN_SIM to
      // refresh anyway; the displayed numbers are "last run", not "live."
      return { ...state, specs: { ...state.specs, [action.key]: action.value } }
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

  // Debounced compatibility re-evaluation on config/specs change.
  useCompatibilityWatcher({ config: state.config, specs: state.specs, dispatch })

  // Demo mode: ?demo=1 or first-visit (no saved config, no visited flag) seeds a
  // sample L3 config + sim so first-time visitors see the tool populated.
  // Share link wins if both are present. Hoisted above usePersistence so demoMode
  // is available to disable auto-save during the demo session.
  const { demoMode, exitDemo } = useDemoMode({
    allParts, demoPartIds: DEMO_PART_IDS, demoSpecs: DEMO_SPECS, dispatch,
  })

  // Auto-persist config + specs + customMotor to localStorage (Pass 2 fix).
  // Disabled during demo so the seeded demo config never clobbers the user's
  // saved config — exitDemo sets recoverysys-visited then hard-navigates.
  usePersistence({
    config: state.config,
    specs: state.specs,
    customMotor: state.customMotor,
    disabled: demoMode,
  })

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
      if (demoMode) return                  // demo (explicit or first-visit) — no "restored" toast
      const raw = localStorage.getItem('recoverysys-config')
      if (raw && JSON.parse(raw)) {
        addToast(TOAST_LEVELS.OK, 'Restored your last session.')
      }
    } catch { /* silent */ }
  }, [addToast])

  // Share link loader (mount-once: decode ?c=, dispatch LOAD_SHARE, toast).
  useShareLinkLoader({ allParts, addToast, setCustomParts, dispatch })

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
