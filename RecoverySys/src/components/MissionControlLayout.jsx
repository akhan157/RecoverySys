import React, { useState, useMemo } from 'react'
import { CATEGORIES } from '../data/parts.js'
import { WARN_LEVELS } from '../lib/constants.js'
import DashboardTab from './tabs/DashboardTab.jsx'
import SimulationTab from './tabs/SimulationTab.jsx'
import DispersionTab from './tabs/DispersionTab.jsx'
import SpecsTab from './tabs/SpecsTab.jsx'
import ExportTab from './tabs/ExportTab.jsx'
import './MissionControlLayout.css'

const TABS = [
  { id: 'DASHBOARD',  label: 'DASHBOARD' },
  { id: 'SIMULATION', label: 'SIMULATION' },
  { id: 'DISPERSION', label: 'DISPERSION' },
  { id: 'SPECS',      label: 'ROCKET_SPECS' },
  { id: 'EXPORT',     label: 'EXPORT' },
]

export default function MissionControlLayout({
  state, allParts, customParts,
  selectPart, removePart, setSpec, setCategory, runSim,
  saveConfig, copyShareLink, addCustomPart, deleteCustomPart,
  setCustomMotor, clearCustomMotor, addToast,
  /* darkMode/setDarkMode removed: MC layout is dark-only */
}) {
  const [activeTab, setActiveTab] = useState('DASHBOARD')

  const filledSlots = useMemo(
    () => CATEGORIES.filter(c => state.config[c.id] != null).length,
    [state.config]
  )

  const totalMass = useMemo(() => {
    let mass = 0
    for (const c of CATEGORIES) {
      const part = state.config[c.id]
      if (part?.specs?.weight_g) mass += part.specs.weight_g
    }
    return mass
  }, [state.config])

  const hasWarnings = state.warnings.length > 0
  const hasErrors = state.warnings.some(w => w.level === WARN_LEVELS.ERROR)

  // Mirror runSimulation's preconditions exactly — inputs are strings from <input>,
  // so '0' and '-5' are truthy. parseFloat(...) > 0 matches what simulation.js rejects.
  const canRun = (
    parseFloat(state.specs.rocket_mass_g) > 0 &&
    parseFloat(state.specs.motor_total_impulse_ns) > 0 &&
    !!(state.config.main_chute || state.config.drogue_chute)
  )

  const tabBtnId   = id => `mc-tab-${id.toLowerCase()}`
  const tabPanelId = id => `mc-panel-${id.toLowerCase()}`

  return (
    <div className="mc">
      {/* Skip link — keyboard users can bypass the header on Tab */}
      <a href="#mc-main" className="mc-skip-link">Skip to main content</a>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="mc-header">
        <h1 className="mc-header__brand">RECOVERYSYS_V1.1</h1>
        <nav className="mc-header__tabs" role="tablist" aria-label="Main navigation">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                id={tabBtnId(tab.id)}
                role="tab"
                aria-selected={isActive}
                aria-controls={tabPanelId(tab.id)}
                tabIndex={isActive ? 0 : -1}
                className={`mc-header__tab ${isActive ? 'mc-header__tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.id}
              </button>
            )
          })}
        </nav>
        <div className="mc-header__right">
          {/* Theme toggle hidden: MC layout is dark-only by design */}
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="mc-body">
        <main
          id="mc-main"
          className="mc-main"
          role="tabpanel"
          aria-labelledby={tabBtnId(activeTab)}
          tabIndex={0}
        >
          {activeTab === 'DASHBOARD' && (
            <DashboardTab
              state={state}
              allParts={allParts}
              customParts={customParts}
              filledSlots={filledSlots}
              totalMass={totalMass}
              hasWarnings={hasWarnings}
              hasErrors={hasErrors}
              canRun={canRun}
              selectPart={selectPart}
              removePart={removePart}
              setCategory={setCategory}
              runSim={runSim}
              addCustomPart={addCustomPart}
              deleteCustomPart={deleteCustomPart}
            />
          )}
          {activeTab === 'SIMULATION' && (
            <SimulationTab
              state={state}
              allParts={allParts}
              selectPart={selectPart}
              runSim={runSim}
              canRun={canRun}
            />
          )}
          {activeTab === 'DISPERSION' && <DispersionTab state={state} />}
          {activeTab === 'SPECS' && (
            <SpecsTab
              state={state}
              setSpec={setSpec}
              removePart={removePart}
              setCategory={setCategory}
              saveConfig={saveConfig}
              copyShareLink={copyShareLink}
              setCustomMotor={setCustomMotor}
              clearCustomMotor={clearCustomMotor}
              addToast={addToast}
            />
          )}
          {activeTab === 'EXPORT' && (
            <ExportTab state={state} saveConfig={saveConfig} copyShareLink={copyShareLink} />
          )}
        </main>
      </div>

      {/* ── Status Bar ──────────────────────────────────────────────────── */}
      <div className="mc-statusbar">
        <button
          className="mc-statusbar__run"
          onClick={runSim}
          disabled={!canRun}
        >
          {state.simRunning ? '⟳ RUNNING...' : '▶ RUN_SIM'}
        </button>
        <div className="mc-statusbar__item">
          MOTOR: {parseFloat(state.specs.motor_total_impulse_ns) > 0 ? `${state.specs.motor_total_impulse_ns}Ns` : 'NOT_SET'}
        </div>
        <div className="mc-statusbar__item">
          DESCENT_RATE: {state.simulation?.main_fps != null ? `${state.simulation.main_fps.toFixed(1)} FT/S` : '—'}
        </div>
        <div className="mc-statusbar__item">
          DRIFT: {state.simulation?.drift_ft != null ? `${state.simulation.drift_ft.toFixed(0)} FT` : '—'}
        </div>
        {state.simulation?.shock_load && (
          <div className="mc-statusbar__item">
            SHOCK_LOAD: {state.simulation.shock_load.peak_load_lbs.toFixed(0)} LBS
          </div>
        )}
        <div className="mc-statusbar__right">
          <span>SLOTS: {filledSlots}/08</span>
          {hasErrors ? (
            <span className="mc-statusbar__badge mc-statusbar__badge--warn">
              {state.warnings.length} WARNING{state.warnings.length !== 1 ? 'S' : ''}
            </span>
          ) : (
            <span className="mc-statusbar__badge">NOMINAL</span>
          )}
        </div>
      </div>
    </div>
  )
}
