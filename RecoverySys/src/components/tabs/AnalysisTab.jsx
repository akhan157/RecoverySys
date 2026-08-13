import { useMemo, useState } from 'react'
import { normalizeCalculationInputs } from '../../lib/schema.js'
import { computeOpeningShockLoad } from '../../lib/recoveryLoad.js'
import { buildAnalysisReviewModel } from '../../lib/analysisReview.js'
import { computeStaticEjectionLoad } from '../../lib/simulation.js'

import { runSensitivity } from '../../lib/sensitivity.js'
import { CRITERION_IDS, evaluateCriterion, shockSafetyFactorBands } from '../../lib/criteria.js'
import { aggregateCriterionStatus, presentCriterion } from '../../lib/criterionPresentation.js'
import { densityAtAltitudeFt, FEET_PER_METER, isa } from '../../lib/atmosphere.js'
import { statusFromWarnings } from '../../lib/statusColor.js'
import StatusChip from '../primitives/StatusChip.jsx'
import ConfidenceStatus from '../ConfidenceStatus.jsx'
import SensitivityPanel from '../SensitivityPanel.jsx'
import { CausalityRow as SharedCausalityRow, ResultUsabilityStrip, ReviewSummary } from '../analysis/index.js'

const RESULT_LABELS = Object.freeze({
  'not-run': 'Not run',
  stale: 'Stale',
  current: 'Current',
})

function buildSurfaceReviewModel({
  simulation,
  resultFresh,
  warnings = [],
  testedResponse = null,
  assumptions = [],
  evidence = [],
}) {
  const findingInputs = [
    ...warnings,
    ...(simulation?.main_snatch?.status === 'unavailable'
      ? [
          {
            code: 'recovery.main-snatch.not-evaluated',
            slot: 'main_chute',
            state: 'not-evaluated',
            message:
              simulation.main_snatch.reason || 'Main deployment snatch screening is unavailable.',
            actionDestination: 'config.main_chute',
            remediation: 'Review main and drogue deployment hardware.',
          },
        ]
      : []),
  ]
  const canonical = buildAnalysisReviewModel({
    simulation,
    resultFresh,
    findings: findingInputs,
    testedResponse,
    assumptions,
    evidence,
  })
  const highestState = canonical.causalityRows.some((row) => row.findingState === 'error')
    ? 'error'
    : canonical.causalityRows.some((row) => row.findingState === 'warning')
      ? 'warning'
      : null
  const prioritizedRows = highestState
    ? canonical.causalityRows.filter((row) => row.findingState === highestState)
    : canonical.causalityRows
  const rows = prioritizedRows.map((row) => ({
    ...row,
    outcome: row.affectedOutcome,
    finding: row.finding?.message || row.consequence || 'Review finding available.',
    findingState: row.findingState,
    action: row.action?.label || 'Review supporting detail',
    actionPath: row.actionDestination,
    detail:
      row.source?.reference ||
      row.evidenceIds?.join(', ') ||
      row.remediation ||
      'Canonical finding and supporting detail.',
  }))
  const criterionCrossings = canonical.testedResponse.rows.reduce(
    (count, row) => count + row.criterionCrossings.length,
    0
  )
  const usability = {
    ...canonical.resultUsability,
    label: RESULT_LABELS[canonical.resultUsability.state],
  }
  const counts = {
    errors: canonical.reviewSummary.errorCount,
    warnings: canonical.reviewSummary.warningCount,
    notEvaluated: canonical.reviewSummary.notEvaluatedCount,
    criterionCrossings,
  }
  const estimates = canonical.keyEstimates.filter((estimate) =>
    ['apogee_ft', 'main_fps', 'landing_ke_ftlbf', 'drift_ft'].includes(estimate.id)
  )
  return {
    ...canonical,
    usability,
    counts,
    rows,
    estimates,
    priorityAction:
      rows[0]?.action ||
      (usability.state === 'current'
        ? 'Review model assumptions and evidence'
        : usability.nextAction),
  }
}

