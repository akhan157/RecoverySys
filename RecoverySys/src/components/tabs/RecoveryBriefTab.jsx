import { CATEGORY_BY_ID } from '../../data/parts.js'
import { RESULT_STATUS_DETAILS } from '../../lib/assessment.js'
import { presentCriterion } from '../../lib/criterionPresentation.js'
import { CRITERIA, CRITERION_IDS } from '../../lib/criteria.js'
import StatusChip from '../primitives/StatusChip.jsx'

function crossingLabel(category, severity) {
  return presentCriterion({ evaluated: true, category, severity }).label
}

const STRENGTH_BANDS = CRITERIA[CRITERION_IDS.STRENGTH_MARGIN].bands

// The load path reuses the strength-margin criterion for its chips, so a margin
// category always renders with the same vocabulary as the rest of the app.
function strengthChip(margin) {
  if (!margin?.category) return presentCriterion(null)
  const band = STRENGTH_BANDS.find((entry) => entry.category === margin.category)
  return presentCriterion({
    evaluated: true,
    category: margin.category,
    severity: margin.severity ?? band?.severity ?? 'none',
  })
}

const LOAD_PATH_STATUS_LABELS = Object.freeze({
  evaluated: 'All chain elements and load cases evaluated.',
  partial: 'Partial — some chain ratings or load cases are unavailable.',
  unavailable: 'Not evaluated — select chain hardware and enter a rocket mass.',
})

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

const SOURCE_LABELS = Object.freeze({
  simulation: 'Simulation',
  input: 'Entered spec',
})

const EVENT_UNITS = Object.freeze({
  altitude_ft: 'ft',
  time_s: 's',
  velocity_fps: 'ft/s',
})

