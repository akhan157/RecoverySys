import React, { useState, useMemo } from 'react'
import { CATEGORIES } from '../data/parts.js'
import { WARN_LEVELS, VERSION_DISPLAY } from '../lib/constants.js'
import { computePackingVolume } from '../lib/compatibility.js'
import DashboardTab from './tabs/DashboardTab.jsx'
import SimulationTab from './tabs/SimulationTab.jsx'
import DispersionTab from './tabs/DispersionTab.jsx'
import SpecsTab from './tabs/SpecsTab.jsx'
import ExportTab from './tabs/ExportTab.jsx'
import CompareTab from './tabs/CompareTab.jsx'
import FlightLogTab from './tabs/FlightLogTab.jsx'
import AnalysisTab from './tabs/AnalysisTab.jsx'
import PrintChecklist from './PrintChecklist.jsx'
import './MissionControlLayout.css'

const TABS = [
  { id: 'DASHBOARD',  label: 'DASHBOARD' },
  { id: 'SPECS',      label: 'ROCKET_SPECS' },
  { id: 'SIMULATION', label: 'SIMULATION' },
  { id: 'ANALYSIS',   label: 'ANALYSIS' },
  { id: 'DISPERSION', label: 'DISPERSION' },
  { id: 'COMPARE',    label: 'COMPARE' },
  { id: 'FLIGHT_LOG', label: 'FLIGHT_LOG' },
  { id: 'EXPORT',     label: 'EXPORT' },
]

export default function MissionControlLayout({
  state, allParts, customParts,
  selectPart, removePart, setSpec, setCategory, runSim,
  saveConfig, copyShareLink, addCustomPart, deleteCustomPart, editCustomPart,
  setCustomMotor, clearCustomMotor, loadConfig, addToast,
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

  const packingVolume = useMemo(
    () => computePackingVolume({ config: state.config, specs: state.specs }),
    [state.config, state.specs]
  )

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
    <>
    <div className="mc">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="mc-header">
        <h1 className="mc-header__brand">RECOVERYSYS_{VERSION_DISPLAY}</h1>
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
                {tab.label}
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
              packingVolume={packingVolume}
              hasWarnings={hasWarnings}
              hasErrors={hasErrors}
              canRun={canRun}
              selectPart={selectPart}
              removePart={removePart}
              setCategory={setCategory}
              runSim={runSim}
              addCustomPart={addCustomPart}
              deleteCustomPart={deleteCustomPart}
              editCustomPart={editCustomPart}
            />
          )}
          {activeTab === 'SIMULATION' && (
            <SimulationTab
              state={state}
              runSim={runSim}
              canRun={canRun}
            />
          )}
          {activeTab === 'ANALYSIS' && <AnalysisTab state={state} />}
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
          {activeTab === 'COMPARE' && <CompareTab state={state} />}
          {activeTab === 'FLIGHT_LOG' && <FlightLogTab state={state} />}
          {activeTab === 'EXPORT' && (
            <ExportTab state={state} saveConfig={saveConfig} copyShareLink={copyShareLink} onLoadConfig={loadConfig} />
          )}
        </main>
      </div>

    </div>
    <PrintChecklist
      specs={state.specs}
      config={state.config}
      simulation={state.simulation}
      warnings={state.warnings}
    />
    </>
  )
}
