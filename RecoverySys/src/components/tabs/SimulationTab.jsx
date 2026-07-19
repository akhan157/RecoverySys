import { WARN_LEVELS } from '../../lib/constants.js'
import FlightChart from '../FlightChart.jsx'
import MetricCard from '../MetricCard.jsx'

export default function SimulationTab({ state, runSim, canRun, resultFresh }) {
  const sim = state.simulation
  const usableSim = resultFresh ? sim : null
  const shock = usableSim?.shock_load

  return (
    <div className="mc-sim">
      {/* ── Top: Chart + Data ────────────────────────────────────────── */}
      <div className="mc-sim__top">
        {/* Flight Chart */}
        <div className="mc-sim__chart">
          <h2 className="mc-panel-header">
            FLIGHT_PROFILE // ALT_vs_TIME
            <span className="mc-panel-header__right">
              {sim && !resultFresh
                ? 'RESULT_STALE // RERUN_REQUIRED'
                : sim
                  ? `REF_ID: STR-SIM-${String(Math.abs((sim.apogee_ft || 0) * 7 + (sim.drift_ft || 0)) % 9999).padStart(4, '0')}`
                  : 'AWAITING_DATA'}
            </span>
          </h2>
          <div className="mc-sim__chart-area">
            <FlightChart simulation={usableSim} />
          </div>
          {(!sim || !resultFresh) && (
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
            <MetricCard
              label="APOGEE_ALTITUDE"
              value={usableSim ? usableSim.apogee_ft.toLocaleString() : '—'}
              unit="ft"
            />
            <MetricCard
              label="MAIN_DESCENT"
              value={usableSim?.main_fps != null ? usableSim.main_fps.toFixed(1) : '—'}
              unit="ft/s"
              warn={usableSim?.main_fps != null && usableSim.main_fps > 15}
            />
            <MetricCard
              label="DESCENT_TIME"
              value={usableSim?.total_time_s != null ? Math.round(usableSim.total_time_s) : '—'}
              unit="sec"
            />
            <MetricCard
              label="DRIFT_DISTANCE"
              value={usableSim ? usableSim.drift_ft.toLocaleString() : '—'}
              unit="ft"
            />
            {usableSim?.drogue_fps && (
              <MetricCard
                label="DROGUE_DESCENT"
                value={usableSim.drogue_fps.toFixed(1)}
                unit="ft/s"
              />
            )}
            {usableSim?.landing_ke_ftlbf != null && (
              <MetricCard label="LANDING_KE" value={sim.landing_ke_ftlbf} unit="ft-lbf" />
            )}

            {/* Shock Cord Load — peak load + safety factor (strain energy in compat warnings) */}
            {usableSim?.shock_load && (
              <>
                <MetricCard label="PEAK_LOAD" value={shock.peak_load_lbs.toFixed(0)} unit="lbs" />
                <MetricCard
                  label="SAFETY_FACTOR"
                  value={shock.safety_factor.toFixed(1) + '×'}
                  unit=""
                  status={
                    shock.sf_status === 'pass'
                      ? 'ok'
                      : shock.sf_status === 'warn'
                        ? 'marginal'
                        : 'fail'
                  }
                  statusLabel={
                    shock.sf_status === 'pass'
                      ? 'OK'
                      : shock.sf_status === 'warn'
                        ? 'MARGINAL'
                        : 'FAIL'
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom: Compatibility Analysis ───────────────────────────── */}
      <div className="mc-sim__bottom">
        <div className="mc-sim__compat">
          <h2 className="mc-panel-header">COMPAT_ANALYSIS</h2>
          {state.warnings.length === 0 ? (
            <div className="mc-alert mc-alert--ok">
              <div className="mc-alert__title">✓ ALL_SYSTEMS_NOMINAL</div>
              <div className="mc-alert__body">No compatibility issues detected.</div>
            </div>
          ) : (
            state.warnings.map((w, i) => (
              <div
                key={i}
                className={`mc-alert ${w.level === WARN_LEVELS.ERROR ? 'mc-alert--critical' : 'mc-alert--warn'}`}
              >
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
