import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import GuidedReview from './GuidedReview.jsx'
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
import RecoveryBriefTab from './tabs/RecoveryBriefTab.jsx'
import { buildRecoveryBrief } from '../lib/recoveryBrief.js'
import PrintChecklist from './PrintChecklist.jsx'
import './MissionControlLayout.css'

const TABS = [
  { id: 'GUIDED_REVIEW', label: 'GUIDED_REVIEW' },
  { id: 'DASHBOARD', label: 'DASHBOARD' },
  { id: 'SPECS', label: 'ROCKET_SPECS' },
  { id: 'SIMULATION', label: 'SIMULATION' },
  { id: 'ANALYSIS', label: 'ANALYSIS' },
  { id: 'DISPERSION', label: 'DISPERSION' },
  { id: 'COMPARE', label: 'COMPARE' },
  { id: 'FLIGHT_LOG', label: 'FLIGHT_LOG' },
  { id: 'RECOVERY_BRIEF', label: 'RECOVERY_BRIEF' },
  { id: 'EXPORT', label: 'EXPORT' },
]

export default function MissionControlLayout({
  state,
  demoMode = false,
  onExitDemo = () => {},
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
  clearAll,
  addToast,
  saveCompareSnapshot,
  clearCompareSnapshot,
  /* darkMode/setDarkMode removed: MC layout is dark-only */
}) {
  const [activeTab, setActiveTab] = useState('GUIDED_REVIEW')
  const [printMode, setPrintMode] = useState(null)
  // Review-origin navigation: { origin: 'ANALYSIS' | null, target: path }
  // set when a review action from Analysis opens a destination surface so the
  // destination can focus the affected input and show a return path.
  const [reviewNav, setReviewNav] = useState(null)
  const activeTabRef = useRef(activeTab)
  const tabRefs = useRef(new Map())

  useEffect(() => {
    activeTabRef.current = activeTab
  }, [activeTab])

  useEffect(() => {
    if (!printMode) return undefined
    const timerId = window.setTimeout(() => window.print(), 0)
    return () => window.clearTimeout(timerId)
  }, [printMode])

  useEffect(() => {
    const resetPrintMode = () => setPrintMode(null)
    window.addEventListener('afterprint', resetPrintMode)
    return () => window.removeEventListener('afterprint', resetPrintMode)
  }, [])

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
  // Review actions (Analysis board rows, result strip, ConfidenceStatus links)
  // open the owning surface, focus the affected input, and offer a return path.
  const handleNavigate = useCallback(
    (path) => {
      const tab =
        path === 'SIMULATION'
          ? 'SIMULATION'
          : path.startsWith('config.')
            ? 'DASHBOARD'
            : 'SPECS'
      setReviewNav({
        origin: activeTabRef.current === 'ANALYSIS' ? 'ANALYSIS' : null,
        target: path,
      })
      setActiveTab(tab)
    },
    []
  )
  const handleTabSelect = useCallback((id) => {
    if (id !== 'ANALYSIS') setReviewNav(null)
    setActiveTab(id)
  }, [])
  const returnToAnalysis = useCallback(() => {
    setReviewNav(null)
    setActiveTab('ANALYSIS')
    tabRefs.current.get('ANALYSIS')?.focus()
  }, [])
  const consumeReviewFocus = useCallback(
    () => setReviewNav((prev) => (prev ? { ...prev, target: null } : prev)),
    []
  )
  const confidenceProps = {
    specs: state.specs,
    config: state.config,
    customMotor: state.customMotor,
    simulation: state.simulation,
    resultFresh,
    onNavigate: handleNavigate,
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
  const focusTab = (index) => {
    const tab = TABS[index]
    handleTabSelect(tab.id)
    tabRefs.current.get(tab.id)?.focus()
  }

  const handleTabKeyDown = (event, index) => {
    let nextIndex

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (index + 1) % TABS.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (index - 1 + TABS.length) % TABS.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = TABS.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    focusTab(nextIndex)
  }

  return (
    <>
      <div className="mc">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="mc-header">
          <h1 className="mc-header__brand">RECOVERYSYS_{VERSION_DISPLAY}</h1>
          <nav className="mc-header__tabs" role="tablist" aria-label="Main navigation">
            {TABS.map((tab, index) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  ref={(element) => {
                    if (element) tabRefs.current.set(tab.id, element)
                    else tabRefs.current.delete(tab.id)
                  }}
                  id={tabBtnId(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={tabPanelId(tab.id)}
                  tabIndex={isActive ? 0 : -1}
                  className={`mc-header__tab ${isActive ? 'mc-header__tab--active' : ''}`}
                  onClick={() => handleTabSelect(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
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
            {activeTab === 'GUIDED_REVIEW' && (
              <GuidedReview
                resultFresh={resultFresh}
                state={state}
                recoveryBrief={recoveryBrief}
                onOpenDashboard={() => setActiveTab('DASHBOARD')}
                onOpenSpecs={() => setActiveTab('SPECS')}
                onOpenSimulation={() => setActiveTab('SIMULATION')}
                onOpenImport={() => setActiveTab('EXPORT')}
                onStartFresh={() => {
                  // Demo data must never become (or be mistaken for) the user's own
                  // plan: starting fresh inside a demo session leaves the session
                  // the same way the banner's START_FRESH does, so no demo inputs
                  // survive and a reload cannot reseed them over user work.
                  if (demoMode) {
                    onExitDemo()
                    return
                  }
                  clearAll()
                  setActiveTab('SPECS')
                }}
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
                reviewOrigin={reviewNav?.origin ?? null}
                focusTarget={reviewNav?.target ?? null}
                onFocusConsumed={consumeReviewFocus}
                onReturnToAnalysis={returnToAnalysis}
              />
            )}
            {activeTab === 'SIMULATION' && (
              <SimulationTab
                state={state}
                runSim={runSim}
                canRun={canRun}
                resultFresh={resultFresh}
                confidenceProps={confidenceProps}
                reviewOrigin={reviewNav?.origin ?? null}
                focusTarget={reviewNav?.target ?? null}
                onFocusConsumed={consumeReviewFocus}
                onReturnToAnalysis={returnToAnalysis}
              />
            )}
            {activeTab === 'ANALYSIS' && (
              <AnalysisTab state={{ ...state, resultFresh }} confidenceProps={confidenceProps} />
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
                reviewOrigin={reviewNav?.origin ?? null}
                focusTarget={reviewNav?.target ?? null}
                onFocusConsumed={consumeReviewFocus}
                onReturnToAnalysis={returnToAnalysis}
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
              <FlightLogTab state={state} resultFresh={resultFresh} addToast={addToast} />
            )}
            {activeTab === 'RECOVERY_BRIEF' && <RecoveryBriefTab recoveryBrief={recoveryBrief} />}
            {activeTab === 'EXPORT' && (
              <ExportTab
                state={state}
                saveConfig={saveConfig}
                copyShareLink={copyShareLink}
                onLoadConfig={loadConfig}
                recoveryBrief={recoveryBrief}
                onOpenBrief={() => setActiveTab('RECOVERY_BRIEF')}
                onPrintBrief={() => setPrintMode('brief')}
                onPrintChecklist={() => setPrintMode('checklist')}
              />
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
        printMode={printMode ?? 'checklist'}
      />
    </>
  )
}
