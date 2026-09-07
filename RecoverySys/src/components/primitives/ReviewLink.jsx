export default function ReviewLink({ target, label, onNavigate, className = '', children }) {
  const handleClick = () => {
    if (onNavigate) {
      onNavigate(target)
    }
  }

  return (
    <button
      type="button"
      className={`mc-review-link ${className}`.trim()}
      onClick={handleClick}
      data-target={target}
    >
      {children || label || `Review ${target}`}
    </button>
  )
}
