import { useMemo } from 'react'
import { normalizeCalculationInputs } from '../../lib/schema.js'
import { computePackingVolume } from '../../lib/compatibility.js'
import { statusFromWarnings } from '../../lib/statusColor.js'
import StatusChip from '../primitives/StatusChip.jsx'

const G = 9.80665
const N_PER_LBF = 4.448
const FT_PER_M = 3.28084
const R_AIR = 287.058

function airDensityAtFt(alt_ft) {
  const h = Math.min(Math.max(0, alt_ft / FT_PER_M), 11000)
  const T = 288.15 - 0.0065 * h
  const P = 101325 * Math.pow(T / 288.15, 5.2559)
  return P / (R_AIR * T)
}

const Cx_MAP = { flat: 1.8, elliptical: 1.6, conical: 1.5, cruciform: 2.2, toroidal: 1.4 }

// Static ejection SF thresholds — mirrors simulation.js SF_THRESHOLDS
const SF_PASS = { nylon: 4, kevlar: 8 }
const SF_WARN = { nylon: 2, kevlar: 4 }

function sfStatus(sf, material) {
  const pass = SF_PASS[material] ?? SF_PASS.nylon
  const warn = SF_WARN[material] ?? SF_WARN.nylon
  return sf >= pass ? 'ok' : sf >= warn ? 'warn' : 'fail'
}

