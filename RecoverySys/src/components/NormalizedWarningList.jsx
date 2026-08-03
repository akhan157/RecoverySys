import { useState } from 'react'
import { WARN_LEVELS } from '../lib/constants.js'

function pathsLabel(warning) {
  return (warning.affectedInputPaths || warning.inputPaths || []).join(', ')
}

export default function NormalizedWarningList({ warnings = [], onNavigate }) {
  const [acknowledged, setAcknowledged] = useState(() => new Set())
  if (!warnings.length) return null

  const acknowledge = (code) => {
    setAcknowledged((current) => new Set(current).add(code))
  }

  return (
    <section className="mc-warning-list" aria-label="Compatibility review">
      <div className="mc-warning-list__intro">
        <strong>COMPATIBILITY_REVIEW</strong>
        <span>
          Acknowledgement records review only. It does not remove a warning or change evidence
          posture.
        </span>
      </div>
      {warnings.map((warning, index) => {
        const code = warning.code || warning.warningCode || `${warning.slot}-${index}`
        const isError = warning.level === WARN_LEVELS.ERROR
        const isAcknowledged = acknowledged.has(code)
        return (
          <article
            key={code}
            className={`mc-warning-item mc-warning-item--${isError ? 'error' : 'warn'}`}
          >
            <div className="mc-warning-item__head">
              <span className="mc-warning-item__severity">{isError ? 'ERROR' : 'WARNING'}</span>
              <strong>{warning.message}</strong>
            </div>
            <dl className="mc-warning-item__meta">
              <div>
                <dt>AFFECTED_AREA</dt>
                <dd>{pathsLabel(warning) || warning.slot || 'Configuration'}</dd>
              </div>
              <div>
                <dt>EVIDENCE</dt>
                <dd>
                  {warning.evidenceClassification ||
                    warning.evidence?.classification ||
                    'Derived calculation'}
                </dd>
              </div>
              <div>
                <dt>SOURCE</dt>
                <dd>
                  {warning.sourceClassification ||
                    warning.source?.classification ||
                    'Compatibility rule'}
                </dd>
              </div>
            </dl>
            <p className="mc-warning-item__remediation">
              <strong>REVIEW:</strong>{' '}
              {warning.remediation || 'Review the affected input and address this warning.'}
            </p>
            <div className="mc-warning-item__actions">
              {onNavigate && (warning.affectedInputPaths || warning.inputPaths)?.[0] && (
                <button
                  type="button"
                  onClick={() => onNavigate((warning.affectedInputPaths || warning.inputPaths)[0])}
                >
                  REVIEW_AFFECTED_AREA
                </button>
              )}
              <button type="button" onClick={() => acknowledge(code)} disabled={isAcknowledged}>
                {isAcknowledged ? 'REVIEW_RECORDED' : 'ACKNOWLEDGE_REVIEW'}
              </button>
            </div>
            {isAcknowledged && (
              <p className="mc-warning-item__ack">
                Warning remains active; evidence posture unchanged.
              </p>
            )}
          </article>
        )
      })}
    </section>
  )
}
