import './AnalysisPrimitives.css'

/**
 * Visible return path from a review destination back to the Analysis board.
 * Rendered by destination surfaces (Specs, Dashboard, Simulation) when a
 * review action from Analysis landed the user there, so keyboard and pointer
 * users can always get back without re-navigating the tab list.
 */
export default function ReviewReturnBar({ onReturn, label = 'Return to Analysis' }) {
  return (
    <div className="analysis-review-return">
      <span className="analysis-review-return__context">Reviewing an unresolved finding</span>
      <button
        type="button"
        className="analysis-review-return__action"
        onClick={onReturn}
        aria-label={label}
      >
        ← {label}
      </button>
    </div>
  )
}
