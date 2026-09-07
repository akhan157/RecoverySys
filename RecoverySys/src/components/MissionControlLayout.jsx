import { useState, useMemo } from 'react'
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
import GuidedPlanWizard from './GuidedPlanWizard.jsx'
import StatusStrip from './StatusStrip.jsx'
import RecoveryAtlas from './atlas/RecoveryAtlas.jsx'
import { buildRecoveryBrief } from '../lib/recoveryBrief.js'
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
  /* darkMode/setDarkMode removed: MC layout is dark-only */
}) {
  const [activeTab, setActiveTab] = useState('DASHBOARD')
  const [printMode, setPrintMode] = useState('brief')
  const [showGuided, setShowGuided] = useState(false)
  const [uiMode, setUiMode] = useState(() => {
    try {
      const saved = localStorage.getItem('recoverysys-ui-mode')
      if (saved === 'classic' || saved === 'atlas' || saved === 'flightline') return saved
      return 'flightline'
    } catch {
      return 'flightline'
    }
  })

  const handleToggleUiMode = (mode) => {
    setUiMode(mode)
    try {
      localStorage.setItem('recoverysys-ui-mode', mode)
    } catch {}
  }

  const handlePrintBrief = () => {
    setPrintMode('brief')
    setTimeout(() => window.print(), 20)
  }
  const handlePrintChecklist = () => {
    setPrintMode('checklist')
    setTimeout(() => window.print(), 20)
  }
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
  const confidenceProps = {
    specs: state.specs,
    config: state.config,
    customMotor: state.customMotor,
    simulation: state.simulation,
    resultFresh,
    onNavigate: (path) => setActiveTab(path.startsWith('config.') ? 'DASHBOARD' : 'SPECS'),
  }
  const recoveryBrief = buildRecoveryBrief({
    specs: state.specs,
    config: state.config,
    customMotor: state.customMotor,
    simulation: state.simulation,
    resultFresh,
    warnings: state.warnings,
  })

  // Mirror runSimulation's preconditions exactly — inputs are strings from <input>,
  // so '0' and '-5' are truthy. parseFloat(...) > 0 matches what simulation.js rejects.
  const canRun =
    parseFloat(state.specs.rocket_mass_g) > 0 &&
    parseFloat(state.specs.motor_total_impulse_ns) > 0 &&
    !!(state.config.main_chute || state.config.drogue_chute)

  const tabBtnId = (id) => `mc-tab-${id.toLowerCase()}`
  const tabPanelId = (id) => `mc-panel-${id.toLowerCase()}`

  if (uiMode === 'atlas') {
    return (
      <RecoveryAtlas
        state={state}
        allParts={allParts}
        onSetSpec={setSpec}
        selectPart={selectPart}
        removePart={removePart}
        runSim={runSim}
        canRun={canRun}
        resultFresh={resultFresh}
        onExit={() => handleToggleUiMode('flightline')}
        uiMode={uiMode}
        onToggleUiMode={handleToggleUiMode}
      />
    )
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
                  className={`mc-header__tab ${isActive ? 'mc-header__tab--active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              )
            })}
          </nav>
          <div className="mc-header__right">
            <div className="mc-ui-mode-toggle" role="group" aria-label="UI Mode Selection">
              <button
                type="button"
                className={`mc-ui-mode-btn ${uiMode === 'classic' ? 'mc-ui-mode-btn--active' : ''}`}
                onClick={() => handleToggleUiMode('classic')}
                aria-pressed={uiMode === 'classic'}
              >
                CLASSIC
              </button>
              <button
                type="button"
                className={`mc-ui-mode-btn ${uiMode === 'flightline' ? 'mc-ui-mode-btn--active' : ''}`}
                onClick={() => handleToggleUiMode('flightline')}
                aria-pressed={uiMode === 'flightline'}
              >
                FLIGHTLINE
              </button>
              <button
                type="button"
                className={`mc-ui-mode-btn ${uiMode === 'atlas' ? 'mc-ui-mode-btn--active' : ''}`}
                onClick={() => handleToggleUiMode('atlas')}
                aria-pressed={uiMode === 'atlas'}
              >
                ATLAS
              </button>
            </div>
            {uiMode === 'flightline' && (
              <button
                type="button"
                className={`mc-header__guided-btn ${showGuided ? 'mc-header__guided-btn--active' : ''}`}
                onClick={() => setShowGuided(!showGuided)}
                aria-label={showGuided ? 'Exit guided review' : 'Guided review'}
              >
                {showGuided ? '✕ EXIT_GUIDE' : '★ GUIDED_REVIEW'}
              </button>
            )}
          </div>
        </header>

        {/* ── Persistent Telemetry & Status Strip ───────────────────────── */}
        {uiMode === 'flightline' && (
          <StatusStrip
            simulation={state.simulation}
            resultFresh={resultFresh}
            hasErrors={hasErrors}
            hasWarnings={hasWarnings}
            warnings={state.warnings}
            filledSlots={filledSlots}
            packingVolume={packingVolume}
            onNavigate={setActiveTab}
          />
        )}
        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="mc-body">
          <main
            id="mc-main"
            className="mc-main"
            role="tabpanel"
            aria-labelledby={tabBtnId(activeTab)}
            tabIndex={0}
          >
            {showGuided ? (
              <GuidedPlanWizard
                state={state}
                allParts={allParts}
                onSetSpec={setSpec}
                selectPart={selectPart}
                removePart={removePart}
                runSim={runSim}
                canRun={canRun}
                resultFresh={resultFresh}
                confidenceProps={confidenceProps}
                onExit={() => setShowGuided(false)}
                onLoadDemo={() => {
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href)
                    url.searchParams.set('demo', '1')
                    window.location.href = url.toString()
                  }
                }}
                onStartFresh={() => {
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href)
                    url.searchParams.set('fresh', '1')
                    window.location.href = url.toString()
                  }
                }}
              />
            ) : (
              <>
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
                    confidenceProps={confidenceProps}
                  />
                )}
                {activeTab === 'SIMULATION' && (
                  <SimulationTab
                    state={state}
                    runSim={runSim}
                    canRun={canRun}
                    resultFresh={resultFresh}
                    confidenceProps={confidenceProps}
                  />
                )}
                {activeTab === 'ANALYSIS' && (
                  <AnalysisTab
                    state={{ ...state, resultFresh }}
                    confidenceProps={confidenceProps}
                  />
                )}
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
                    onNavigate={(path) => {
                      if (path.startsWith('config.')) setCategory(path.replace('config.', ''))
                    }}
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
                {activeTab === 'FLIGHT_LOG' && (
                  <FlightLogTab state={state} resultFresh={resultFresh} />
                )}
                {activeTab === 'EXPORT' && (
                  <ExportTab
                    state={state}
                    saveConfig={saveConfig}
                    copyShareLink={copyShareLink}
                    onLoadConfig={loadConfig}
                    recoveryBrief={recoveryBrief}
                    onPrintBrief={handlePrintBrief}
                    onPrintChecklist={handlePrintChecklist}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>
      <PrintChecklist
        specs={state.specs}
        config={state.config}
        simulation={state.simulation}
        resultFresh={resultFresh}
        warnings={state.warnings}
        recoveryBrief={recoveryBrief}
        mode={printMode}
      />
    </>
  )
}
