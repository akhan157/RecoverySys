import { RESULT_STATUS_DETAILS } from '../../lib/assessment.js'
import StatusChip from '../primitives/StatusChip.jsx'

const STATUS_LABELS = Object.freeze({
  current: 'CURRENT RESULT',
  stale: 'STALE RESULT',
  'not-run': 'NO CURRENT RESULT',
})

const STATUS_TONES = Object.freeze({
  current: 'ok',
  stale: 'warn',
  'not-run': 'neutral',
})

const ESTIMATES = Object.freeze([
  ['apogee_ft', 'Apogee', 'ft'],
  ['drift_ft', 'Drift', 'ft'],
  ['drogue_fps', 'Drogue descent', 'ft/s'],
  ['main_fps', 'Main descent', 'ft/s'],
  ['landing_ke_ftlbf', 'Landing energy', 'ft-lbf'],
])

const SENSITIVITY_OUTPUTS = Object.freeze([
  ['apogee_ft', 'Apogee', 'ft'],
  ['drift_ft', 'Drift', 'ft'],
  ['main_fps', 'Main descent', 'ft/s'],
  ['landing_ke_ftlbf', 'Landing energy', 'ft-lbf'],
])

function display(value, fallback = 'Not available') {
  return value == null || value === '' ? fallback : String(value)
}