export default function AnalysisTab({ state }) {
  const sim = state.resultFresh ? state.simulation : null
  const specs = state.specs
  const config = state.config

  const a = useMemo(() => {
    if (!sim) return null

    const { mass_g, mass_kg, g_factor, g_factor_auto } = normalizeCalculationInputs(specs)

    const static_N = mass_kg * g_factor * G
    const static_lbs = static_N / N_PER_LBF

    // Shock cord derived values
    const cord = config.shock_cord?.specs ?? null
    let cord_sf = null,
      cord_sf_status = null
    if (cord) {
      cord_sf = cord.strength_lbs / static_lbs
      cord_sf_status = sfStatus(cord_sf, cord.material)
    }

    // Opening shock: main chute opens at deploy_ft while descending at drogue speed
    const main = config.main_chute?.specs ?? null
    const deploy_ft = sim.deploy_ft || 500
    const drogue_fps = sim.drogue_fps || 0
    let opening_shock_N = null,
      opening_shock_lbs = null,
      main_Cx = null,
      main_area_m2 = null
    if (main && drogue_fps > 0) {
      const rho_deploy = airDensityAtFt(deploy_ft)
      const r_m = (main.diameter_in * 0.0254) / 2
      main_area_m2 = Math.PI * r_m * r_m
      main_Cx = Cx_MAP[main.shape] ?? 1.8
      const v_mps = drogue_fps / FT_PER_M
      opening_shock_N = main_Cx * 0.5 * rho_deploy * v_mps * v_mps * main_area_m2
      opening_shock_lbs = opening_shock_N / N_PER_LBF
    }

    const mid_drogue_ft = (sim.apogee_ft + deploy_ft) / 2
    const rho_mid = airDensityAtFt(mid_drogue_ft)
    const rho_deploy_val = airDensityAtFt(deploy_ft)

    const landing_fps = sim.main_fps ?? sim.drogue_fps
    const landing_mps = landing_fps / FT_PER_M
    const landing_ke_J = 0.5 * mass_kg * landing_mps * landing_mps

    const ke_ftlbf = sim.landing_ke_ftlbf
    const ke_status = ke_ftlbf >= 100 ? 'fail' : ke_ftlbf >= 75 ? 'warn' : 'ok'

    const packing = computePackingVolume({ config, specs })

    const drogue_phase_dist = sim.apogee_ft - deploy_ft

    return {
      mass_kg,
      mass_g,
      g_factor,
      g_factor_auto,
      static_N,
      static_lbs,
      cord,
      cord_sf,
      cord_sf_status,
      opening_shock_N,
      opening_shock_lbs,
      main_Cx,
      main_area_m2,
      main,
      deploy_ft,
      drogue_fps,
      mid_drogue_ft,
      rho_mid,
      rho_deploy_val,
      landing_ke_J,
      ke_ftlbf,
      ke_status,
      packing,
      drogue_phase_dist,
    }
  }, [sim, specs, config])

  const ap = a
  const warnings = state.warnings ?? []
  const warningStatus = statusFromWarnings(warnings)
  const stale = Boolean(state.simulation && !state.resultFresh)
  const motorMethod = state.customMotor
    ? `THRUST CURVE / ${state.customMotor.designation || 'CUSTOM MOTOR'}`
    : sim?.apogee_method?.toUpperCase() || 'NOT RUN'
  const flightStatus = !sim ? 'neutral' : warningStatus === 'error' ? 'error' : warningStatus === 'warn' ? 'warn' : 'ok'
  const landingStatus = !sim ? 'neutral' : sim.main_fps > 20 || ap?.ke_status === 'fail' ? 'error' : sim.main_fps > 15 || ap?.ke_status === 'warn' ? 'warn' : 'ok'
  const snatchStatus = String(sim?.main_snatch?.status || '').toLowerCase()
  const hardwareStatus = !sim ? 'neutral' : warningStatus === 'error' || snatchStatus.includes('fail') || ap?.cord_sf_status === 'fail' ? 'error' : warningStatus === 'warn' || snatchStatus.includes('warn') || ap?.cord_sf_status === 'warn' ? 'warn' : 'ok'

  return (
    <div className="mc-analysis">
      {!sim ? <div className="mc-analysis__empty"><div className="mc-analysis__empty-code">{stale ? 'RESULT_STALE // RERUN_REQUIRED' : 'NO_SIMULATION_DATA'}</div><div className="mc-analysis__empty-sub">{stale ? 'Inputs changed. Run the simulation again to refresh analysis.' : 'Run a simulation from the DASHBOARD or SIMULATION tab to populate physics breakdown'}</div></div> : <>
      <section className="mc-analysis__review mc-analysis__section--wide" aria-label="Review first">
        <div className="mc-analysis__review-head">
          <div><div className="mc-analysis__eyebrow">REVIEW FIRST</div><strong>{motorMethod}</strong></div>
          <StatusChip status="ok" label="FRESH" />
        </div>
        <div className="mc-analysis__review-signals">
          <ReviewSignal label="PRIORITY WARNING" value={warnings[0]?.message || 'NO PRIORITY WARNINGS'} status={warningStatus} />
          <ReviewSignal label="LANDING" value={`${sim.drift_ft?.toLocaleString?.() ?? '—'} FT DRIFT · ${sim.main_fps?.toFixed?.(1) ?? '—'} FT/S`} status={landingStatus} />
          <ReviewSignal label="HARDWARE" value={hardwareStatus === 'ok' ? 'PRELIMINARY CHECKS PASS' : 'REVIEW LOADS'} status={hardwareStatus} />
        </div>
      </section>
      {/* ── EJECTION LOADS ──────────────────────────────────────────────── */}
      <section className="mc-analysis__section">
        <div className="mc-panel-header">EJECTION_LOADS</div>
        <MethodDisclosure method="Static impulse screening" inputs={`Mass ${ap.mass_kg.toFixed(2)} kg · ${ap.g_factor}G`} defaults={ap.g_factor_auto ? 'G-factor auto: 20G below 10 kg; 30G at or above 10 kg.' : 'G-factor supplied in Rocket Specs.'} limitations="A pressure pulse, bay geometry, slack, and peak dynamic load are not solved." />
        <div className="mc-analysis__body">
          <AnalRow
            label="G_FACTOR"
            value={`${ap.g_factor}×`}
            note={
              ap.g_factor_auto
                ? `Auto-selected: ${ap.mass_kg >= 10 ? '≥10 kg rocket → 30G (L3 HPR standard)' : '<10 kg → 20G (L1/L2 standard)'}`
                : 'User-specified in Rocket Specs'
            }
          />
          <AnalRow
            label="STATIC_EJECTION_LOAD"
            value={`${Math.round(ap.static_N)} N`}
            badge={`${Math.round(ap.static_lbs)} LBS`}
            note={`F = m × G_factor × g₀ = ${ap.mass_kg.toFixed(2)} kg × ${ap.g_factor} × 9.807 m/s²`}
          />
          {ap.cord_sf != null && (
            <AnalRow
              label="CORD_SAFETY_FACTOR"
              value={`${ap.cord_sf.toFixed(1)}×`}
              badge={
                ap.cord_sf_status === 'ok'
                  ? 'PASS'
                  : ap.cord_sf_status === 'warn'
                    ? 'MARGINAL'
                    : 'FAIL'
              }
              badgeStatus={ap.cord_sf_status}
              note={`${ap.cord.strength_lbs} lbs rated ÷ ${Math.ceil(ap.static_lbs)} lbs required — ${ap.cord.material} threshold: ${SF_PASS[ap.cord.material] ?? 4}× pass, ${SF_WARN[ap.cord.material] ?? 2}× warn`}
            />
          )}
        </div>
      </section>

      <MainSnatchSection snatch={sim.main_snatch} />

      {/* ── OPENING SHOCK ───────────────────────────────────────────────── */}
      {ap.opening_shock_lbs != null && (
      <section className="mc-analysis__section">
        <div className="mc-panel-header">OPENING_SHOCK // MAIN_CHUTE</div>
        <MethodDisclosure method="Opening-load estimate" inputs={`Drogue ${ap.drogue_fps.toFixed(1)} ft/s · deploy ${ap.deploy_ft.toLocaleString()} ft`} defaults={`Shape factor Cx ${ap.main_Cx ?? 1.8}; air density sampled at deployment altitude.`} limitations="Porosity, reefing, line stretch, and actual inflation timing are omitted." />
          <div className="mc-analysis__body">
            <AnalRow
              label="DEPLOY_ALTITUDE"
              value={`${ap.deploy_ft.toLocaleString()} ft AGL`}
              note="Altimeter setpoint — main chute opens here"
            />
            <AnalRow
              label="APPROACH_SPEED"
              value={`${ap.drogue_fps} ft/s`}
              badge={`${(ap.drogue_fps / FT_PER_M).toFixed(1)} m/s`}
              note="Drogue terminal velocity at deploy altitude — rocket speed when main opens"
            />
            <AnalRow
              label="AIR_DENSITY_ρ"
              value={`${ap.rho_deploy_val.toFixed(4)} kg/m³`}
              note={`ISA troposphere at ${ap.deploy_ft.toLocaleString()} ft — T = ${(288.15 - 0.0065 * (ap.deploy_ft / FT_PER_M)).toFixed(1)} K`}
            />
            <AnalRow
              label="OPENING_FACTOR_Cx"
              value={`${ap.main_Cx}`}
              note={`Shape: ${ap.main?.shape ?? 'unknown'} — flat=1.8, elliptical=1.6, conical=1.5, cruciform=2.2. Deployment bag reduces Cx 30–40%.`}
            />
            <AnalRow
              label="CHUTE_AREA"
              value={`${ap.main_area_m2.toFixed(4)} m²`}
              badge={`π × (${(ap.main?.diameter_in / 2).toFixed(2)}")²`}
              note={`Nominal flat area of ${ap.main?.diameter_in}" main chute — not projected area (real projected area ≈ 70% of flat)`}
            />
            <AnalRow
              label="OPENING_LOAD"
              value={`${Math.round(ap.opening_shock_N)} N`}
              badge={`≈ ${Math.round(ap.opening_shock_lbs)} LBS`}
              highlight
              note={`Cx × ½ρv²A — constraint: Cx is shape-generic, actual may vary ±30%. No deployment bag modeled.`}
            />
          </div>
        </section>
      )}

      {/* ── DESCENT RATES ───────────────────────────────────────────────── */}
      <section className="mc-analysis__section">
        <div className="mc-panel-header">DESCENT_RATES</div>
        <MethodDisclosure method="Terminal velocity by recovery phase" inputs={`Main ${sim.main_fps?.toFixed?.(1) ?? '—'} ft/s · drogue ${sim.drogue_fps?.toFixed?.(1) ?? '—'} ft/s`} defaults="Catalog Cd and sampled air density are used when inputs are available." limitations="Inflation transient, oscillation, and partial inflation are not modeled." />
        <div className="mc-analysis__body">
          {sim.drogue_fps && (
            <>
              <AnalRow
                label="DROGUE_TERMINAL_V"
                value={`${sim.drogue_fps} ft/s`}
                note={`v = √(2mg / ρCdA) — sampled at ${Math.round(ap.mid_drogue_ft).toLocaleString()} ft (midpoint of drogue phase); ρ = ${ap.rho_mid.toFixed(4)} kg/m³. Single-altitude approximation; density increases ~40% to ground.`}
              />
              <AnalRow
                label="DROGUE_PHASE"
                value={`${sim.phase1_time_s} s`}
                badge={`${Math.round(ap.drogue_phase_dist).toLocaleString()} ft`}
                note="No transient acceleration — rockets takes 3–10s to reach terminal after deploy; actual drift in that window may be 5–15% underpredicted"
              />
            </>
          )}
          {sim.main_fps && (
            <>
              <AnalRow
                label="MAIN_TERMINAL_V"
                value={`${sim.main_fps} ft/s`}
                badgeStatus={sim.main_fps > 20 ? 'fail' : sim.main_fps > 15 ? 'warn' : 'ok'}
                badge={sim.main_fps > 20 ? 'ABOVE_LIMIT' : sim.main_fps > 15 ? 'MARGINAL' : 'OK'}
                note={`v = √(2mg / ρCdA) at ${ap.deploy_ft.toLocaleString()} ft; ρ = ${ap.rho_deploy_val.toFixed(4)} kg/m³. NAR/TRA limit: 15 ft/s warn, 20 ft/s error.`}
              />
              <AnalRow
                label="MAIN_PHASE"
                value={`${sim.phase2_time_s} s`}
                badge={`${ap.deploy_ft.toLocaleString()} ft to ground`}
                note="Time from main deploy to landing"
              />
            </>
          )}
          <AnalRow
            label="LANDING_KE"
            value={`${ap.ke_ftlbf} ft·lbf`}
            badge={
              ap.ke_status === 'ok' ? 'SAFE' : ap.ke_status === 'warn' ? 'MARGINAL' : 'CRITICAL'
            }
            badgeStatus={ap.ke_status}
            note={`KE = ½mv² = ${ap.landing_ke_J.toFixed(0)} J using main descent rate. NAR/TRA: 75 ft·lbf warn, 100 ft·lbf error. Slightly conservative — actual ground speed is 3–5% lower (denser surface air).`}
          />
          {sim.total_time_s && (
            <AnalRow
              label="TOTAL_FLIGHT"
              value={`${sim.total_time_s} s`}
              note={`Apogee at T+${sim.apogee_t_s}s → main deploy at T+${sim.apogee_t_s + sim.phase1_time_s}s → landing`}
            />
          )}
        </div>
      </section>

      {/* ── FLIGHT TIMELINE ─────────────────────────────────────────────── */}
      <section className="mc-analysis__section">
        <div className="mc-panel-header">FLIGHT_TIMELINE</div>
        <MethodDisclosure method="Phase timing from descent rates" inputs={`Apogee ${sim.apogee_ft?.toLocaleString?.() ?? '—'} ft · main deploy ${ap.deploy_ft.toLocaleString()} ft`} defaults="One terminal rate is used for each recovery phase." limitations="Transient inflation and horizontal inertia are omitted." />
        <div className="mc-analysis__body">
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
            event={`MAIN_DEPLOY @ ${ap.deploy_ft.toLocaleString()} FT`}
            note="Altimeter fires main — opening shock occurs here"
          />
          {sim.total_time_s && (
            <TimelineRow
              marker={`T+${sim.total_time_s}s`}
              event={`LANDING @ ${sim.drift_ft.toLocaleString()} FT DOWNWIND`}
              note={`Primary wind drift; use DISPERSION tab for uncertainty bounds`}
            />
          )}
        </div>
      </section>

      {/* ── PACKING VOLUME ──────────────────────────────────────────────── */}
      {ap.packing.bay_known && (
        <section className="mc-analysis__section mc-analysis__section--wide">
          <div className="mc-panel-header">PACKING_VOLUME</div>
          <MethodDisclosure method="Effective bay volume and representative component volumes" inputs={`Fill ${Math.round((ap.packing.fraction ?? 0) * 100)}%`} defaults="70% packing efficiency accounts for folds, rigging, and fabric bulk." limitations="Actual fold geometry, snag points, wiring, and closure force are not measured." />
          <div className="mc-analysis__body">
            <AnalRow
              label="STACKED_COMPONENTS"
              value={`${ap.packing.stacked_in3.toFixed(1)} IN³`}
              badge={`of ${ap.packing.effective_in3.toFixed(1)} IN³ effective`}
              note="Cylindrical stacking sum — each component packed height × bay cross-section area"
            />
            <PackingGauge fraction={ap.packing.fraction ?? 0} />
            <AnalRow
              label="EFFICIENCY_FACTOR"
              value="70%"
              note="Real-world packing achieves ~70% of ideal linear stacking (folds, wadding, rigging, harness bulk)"
            />
            <AnalRow
              label="FILL_FRACTION"
              value={`${Math.round((ap.packing.fraction ?? 0) * 100)}%`}
              badge={(ap.packing.fraction ?? 0) > 0.85 ? 'TIGHT' : 'OK'}
              badgeStatus={(ap.packing.fraction ?? 0) > 0.85 ? 'warn' : 'ok'}
              highlight={(ap.packing.fraction ?? 0) > 0.85}
              note="Alert threshold: 85% of effective volume. Exceeding this raises packing-too-tight warning."
            />
          </div>
        </section>
      )}
      <section className="mc-analysis__dossier">
        <details>
          <summary>MODEL ASSUMPTIONS &amp; LIMITS</summary>
          <div className="mc-analysis__dossier-grid">
            <DossierItem title="ASCENT" text="Vertical 1-DOF trajectory; drag and motor behavior are simplified when no thrust curve is loaded." />
            <DossierItem title="DESCENT" text="Single terminal velocity per phase; chute inflation transients and oscillation are not modeled." />
            <DossierItem title="DRIFT" text="Wind is linearly coupled by altitude; gusts, local obstacles, and correlated layers are omitted." />
            <DossierItem title="LOADS" text="Ejection, snatch, and opening-shock values are preliminary screening models, not certification evidence." />
          </div>
        </details>
      </section>
      </>}
    </div>
  )
}

