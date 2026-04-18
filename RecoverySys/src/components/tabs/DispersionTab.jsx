import React from 'react'
import DispersionMap from '../DispersionMap.jsx'

export default function DispersionTab({ state }) {
  return (
    <div className="mc-dispersion">
      <h2 className="mc-panel-header">
        DISPERSION_MAP // LANDING_PREDICTION
        <span className="mc-panel-header__right">
          {state.simulation ? 'DATA_LOADED' : 'AWAITING_SIMULATION'}
        </span>
      </h2>
      <div className="mc-dispersion__content">
        <DispersionMap
          simulation={state.simulation}
          specs={state.specs}
          forceOpen={true}
        />
        {!state.simulation && (
          <div className="mc-dispersion__empty">
            <div className="mc-metric__label" style={{ marginBottom: 8 }}>NO_SIMULATION_DATA</div>
            <div style={{ fontSize: 11, color: 'var(--mc-text-dim)', lineHeight: 1.6 }}>
              Run a simulation from the DASHBOARD or SIMULATION tab to generate
              dispersion data. The map will show predicted landing zones with
              drift vectors and uncertainty circles.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
