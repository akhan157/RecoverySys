import { WARN_LEVELS } from '../../lib/constants.js'
import { RESULT_STATUS_DETAILS } from '../../lib/assessment.js'
import { CRITERION_IDS, evaluateCriterion } from '../../lib/criteria.js'
import { presentCriterion } from '../../lib/criterionPresentation.js'
import { computePackingVolume } from '../../lib/compatibility.js'
import FlightChart from '../FlightChart.jsx'
import MetricCard from '../MetricCard.jsx'
import ConfidenceStatus from '../ConfidenceStatus.jsx'
import ReviewReturnBar from '../analysis/ReviewReturnBar.jsx'
import { useReviewDestinationFocus } from '../../hooks/useReviewDestinationFocus.js'

export default function SimulationTab({
  state,
  runSim,
  canRun,
  resultFresh,
  confidenceProps,
  reviewOrigin = null,
  focusTarget = null,
  onFocusConsumed,
  onReturnToAnalysis,
}) {
  const sim = state.simulation
  const resultStatus = sim ? (resultFresh ? 'current' : 'stale') : 'not-run'
  const resultDetails = RESULT_STATUS_DETAILS[resultStatus]
  const usableSim = resultFresh ? sim : null
  const shock = usableSim?.shock_load
  const shockPresentation = presentCriterion(shock?.criterion)
  const snatch = usableSim?.main_snatch
  // Exact boundary behavior is owned by the canonical main-descent criterion;
  // the card never re-derives the 15/20 ft/s thresholds.
  const descentPresentation =
    usableSim?.main_fps != null
      ? presentCriterion(evaluateCriterion(CRITERION_IDS.MAIN_DESCENT_RATE, usableSim.main_fps))
      : null

  // Arriving from a review action (e.g. the Analysis "Rerun simulation" strip
  // or a result-status destination) hands focus to the run control.
  useReviewDestinationFocus({
    focusTarget,
    onConsumed: onFocusConsumed,
    resolve: (target) => (target === 'SIMULATION' ? document.querySelector('.mc-run-btn') : null),
  })

  return (
    <div className="mc-sim">
      {reviewOrigin === 'ANALYSIS' && <ReviewReturnBar onReturn={onReturnToAnalysis} />}
      <ConfidenceStatus {...confidenceProps} />
      {/* ── Top: Chart + Data ────────────────────────────────────────── */}
      <div className="mc-sim__top">
        {/* Flight Chart */}
        <div className="mc-sim__chart">
          <h2 className="mc-panel-header">
            FLIGHT_PROFILE // ALT_vs_TIME
            <span className="mc-panel-header__right">
              {resultStatus === 'stale'
                ? `${resultDetails.reasonCode} — ${resultDetails.remediation}`
                : sim
                  ? `REF_ID: STR-SIM-${String(Math.abs((sim.apogee_ft || 0) * 7 + (sim.drift_ft || 0)) % 9999).padStart(4, '0')}`
                  : resultDetails.reasonCode}
            </span>
          </h2>
          <div className="mc-sim__chart-area">
            <FlightChart simulation={usableSim} />
          </div>
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
              status={descentPresentation?.metricStatus}
              statusLabel={descentPresentation?.metricLabel}
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
                  status={shockPresentation.metricStatus}
                  statusLabel={shockPresentation.metricLabel}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <MainSnatchSummary snatch={snatch} />

      {(!sim || !resultFresh) && (
        <div className="mc-sim__runbar">
          <span>
            {resultDetails.reasonCode} — {resultDetails.remediation}
          </span>
          <button className="mc-run-btn" onClick={runSim} disabled={!canRun}>
            {state.simRunning ? 'RUNNING...' : 'RUN_SIMULATION →'}
          </button>
        </div>
      )}

      {usableSim && <FlightTimelinePanel sim={usableSim} specs={state.specs} />}

      {/* ── Bottom: Compatibility Analysis ───────────────────────────── */}
      <div className="mc-sim__bottom">
        <div className="mc-sim__compat">
          <h2 className="mc-panel-header">COMPAT_ANALYSIS</h2>
          {state.warnings.length === 0 ? (
            <div className="mc-alert">
              <div className="mc-alert__title">NO_COMPATIBILITY_WARNINGS_RECORDED</div>
              <div className="mc-alert__body">
                Absence of recorded warnings is not a clearance; review findings, evidence, and the
                mission envelope separately.
              </div>
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
          {usableSim && <PackingVolumePanel specs={state.specs} config={state.config} />}
        </div>
      </div>
    </div>
  )
}

// The canonical owning surface for phase sequence detail: the complete flight
// timeline lives with Simulation, where phase timing is the primary context.
function FlightTimelinePanel({ sim, specs }) {
  const deploy_ft = sim.deploy_ft || 500
  return (
    <section className="mc-sim__timeline" aria-label="Flight timeline">
      <h2 className="mc-panel-header">
        FLIGHT_TIMELINE <span className="mc-panel-header__right">PHASE_SEQUENCE</span>
      </h2>
      <div className="mc-sim__timeline-body">
        <details className="mc-sim__snatch-limitations">
          <summary>HOW THIS IS ESTIMATED — PHASE TIMING FROM DESCENT RATES</summary>
          <p>
            One terminal rate is used for each recovery phase; transient inflation and horizontal
            inertia are omitted. Ejection fires at apogee and the altimeter fires the main at the
            configured deploy altitude.
          </p>
        </details>
        <div className="mc-sim__timeline-body">
          <TimelineRow
            marker="T+0"
            event="LAUNCH"
            note="Rail exit — no rail friction or launch-guide losses modeled"
          />
          {sim.burnout_t_s != null && (
            <TimelineRow
              marker={`T+${sim.burnout_t_s}s`}
              event="MOTOR_BURNOUT"
              note={`${parseFloat(specs.motor_total_impulse_ns).toLocaleString()} N·s total impulse consumed`}
            />
          )}
          <TimelineRow
            marker={`T+${sim.apogee_t_s}s`}
            event={`APOGEE @ ${sim.apogee_ft.toLocaleString()} FT`}
            note={`Method: ${sim.apogee_method?.toUpperCase() ?? 'RK4'} — ejection fires, drogue deploys`}
          />
          <TimelineRow
            marker={`T+${sim.apogee_t_s + sim.phase1_time_s}s`}
            event={`MAIN_DEPLOY @ ${deploy_ft.toLocaleString()} FT`}
            note="Altimeter fires main — opening shock occurs here"
          />
          {sim.total_time_s && (
            <TimelineRow
              marker={`T+${sim.total_time_s}s`}
              event={`LANDING @ ${sim.drift_ft.toLocaleString()} FT DOWNWIND`}
              note="Primary wind drift; use DISPERSION tab for uncertainty bounds"
            />
          )}
        </div>
      </div>
    </section>
  )
}

// Detailed packing review moved to the canonical hardware/compatibility
// surface; Analysis shows only the unresolved packing finding and action.
function PackingVolumePanel({ specs, config }) {
  const packing = computePackingVolume({ config, specs })
  if (!packing.bay_known) return null
  const packingCriterion = evaluateCriterion(CRITERION_IDS.PACKING_CAPACITY_RATIO, packing.fraction)
  const fillPct = Math.round((packing.fraction ?? 0) * 100)
  return (
    <section className="mc-sim__packing" aria-label="Packing volume">
      <h2 className="mc-panel-header">PACKING_VOLUME</h2>
      <div className="mc-sim__packing-body">
        <details className="mc-sim__snatch-limitations">
          <summary>HOW THIS IS ESTIMATED — EFFECTIVE BAY VOLUME</summary>
          <p>
            70% packing efficiency accounts for folds, rigging, and fabric bulk. Actual fold
            geometry, snag points, wiring, and closure force are not measured.
          </p>
        </details>
        <AnalRow
          label="STACKED_COMPONENTS"
          value={`${packing.stacked_in3.toFixed(1)} IN³`}
          badge={`of ${packing.effective_in3.toFixed(1)} IN³ effective`}
          note="Cylindrical stacking sum — each component packed height × bay cross-section area"
        />
        <PackingGauge fraction={packing.fraction ?? 0} />
        <AnalRow
          label="FILL_FRACTION"
          value={`${fillPct}%`}
          badge={
            packingCriterion?.severity === 'error'
              ? 'ABOVE CRITERION'
              : packingCriterion?.severity === 'warn'
                ? 'TIGHT'
                : 'SCREENING AVAILABLE'
          }
          badgeStatus={
            packingCriterion?.severity === 'error'
              ? 'fail'
              : packingCriterion?.severity === 'warn'
                ? 'warn'
                : 'ok'
          }
          highlight={packingCriterion?.severity !== 'none'}
          note={`Criterion: ${packingCriterion?.policyVersion ?? 'not evaluated'}; exact boundary behavior is owned by the canonical packing criterion.`}
        />
      </div>
    </section>
  )
}

function AnalRow({ label, value, badge, badgeStatus, note, highlight }) {
  return (
    <div className={`mc-anal-row${highlight ? ' mc-anal-row--highlight' : ''}`}>
      <div className="mc-anal-row__top">
        <span className="mc-anal-row__label">{label}</span>
        <span className="mc-anal-row__right">
          <span className="mc-anal-row__value">{value}</span>
          {badge && (
            <span
              className={`mc-anal-row__badge${badgeStatus ? ` mc-anal-row__badge--${badgeStatus}` : ''}`}
            >
              {badge}
            </span>
          )}
        </span>
      </div>
      {note && <div className="mc-anal-row__note">{note}</div>}
    </div>
  )
}

function PackingGauge({ fraction }) {
  const pct = Math.min(100, Math.round(fraction * 100))
  const status = pct > 95 ? 'fail' : pct > 85 ? 'warn' : 'ok'
  return (
    <div className="mc-packing-gauge-wrap">
      <div className="mc-packing-gauge">
        <div
          className={`mc-packing-gauge__fill mc-packing-gauge__fill--${status}`}
          style={{ '--packing-pct': `${pct}%` }}
        />
      </div>
      <div className="mc-packing-gauge__labels">
        <span>0%</span>
        <span>85% THRESHOLD</span>
        <span>100%</span>
      </div>
    </div>
  )
}

function TimelineRow({ marker, event, note }) {
  return (
    <div className="mc-anal-row mc-anal-row--timeline">
      <div className="mc-anal-row__top">
        <span className="mc-anal-row__marker">{marker}</span>
        <span className="mc-anal-row__event">{event}</span>
      </div>
      {note && <div className="mc-anal-row__note">{note}</div>}
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