function ReviewSignal({ label, value, status }) {
  return <div className="mc-analysis__review-signal"><span>{label}</span><strong>{value}</strong><StatusChip status={status} label={statusLabelText(status)} /></div>
}

function statusLabelText(status) {
  return ({ ok: 'REVIEWED', warn: 'REVIEW', error: 'BLOCKED', neutral: 'NO RUN' })[status] || 'REVIEW'
}

function MethodDisclosure({ method, inputs, defaults, limitations }) {
  return <details className="mc-analysis__method"><summary>HOW THIS IS ESTIMATED — {method}</summary>{limitations && <p>{limitations}</p>}</details>
}

function DossierItem({ title, text }) {
  return <div><span>{title}</span><p>{text}</p></div>
}

function MainSnatchSection({ snatch }) {
  const status = String(snatch?.status || '')
    .toLowerCase()
    .replace(/[- ]/g, '_')
  const evaluated = snatch && status !== 'not_evaluated' && status !== 'unavailable'
  const limitations = snatch?.limitations
  const limitationText = Array.isArray(limitations) ? limitations.join(' ') : limitations

  return (
    <section className="mc-analysis__section mc-analysis__section--wide mc-analysis__section--screening">
      <div className="mc-panel-header">MAIN_DEPLOYMENT_SNATCH // SCREENING</div>
      <MethodDisclosure method="Linear-elastic harness screening proxy" inputs={`Approach ${formatValue(snatch?.approach_velocity_fps, ' fps')} · margin ${formatValue(snatch?.rating_margin)}`} defaults="The stopping-time and elasticity model use representative recovery geometry." limitations="This is not peak load, certification, or a substitute for component-specific testing." />
      {!evaluated ? (
        <div className="mc-screening-empty">
          <div className="mc-screening-empty__status">{screeningStatusLabel(snatch?.status)}</div>
          <div className="mc-anal-row__note">
            {snatch?.reason ||
              'No linear-elastic screening result is available for this configuration.'}
          </div>
        </div>
      ) : (
        <div className="mc-analysis__body">
          <AnalRow
            label="ESTIMATED_MAIN_DEPLOYMENT_SNATCH"
            value={formatValue(snatch.peak_force_proxy_lbs, ' lbs')}
            badge="LINEAR-ELASTIC SCREENING PROXY"
            highlight
            note="A screening estimate of the main-deployment snatch force; not a peak-load, safe, or certified result."
          />
          <AnalRow
            label="APPROACH_VELOCITY"
            value={formatValue(snatch.approach_velocity_fps, ' ft/s')}
          />
          <AnalRow
            label="PREDICTED_EXTENSION"
            value={formatValue(snatch.predicted_extension_m, ' m')}
          />
          <AnalRow label="SCREENING_STATUS" value={screeningStatusLabel(snatch.status)} />
          <AnalRow label="RATING_MARGIN" value={formatValue(snatch.rating_margin)} />
          <AnalRow
            label="APPROACH_VELOCITY_SOURCE"
            value={snatch.approach_velocity_source || 'Core screening model'}
          />
          <AnalRow
            label="ASSUMPTION / DATA QUALITY"
            value={snatch.data_quality || 'Not specified'}
          />
          <div className="mc-screening-limitations">
            <details>
              <summary>LIMITATIONS // ASSUMPTIONS</summary>
              <p>
                {limitationText || 'See the core screening model documentation for assumptions.'}
              </p>
            </details>
          </div>
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
