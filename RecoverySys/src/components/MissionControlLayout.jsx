import { useState, useMemo, useRef } from 'react'
import { CATEGORIES } from '../data/parts.js'
import { WARN_LEVELS, VERSION_DISPLAY } from '../lib/constants.js'
import { computePackingVolume } from '../lib/compatibility.js'
import { isResultFresh } from '../lib/resultIntegrity.js'
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
  { id: 'DASHBOARD', label: 'DASHBOARD' },
  { id: 'SPECS', label: 'ROCKET_SPECS' },
  { id: 'SIMULATION', label: 'SIMULATION' },
  { id: 'ANALYSIS', label: 'ANALYSIS' },
  { id: 'DISPERSION', label: 'DISPERSION' },
  { id: 'COMPARE', label: 'COMPARE' },
  { id: 'FLIGHT_LOG', label: 'FLIGHT_LOG' },
  { id: 'EXPORT', label: 'EXPORT' },
]

export default function MissionControlLayout({
  state,
  allParts,
  customParts,
  selectPart,
  removePart,
  setSpec,
  setCategory,
  runSim,
  saveConfig,
  copyShareLink,
  addCustomPart,
  deleteCustomPart,
  editCustomPart,
  setCustomMotor,
  clearCustomMotor,
  loadConfig,
  addToast,
  saveCompareSnapshot,
  clearCompareSnapshot,
  openExampleConfiguration,
  /* darkMode/setDarkMode removed: MC layout is dark-only */
}) {
  const [activeTab, setActiveTab] = useState('DASHBOARD')
  const tabRefs = useRef([])

  const filledSlots = useMemo(
    () => CATEGORIES.filter((c) => state.config[c.id] != null).length,
    [state.config]
  )

  const packingVolume = useMemo(
    () => computePackingVolume({ config: state.config, specs: state.specs }),
    [state.config, state.specs]
  )

  const hasWarnings = state.warnings.length > 0
  const hasErrors = state.warnings.some((w) => w.level === WARN_LEVELS.ERROR)
  const resultFresh = isResultFresh(
    state.simulation,
    { specs: state.specs, config: state.config, customMotor: state.customMotor },
    state.inputRevision
  )

  // Mirror runSimulation's preconditions exactly — inputs are strings from <input>,
  // so '0' and '-5' are truthy. parseFloat(...) > 0 matches what simulation.js rejects.
  const canRun =
    parseFloat(state.specs.rocket_mass_g) > 0 &&
    parseFloat(state.specs.motor_total_impulse_ns) > 0 &&
    !!(state.config.main_chute || state.config.drogue_chute)

  const tabBtnId = (id) => `mc-tab-${id.toLowerCase()}`
  const tabPanelId = (id) => `mc-panel-${id.toLowerCase()}`

  const selectTabWithKeyboard = (index) => {
    setActiveTab(TABS[index].id)
    tabRefs.current[index]?.focus()
  }

  const handleTabKeyDown = (event, index) => {
    let nextIndex = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + TABS.length) % TABS.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = TABS.length - 1
    if (nextIndex !== null) {
      event.preventDefault()
      selectTabWithKeyboard(nextIndex)
    }
  }

  return (
    <>
      <div className="mc">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="mc-header">
          <h1 className="mc-header__brand">RECOVERYSYS_{VERSION_DISPLAY}</h1>
          <nav className="mc-header__tabs" role="tablist" aria-label="Main navigation">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  id={tabBtnId(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={tabPanelId(tab.id)}
                  tabIndex={isActive ? 0 : -1}
                  ref={(element) => {
                    tabRefs.current[TABS.findIndex((item) => item.id === tab.id)] = element
                  }}
                  className={`mc-header__tab ${isActive ? 'mc-header__tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(event) =>
                    handleTabKeyDown(
                      event,
                      TABS.findIndex((item) => item.id === tab.id)
                    )
                  }
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
            id={tabPanelId(activeTab)}
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
                resultFresh={resultFresh}
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
                resultFresh={resultFresh}
              />
            )}
            {activeTab === 'ANALYSIS' && <AnalysisTab state={{ ...state, resultFresh }} />}
            {activeTab === 'DISPERSION' && (
              <DispersionTab state={state} resultFresh={resultFresh} />
            )}
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
                openExampleConfiguration={openExampleConfiguration}
              />
            )}
            {activeTab === 'COMPARE' && (
              <CompareTab
                state={state}
                resultFresh={resultFresh}
                snapshot={state.compareSnapshot}
                onSaveSnapshot={saveCompareSnapshot}
                onClearSnapshot={clearCompareSnapshot}
              />
            )}
            {activeTab === 'FLIGHT_LOG' && <FlightLogTab state={state} resultFresh={resultFresh} />}
            {activeTab === 'EXPORT' && (
              <ExportTab
                state={state}
                saveConfig={saveConfig}
                copyShareLink={copyShareLink}
                onLoadConfig={loadConfig}
              />
            )}
          </main>
          {TABS.filter((tab) => tab.id !== activeTab).map((tab) => (
            <div
              key={tab.id}
              id={tabPanelId(tab.id)}
              role="tabpanel"
              aria-labelledby={tabBtnId(tab.id)}
              hidden
            />
          ))}
        </div>
      </div>
      <PrintChecklist
        specs={state.specs}
        config={state.config}
        simulation={state.simulation}
        resultFresh={resultFresh}
        warnings={state.warnings}
      />
    </>
  )
}
