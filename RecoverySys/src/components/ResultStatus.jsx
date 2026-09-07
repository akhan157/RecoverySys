import { useState } from 'react'
import { evaluateConfidence } from '../lib/confidence.js'
import { EVIDENCE_LEVEL } from '../lib/evidenceCoverage.js'
import { evaluateMissionEnvelope } from '../lib/missionEnvelope.js'
import ReviewLink from './primitives/ReviewLink.jsx'

const LABELS = {
  supported: 'Supported',
  conditional: 'Conditional',
  'sensitivity-flagged': 'Sensitivity flagged',
  'insufficient-confidence': 'Insufficient confidence',
}

const FALLBACK_REASONS = {
  RESULT_STALE_OR_MISSING: 'Run a current simulation before interpreting derived results.',
  NO_ACCEPTED_APPLICABLE_EVIDENCE:
    'No accepted comparison or flight evidence is available for this model and condition.',
}

function targetLabel(path) {
  if (path.startsWith('config.')) return 'recovery configuration'
  if (path.startsWith('specs.')) {
    const field = path.replace('specs.', '')
    const map = {
      rocket_mass_g: 'rocket mass',
      motor_total_impulse_ns: 'motor impulse',
      burn_time_s: 'motor burn time',
      airframe_id_in: 'airframe ID',
      bay_length_in: 'bay length',
      main_deploy_alt_ft: 'deployment altitude',
      wind_speed_mph: 'wind speed',
      wind_direction_deg: 'wind direction',
    }
    return map[field] || 'rocket specs'
  }
  return 'rocket specs'
}

export default function ResultStatus({
  specs,
  config,
  customMotor,
  simulation,
  resultFresh,
  onNavigate,
  onRerun,
  runSim,
  compact = false,
  className = '',
}) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const envelope = evaluateMissionEnvelope({ specs, config, customMotor })
  const coverage = { level: EVIDENCE_LEVEL.UNCOVERED, caseIds: [], hasReviewOnlyEvidence: true }
  const isFresh = Boolean(simulation && resultFresh)
  const isStale = Boolean(simulation && !resultFresh)
  const isMissing = !simulation

  const confidence = evaluateConfidence({
    fresh: isFresh,
    envelope,
    coverage,
  })

  const reasons = confidence.reasons.length
    ? confidence.reasons
    : ['NO_ACCEPTED_APPLICABLE_EVIDENCE']

  const reasonText = (code) =>
    envelope.reasons.find((reason) => reason.code === code)?.message ??
    FALLBACK_REASONS[code] ??
    'Review the model scope and assumptions before relying on this estimate.'

  const handleRerun = () => {
    if (onRerun) onRerun()
    else if (runSim) runSim()
    else if (onNavigate) onNavigate('SIMULATION')
  }

  const freshnessLabel = isFresh ? 'CURRENT_RESULT' : isStale ? 'STALE_RESULT' : 'NO_RESULT'

  return (
    <section
      className={`mc-confidence mc-result-status mc-confidence--${confidence.state}${
        compact ? ' mc-confidence--compact' : ''
      } ${className}`.trim()}
      aria-labelledby="confidence-status-title"
      aria-live="polite"
    >
      <div className="mc-confidence__header">
        <div>
          <div className="mc-confidence__eyebrow">ESTIMATE / EVIDENCE POSTURE</div>
          <h2 id="confidence-status-title">{LABELS[confidence.state]}</h2>
        </div>
        <div className="mc-result-status__status-badges">
          <span className="mc-confidence__freshness">{freshnessLabel}</span>
        </div>
      </div>

      <div className="mc-result-status__body">
        <p className="mc-confidence__summary">
          {isFresh
            ? 'This is a planning estimate, not a safety approval or certification.'
            : isStale
              ? 'Current result is stale because inputs or selected hardware changed. Rerun the simulation.'
              : 'No current simulation result is available yet.'}
        </p>

        <div className="mc-result-status__quick-actions">
          {isStale && (
            <button type="button" className="mc-result-status__rerun-btn" onClick={handleRerun}>
              RERUN SIMULATION
            </button>
          )}
          {isMissing && (
            <button type="button" className="mc-result-status__rerun-btn" onClick={handleRerun}>
              RUN SIMULATION
            </button>
          )}
          {onNavigate && envelope.reasons.length > 0 && (
            <div className="mc-confidence__actions">
              {envelope.reasons.slice(0, compact ? 1 : 3).map((reason) => (
                <ReviewLink
                  key={reason.code}
                  target={reason.path}
                  onNavigate={onNavigate}
                  className="mc-confidence__action"
                >
                  Review {targetLabel(reason.path)}
                </ReviewLink>
              ))}
            </div>
          )}
        </div>
      </div>

      <details
        className="mc-result-status__details"
        open={detailsOpen}
        onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
      >
        <summary className="mc-result-status__summary-toggle">
          {detailsOpen
            ? 'Hide method, evidence & limitations ▲'
            : 'Show method, evidence & limitations ▼'}
        </summary>
        <div className="mc-result-status__details-content">
          <ul className="mc-confidence__reasons">
            {reasons.slice(0, compact ? 2 : 4).map((code) => (
              <li key={code}>{reasonText(code)}</li>
            ))}
          </ul>
          <p className="mc-confidence__boundary">
            Confidence describes evidence and model scope; it is not a probability of success,
            safety approval, or certification.
          </p>
        </div>
      </details>
    </section>
  )
}