function eventValue(event, key, resultStatus) {
  const value = event?.[key]
  if (key === 'time_s' && value == null && Number.isFinite(event?.time_after_apogee_s)) {
    return `Apogee + ${formatNumber(event.time_after_apogee_s)} s`
  }
  if (value == null || !Number.isFinite(Number(value))) {
    return resultStatus === 'not-run' ? 'Run simulation' : '—'
  }
  return `${formatNumber(value)} ${EVENT_UNITS[key]}`
}

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
  ['drogue_fps', 'Drogue descent', 'ft/s'],
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
  const recoveryMass = recoveryBrief.recoveryMass
  const massItems = Array.isArray(recoveryMass?.items) ? recoveryMass.items : []
  const missingMassSlots = Array.isArray(recoveryMass?.missing) ? recoveryMass.missing : []
  const deploymentSequence = recoveryBrief.deploymentSequence
  const deploymentEvents = Array.isArray(deploymentSequence?.events)
    ? deploymentSequence.events
    : []
  const deploymentStatus = deploymentSequence?.resultStatus || status
  const deploymentDetails = RESULT_STATUS_DETAILS[deploymentStatus] || resultDetails
  const deploymentLimitations = Array.isArray(deploymentSequence?.limitations)
    ? deploymentSequence.limitations
    : []
  const loadPath = recoveryBrief.loadPath
  const loadCases = Array.isArray(loadPath?.loadCases) ? loadPath.loadCases : []
  const chainElements = Array.isArray(loadPath?.elements) ? loadPath.elements : []
  const loadPathLimitations = Array.isArray(loadPath?.limitations) ? loadPath.limitations : []
  const loadCaseLabel = (caseId) =>
    loadCases.find((loadCase) => loadCase.id === caseId)?.label || caseId
  const elementName = (element) =>
    element.name || CATEGORY_BY_ID[element.slot]?.label || element.slot

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

      {deploymentSequence && (
        <section className="mc-brief__section" aria-labelledby="brief-deployment-title">
          <h3 id="brief-deployment-title">Deployment sequence</h3>
          <p className="mc-brief__lead">
            <strong>{display(deploymentSequence.architectureLabel, 'Architecture unknown')}</strong>
          </p>
          {deploymentStatus !== 'current' && (
            <p>
              {display(deploymentDetails.reasonCode, 'NO_CURRENT_RESULT')} —{' '}
              {deploymentDetails.remediation}
            </p>
          )}
          {deploymentEvents.length ? (
            <ol className="mc-brief__timeline">
              {deploymentEvents.map((event) => (
                <li key={event.id} className="mc-brief__timeline-item">
                  <div className="mc-brief__timeline-head">
                    <span className="mc-brief__timeline-label">{event.label}</span>
                    <span className="mc-brief__timeline-source">
                      {SOURCE_LABELS[event.source] || 'Unknown'}
                    </span>
                  </div>
                  <p className="mc-brief__timeline-trigger">{event.trigger}</p>
                  <dl className="mc-brief__timeline-facts">
                    <div>
                      <dt>Altitude</dt>
                      <dd>{eventValue(event, 'altitude_ft', deploymentStatus)}</dd>
                    </div>
                    <div>
                      <dt>Time</dt>
                      <dd>{eventValue(event, 'time_s', deploymentStatus)}</dd>
                    </div>
                    <div>
                      <dt>Speed</dt>
                      <dd>{eventValue(event, 'velocity_fps', deploymentStatus)}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>
          ) : (
            <p>No deployment events are available for the selected hardware.</p>
          )}
          {deploymentLimitations.length > 0 && (
            <ul className="mc-brief__boundary-list">
              {deploymentLimitations.map((limitation, index) => (
                <li key={index}>{limitation}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {loadPath && (
        <section className="mc-brief__section" aria-labelledby="brief-load-path-title">
          <h3 id="brief-load-path-title">Load path</h3>
          <p className="mc-brief__lead">
            <strong>{LOAD_PATH_STATUS_LABELS[loadPath.status] || display(loadPath.status)}</strong>
          </p>
          {loadPath.governingCase && (
            <p>
              Governing load case: <strong>{loadPath.governingCase.label}</strong> —{' '}
              {formatNumber(loadPath.governingCase.force_lbs)} lbs
            </p>
          )}
          {loadPath.weakestLink ? (
            <p>
              Weakest link: <strong>{elementName(loadPath.weakestLink)}</strong> rated{' '}
              {formatNumber(loadPath.weakestLink.rating_lbs)} lbs
              {loadPath.weakestLink.governing && (
                <>
                  {' '}
                  — {loadCaseLabel(loadPath.weakestLink.governing.caseId)} margin{' '}
                  {loadPath.weakestLink.governing.ratio.toFixed(2)}×
                </>
              )}
            </p>
          ) : (
            <p>Weakest link: no rated chain element selected.</p>
          )}
          {loadCases.length > 0 && (
            <ul className="mc-brief__load-cases" aria-label="Load cases">
              {loadCases.map((loadCase) => (
                <li key={loadCase.id} className="mc-brief__load-case">
                  <div className="mc-brief__load-case-head">
                    <span className="mc-brief__load-case-label">{loadCase.label}</span>
                    <span className="mc-brief__load-case-value">
                      {loadCase.status === 'evaluated'
                        ? `${formatNumber(loadCase.force_lbs)} lbs`
                        : 'Not evaluated'}
                    </span>
                  </div>
                  {loadCase.status !== 'evaluated' && loadCase.reason && (
                    <p className="mc-brief__load-case-reason">{loadCase.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {chainElements.length > 0 && (
            <div className="mc-brief__table-scroll">
              <table className="mc-brief__table mc-brief__table--load-path">
                <thead>
                  <tr>
                    <th scope="col">Chain element</th>
                    <th scope="col">Rating</th>
                    <th scope="col">Governing case</th>
                    <th scope="col">Margin</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {chainElements.map((element) => {
                    const chip = strengthChip(element.governing)
                    return (
                      <tr key={element.slot}>
                        <td data-label="Chain element">{elementName(element)}</td>
                        <td data-label="Rating" className="mc-brief__table-number">
                          {element.rating_lbs == null
                            ? 'Missing rating'
                            : `${formatNumber(element.rating_lbs)} lbs`}
                        </td>
                        <td data-label="Governing case">
                          {element.governing
                            ? loadCaseLabel(element.governing.caseId)
                            : 'Not evaluated'}
                        </td>
                        <td data-label="Margin" className="mc-brief__table-number">
                          {element.governing ? `${element.governing.ratio.toFixed(2)}×` : '—'}
                        </td>
                        <td data-label="Status">
                          <StatusChip status={chip.metricStatus} label={chip.metricLabel} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {loadPathLimitations.length > 0 && (
            <ul className="mc-brief__boundary-list">
              {loadPathLimitations.map((limitation, index) => (
                <li key={index}>{limitation}</li>
              ))}
            </ul>
          )}
        </section>
      )}

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

      {recoveryMass && (
        <section className="mc-brief__section" aria-labelledby="brief-mass-title">
          <h3 id="brief-mass-title">Recovery hardware mass</h3>
          {massItems.length ? (
            <>
              <table className="mc-brief__table">
                <thead>
                  <tr>
                    <th scope="col">Slot</th>
                    <th scope="col">Selected part</th>
                    <th scope="col">Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {massItems.map((item) => (
                    <tr key={item.slot}>
                      <td>{display(CATEGORY_BY_ID[item.slot]?.label, item.slot)}</td>
                      <td>{display(item.name, 'Selected part')}</td>
                      <td className="mc-brief__table-number">
                        {item.weight_g == null
                          ? 'Missing weight'
                          : `${formatNumber(item.weight_g)} g`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <dl className="mc-brief__facts mc-brief__facts--compact">
                <div>
                  <dt>Known recovery total</dt>
                  <dd>
                    {formatNumber(recoveryMass.total_g)} <span>g</span>
                  </dd>
                </div>
                <div>
                  <dt>Entered rocket mass</dt>
                  <dd>
                    {recoveryMass.rocket_mass_g == null
                      ? '—'
                      : `${formatNumber(recoveryMass.rocket_mass_g)} g`}
                  </dd>
                </div>
                <div>
                  <dt>Share of entered mass</dt>
                  <dd>
                    {recoveryMass.fraction_of_rocket == null
                      ? '—'
                      : `${formatNumber(recoveryMass.fraction_of_rocket * 100)}%`}
                  </dd>
                </div>
              </dl>
              {missingMassSlots.length > 0 && (
                <p className="mc-brief__boundary">
                  Missing catalog weight:{' '}
                  {missingMassSlots.map((slot) => CATEGORY_BY_ID[slot]?.label || slot).join(', ')}.
                  The reported total excludes those selected slots.
                </p>
              )}
              {recoveryMass.exceeds_rocket_mass && (
                <p className="mc-brief__boundary">
                  Known recovery mass is at or above the entered rocket mass. The entered mass must
                  include the selected recovery hardware.
                </p>
              )}
              <p className="mc-brief__boundary">
                Quantity is one selected part per slot. This roll-up is informational and is not
                added to the simulated rocket mass.
              </p>
            </>
          ) : (
            <p>No recovery hardware selected.</p>
          )}
        </section>
      )}

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
            <dl className="mc-brief__facts">
              {SENSITIVITY_OUTPUTS.map(([key, label, unit]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{rangeText(sensitivityRows, key, unit)}</dd>
                </div>
              ))}
            </dl>
            {sensitivity.criterionCrossings?.length > 0 && (
              <ul aria-label="Defensible criterion crossings">
                {sensitivity.criterionCrossings.map((crossing, index) => (
                  <li key={`${crossing.driverKey}-${crossing.output}-${index}`}>
                    <strong>{crossing.driverLabel}</strong> {crossing.variantLabel}:{' '}
                    {crossing.outputLabel} {formatNumber(crossing.baseline.value)} {crossing.unit}{' '}
                    moves from{' '}
                    {crossingLabel(crossing.baseline.category, crossing.baseline.severity)} to{' '}
                    {crossingLabel(crossing.variant.category, crossing.variant.severity)}.
                  </li>
                ))}
              </ul>
            )}
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
