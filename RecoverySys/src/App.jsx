import React, { useReducer, useEffect, useCallback, useRef } from 'react'
import { PARTS, CATEGORIES } from './data/parts.js'
import { runSimulation } from './lib/simulation.js'
import { checkCompatibility } from './lib/compatibility.js'
import { exportOrk } from './lib/ork.js'
import PartsBrowser from './components/PartsBrowser.jsx'
import ConfigBuilder from './components/ConfigBuilder.jsx'
import SimPanel from './components/SimPanel.jsx'
import ToastContainer from './components/ToastContainer.jsx'

// ── State ────────────────────────────────────────────────────────────────────

const DEFAULT_SPECS = {
  rocket_mass_g:          '',
  motor_total_impulse_ns: '',
  burn_time_s:            '',
  airframe_od_in:         '',
  airframe_id_in:         '',
  bay_length_in:          '',
  drag_cd:                '',
  wind_speed_mph:         '',
  main_deploy_alt_ft:     '500',
}

function loadSaved() {
  try {
    const raw = localStorage.getItem('recoverysys-config')
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

function buildInitialState() {
  const saved = loadSaved()
  // Re-hydrate part references from PARTS array
  const rehydrate = (part) => part ? PARTS.find(p => p.id === part.id) ?? null : null
  return {
    config: {
      main_chute:      rehydrate(saved?.config?.main_chute),
      drogue_chute:    rehydrate(saved?.config?.drogue_chute),
      shock_cord:      rehydrate(saved?.config?.shock_cord),
      chute_protector: rehydrate(saved?.config?.chute_protector),
      quick_links:     rehydrate(saved?.config?.quick_links),
      chute_device:    rehydrate(saved?.config?.chute_device),
    },
    specs:          { ...DEFAULT_SPECS, ...(saved?.specs ?? {}) },
    activeCategory: CATEGORIES[0].id,
    mobileTab:      'parts',
    simulation:     null,
    simFailed:      false,
    simRunning:     false,
    warnings:       [],
    toasts:         [],
    saveState:      'idle',   // 'idle' | 'saving' | 'saved'
    shareState:     'idle',   // 'idle' | 'copied'
    exportState:    'idle',   // 'idle' | 'exporting' | 'done'
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'SELECT_PART':
      return {
        ...state,
        config: { ...state.config, [action.category]: action.part },
        simulation: null,
      }
    case 'REMOVE_PART':
      return {
        ...state,
        config: { ...state.config, [action.category]: null },
        simulation: null,
      }
    case 'SET_SPEC':
      return {
        ...state,
        specs: { ...state.specs, [action.key]: action.value },
        simulation: null,
      }
    case 'SET_CATEGORY':
      return { ...state, activeCategory: action.category }
    case 'SET_MOBILE_TAB':
      return { ...state, mobileTab: action.tab }
    case 'SET_WARNINGS':
      return { ...state, warnings: action.warnings }
    case 'START_SIM':
      return { ...state, simRunning: true, simFailed: false }
    case 'SET_SIM':
      return {
        ...state,
        simulation: action.simulation,
        simFailed: action.simulation === null,
        simRunning: false,
      }
    case 'ADD_TOAST': {
      const id = Date.now()
      return { ...state, toasts: [...state.toasts, { id, ...action.toast }] }
    }
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }
    case 'SET_SAVE_STATE':
      return { ...state, saveState: action.state }
    case 'SET_SHARE_STATE':
      return { ...state, shareState: action.state }
    case 'SET_EXPORT_STATE':
      return { ...state, exportState: action.state }
    default:
      return state
  }
}

// ── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, dispatch] = useReducer(reducer, null, buildInitialState)
  const debounceRef = useRef(null)

  // ── Parts browser collapse (UI pref, persisted separately) ──────────────────
  const [browserCollapsed, setBrowserCollapsed] = React.useState(
    () => localStorage.getItem('recoverysys-browser-collapsed') === 'true'
  )
  const toggleBrowser = useCallback(() => {
    setBrowserCollapsed(prev => {
      const next = !prev
      localStorage.setItem('recoverysys-browser-collapsed', String(next))
      return next
    })
  }, [])

  // ── Recompute compatibility whenever config or specs change ─────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const warnings = checkCompatibility({ config: state.config, specs: state.specs })
      dispatch({ type: 'SET_WARNINGS', warnings })
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [state.config, state.specs])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const selectPart = useCallback((part) => {
    dispatch({ type: 'SELECT_PART', category: part.category, part })
    // Auto-switch category in browser to match
    dispatch({ type: 'SET_CATEGORY', category: part.category })
  }, [])

  const removePart = useCallback((category) => {
    dispatch({ type: 'REMOVE_PART', category })
  }, [])

  const setSpec = useCallback((key, value) => {
    dispatch({ type: 'SET_SPEC', key, value })
  }, [])

  const setCategory = useCallback((cat) => {
    dispatch({ type: 'SET_CATEGORY', category: cat })
  }, [])

  const setMobileTab = useCallback((tab) => {
    dispatch({ type: 'SET_MOBILE_TAB', tab })
  }, [])

  const runSim = useCallback(() => {
    dispatch({ type: 'START_SIM' })
    // Simulate async (could be a worker in v2)
    setTimeout(() => {
      const result = runSimulation({ specs: state.specs, config: state.config })
      dispatch({ type: 'SET_SIM', simulation: result })
    }, 600)
  }, [state.specs, state.config])

  const saveConfig = useCallback(() => {
    dispatch({ type: 'SET_SAVE_STATE', state: 'saving' })
    try {
      localStorage.setItem('recoverysys-config', JSON.stringify({
        config: state.config,
        specs: state.specs,
      }))
    } catch { /* storage full */ }
    setTimeout(() => dispatch({ type: 'SET_SAVE_STATE', state: 'saved' }), 400)
    setTimeout(() => dispatch({ type: 'SET_SAVE_STATE', state: 'idle' }), 2400)
  }, [state.config, state.specs])

  const copyShareLink = useCallback(() => {
    const payload = { config: state.config, specs: state.specs }
    const encoded = btoa(JSON.stringify(payload))
    const url = `${location.origin}${location.pathname}?c=${encodeURIComponent(encoded)}`
    navigator.clipboard.writeText(url).catch(() => {})
    dispatch({ type: 'SET_SHARE_STATE', state: 'copied' })
    setTimeout(() => dispatch({ type: 'SET_SHARE_STATE', state: 'idle' }), 2000)
  }, [state.config, state.specs])

  const doExportOrk = useCallback(async () => {
    dispatch({ type: 'SET_EXPORT_STATE', state: 'exporting' })
    try {
      const blob = await exportOrk({ config: state.config, specs: state.specs, simulation: state.simulation })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'recoverysys.ork'
      a.click()
      URL.revokeObjectURL(url)
      dispatch({ type: 'SET_EXPORT_STATE', state: 'idle' })
      dispatch({ type: 'ADD_TOAST', toast: { message: 'Downloaded!', level: 'ok' } })
      setTimeout(() => dispatch({ type: 'REMOVE_TOAST', id: Date.now() }), 3000)
    } catch {
      dispatch({ type: 'SET_EXPORT_STATE', state: 'idle' })
    }
  }, [state.config, state.specs, state.simulation])

  const removeToast = useCallback((id) => {
    dispatch({ type: 'REMOVE_TOAST', id })
  }, [])

  // ── Load share link on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const c = params.get('c')
    if (!c) return
    try {
      const payload = JSON.parse(atob(decodeURIComponent(c)))
      if (payload.config) {
        Object.entries(payload.config).forEach(([cat, part]) => {
          if (part) {
            const found = PARTS.find(p => p.id === part.id)
            if (found) dispatch({ type: 'SELECT_PART', category: cat, part: found })
          }
        })
      }
      if (payload.specs) {
        Object.entries(payload.specs).forEach(([key, value]) => {
          dispatch({ type: 'SET_SPEC', key, value })
        })
      }
    } catch { /* malformed */ }
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-app)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--cta-bg)',
        color: 'var(--cta-fg)',
        padding: '0 16px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderBottom: '1px solid #000',
      }}>
        <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>RECOVERYSYS</span>
        <span style={{ fontSize: '11px', color: '#888', fontFamily: 'ui-monospace, monospace' }}>v1</span>
      </header>

      {/* 3-panel layout (desktop) / tab layout (mobile) */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Desktop: 3 columns */}
        <div className="hidden md:flex" style={{ flex: 1, overflow: 'hidden' }}>
          {/* Left: Parts Browser (collapsible) */}
          <div style={{
            width: browserCollapsed ? '24px' : '280px',
            flexShrink: 0,
            borderRight: '1px solid var(--border-default)',
            background: 'var(--bg-panel)',
            overflow: 'hidden',
            transition: 'width 200ms ease',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {/* Collapse toggle — always visible on right edge */}
            <button
              onClick={toggleBrowser}
              title={browserCollapsed ? 'Expand parts browser' : 'Collapse parts browser'}
              style={{
                position: 'absolute',
                top: '50%',
                right: 0,
                transform: 'translateY(-50%)',
                width: '20px',
                height: '48px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-default)',
                borderRight: 'none',
                borderRadius: '4px 0 0 4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                color: 'var(--text-tertiary)',
                zIndex: 10,
                flexShrink: 0,
                padding: 0,
              }}
            >
              {browserCollapsed ? '›' : '‹'}
            </button>

            {/* Parts browser content — hidden when collapsed */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              opacity: browserCollapsed ? 0 : 1,
              pointerEvents: browserCollapsed ? 'none' : 'auto',
              transition: 'opacity 150ms ease',
              width: '280px',   /* keep inner width stable during transition */
            }}>
              <PartsBrowser
                parts={PARTS}
                categories={CATEGORIES}
                activeCategory={state.activeCategory}
                config={state.config}
                warnings={state.warnings}
                onSelectCategory={setCategory}
                onSelectPart={selectPart}
              />
            </div>
          </div>

          {/* Middle: Config Builder */}
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-panel)', borderRight: '1px solid var(--border-default)' }}>
            <ConfigBuilder
              categories={CATEGORIES}
              config={state.config}
              specs={state.specs}
              warnings={state.warnings}
              saveState={state.saveState}
              shareState={state.shareState}
              onRemovePart={removePart}
              onSetSpec={setSpec}
              onSave={saveConfig}
              onShare={copyShareLink}
              onSelectCategory={setCategory}
            />
          </div>

          {/* Right: Simulation Panel */}
          <div style={{ width: '380px', flexShrink: 0, overflowY: 'auto', background: 'var(--bg-panel)' }}>
            <SimPanel
              simulation={state.simulation}
              simFailed={state.simFailed}
              simRunning={state.simRunning}
              exportState={state.exportState}
              config={state.config}
              specs={state.specs}
              onRun={runSim}
              onExport={doExportOrk}
            />
          </div>
        </div>

        {/* Mobile: tabbed */}
        <div className="flex md:hidden flex-col" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-panel)' }}>
            {state.mobileTab === 'parts' && (
              <PartsBrowser
                parts={PARTS}
                categories={CATEGORIES}
                activeCategory={state.activeCategory}
                config={state.config}
                warnings={state.warnings}
                onSelectCategory={setCategory}
                onSelectPart={selectPart}
              />
            )}
            {state.mobileTab === 'config' && (
              <ConfigBuilder
                categories={CATEGORIES}
                config={state.config}
                specs={state.specs}
                warnings={state.warnings}
                saveState={state.saveState}
                shareState={state.shareState}
                onRemovePart={removePart}
                onSetSpec={setSpec}
                onSave={saveConfig}
                onShare={copyShareLink}
                onSelectCategory={setCategory}
              />
            )}
            {state.mobileTab === 'simulation' && (
              <SimPanel
                simulation={state.simulation}
                simFailed={state.simFailed}
                simRunning={state.simRunning}
                exportState={state.exportState}
                config={state.config}
                specs={state.specs}
                onRun={runSim}
                onExport={doExportOrk}
              />
            )}
          </div>

          {/* Mobile tab bar */}
          <div style={{
            height: '44px',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            background: 'var(--bg-panel)',
            flexShrink: 0,
          }}>
            {[
              { id: 'parts',      label: 'Parts' },
              { id: 'config',     label: 'Config' },
              { id: 'simulation', label: 'Simulation' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMobileTab(tab.id)}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: state.mobileTab === tab.id ? 600 : 400,
                  color: state.mobileTab === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  borderTop: state.mobileTab === tab.id ? '2px solid var(--text-primary)' : '2px solid transparent',
                  transition: 'color 150ms',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ToastContainer toasts={state.toasts} onRemove={removeToast} />
    </div>
  )
}
