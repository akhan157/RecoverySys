export default function ReviewSummary({
  errorsCount = 0,
  warningsCount = 0,
  highestPriorityAction = null,
  onOpenReview = null,
  className = '',
}) {
  return (
    <div
      className={`mc-review-summary ${className}`.trim()}
      role="status"
      aria-label="Review summary"
    >
      <div className="mc-review-summary__counts">
        <span
          className={`mc-review-summary__badge ${
            errorsCount > 0 ? 'mc-review-summary__badge--error' : 'mc-review-summary__badge--dim'
          }`}
        >
          {errorsCount} {errorsCount === 1 ? 'ERROR' : 'ERRORS'}
        </span>
        <span
          className={`mc-review-summary__badge ${
            warningsCount > 0 ? 'mc-review-summary__badge--warn' : 'mc-review-summary__badge--dim'
          }`}
        >
          {warningsCount} {warningsCount === 1 ? 'WARNING' : 'WARNINGS'}
        </span>
      </div>
      {highestPriorityAction && (
        <div className="mc-review-summary__action">
          <span className="mc-review-summary__action-label">ACTION:</span>
          <button
            type="button"
            className="mc-review-summary__action-btn"
            onClick={highestPriorityAction.onClick || onOpenReview}
          >
            {highestPriorityAction.label || 'Open Review'}
          </button>
        </div>
      )}
    </div>
  )
}