function formatNumber(value) {
  return value == null || value === '' || !Number.isFinite(Number(value))
    ? '—'
    : Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function rangeText(rows, key, unit) {
  const ranges = rows.map((row) => row.ranges?.[key]).filter(Boolean)
  if (!ranges.length) return 'Not available'
  const min = Math.min(...ranges.map((range) => Number(range.min)))
  const max = Math.max(...ranges.map((range) => Number(range.max)))
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 'Not available'
  return `${formatNumber(min)}–${formatNumber(max)} ${unit}`
}

export default function RecoveryBriefTab({ recoveryBrief = {} }) {
  const status = recoveryBrief.status || 'not-run'
  const resultDetails = RESULT_STATUS_DETAILS[status] || RESULT_STATUS_DETAILS['not-run']
  const statusLabelText = STATUS_LABELS[status] || status.toUpperCase()
  const sensitivity = recoveryBrief.sensitivity
  const sensitivityRows = Array.isArray(sensitivity?.rows) ? sensitivity.rows : []
  const unresolvedChecks = Array.isArray(recoveryBrief.unresolvedChecks)
    ? recoveryBrief.unresolvedChecks
    : []
  const warnings = Array.isArray(recoveryBrief.warnings) ? recoveryBrief.warnings : []
  const hardware = Array.isArray(recoveryBrief.selectedHardware)
    ? recoveryBrief.selectedHardware
    : []

  return (
    <div className="mc-brief">
      <header className="mc-brief__header">
        <div>
          <div className="mc-panel-header">RECOVERY_BRIEF // HANDOFF_ARTIFACT</div>
          <h2>Recovery Brief</h2>
          <p className="mc-brief__subtitle">
            Version {display(recoveryBrief.briefVersion)} · Generated{' '}
            {display(recoveryBrief.generatedAt)}
          </p>
        </div>
        <div className="mc-brief__status" role="status" aria-live="polite">
          <StatusChip status={STATUS_TONES[status] || 'neutral'} label={statusLabelText} />
          <span>{resultDetails.reason}</span>
        </div>
      </header>

      <section className="mc-brief__section" aria-labelledby="brief-confidence-title">
        <h3 id="brief-confidence-title">Confidence and evidence posture</h3>
        <p className="mc-brief__lead">
          <strong>{display(recoveryBrief.confidence?.label, 'Insufficient confidence')}</strong>
        </p>
        <p>{display(recoveryBrief.confidence?.evidenceNote)}</p>
        <ul>
          {(recoveryBrief.confidence?.reasons || []).map((reason, index) => (
            <li key={`${reason.code || reason}-${index}`}>
              {typeof reason === 'string' ? reason : display(reason.message || reason.reason)}
            </li>
          ))}
        </ul>
      </section>

      <section className="mc-brief__section" aria-labelledby="brief-envelope-title">
        <h3 id="brief-envelope-title">Mission envelope</h3>
        <p>
          Status: <strong>{display(recoveryBrief.missionEnvelope?.status, 'Not evaluated')}</strong>
        </p>
        {recoveryBrief.missionEnvelope?.reasons?.length ? (
          <ul>
            {recoveryBrief.missionEnvelope.reasons.map((reason, index) => (
              <li key={`${reason.code || reason.message}-${index}`}>
                <strong>{display(reason.code, 'REVIEW')}</strong> — {display(reason.message)}
                {reason.remediation && <span> Review: {reason.remediation}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p>No mission-envelope reasons recorded.</p>
        )}
      </section>

      <section className="mc-brief__section" aria-labelledby="brief-checks-title">
        <h3 id="brief-checks-title">Unresolved checks</h3>
        {unresolvedChecks.length ? (
          <ul>
            {unresolvedChecks.map((check, index) => (
              <li key={`${check.code || check.message}-${index}`}>
                <strong>{display(check.code, 'REVIEW')}</strong> — {display(check.message)}
                {check.remediation && <span> Review: {check.remediation}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p>No unresolved checks recorded.</p>
        )}
      </section>

      <section className="mc-brief__section" aria-labelledby="brief-estimates-title">
        <h3 id="brief-estimates-title">Current key estimates</h3>
        {recoveryBrief.keyEstimates ? (
          <dl className="mc-brief__facts">
            {ESTIMATES.map(([key, label, unit]) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {formatNumber(recoveryBrief.keyEstimates[key])} <span>{unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p>
            {display(resultDetails.reasonCode, 'NO_CURRENT_RESULT')} — {resultDetails.remediation}
          </p>
        )}
      </section>

      <section className="mc-brief__section" aria-labelledby="brief-hardware-title">
        <h3 id="brief-hardware-title">Selected hardware</h3>
        {hardware.length ? (
          <ul>
            {hardware.map((part, index) => (
              <li key={`${part.slot || part.name}-${index}`}>
                <strong>{display(part.slot, 'Hardware')}:</strong> {display(part.name)}
              </li>
            ))}
          </ul>
        ) : (
          <p>No hardware selected.</p>
        )}
      </section>

      <section className="mc-brief__section" aria-labelledby="brief-warnings-title">
        <h3 id="brief-warnings-title">Compatibility findings</h3>
        {warnings.length ? (
          <ul>
            {warnings.map((warning, index) => (
              <li key={`${warning.code || warning.message}-${index}`}>
                <strong>{display(warning.code, warning.level || 'REVIEW')}</strong> —{' '}
                {display(warning.message)}
              </li>
            ))}
          </ul>
        ) : (
          <p>No compatibility warnings recorded.</p>
        )}
      </section>

      <section className="mc-brief__section" aria-labelledby="brief-sensitivity-title">
        <h3 id="brief-sensitivity-title">Sensitivity response</h3>
        {sensitivity?.status === 'complete' ? (
          <>
            <p>{display(sensitivity.method)}</p>
            <dl className="mc-brief__facts mc-brief__facts--compact">
              {SENSITIVITY_OUTPUTS.map(([key, label, unit]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{rangeText(sensitivityRows, key, unit)}</dd>
                </div>
              ))}
            </dl>
            <p className="mc-brief__boundary">
              These ranges describe model response only, not probability, accuracy, or a confidence
              interval, and do not establish safety, approval, certification, or launch readiness.
            </p>
          </>
        ) : (
          <p>{display(sensitivity?.reason, 'Sensitivity response is not available.')}</p>
        )}
      </section>

      <section className="mc-brief__section" aria-labelledby="brief-provenance-title">
        <h3 id="brief-provenance-title">Provenance and review boundary</h3>
        <dl className="mc-brief__metadata">
          <div>
            <dt>Input identity</dt>
            <dd>{display(recoveryBrief.provenance?.inputKey)}</dd>
          </div>
          <div>
            <dt>Input revision</dt>
            <dd>
              {display(
                recoveryBrief.provenance?.inputRevision ?? recoveryBrief.provenance?.revision
              )}
            </dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{display(recoveryBrief.provenance?.modelId)}</dd>
          </div>
          <div>
            <dt>Model version</dt>
            <dd>{display(recoveryBrief.provenance?.modelVersion)}</dd>
          </div>
          <div>
            <dt>Assumptions</dt>
            <dd>{display(recoveryBrief.provenance?.assumptionsVersion)}</dd>
          </div>
        </dl>
        <p className="mc-brief__boundary">{display(recoveryBrief.authorization)}</p>
      </section>
    </div>
  )
}

export { formatNumber, rangeText }