export default function AnalysisTab({ state, confidenceProps }) {
  const sim = state.resultFresh ? state.simulation : null
  const specs = state.specs
  const config = state.config

  const a = useMemo(() => {
    if (!sim) return null

    const { mass_g, mass_kg, g_factor, g_factor_auto } = normalizeCalculationInputs(specs)
    // Canonical static ejection impulse load: consume the simulation result
    // (computed by computeShockLoad) when the canonical model evaluated it;
    // fall back to the same exported derivation when no shock cord is selected.
    const staticLoad = sim.shock_load
      ? { load_lbs: sim.shock_load.peak_load_lbs }
      : computeStaticEjectionLoad(mass_kg, g_factor)
    const cord = config.shock_cord?.specs ?? null
    let cord_sf = null,
      cord_sf_status = null,
      cord_sf_presentation = null
    if (cord && sim.shock_load?.safety_factor != null) {
      cord_sf = sim.shock_load.safety_factor
      cord_sf_presentation = presentCriterion(sim.shock_load.criterion)
      cord_sf_status = cord_sf_presentation.status
    }

    // Opening shock: main chute opens at deploy_ft while descending at drogue speed
    const main = config.main_chute?.specs ?? null
    const deploy_ft = sim.deploy_ft || 500
    const drogue_fps = sim.drogue_fps || 0
    const openingShock = computeOpeningShockLoad({
      mainSpecs: main,
      deploy_alt_ft: deploy_ft,
      approach_velocity_fps: drogue_fps,
    })
    const opening_shock_N = openingShock.status === 'evaluated' ? openingShock.force_N : null
    const opening_shock_lbs = openingShock.status === 'evaluated' ? openingShock.force_lbs : null
    const main_Cx = openingShock.coefficient ?? null
    const main_area_m2 = openingShock.area_m2 ?? null

    const mid_drogue_ft = (sim.apogee_ft + deploy_ft) / 2
    const rho_mid = densityAtAltitudeFt(mid_drogue_ft)
    const rho_deploy_val = densityAtAltitudeFt(deploy_ft)
    const deployAtmosphere = isa(deploy_ft / FEET_PER_METER)

    const ke_ftlbf = sim.landing_ke_ftlbf
    const descentCriterion = evaluateCriterion(CRITERION_IDS.MAIN_DESCENT_RATE, sim.main_fps)
    const landingCriterion = evaluateCriterion(CRITERION_IDS.LANDING_ENERGY, ke_ftlbf)
    const descentCriterionPresentation = presentCriterion(descentCriterion)
    const landingCriterionPresentation = presentCriterion(landingCriterion)
    const ke_status = landingCriterionPresentation.status

    const drogue_phase_dist = sim.apogee_ft - deploy_ft

    return {
      mass_kg,
      mass_g,
      g_factor,
      g_factor_auto,
      staticLoad,
      cord,
      cord_sf,
      cord_sf_status,
      cord_sf_presentation,
      opening_shock_N,
      opening_shock_lbs,
      main_Cx,
      main_area_m2,
      main,
      deploy_ft,
      drogue_fps,
      mid_drogue_ft,
      rho_mid,
      deploy_temperature_K: deployAtmosphere.T,
      rho_deploy_val,
      descentCriterionPresentation,
      landingCriterionPresentation,
      ke_ftlbf,
      descentCriterion,
      landingCriterion,
      ke_status,
      drogue_phase_dist,
    }
  }, [sim, specs, config])

  const ap = a
  const warnings = state.warnings ?? []
  const resultStatus = state.simulation ? (state.resultFresh ? 'current' : 'stale') : 'not-run'
  const motorMethod = state.customMotor
    ? `THRUST CURVE / ${state.customMotor.designation || 'CUSTOM MOTOR'}`
    : sim?.apogee_method?.toUpperCase() || 'NOT RUN'
  const landingStatus = !sim
    ? 'neutral'
    : aggregateCriterionStatus([ap?.descentCriterion, ap?.landingCriterion])
  const snatchStatus = String(sim?.main_snatch?.status || '').toLowerCase()
  const snatchSeverity =
    snatchStatus === 'exceeds_rating' ? 'error' : snatchStatus === 'marginal' ? 'warn' : 'neutral'
  const hardwareWarnings = warnings.filter((warning) => HARDWARE_WARNING_SLOTS.has(warning.slot))
  const hardwareWarningStatus = statusFromWarnings(hardwareWarnings)
  const hardwareStatus = !sim
    ? 'neutral'
    : hardwareWarningStatus === 'error' ||
        snatchSeverity === 'error' ||
        ap?.cord_sf_status === 'error'
      ? 'error'
      : hardwareWarningStatus === 'warn' ||
          snatchSeverity === 'warn' ||
          ap?.cord_sf_status === 'warn'
        ? 'warn'
        : ap?.cord_sf_status === 'neutral'
          ? 'neutral'
          : 'ok'
  const sensitivityResult = useMemo(
    () =>
      state.testedResponse ??
      state.sensitivity ??
      (state.resultFresh
        ? runSensitivity({ specs, config, customMotor: state.customMotor })
        : null),
    [config, specs, state.customMotor, state.resultFresh, state.sensitivity, state.testedResponse]
  )

  const reviewModel =
    state.reviewModel ??
    buildSurfaceReviewModel({
      simulation: state.simulation,
      resultFresh: state.resultFresh,
      warnings,
      testedResponse: sensitivityResult,
      assumptions: state.assumptions,
      evidence: state.evidence,
    })
  const cordBands = shockSafetyFactorBands(ap?.cord?.material)
  const cordWarnThreshold = cordBands.find((band) => band.severity === 'warn')?.threshold
  const cordFailThreshold = cordBands.find((band) => band.severity === 'error')?.threshold
  const [selectedRowId, setSelectedRowId] = useState(() => {
    const firstEvaluated = reviewModel.rows.find(
      (row) => row.findingState === 'error' || row.findingState === 'warning'
    )
    return firstEvaluated?.id ?? null
  })
  const selectedRow =
    reviewModel.rows.find((row) => row.id === selectedRowId) ??
    reviewModel.rows.find(
      (row) => row.findingState === 'error' || row.findingState === 'warning'
    ) ??
    null
  return (
    <div className="mc-analysis">
      <ConfidenceStatus {...confidenceProps} />
      {!sim ? (
        <div className="mc-analysis__empty">
          <ResultUsabilityStrip
            state={resultStatus}
            onAction={(_action, destination) => confidenceProps?.onNavigate?.(destination)}
          />
        </div>
      ) : (
        <>
          <section
            className="mc-analysis__review mc-analysis__section--wide"
            aria-label="Review first"
          >
            <div className="mc-analysis__review-head">
              <div>
                <div className="mc-analysis__eyebrow">REVIEW FIRST</div>
                <strong>{motorMethod}</strong>
              </div>
              <StatusChip
                status={reviewModel.usability.state === 'current' ? 'ok' : 'warn'}
                label={reviewModel.usability.label.toUpperCase()}
              />
            </div>
            <div className="mc-analysis__review-signals">
              <ReviewSignal
                label="PRIORITY ACTION"
                value={warnings.length ? reviewModel.priorityAction : 'NO PRIORITY WARNINGS'}
                status={
                  reviewModel.counts.errors
                    ? 'error'
                    : reviewModel.counts.warnings
                      ? 'warn'
                      : 'neutral'
                }
              />
              <ReviewSignal
                label="LANDING"
                value={`${sim.drift_ft?.toLocaleString?.() ?? '—'} FT DRIFT · ${sim.main_fps?.toFixed?.(1) ?? '—'} FT/S`}
                status={landingStatus}
              />
              <ReviewSignal
                label="HARDWARE"
                value={hardwareStatus === 'ok' ? 'NO MATERIAL HARDWARE FINDING' : 'REVIEW LOADS'}
                status={hardwareStatus}
              />
            </div>
          </section>
          <SensitivityPanel
            specs={specs}
            config={config}
            customMotor={state.customMotor}
            resultFresh={state.resultFresh}
            result={sensitivityResult}
          />
          <section
            className="mc-analysis__board mc-analysis__section--wide"
            aria-label="Analysis review board"
          >
            <div className="mc-analysis__board-header">
              <div>
                <div className="mc-analysis__eyebrow">CAUSE → CONSEQUENCE REVIEW</div>
                <h2>What needs review before relying on this plan</h2>
              </div>
              <p>{reviewModel.usability.reason}</p>
            </div>
            <ReviewSummary
              summary={{
                ...reviewModel.counts,
                testedCrossings: reviewModel.counts.criterionCrossings,
              }}
              primaryAction={
                reviewModel.rows[0]?.actionPath
                  ? {
                      label: reviewModel.priorityAction,
                      destination: reviewModel.rows[0].actionPath,
                    }
                  : undefined
              }
              onAction={(action) => confidenceProps?.onNavigate?.(action.destination)}
            />
            <div className="mc-analysis__priority" role="status">
              <span>HIGHEST-PRIORITY ACTION</span>
              <strong>{reviewModel.priorityAction}</strong>
            </div>
            <div className="mc-analysis__estimates" aria-label="Key estimates">
              {reviewModel.estimates.map((estimate) => (
                <div key={estimate.label}>
                  <span>{estimate.label}</span>
                  <strong>
                    {estimate.value == null
                      ? 'Not available'
                      : `${Number(estimate.value).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${estimate.unit}`}
                  </strong>
                </div>
              ))}
            </div>
            <div className="mc-analysis__board-grid">
              <div className="mc-analysis__queue" aria-label="Cause-to-consequence findings">
                {reviewModel.rows.length ? (
                  reviewModel.rows.map((row) => (
                    <SharedCausalityRow
                      key={row.id}
                      row={{
                        ...row,
                        finding: {
                          state: row.findingState,
                          label:
                            row.findingState === 'not-evaluated' ? 'NOT EVALUATED' : row.finding,
                          message: row.finding,
                        },
                        action: {
                          label: row.action,
                          destination: row.actionPath,
                        },
                      }}
                      selected={row.id === selectedRow?.id}
                      onSelect={() => setSelectedRowId(row.id)}
                      onAction={(_, selected) => confidenceProps?.onNavigate?.(selected.actionPath)}
                    />
                  ))
                ) : (
                  <div className="mc-analysis__queue-empty">
                    <strong>No material findings are currently authored.</strong>
                    <span>
                      Review the model assumptions and evidence posture before relying on the
                      estimates.
                    </span>
                  </div>
                )}
              </div>
              <ReviewInspector row={selectedRow} onNavigate={confidenceProps?.onNavigate} />
            </div>
          </section>
          <details className="mc-analysis__supporting mc-analysis__section--wide">
            <summary>SUPPORTING CALCULATIONS / PROVENANCE</summary>
            {/* ── EJECTION LOADS ──────────────────────────────────────────────── */}
            <section className="mc-analysis__section">
              <div className="mc-panel-header">EJECTION_LOADS</div>
              <MethodDisclosure
                method="Static impulse screening"
                inputs={`Mass ${ap.mass_kg.toFixed(2)} kg · ${ap.g_factor}G`}
                defaults={
                  ap.g_factor_auto
                    ? 'G-factor auto: 20G below 10 kg; 30G at or above 10 kg.'
                    : 'G-factor supplied in Rocket Specs.'
                }
                limitations="A pressure pulse, bay geometry, slack, and peak dynamic load are not solved."
              />
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
                  value={`${Math.round(ap.staticLoad.load_lbs)} LBS`}
                  note="F = m × G × g₀ from the canonical static impulse model; loads are screening estimates, not certification evidence."
                />
                {ap.cord_sf != null && (
                  <AnalRow
                    label="CORD_SAFETY_FACTOR"
                    value={`${ap.cord_sf.toFixed(1)}×`}
                    badge={ap.cord_sf_presentation?.label ?? 'NOT EVALUATED'}
                    badgeStatus={ap.cord_sf_status}
                    note={`${ap.cord.strength_lbs} lbs rated ÷ ${Math.ceil(ap.staticLoad.load_lbs)} lbs required — ${ap.cord.material} criterion: ${cordFailThreshold ?? 'not evaluated'}× fail, ${cordWarnThreshold ?? 'not evaluated'}× warn`}
                  />
                )}
              </div>
            </section>

            <MainSnatchSection snatch={sim.main_snatch} />

            {/* ── OPENING SHOCK ───────────────────────────────────────────────── */}
            {ap.opening_shock_lbs != null && (
              <section className="mc-analysis__section">
                <div className="mc-panel-header">OPENING_SHOCK // MAIN_CHUTE</div>
                <MethodDisclosure
                  method="Opening-load estimate"
                  inputs={`Drogue ${ap.drogue_fps.toFixed(1)} ft/s · deploy ${ap.deploy_ft.toLocaleString()} ft`}
                  defaults={`Shape factor ${ap.main_Cx ?? 'not evaluated'}; air density sampled at deployment altitude.`}
                  limitations="Porosity, reefing, line stretch, and actual inflation timing are omitted."
                />
                <div className="mc-analysis__body">
                  <AnalRow
                    label="DEPLOY_ALTITUDE"
                    value={`${ap.deploy_ft.toLocaleString()} ft AGL`}
                  />
                  <AnalRow
                    label="APPROACH_SPEED"
                    value={`${ap.drogue_fps} ft/s`}
                    badge={`${(ap.drogue_fps / FEET_PER_METER).toFixed(1)} m/s`}
                  />
                  <AnalRow
                    label="AIR_DENSITY_ρ"
                    value={`${ap.rho_deploy_val.toFixed(4)} kg/m³`}
                    note={`ISA troposphere at ${ap.deploy_ft.toLocaleString()} ft — T = ${ap.deploy_temperature_K.toFixed(1)} K`}
                  />
                  <AnalRow
                    label="OPENING_FACTOR_Cx"
                    value={`${ap.main_Cx ?? 'Not evaluated'}`}
                    note="Shape factor selected by the canonical opening-load model; deployment hardware effects are not solved."
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
              <MethodDisclosure
                method="Terminal velocity by recovery phase"
                inputs={`Main ${sim.main_fps?.toFixed?.(1) ?? '—'} ft/s · drogue ${sim.drogue_fps?.toFixed?.(1) ?? '—'} ft/s`}
                defaults="Catalog Cd and sampled air density are used when inputs are available."
                limitations="Inflation transient, oscillation, and partial inflation are not modeled."
              />
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
                      badgeStatus={ap.descentCriterionPresentation.status}
                      badge={ap.descentCriterionPresentation.label}
                      note={`v = √(2mg / ρCdA) at ${ap.deploy_ft.toLocaleString()} ft; ρ = ${ap.rho_deploy_val.toFixed(4)} kg/m³. Criterion: ${ap.descentCriterion?.policyVersion ?? 'not evaluated'}.`}
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
                  badge={ap.landingCriterionPresentation.label}
                  badgeStatus={ap.ke_status}
                  note={`KE = ½mv² using the canonical landing-energy model with the main descent rate. Slightly conservative — actual ground speed is 3–5% lower (denser surface air).`}
                />
              </div>
            </section>
            {/* ── PACKING VOLUME moved to the canonical compatibility review
                 (SimulationTab COMPAT_ANALYSIS); Analysis keeps only the
                 unresolved packing finding from the compatibility warnings. */}
            <section className="mc-analysis__dossier">
              <details>
                <summary>MODEL ASSUMPTIONS &amp; LIMITS</summary>
                <div className="mc-analysis__dossier-grid">
                  <DossierItem
                    title="ASCENT"
                    text="Vertical 1-DOF trajectory; drag and motor behavior are simplified when no thrust curve is loaded."
                  />
                  <DossierItem
                    title="DESCENT"
                    text="Single terminal velocity per phase; chute inflation transients and oscillation are not modeled."
                  />
                  <DossierItem
                    title="DRIFT"
                    text="Wind is linearly coupled by altitude; gusts, local obstacles, and correlated layers are omitted."
                  />
                  <DossierItem
                    title="LOADS"
                    text="Ejection, snatch, and opening-shock values are preliminary screening models, not certification evidence."
                  />
                </div>
              </details>
            </section>
          </details>
        </>
      )}
    </div>
  )
}

function ReviewInspector({ row, onNavigate }) {
  if (!row) {
    return (
      <aside className="mc-analysis__inspector" aria-label="Selected finding details">
        <span className="mc-analysis__eyebrow">SELECTED REVIEW DETAIL</span>
        <strong>Select a causality row to inspect its driver, consequence, and action.</strong>
      </aside>
    )
  }

  return (
    <aside className="mc-analysis__inspector" aria-label="Selected finding details">
      <span className="mc-analysis__eyebrow">SELECTED REVIEW DETAIL</span>
      <h3>{row.driver}</h3>
      <dl>
        <div>
          <dt>Affected outcome</dt>
          <dd>{row.outcome}</dd>
        </div>
        <div>
          <dt>Method / provenance</dt>
          <dd>{row.detail}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="mc-analysis__inspector-action"
        onClick={() => onNavigate?.(row.actionPath)}
      >
        {row.action}
      </button>
    </aside>
  )
}

function ReviewSignal({ label, value, status }) {
  return (
    <div className="mc-analysis__review-signal">
      <span>{label}</span>
      <strong>{value}</strong>
      <StatusChip status={status} label={statusLabelText(status)} />
    </div>
  )
}

const HARDWARE_WARNING_SLOTS = new Set(['shock_cord', 'quick_links', 'swivel'])

function statusLabelText(status) {
  return { ok: 'CURRENT', warn: 'REVIEW', error: 'ERROR', neutral: 'NOT RUN' }[status] || 'REVIEW'
}

function MethodDisclosure({ method, inputs, defaults, limitations }) {
  return (
    <details className="mc-analysis__method">
      <summary>HOW THIS IS ESTIMATED — {method}</summary>
      <div className="mc-analysis__method-body">
        <div>
          <strong>Inputs</strong>
          <span>{inputs || 'Not specified'}</span>
        </div>
        <div>
          <strong>Defaults</strong>
          <span>{defaults || 'None specified'}</span>
        </div>
        {limitations && <p>{limitations}</p>}
      </div>
    </details>
  )
}

function DossierItem({ title, text }) {
  return (
    <div>
      <span>{title}</span>
      <p>{text}</p>
    </div>
  )
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
      <MethodDisclosure
        method="Linear-elastic harness screening proxy"
        inputs={`Approach ${formatValue(snatch?.approach_velocity_fps, ' fps')} · margin ${formatValue(snatch?.rating_margin)}`}
        defaults="The stopping-time and elasticity model use representative recovery geometry."
        limitations="This is not peak load, certification, or a substitute for component-specific testing."
      />
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
  if (normalized === 'not evaluated' || normalized === 'unavailable')
    return 'NOT EVALUATED // SUPPORTING DETAIL'
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
