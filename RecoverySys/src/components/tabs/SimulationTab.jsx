import { WARN_LEVELS } from '../../lib/constants.js'
import FlightChart from '../FlightChart.jsx'
import MetricCard from '../MetricCard.jsx'

export default function SimulationTab({ state, runSim, canRun, resultFresh }) {
  const sim = state.simulation
  const usableSim = resultFresh ? sim : null
  const shock = usableSim?.shock_load
  const snatch = usableSim?.main_snatch

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

            {/* Legacy static ejection result — retained for continuity. */}
            {usableSim?.shock_load && (
              <>
                <MetricCard
                  label="LEGACY_STATIC_EJECTION"
                  value={shock.peak_load_lbs.toFixed(0)}
                  unit="lbs"
                />
                <MetricCard
                  label="LEGACY_STATIC_EJECTION_SF"
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

      <MainSnatchSummary snatch={snatch} />

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

function MainSnatchSummary({ snatch }) {
  const status = String(snatch?.status || '')
    .toLowerCase()
    .replace(/[- ]/g, '_')
  const evaluated = snatch && status !== 'not_evaluated' && status !== 'unavailable'
  const limitations = Array.isArray(snatch?.limitations)
    ? snatch.limitations.join(' ')
    : snatch?.limitations
  return (
    <section className="mc-sim__snatch" aria-label="Main deployment snatch screening">
      <h2 className="mc-panel-header">
        MAIN_DEPLOYMENT_SNATCH <span className="mc-panel-header__right">SCREENING_ONLY</span>
      </h2>
      {!evaluated ? (
        <div className="mc-sim__snatch-empty">
          <strong>{screeningStatusLabel(snatch?.status)}</strong>
          <span>
            {snatch?.reason || 'No screening result is available for this configuration.'}
          </span>
        </div>
      ) : (
        <div className="mc-sim__snatch-grid">
          <div className="mc-sim__snatch-primary">
            <span>ESTIMATED_MAIN_DEPLOYMENT_SNATCH</span>
            <strong>{formatValue(snatch.peak_force_proxy_lbs, ' lbs')}</strong>
            <small>Linear-elastic screening proxy; not peak load, safe, or certified.</small>
          </div>
          <div>
            <span>APPROACH VELOCITY</span>
            <strong>{formatValue(snatch.approach_velocity_fps, ' ft/s')}</strong>
          </div>
          <div>
            <span>PREDICTED EXTENSION</span>
            <strong>{formatValue(snatch.predicted_extension_m, ' m')}</strong>
          </div>
          <div>
            <span>SCREENING STATUS</span>
            <strong>{screeningStatusLabel(snatch.status)}</strong>
          </div>
          <div>
            <span>RATING MARGIN</span>
            <strong>{formatValue(snatch.rating_margin)}</strong>
          </div>
          <div>
            <span>APPROACH VELOCITY SOURCE</span>
            <strong>{snatch.approach_velocity_source || 'Core screening model'}</strong>
          </div>
          <div>
            <span>DATA QUALITY</span>
            <strong>{snatch.data_quality || 'Not specified'}</strong>
          </div>
          <details className="mc-sim__snatch-limitations">
            <summary>LIMITATIONS // ASSUMPTIONS</summary>
            <p>{limitations || 'See the core screening model documentation for assumptions.'}</p>
          </details>
        </div>
      )}
    </section>
  )
}

function formatValue(value, suffix = '') {
  if (value == null || value === '') return '—'
  return `${typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}${suffix}`
}

function screeningStatusLabel(status) {
  const normalized = String(status || 'not evaluated')
    .toLowerCase()
    .replace(/[-_]/g, ' ')
  if (normalized === 'screened' || normalized === 'evaluated') return 'SCREENED'
  if (normalized === 'marginal') return 'MARGINAL'
  if (normalized === 'exceeds rating') return 'EXCEEDS RATING'
  if (normalized === 'not evaluated' || normalized === 'unavailable') return 'NOT EVALUATED'
  return normalized.toUpperCase()
}
