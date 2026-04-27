import React from 'react'
import { WARN_LEVELS } from '../../lib/constants.js'
import FlightChart from '../FlightChart.jsx'
import MetricCard from '../MetricCard.jsx'

export default function SimulationTab({ state, runSim, canRun }) {
  const sim = state.simulation
  const shock = sim?.shock_load

  return (
    <div className="mc-sim">
      {/* ── Top: Chart + Data ────────────────────────────────────────── */}
      <div className="mc-sim__top">
        {/* Flight Chart */}
        <div className="mc-sim__chart">
          <h2 className="mc-panel-header">
            FLIGHT_PROFILE // DESCENT_PHASE_V4.2
            <span className="mc-panel-header__right">
              {sim ? `REF_ID: STR-SIM-${String(Math.abs((sim.apogee_ft || 0) * 7 + (sim.drift_ft || 0)) % 9999).padStart(4, '0')}` : 'AWAITING_DATA'}
            </span>
          </h2>
          <div className="mc-sim__chart-area">
            <FlightChart simulation={sim} />
          </div>
          {!sim && (
            <div style={{ padding: '0 16px 16px', textAlign: 'center' }}>
              <button className="mc-run-btn" onClick={runSim} disabled={!canRun}>
                {state.simRunning ? 'RUNNING...' : 'RUN_SIMULATION →'}
              </button>
            </div>
          )}
        </div>

        {/* Simulation Data */}
        <div className="mc-sim__data">
          <h2 className="mc-panel-header">SIMULATION_DATA</h2>
          <div className="mc-sim__data-grid">
            <MetricCard label="APOGEE_ALTITUDE" value={sim ? sim.apogee_ft.toLocaleString() : '—'} unit="ft" />
            <MetricCard
              label="MAIN_DESCENT"
              value={sim?.main_fps != null ? sim.main_fps.toFixed(1) : '—'}
              unit="ft/s"
              warn={sim?.main_fps != null && sim.main_fps > 15}
            />
            <MetricCard label="DESCENT_TIME" value={sim?.total_time_s != null ? Math.round(sim.total_time_s) : '—'} unit="sec" />
            <MetricCard label="DRIFT_DISTANCE" value={sim ? sim.drift_ft.toLocaleString() : '—'} unit="ft" />
            {sim?.drogue_fps && (
              <MetricCard label="DROGUE_DESCENT" value={sim.drogue_fps.toFixed(1)} unit="ft/s" />
            )}
            {sim?.landing_ke_ftlbf != null && (
              <MetricCard label="LANDING_KE" value={sim.landing_ke_ftlbf} unit="ft-lbf" />
            )}

            {/* Shock Cord Load — peak load + safety factor (strain energy in compat warnings) */}
            {shock && (
              <>
                <MetricCard label="PEAK_LOAD" value={shock.peak_load_lbs.toFixed(0)} unit="lbs" />
                <MetricCard
                  label="SAFETY_FACTOR"
                  value={shock.safety_factor.toFixed(1) + '×'}
                  unit=""
                  status={shock.sf_status === 'pass' ? 'ok' : shock.sf_status === 'warn' ? 'marginal' : 'fail'}
                  statusLabel={shock.sf_status === 'pass' ? 'OK' : shock.sf_status === 'warn' ? 'MARGINAL' : 'FAIL'}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom: Compatibility Analysis ───────────────────────────── */}
      <div className="mc-sim__bottom">
        <div className="mc-sim__compat">
          <h2 className="mc-panel-header">COMPATIBILITY_ANALYSIS</h2>
          {state.warnings.length === 0 ? (
            <div className="mc-alert mc-alert--ok">
              <div className="mc-alert__title">✓ ALL_SYSTEMS_NOMINAL</div>
              <div className="mc-alert__body">No compatibility issues detected.</div>
            </div>
          ) : (
            state.warnings.map((w, i) => (
              <div key={i} className={`mc-alert ${w.level === WARN_LEVELS.ERROR ? 'mc-alert--critical' : 'mc-alert--warn'}`}>
                <div className="mc-alert__title">
                  ⚠ {w.level === WARN_LEVELS.ERROR ? 'CRITICAL_ALERT' : 'NOMINAL_VARIANCE'}
                </div>
                <div className="mc-alert__body">{w.message}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
