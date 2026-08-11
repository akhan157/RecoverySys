import Button from '../primitives/Button.jsx'
import SectionLabel from '../primitives/SectionLabel.jsx'
import StatusChip from '../primitives/StatusChip.jsx'
import './AnalysisPrimitives.css'

const STATE_LABELS = Object.freeze({
  'not-run': 'Not run',
  missing: 'Not run',
  stale: 'Stale',
  current: 'Current',
  conditional: 'Conditional',
  insufficient: 'Insufficient',
  'insufficient-confidence': 'Insufficient',
})

const STATE_STATUS = Object.freeze({
  'not-run': 'neutral',
  missing: 'neutral',
  stale: 'warn',
  current: 'ok',
  conditional: 'warn',
  insufficient: 'warn',
  'insufficient-confidence': 'warn',
})

const DEFAULT_REASON = Object.freeze({
  'not-run': 'No current simulation result is available.',
  missing: 'No current simulation result is available.',
  stale: 'The result is stale because an input or selected hardware value changed.',
  current: 'This is a current planning estimate; it is not a safety approval or certification.',
  conditional: 'The result is current but limited by its stated scope or evidence.',
  insufficient:
    'The result is limited; review the stated scope and assumptions before relying on it.',
  'insufficient-confidence':
    'The result is limited; review the stated scope and assumptions before relying on it.',
})

function normalizeState(value) {
  const normalized = String(value ?? 'not-run')
    .trim()
    .toLowerCase()
    .replace(/[_ ]+/g, '-')
  return STATE_LABELS[normalized] ? normalized : 'not-run'
}

function normalizeAction(action, state) {
  if (typeof action === 'string') return { label: action }
  if (action && typeof action === 'object') return action
  if (state === 'not-run' || state === 'missing') return { label: 'Run simulation' }
  if (state === 'stale') return { label: 'Rerun simulation' }
  return null
}

function displayValue(value) {
  if (value == null || value === '') return null
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export default function ResultUsabilityStrip({
  usability,
  result,
  state,
  reason,
  action,
  onAction,
  identity,
  resultIdentity,
  modelIdentity,
  details,
}) {
  const source = usability ?? result ?? {}
  const normalizedState = normalizeState(state ?? source.state ?? source.status)
  const stateLabel = STATE_LABELS[normalizedState]
  const actionSpec = normalizeAction(action ?? source.nextAction ?? source.action, normalizedState)
  const actionHandler = onAction ?? actionSpec?.onActivate ?? actionSpec?.onClick
  const actionDestination = actionSpec?.destination ?? actionSpec?.path ?? actionSpec?.id
  const reasonText = displayValue(reason ?? source.reason) ?? DEFAULT_REASON[normalizedState]
  const resolvedResultIdentity = displayValue(
    resultIdentity ?? identity ?? source.resultIdentity ?? source.identity
  )
  const resolvedModelIdentity = displayValue(modelIdentity ?? source.modelIdentity ?? source.model)
  const actionLabel = displayValue(actionSpec?.label ?? actionSpec?.name)

  return (
    <section
      className={`analysis-result-status analysis-result-status--${normalizedState}`}
      aria-label="Result usability"
      aria-live="polite"
    >
      <div className="analysis-result-status__header">
        <div className="analysis-result-status__identity">
          <SectionLabel>Result usability</SectionLabel>
          <strong>{stateLabel}</strong>
        </div>
        <StatusChip status={STATE_STATUS[normalizedState]} label={stateLabel} />
      </div>

      <p className="analysis-result-status__reason">{reasonText}</p>

      {(resolvedResultIdentity || resolvedModelIdentity) && (
        <p className="analysis-result-status__meta">
          {resolvedResultIdentity && <span>Result: {resolvedResultIdentity}</span>}
          {resolvedModelIdentity && <span>Model: {resolvedModelIdentity}</span>}
        </p>
      )}

      {actionLabel && (actionHandler || actionDestination) && (
        <div className="analysis-result-status__actions">
          <Button
            size="sm"
            onClick={() => actionHandler?.(actionSpec, actionDestination)}
            aria-label={actionLabel}
          >
            {actionLabel}
          </Button>
        </div>
      )}

      {details && (
        <details className="analysis-result-status__details">
          <summary>Model and scope details</summary>
          {typeof details === 'string' ? <p>{details}</p> : details}
        </details>
      )}
    </section>
  )
}

export { DEFAULT_REASON, STATE_LABELS, normalizeState }
