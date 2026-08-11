import Button from '../primitives/Button.jsx'
import StatusChip from '../primitives/StatusChip.jsx'
import './AnalysisPrimitives.css'

const FINDING_LABELS = Object.freeze({
  error: 'Error',
  warning: 'Warning',
  warn: 'Warning',
  evaluated: 'Evaluated',
  current: 'Current estimate',
  unknown: 'Not evaluated',
  'not-evaluated': 'Not evaluated',
  unavailable: 'Screening unavailable',
  conditional: 'Conditional',
})

const FINDING_STATUS = Object.freeze({
  error: 'error',
  warning: 'warn',
  warn: 'warn',
  evaluated: 'ok',
  current: 'ok',
  unknown: 'neutral',
  'not-evaluated': 'neutral',
  unavailable: 'neutral',
  conditional: 'warn',
})

function normalizeFinding(row = {}) {
  const finding = row.finding && typeof row.finding === 'object' ? row.finding : {}
  const rawState = String(finding.state ?? row.state ?? 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[_ ]+/g, '-')
  const state = FINDING_LABELS[rawState] ? rawState : 'unknown'
  const value = finding.value ?? row.value ?? finding.message ?? row.message
  const label = finding.label ?? (value == null ? FINDING_LABELS[state] : String(value))
  return { ...finding, state, label }
}

function normalizeAction(row = {}) {
  const action = row.action
  if (typeof action === 'string') return { label: action }
  return action && typeof action === 'object' ? action : null
}

export default function CausalityRow({ row = {}, selected = false, onSelect, onAction }) {
  const finding = normalizeFinding(row)
  const action = normalizeAction(row)
  const actionHandler = onAction ?? action?.onActivate ?? action?.onClick
  const actionText = action?.label ?? action?.name
  const driver = row.driver ?? row.cause ?? 'Unresolved input or assumption'
  const outcome = row.affectedOutcome ?? row.outcome ?? 'Affected recovery outcome'
  const rowId = row.id ?? row.code ?? `${driver}-${outcome}`

  return (
    <article className="analysis-causality-row" data-selected={selected ? 'true' : 'false'}>
      <button
        type="button"
        className="analysis-causality-row__select"
        aria-label={`Review ${String(driver)} affecting ${String(outcome)}`}
        aria-pressed={selected}
        onClick={() => onSelect?.(row)}
      >
        <div className="analysis-causality-row__grid">
          <div className="analysis-causality-row__cell">
            <span className="analysis-causality-row__label">Driver</span>
            <span className="analysis-causality-row__value">{driver}</span>
          </div>
          <div className="analysis-causality-row__cell">
            <span className="analysis-causality-row__label">Affected outcome</span>
            <span className="analysis-causality-row__value">{outcome}</span>
          </div>
          <div className="analysis-causality-row__cell">
            <span className="analysis-causality-row__label">Finding</span>
            <span className="analysis-causality-row__finding">
              <StatusChip
                status={FINDING_STATUS[finding.state]}
                label={FINDING_LABELS[finding.state]}
              />
              <span className="analysis-causality-row__value">{finding.label}</span>
            </span>
          </div>
        </div>
      </button>
      {actionText && actionHandler && (
        <div className="analysis-causality-row__actions">
          <Button
            variant="secondary"
            size="sm"
            className="analysis-causality-row__action"
            aria-label={actionText}
            onClick={() => actionHandler(action, row)}
          >
            {actionText}
          </Button>
        </div>
      )}

      <span hidden data-row-id={rowId} />
    </article>
  )
}

export { FINDING_LABELS, normalizeFinding }
