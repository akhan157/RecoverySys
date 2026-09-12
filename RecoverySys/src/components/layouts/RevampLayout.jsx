import { useState } from 'react'
import { VERSION_DISPLAY } from '../../lib/constants.js'
import StatusStrip from '../StatusStrip.jsx'
import GuidedPlanWizard from '../GuidedPlanWizard.jsx'
import DashboardTab from '../tabs/DashboardTab.jsx'
import SimulationTab from '../tabs/SimulationTab.jsx'
import DispersionTab from '../tabs/DispersionTab.jsx'
import SpecsTab from '../tabs/SpecsTab.jsx'
import ExportTab from '../tabs/ExportTab.jsx'
import CompareTab from '../tabs/CompareTab.jsx'
import FlightLogTab from '../tabs/FlightLogTab.jsx'
import AnalysisTab from '../tabs/AnalysisTab.jsx'
import PrintChecklist from '../PrintChecklist.jsx'
import QuickDraftTab from '../tabs/QuickDraftTab.jsx'
import '../MissionControlLayout.css'

const TABS = [
  { id: 'DRAFT', label: 'DRAFT' },
  { id: 'DASHBOARD', label: 'DASHBOARD' },
  { id: 'SPECS', label: 'ROCKET_SPECS' },
  { id: 'SIMULATION', label: 'SIMULATION' },
  { id: 'ANALYSIS', label: 'ANALYSIS' },
  { id: 'DISPERSION', label: 'DISPERSION' },
  { id: 'COMPARE', label: 'COMPARE' },
  { id: 'FLIGHT_LOG', label: 'FLIGHT_LOG' },
  { id: 'EXPORT', label: 'EXPORT' },
]

export default function RevampLayout({
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
  filledSlots,
  packingVolume,
  hasWarnings,
  hasErrors,
  canRun,
  resultFresh,
  confidenceProps,
  recoveryBrief,
  onSwitchMode,
}) {
  const [activeTab, setActiveTab] = useState('DRAFT')
  const [showGuided, setShowGuided] = useState(false)
  const [printMode, setPrintMode] = useState('checklist')

  const tabBtnId = (id) => `mc-tab-${id.toLowerCase()}`
  const tabPanelId = (id) => `mc-panel-${id.toLowerCase()}`

  const handlePrintBrief = () => {
    setPrintMode('brief')
    setTimeout(() => window.print(), 20)
  }

  const handlePrintChecklist = () => {
    setPrintMode('checklist')
    setTimeout(() => window.print(), 20)
  }

  return (
    <>
      <div className="mc mc--revamp">
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
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={tabPanelId(tab.id)}
                  className={`mc-tab-btn ${isActive ? 'mc-tab-btn--active' : ''}`}
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
                className="mc-ui-mode-btn"
                onClick={() => onSwitchMode?.('classic')}
                aria-pressed={false}
              >
                CLASSIC
              </button>
              <button
                type="button"
                className="mc-ui-mode-btn mc-ui-mode-btn--active"
                aria-pressed={true}
              >
                REVAMP
              </button>
            </div>
            <button
              type="button"
              className={`mc-header__guided-btn ${showGuided ? 'mc-header__guided-btn--active' : ''}`}
              onClick={() => setShowGuided(!showGuided)}
              aria-label={showGuided ? 'Exit guided review' : 'Guided review'}
            >
              {showGuided ? '✕ EXIT_GUIDE' : '★ GUIDED_REVIEW'}
            </button>
          </div>
        </header>

        {/* ── Persistent Telemetry & Status Strip ───────────────────────── */}
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
                    url.searchParams.delete('demo')
                    url.searchParams.set('fresh', '1')
                    window.location.href = url.toString()
                  }
                }}
              />
            ) : (
              <>
                {activeTab === 'DRAFT' && (
                  <QuickDraftTab
                    state={state}
                    allParts={allParts}
                    selectPart={selectPart}
                    removePart={removePart}
                    setSpec={setSpec}
                    resultFresh={resultFresh}
                  />
                )}
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
