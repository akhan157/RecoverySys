import { RESULT_STATUS_DETAILS } from '../../lib/assessment.js'
import DispersionMap from '../DispersionMap.jsx'

export default function DispersionTab({ state, resultFresh }) {
  const resultStatus = state.simulation ? (resultFresh ? 'current' : 'stale') : 'not-run'
  const resultDetails = RESULT_STATUS_DETAILS[resultStatus]
  const usableSimulation = resultFresh ? state.simulation : null

  return (
    <div className="mc-dispersion">
      <h2 className="mc-panel-header">
        DISPERSION_MAP // LANDING_PREDICTION
        <span className="mc-panel-header__right">
          {resultStatus === 'current' ? 'DATA_LOADED' : resultDetails.reasonCode}
        </span>
      </h2>
      <div className="mc-dispersion__content">
        <DispersionMap simulation={usableSimulation} specs={state.specs} forceOpen={true} />
        {!usableSimulation && (
          <div className="mc-dispersion__empty">
            <div className="mc-metric__label" style={{ marginBottom: 8 }}>
              {resultDetails.reasonCode}
            </div>
            <div style={{ fontSize: 11, color: 'var(--mc-text-dim)', lineHeight: 1.6 }}>
              {resultDetails.remediation || resultDetails.nextAction}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
