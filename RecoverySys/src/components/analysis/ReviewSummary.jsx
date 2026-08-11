import Button from '../primitives/Button.jsx'
import SectionLabel from '../primitives/SectionLabel.jsx'
import StatusChip from '../primitives/StatusChip.jsx'
import './AnalysisPrimitives.css'

const COUNT_DEFINITIONS = Object.freeze([
  ['errors', 'Errors', 'error'],
  ['warnings', 'Warnings', 'warn'],
  ['notEvaluated', 'Not evaluated', 'neutral'],
  ['testedCrossings', 'Tested-response crossings', 'warn'],
])

function countOf(value) {
  if (Array.isArray(value)) return value.length
  if (value == null || value === '') return 0
  const count = Number(value)
  return Number.isFinite(count) && count >= 0 ? count : 0
}

function actionLabel(action) {
  if (typeof action === 'string') return action
  return action?.label ?? action?.name ?? null
}

export default function ReviewSummary({ summary = {}, primaryAction, onAction }) {
  const counts = summary.counts ?? summary
  const action = primaryAction ?? summary.primaryAction ?? summary.nextAction
  const actionHandler = onAction ?? action?.onActivate ?? action?.onClick
  const actionText = actionLabel(action)
  const findingCount = COUNT_DEFINITIONS.reduce(
    (total, [key, ,]) =>
      total +
      countOf(counts[key] ?? counts[key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)]),
    0
  )
  const priorityText = summary.highestPriority ?? summary.priority ?? summary.priorityFinding

  return (
    <section className="analysis-review-summary" aria-label="Review summary">
      <div className="analysis-review-summary__header">
        <SectionLabel>Review summary</SectionLabel>
        {findingCount === 0 && <StatusChip status="neutral" label="No finding generated" />}
      </div>

      <dl className="analysis-review-summary__counts">
        {COUNT_DEFINITIONS.map(([key, label, status]) => {
          const count = countOf(
            counts[key] ??
              counts[key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)] ??
              counts[key.replace(/[A-Z]/g, (match) => match.toLowerCase())]
          )
          return (
            <div className="analysis-review-summary__count" key={key}>
              <dt>{label}</dt>
              <dd aria-label={`${label}: ${count}`}>{count}</dd>
              <StatusChip status={status} label={count > 0 ? label : `No ${label.toLowerCase()}`} />
            </div>
          )
        })}
      </dl>

      {priorityText && (
        <div className="analysis-review-summary__priority">
          <span className="analysis-review-summary__priority-label">Highest-priority action</span>
          <strong>
            {typeof priorityText === 'string'
              ? priorityText
              : (priorityText.label ?? priorityText.title)}
          </strong>
        </div>
      )}

      {actionText && actionHandler && (
        <div className="analysis-review-summary__actions">
          <Button
            size="sm"
            onClick={() => actionHandler(action)}
            aria-label={actionText}
            className="analysis-review-summary__action"
          >
            {actionText}
          </Button>
        </div>
      )}

      {summary.emptyReason && (
        <p className="analysis-review-summary__empty">{summary.emptyReason}</p>
      )}
    </section>
  )
}

export { countOf }
