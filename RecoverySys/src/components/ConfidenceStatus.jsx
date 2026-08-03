import { evaluateConfidence } from '../lib/confidence.js'
import { EVIDENCE_LEVEL } from '../lib/evidenceCoverage.js'
import { evaluateMissionEnvelope } from '../lib/missionEnvelope.js'

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

export default function ConfidenceStatus({
  specs,
  config,
  customMotor,
  simulation,
  resultFresh,
  onNavigate,
  compact = false,
}) {
  const envelope = evaluateMissionEnvelope({ specs, config, customMotor })
  // The checked-in corpus is review-only. Never imply Supported until an
  // accepted applicable case exists.
  const coverage = { level: EVIDENCE_LEVEL.UNCOVERED, caseIds: [], hasReviewOnlyEvidence: true }
  const confidence = evaluateConfidence({
    fresh: Boolean(simulation && resultFresh),
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

  return (
    <section
      className={`mc-confidence mc-confidence--${confidence.state}${compact ? ' mc-confidence--compact' : ''}`}
      aria-labelledby="confidence-status-title"
      aria-live="polite"
    >
      <div className="mc-confidence__header">
        <div>
          <div className="mc-confidence__eyebrow">ESTIMATE / EVIDENCE POSTURE</div>
          <h2 id="confidence-status-title">{LABELS[confidence.state]}</h2>
        </div>
        <span className="mc-confidence__freshness">
          {simulation && resultFresh ? 'CURRENT_RESULT' : simulation ? 'STALE_RESULT' : 'NO_RESULT'}
        </span>
      </div>
      <p className="mc-confidence__summary">
        {simulation && resultFresh
          ? 'This is a planning estimate, not a safety approval or certification.'
          : simulation
            ? 'Current result is stale because inputs or selected hardware changed. Rerun the simulation.'
            : 'No current simulation result is available yet.'}
      </p>
      <ul className="mc-confidence__reasons">
        {reasons.slice(0, compact ? 2 : 4).map((code) => (
          <li key={code}>{reasonText(code)}</li>
        ))}
      </ul>
      {onNavigate && envelope.reasons.length > 0 && (
        <div className="mc-confidence__actions">
          {envelope.reasons.slice(0, compact ? 1 : 3).map((reason) => (
            <button
              key={reason.code}
              type="button"
              className="mc-confidence__action"
              onClick={() => onNavigate(reason.path)}
            >
              Review {reason.path.startsWith('config.') ? 'recovery configuration' : 'rocket specs'}
            </button>
          ))}
        </div>
      )}
      <p className="mc-confidence__boundary">
        Confidence describes evidence and model scope; it is not a probability of success, safety
        approval, or certification.
      </p>
    </section>
  )
}
