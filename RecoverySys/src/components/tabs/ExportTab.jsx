import { useEffect, useRef, useState } from 'react'
import { RESULT_STATUS_DETAILS } from '../../lib/assessment.js'
import { SAVE_STATES, SHARE_STATES } from '../../lib/constants.js'
import {
  encodeJsonPayload,
  decodeMigrateValidateNormalize,
  PAYLOAD_LIMITS,
  isPayloadSizeAllowed,
} from '../../lib/payloadBoundary.js'
import { PARTS, SLOT_IDS, EMPTY_CONFIG } from '../../data/parts.js'
import { loadCustomParts } from '../../lib/storage.js'
import { OPENROCKET_IMPORT_LIMITS } from '../../lib/openRocketExchange.js'

function downloadJson(state) {
  const blob = new Blob([encodeJsonPayload(state)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `recoverysys-config-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
export default function ExportTab({
  state,
  saveConfig,
  copyShareLink,
  onLoadConfig,
  onImportOpenRocket = async () => ({ ok: false }),
  onAcceptOpenRocket = () => ({ ok: false }),
  openRocketImport = state.openRocketImport,
  recoveryBrief,
  onOpenBrief = () => {},
  onPrintBrief = () => window.print(),
  onPrintChecklist = () => window.print(),
}) {
  const fileRef = useRef(null)
  const openRocketFileRef = useRef(null)
  const [snapshotSelection, setSnapshotSelection] = useState({
    configurationId: '',
    stagePath: '',
    airframeCandidateId: '',
    bayCandidateId: '',
    massCandidateId: '',
  })

  useEffect(() => {
    if (!openRocketImport) return
    setSnapshotSelection({
      configurationId: '',
      stagePath: '',
      airframeCandidateId: '',
      bayCandidateId: '',
      massCandidateId: '',
    })
  }, [openRocketImport])

  const handleOpenRocketImport = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    await onImportOpenRocket(file)
    event.target.value = ''
  }

  const exchange = openRocketImport
  const selectedStageCandidates =
    exchange?.vehicleCandidates.filter(
      (candidate) =>
        candidate.tube?.stage?.sourcePath === snapshotSelection.stagePath &&
        candidate.status === 'needs-confirmation'
    ) ?? []
  const airframeCandidates = selectedStageCandidates.filter(
    (candidate) => candidate.targetField === 'airframe_id_in'
  )
  const bayCandidates = selectedStageCandidates.filter(
    (candidate) => candidate.targetField === 'bay_length_in'
  )
  const massCandidates =
    exchange?.massCandidates.filter(
      (candidate) =>
        candidate.status === 'needs-confirmation' &&
        candidate.simulation.configId === snapshotSelection.configurationId
    ) ?? []

  const candidateLabel = (candidate) =>
    `${candidate.tube?.componentName || candidate.kind} · ${candidate.normalizedValue.toFixed(2)} ${
      candidate.normalizedUnit
    }`

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!isPayloadSizeAllowed(file.size)) {
      alert(
        `Invalid config file — Payload exceeds the supported size limit of ${PAYLOAD_LIMITS.jsonBytes.toLocaleString()} bytes.`
      )
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result)
        if (data._format !== 'recoverysys-config-v1') {
          alert('Invalid config file — must be a RecoverySys JSON export.')
          return
        }
        const decoded = decodeMigrateValidateNormalize(data, {
          allParts: [...loadCustomParts(), ...PARTS],
          slotIds: SLOT_IDS,
          emptyConfig: EMPTY_CONFIG,
        })
        if (!decoded.ok) {
          alert(`Invalid config file — ${decoded.error.message}.`)
          return
        }
        const loadResult = onLoadConfig({
          config: decoded.config,
          specs: decoded.specs,
          customMotor: decoded.customMotor,
          inlinedCustomParts: decoded.inlinedCustomParts,
        })
        if (loadResult?.ok === false) {
          alert(`Invalid config file — ${loadResult.error}.`)
        }
      } catch {
        alert('Failed to parse config file — not valid JSON.')
      }
    }
    reader.readAsText(file)
    // Reset so the same file can be re-imported
    e.target.value = ''
  }

  return (
    <div className="mc-export">
      <h2 className="mc-panel-header" style={{ borderBottom: '1px solid var(--mc-border)' }}>
        EXPORT // SHARE_CONFIGURATION
      </h2>
      <div className="mc-export__content">
        <div className="mc-export__section">
          <div className="mc-metric__label">RECOVERY_BRIEF</div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--mc-text-dim)',
              margin: '6px 0 12px',
              lineHeight: 1.6,
            }}
          >
            Review the mission envelope, evidence posture, hardware, estimates, unresolved checks,
            and model provenance before sharing or printing.
          </div>
          <div className="mc-export__brief-status" role="status">
            {RESULT_STATUS_DETAILS[recoveryBrief?.status || 'not-run']?.reasonCode ||
              RESULT_STATUS_DETAILS['not-run'].reasonCode}{' '}
            · {recoveryBrief?.confidence?.label || 'Insufficient confidence'}
          </div>
          <div className="mc-export__brief-actions">
            <button className="mc-run-btn" onClick={onOpenBrief}>
              OPEN_RECOVERY_BRIEF →
            </button>
            <button className="mc-run-btn" onClick={onPrintBrief}>
              PRINT_RECOVERY_BRIEF →
            </button>
          </div>
        </div>
        <div className="mc-export__section">
          <div className="mc-metric__label">SAVE_TO_BROWSER</div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--mc-text-dim)',
              margin: '6px 0 12px',
              lineHeight: 1.6,
            }}
          >
            Stores your current configuration in the browser's local storage. Your config will
            persist across sessions on this device.
          </div>
          <button className="mc-run-btn" onClick={saveConfig}>
            {state.saveState === SAVE_STATES.SAVING
              ? 'SAVING...'
              : state.saveState === SAVE_STATES.SAVED
                ? '✓ SAVED'
                : 'SAVE_CONFIG →'}
          </button>
        </div>
        <div className="mc-export__section">
          <div className="mc-metric__label">SHARE_LINK</div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--mc-text-dim)',
              margin: '6px 0 12px',
              lineHeight: 1.6,
            }}
          >
            Creates a URL encoding your entire configuration. Anyone who opens it will see your
            exact recovery bay setup. No account required.
          </div>
          <button className="mc-run-btn" onClick={copyShareLink}>
            {state.shareState === SHARE_STATES.COPIED
              ? '✓ COPIED_TO_CLIPBOARD'
              : 'COPY_SHARE_LINK →'}
          </button>
        </div>
        <div className="mc-export__section">
          <div className="mc-metric__label">EXPORT_JSON</div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--mc-text-dim)',
              margin: '6px 0 12px',
              lineHeight: 1.6,
            }}
          >
            Download your full configuration as a JSON file. Share with teammates, back up before
            changes, or template common setups.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="mc-run-btn" onClick={() => downloadJson(state)}>
              DOWNLOAD_JSON &rarr;
            </button>
            <button className="mc-run-btn" onClick={() => fileRef.current?.click()}>
              IMPORT_JSON &rarr;
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImport}
            />
          </div>
        </div>
        <div className="mc-export__section">
          <div className="mc-metric__label">IMPORT_OPENROCKET</div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--mc-text-dim)',
              margin: '6px 0 12px',
              lineHeight: 1.6,
            }}
          >
            Inspect a local OpenRocket .ork archive, choose one configuration and stage, then
            explicitly accept geometry and optional pre-launch mass. Saved simulation output stays a
            reference only.
          </div>
          <button className="mc-run-btn" onClick={() => openRocketFileRef.current?.click()}>
            SELECT_ORK_ARCHIVE →
          </button>
          <input
            ref={openRocketFileRef}
            type="file"
            accept=".ork,application/zip"
            style={{ display: 'none' }}
            onChange={handleOpenRocketImport}
          />
          <div style={{ fontSize: 9, color: 'var(--mc-text-dim)', marginTop: 8 }}>
            Local-only parse · archive limit{' '}
            {Math.round(OPENROCKET_IMPORT_LIMITS.archiveBytes / 1024 / 1024)} MB
          </div>
          {!exchange && state.importedSource && (
            <div
              role="status"
              style={{
                border: '1px solid var(--mc-border)',
                padding: 10,
                marginTop: 12,
                fontSize: 9,
                lineHeight: 1.6,
              }}
            >
              IMPORTED_SOURCE · {state.importedSource.sourceFilename || 'unknown'} · OpenRocket{' '}
              {state.importedSource.formatVersion || 'unknown'}
              <br />
              Snapshot accepted for the selected configuration and stage. Run a fresh simulation
              before using estimates.
            </div>
          )}

          {exchange && (
            <div
              style={{
                border: '1px solid var(--mc-border)',
                padding: 10,
                marginTop: 12,
                display: 'grid',
                gap: 8,
              }}
            >
              <strong style={{ fontSize: 11 }}>IMPORT_PREVIEW // {exchange.project.name}</strong>
              <div style={{ fontSize: 9, color: 'var(--mc-text-dim)', lineHeight: 1.5 }}>
                SOURCE {exchange.source.sourceFilename || 'unknown'} · SHA-256{' '}
                {exchange.source.sourceHash || 'pending'} · OpenRocket{' '}
                {exchange.source.formatVersion}
                <br />
                {exchange.externalResults.length} saved simulation reference(s) ·{' '}
                {exchange.motorContext.length} motor metadata record(s) ·{' '}
                {exchange.omitted.typedFlightBranchCount} typed flight branch(es) not imported
              </div>

              <label style={{ fontSize: 10 }}>
                CONFIGURATION
                <select
                  value={snapshotSelection.configurationId}
                  onChange={(event) =>
                    setSnapshotSelection((previous) => ({
                      ...previous,
                      configurationId: event.target.value,
                      massCandidateId: '',
                    }))
                  }
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                >
                  <option value="">SELECT_CONFIGURATION</option>
                  {exchange.project.configurations.map((configuration) => (
                    <option key={configuration.id} value={configuration.id}>
                      {configuration.id}
                      {configuration.default ? ' · default' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 10 }}>
                STAGE
                <select
                  value={snapshotSelection.stagePath}
                  onChange={(event) =>
                    setSnapshotSelection((previous) => ({
                      ...previous,
                      stagePath: event.target.value,
                      airframeCandidateId: '',
                      bayCandidateId: '',
                    }))
                  }
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                >
                  <option value="">SELECT_STAGE</option>
                  {exchange.project.stages.map((stage) => (
                    <option key={stage.sourcePath} value={stage.sourcePath}>
                      {stage.name} · stage {stage.number}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 10 }}>
                AIRFRAME_ID_CANDIDATE
                <select
                  value={snapshotSelection.airframeCandidateId}
                  onChange={(event) =>
                    setSnapshotSelection((previous) => ({
                      ...previous,
                      airframeCandidateId: event.target.value,
                    }))
                  }
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                >
                  <option value="">SELECT_DIAMETER</option>
                  {airframeCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidateLabel(candidate)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 10 }}>
                BAY_LENGTH_CANDIDATE
                <select
                  value={snapshotSelection.bayCandidateId}
                  onChange={(event) =>
                    setSnapshotSelection((previous) => ({
                      ...previous,
                      bayCandidateId: event.target.value,
                    }))
                  }
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                >
                  <option value="">SELECT_BAY_LENGTH</option>
                  {bayCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidateLabel(candidate)}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ fontSize: 10 }}>
                PRE_LAUNCH_MASS (OPTIONAL)
                <select
                  value={snapshotSelection.massCandidateId}
                  onChange={(event) =>
                    setSnapshotSelection((previous) => ({
                      ...previous,
                      massCandidateId: event.target.value,
                    }))
                  }
                  style={{ display: 'block', width: '100%', marginTop: 4 }}
                >
                  <option value="">DO_NOT_IMPORT_MASS</option>
                  {massCandidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.normalizedValue.toFixed(1)} g · {candidate.simulation.name}
                    </option>
                  ))}
                </select>
              </label>

              {exchange.warnings.map((warning) => (
                <div key={warning.code} style={{ fontSize: 9, color: 'var(--mc-warn)' }}>
                  {warning.code} · {warning.message}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="mc-run-btn"
                  disabled={
                    !snapshotSelection.configurationId ||
                    !snapshotSelection.stagePath ||
                    !snapshotSelection.airframeCandidateId ||
                    !snapshotSelection.bayCandidateId
                  }
                  onClick={() => onAcceptOpenRocket(snapshotSelection)}
                >
                  ACCEPT_VEHICLE_SNAPSHOT →
                </button>
              </div>
              <div style={{ fontSize: 9, color: 'var(--mc-text-dim)' }}>
                All accepted values remain marked as imported source candidates. A fresh simulation
                is required before estimates are current.
              </div>
            </div>
          )}
        </div>
        <div className="mc-export__section">
          <div className="mc-metric__label">PRINT_CHECKLIST</div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--mc-text-dim)',
              margin: '6px 0 12px',
              lineHeight: 1.6,
            }}
          >
            Print a recovery checklist with specs, selected parts, compatibility warnings,
            simulation results, and a packing order with checkboxes.
          </div>
          <button className="mc-run-btn" onClick={onPrintChecklist}>
            PRINT_CHECKLIST &rarr;
          </button>
        </div>
      </div>
    </div>
  )
}
