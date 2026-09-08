import { useState, useMemo } from 'react'
import { CATEGORIES } from '../data/parts.js'
import { WARN_LEVELS } from '../lib/constants.js'
import { computePackingVolume } from '../lib/compatibility.js'
import { isResultFresh } from '../lib/resultIntegrity.js'
import { buildRecoveryBrief } from '../lib/recoveryBrief.js'
import ClassicLayout from './layouts/ClassicLayout.jsx'
import RevampLayout from './layouts/RevampLayout.jsx'

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
}) {
  const [uiMode, setUiMode] = useState(() => {
    try {
      const saved = localStorage.getItem('recoverysys-ui-mode')
      if (saved === 'classic' || saved === 'revamp' || saved === 'flightline') {
        return saved === 'classic' ? 'classic' : 'revamp'
      }
    } catch {
      // ignore localStorage security errors in sandboxes
    }
    return 'revamp'
  })

  const handleToggleUiMode = (mode) => {
    const target = mode === 'classic' ? 'classic' : 'revamp'
    setUiMode(target)
    try {
      localStorage.setItem('recoverysys-ui-mode', target)
    } catch {
      // ignore
    }
  }

  const filledSlots = CATEGORIES.filter((c) => Boolean(state.config[c.id])).length
  const packingVolume = computePackingVolume({ config: state.config, specs: state.specs })
  const hasWarnings = state.warnings.length > 0
  const hasErrors = state.warnings.some((w) => w.level === WARN_LEVELS.ERROR)

  const resultFresh = isResultFresh(
    state.simulation,
    {
      specs: state.specs,
      config: state.config,
      customMotor: state.customMotor,
    },
    state.inputRevision
  )

  const confidenceProps = useMemo(() => {
    if (!state.simulation) return null
    return {
      flightEvidence: state.flightEvidence ?? null,
      catalogSummary: state.catalogProvenance ?? null,
      simulationIdentity: state.simulationIdentity ?? null,
      envelope: state.resultEnvelope ?? null,
    }
  }, [
    state.simulation,
    state.flightEvidence,
    state.catalogProvenance,
    state.simulationIdentity,
    state.resultEnvelope,
  ])

  const recoveryBrief = buildRecoveryBrief({
    specs: state.specs,
    config: state.config,
    customMotor: state.customMotor,
    simulation: state.simulation,
    resultFresh,
    warnings: state.warnings,
  })

  const canRun =
    parseFloat(state.specs.rocket_mass_g) > 0 &&
    parseFloat(state.specs.motor_total_impulse_ns) > 0 &&
    !!(state.config.main_chute || state.config.drogue_chute)

  const layoutProps = {
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
    onSwitchMode: handleToggleUiMode,
  }

  if (uiMode === 'classic') {
    return <ClassicLayout {...layoutProps} />
  }

  return <RevampLayout {...layoutProps} />
}
