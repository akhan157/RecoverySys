import { useState } from 'react'
import SpecInput from './specs/SpecInput.jsx'
import CustomMotorImport from './specs/CustomMotorImport.jsx'
import ResultStatus from './ResultStatus.jsx'
import ReviewSummary from './primitives/ReviewSummary.jsx'
import { WARN_LEVELS } from '../lib/constants.js'

const WIZARD_STEPS = [
  { id: 'scope', index: '01', title: 'START & SCOPE', desc: 'Choose a starting point' },
  { id: 'rocket', index: '02', title: 'ROCKET & MOTOR', desc: 'Mass, motor, and airframe' },
  { id: 'hardware', index: '03', title: 'RECOVERY HARDWARE', desc: 'Chutes and shock cords' },
  { id: 'weather', index: '04', title: 'DEPLOY & WEATHER', desc: 'Altitude and wind profile' },
  { id: 'simulate', index: '05', title: 'SIMULATE & REVIEW', desc: 'Trajectory & loads' },
  { id: 'brief', index: '06', title: 'RECOVERY BRIEF', desc: 'Traceable plan handoff' },
]

export default function GuidedPlanWizard({
  state,
  allParts = [],
  onSetSpec,
  selectPart,
  removePart,
  runSim,
  canRun = false,
  resultFresh = false,
  _confidenceProps,
  onExit,
  onLoadDemo,
  onStartFresh,
}) {
  const [currentStep, setCurrentStep] = useState(0)
  const step = WIZARD_STEPS[currentStep]

  const sim = state.simulation
  const specs = state.specs
  const config = state.config

  const errorCount = (state.warnings || []).filter((w) => w.level === WARN_LEVELS.ERROR).length
  const warnCount = (state.warnings || []).filter((w) => w.level === WARN_LEVELS.WARN).length

  return (
    <section className="guided-review guided-wizard" aria-label="Guided Recovery Planning Wizard">
      {/* ── Left Rail: Step Progress ────────────────────────────────────── */}
      <div className="guided-review__rail">
        <div className="guided-review__eyebrow">GUIDED FIRST-PLAN // WIZARD</div>
        <h2>
          Recovery Plan
          <br />
          <em>Step-by-Step.</em>
        </h2>
        <p className="guided-review__intro">
          Build a defensible recovery configuration from empty inputs to a flight-ready brief.
        </p>

        <ol className="guided-review__steps">
          {WIZARD_STEPS.map((s, idx) => {
            const isActive = idx === currentStep
            const isDone = idx < currentStep
            return (
              <li key={s.id} className={isActive ? 'is-active' : isDone ? 'is-complete' : ''}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(idx)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span>{s.index}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <div style={{ fontSize: '8px', color: 'var(--mc-text-faint, #666)' }}>
                      {s.desc}
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ol>

        <div className="guided-review__rail-note">
          PLANNING AID ONLY
          <br />
          <strong>Does not certify flight readiness</strong>
        </div>
      </div>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      <div className="guided-review__content">
        <div className="guided-review__topline">
          <span>
            STEP {step.index} OF 06 — {step.title}
          </span>
          <button
            type="button"
            className="guided-result__action"
            onClick={onExit}
            aria-label="Exit guided wizard"
          >
            ✕ RETURN_TO_DASHBOARD
          </button>
        </div>

        {/* ── STEP 1: START & SCOPE ─────────────────────────────────────── */}
        {currentStep === 0 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">PHASE 1: SCOPE</div>
            <h3>How do you want to start?</h3>
            <p className="guided-review__lede">
              RecoverySys is a local-first engineering review aid for high-power rocketry. It
              evaluates descent velocities, shock cord snatch loads, bay packing, and wind drift.
            </p>

            <div className="guided-review__answer-grid">
              <article>
                <span className="guided-review__number">A</span>
                <h4>Load Demo Flight</h4>
                <p>
                  Loads a representative Level 3 dual-deploy flight at FAR Mojave with sample motor
                  and chutes.
                </p>
                <button
                  type="button"
                  className="mc-run-btn"
                  style={{ marginTop: 12 }}
                  onClick={() => {
                    if (onLoadDemo) onLoadDemo()
                    setCurrentStep(1)
                  }}
                >
                  LOAD_DEMO →
                </button>
              </article>

              <article>
                <span className="guided-review__number">B</span>
                <h4>Start Fresh</h4>
                <p>
                  Clears existing inputs so you can configure your own rocket from the ground up.
                </p>
                <button
                  type="button"
                  className="mc-review-summary__action-btn"
                  style={{ marginTop: 12 }}
                  onClick={() => {
                    if (onStartFresh) onStartFresh()
                    setCurrentStep(1)
                  }}
                >
                  START_FRESH →
                </button>
              </article>

              <article>
                <span className="guided-review__number">C</span>
                <h4>Continue Current Plan</h4>
                <p>
                  Keep your entered rocket specs and hardware selections and proceed through the
                  review.
                </p>
                <button
                  type="button"
                  className="mc-review-summary__action-btn"
                  style={{ marginTop: 12 }}
                  onClick={() => setCurrentStep(1)}
                >
                  CONTINUE →
                </button>
              </article>
            </div>

            <div className="guided-review__callout guided-review__callout--info">
              <span>i</span>
              <p>
                <strong>Local-First Guarantee:</strong> All calculations, thrust-curve integrations,
                and configs remain on this device. No data is sent to external servers.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 2: ROCKET & MOTOR ────────────────────────────────────── */}
        {currentStep === 1 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">PHASE 2: VEHICLE & PROPULSION</div>
            <h3>Define rocket mass, motor, and airframe</h3>
            <p className="guided-review__lede">
              Apogee altitude and peak kinetic energy depend directly on total loaded mass and motor
              impulse.
            </p>

            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}
            >
              <SpecInput
                id="wizard-mass"
                label="Rocket Loaded Mass"
                value={specs.rocket_mass_g}
                unit="g"
                placeholder="e.g. 2500"
                onChange={(v) => onSetSpec('rocket_mass_g', v)}
                help="Total liftoff mass including airframe, hardware, and motor propellant"
              />
              <SpecInput
                id="wizard-airframe-id"
                label="Airframe Inner Diameter"
                value={specs.airframe_id_in}
                unit="in"
                placeholder="e.g. 3.9"
                onChange={(v) => onSetSpec('airframe_id_in', v)}
                help="Inner diameter of the recovery bay tube (e.g. 3.9 for 4-inch tube)"
              />
              <SpecInput
                id="wizard-impulse"
                label="Motor Total Impulse"
                value={specs.motor_total_impulse_ns}
                unit="Ns"
                placeholder="e.g. 640"
                onChange={(v) => onSetSpec('motor_total_impulse_ns', v)}
                help="Total impulse in Newton-seconds"
              />
              <SpecInput
                id="wizard-burn"
                label="Motor Burn Time"
                value={specs.burn_time_s}
                unit="s"
                placeholder="e.g. 1.8"
                onChange={(v) => onSetSpec('burn_time_s', v)}
                help="Burn duration in seconds for accurate numerical ascent integration"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <div
                style={{ fontSize: 11, fontWeight: 600, color: 'var(--mc-white)', marginBottom: 6 }}
              >
                CUSTOM MOTOR CURVE (.ENG)
              </div>
              <CustomMotorImport
                customMotor={state.customMotor}
                onSetCustomMotor={(motor) => onSetSpec('customMotor', motor)}
                onClearCustomMotor={() => onSetSpec('customMotor', null)}
                onToast={() => {}}
              />
            </div>

            <div className="guided-review__callout guided-review__callout--info">
              <span>i</span>
              <p>
                <strong>Ascent Model Notice:</strong> Numerical RK4 integration is used when burn
                time is entered; thrust curve interpolation provides ±3–5% apogee accuracy.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 3: RECOVERY HARDWARE ─────────────────────────────────── */}
        {currentStep === 2 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">PHASE 3: RECOVERY HARDWARE</div>
            <h3>Select parachutes and shock cord</h3>
            <p className="guided-review__lede">
              Match main and drogue canopy diameters to vehicle mass. Parachutes must meet the 15–20
              fps landing speed threshold.
            </p>

            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}
            >
              {/* Main Chute Picker */}
              <div
                style={{
                  padding: 12,
                  border: '1px solid var(--mc-border-card)',
                  background: 'var(--mc-bg-card)',
                }}
              >
                <strong style={{ fontSize: 11, color: 'var(--mc-white)' }}>MAIN PARACHUTE</strong>
                <p style={{ fontSize: 10, color: 'var(--mc-text-dim)', margin: '4px 0 8px' }}>
                  {config.main_chute ? config.main_chute.name : 'No main chute selected'}
                </p>
                {config.main_chute ? (
                  <button
                    type="button"
                    className="mc-review-summary__action-btn"
                    onClick={() => removePart('main_chute')}
                  >
                    Remove Main Chute
                  </button>
                ) : (
                  <select
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: 'var(--mc-bg-panel)',
                      color: 'var(--mc-text)',
                      border: '1px solid var(--mc-border)',
                    }}
                    onChange={(e) => {
                      const part = allParts.find((p) => p.id === e.target.value)
                      if (part) selectPart('main_chute', part)
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a catalog main canopy...
                    </option>
                    {allParts
                      .filter((p) => p.category === 'main_chute')
                      .slice(0, 15)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.specs.diameter_in}" Cd={p.specs.cd})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Drogue Chute Picker */}
              <div
                style={{
                  padding: 12,
                  border: '1px solid var(--mc-border-card)',
                  background: 'var(--mc-bg-card)',
                }}
              >
                <strong style={{ fontSize: 11, color: 'var(--mc-white)' }}>DROGUE CHUTE</strong>
                <p style={{ fontSize: 10, color: 'var(--mc-text-dim)', margin: '4px 0 8px' }}>
                  {config.drogue_chute
                    ? config.drogue_chute.name
                    : 'No drogue chute (single deploy)'}
                </p>
                {config.drogue_chute ? (
                  <button
                    type="button"
                    className="mc-review-summary__action-btn"
                    onClick={() => removePart('drogue_chute')}
                  >
                    Remove Drogue
                  </button>
                ) : (
                  <select
                    style={{
                      width: '100%',
                      padding: '6px',
                      background: 'var(--mc-bg-panel)',
                      color: 'var(--mc-text)',
                      border: '1px solid var(--mc-border)',
                    }}
                    onChange={(e) => {
                      const part = allParts.find((p) => p.id === e.target.value)
                      if (part) selectPart('drogue_chute', part)
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select a catalog drogue...
                    </option>
                    {allParts
                      .filter((p) => p.category === 'drogue_chute')
                      .slice(0, 12)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.specs.diameter_in}")
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>

            <div className="guided-review__callout guided-review__callout--info">
              <span>i</span>
              <p>
                <strong>Catalog Provenance:</strong> Built-in catalog values are sourced from
                OpenRocket and manufacturer sheets (labeled unverified until independently
                reviewed).
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 4: DEPLOYMENT & WEATHER ──────────────────────────────── */}
        {currentStep === 3 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">PHASE 4: ENVIRONMENT & TIMING</div>
            <h3>Set deployment altitude and wind speed</h3>
            <p className="guided-review__lede">
              Lower main deployment altitude reduces downwind drift walk distance. Higher deployment
              provides more safety margin for line stretch and inflation.
            </p>

            <div
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}
            >
              <SpecInput
                id="wizard-deploy-alt"
                label="Main Deployment Altitude"
                value={specs.main_deploy_alt_ft}
                unit="ft"
                placeholder="500"
                onChange={(v) => onSetSpec('main_deploy_alt_ft', v)}
                help="Typical main deploy: 500–1000 ft AGL"
              />
              <SpecInput
                id="wizard-wind-speed"
                label="Surface Wind Speed"
                value={specs.wind_speed_mph}
                unit="mph"
                placeholder="e.g. 10"
                onChange={(v) => onSetSpec('wind_speed_mph', v)}
                help="Average surface wind speed"
              />
              <SpecInput
                id="wizard-wind-dir"
                label="Wind Direction (FROM)"
                value={specs.wind_direction_deg}
                unit="°"
                placeholder="0=N 90=E 180=S"
                onChange={(v) => onSetSpec('wind_direction_deg', v)}
                help="Direction wind blows FROM (meteorological convention)"
              />
              <SpecInput
                id="wizard-bay-length"
                label="Recovery Bay Length"
                value={specs.bay_length_in}
                unit="in"
                placeholder="e.g. 18"
                onChange={(v) => onSetSpec('bay_length_in', v)}
                help="Axial length available in the tube for packed recovery gear"
              />
            </div>

            <div className="guided-review__callout guided-review__callout--warn">
              <span>!</span>
              <p>
                <strong>Wind Direction Requirement:</strong> A valid wind direction angle is
                required to compute compass bearing and landing coordinates on the dispersion map.
              </p>
            </div>
          </div>
        )}

        {/* ── STEP 5: SIMULATE & REVIEW ─────────────────────────────────── */}
        {currentStep === 4 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">PHASE 5: SIMULATION & COMPATIBILITY</div>
            <h3>Execute simulation and check findings</h3>
            <p className="guided-review__lede">
              Evaluate trajectory estimates against recovery safety boundaries and compatibility
              checks.
            </p>

            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                className="mc-run-btn"
                onClick={runSim}
                disabled={!canRun}
                style={{ padding: '8px 16px', fontSize: 11 }}
              >
                {state.simRunning ? 'RUNNING_SIMULATION...' : '▶ RUN_SIMULATION_NOW'}
              </button>
            </div>

            <ResultStatus
              specs={specs}
              config={config}
              customMotor={state.customMotor}
              simulation={sim}
              resultFresh={resultFresh}
              onRerun={runSim}
              compact
            />

            <div style={{ marginTop: 16 }}>
              <ReviewSummary
                errorsCount={errorCount}
                warningsCount={warnCount}
                highestPriorityAction={{
                  label:
                    errorCount > 0
                      ? 'Review Critical Compatibility Errors'
                      : 'Review Hardware Configuration',
                  onClick: () => setCurrentStep(2),
                }}
              />
            </div>

            {sim && resultFresh && (
              <div className="guided-review__answer-grid" style={{ marginTop: 16 }}>
                <article>
                  <span className="guided-review__number">01</span>
                  <h4>Predicted Apogee</h4>
                  <p>
                    <strong>{sim.apogee_ft?.toLocaleString()} FT</strong> ({sim.apogee_method})
                  </p>
                </article>
                <article>
                  <span className="guided-review__number">02</span>
                  <h4>Main Descent Rate</h4>
                  <p>
                    <strong>{sim.main_fps?.toFixed(1) || '—'} FT/S</strong> (Target: &lt;20 fps)
                  </p>
                </article>
                <article>
                  <span className="guided-review__number">03</span>
                  <h4>Lateral Drift</h4>
                  <p>
                    <strong>{sim.drift_ft?.toLocaleString() || '—'} FT</strong> (~
                    {((sim.drift_ft || 0) / 5280).toFixed(2)} mi)
                  </p>
                </article>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 6: RECOVERY BRIEF ────────────────────────────────────── */}
        {currentStep === 5 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">PHASE 6: RECOVERY BRIEF</div>
            <h3>Traceable Recovery Brief & Sign-Off</h3>
            <p className="guided-review__lede">
              Your recovery configuration is prepared. Review unresolved checks and generate the
              formal handoff brief or field checklist.
            </p>

            <div
              style={{
                padding: 16,
                border: '1px solid var(--mc-border-card)',
                background: 'var(--mc-bg-card)',
                marginBottom: 16,
              }}
            >
              <h4 style={{ color: 'var(--mc-white)', marginBottom: 8 }}>RECOVERY BRIEF SUMMARY</h4>
              <ul
                style={{
                  fontSize: 11,
                  color: 'var(--mc-text-dim)',
                  lineHeight: 1.6,
                  paddingLeft: 16,
                }}
              >
                <li>
                  Mass: {specs.rocket_mass_g || '—'} g · Motor:{' '}
                  {specs.motor_total_impulse_ns || '—'} Ns
                </li>
                <li>
                  Main Chute: {config.main_chute?.name || 'None'} · Drogue:{' '}
                  {config.drogue_chute?.name || 'None'}
                </li>
                <li>
                  Apogee: {sim?.apogee_ft?.toLocaleString() || '—'} ft · Main Descent:{' '}
                  {sim?.main_fps?.toFixed(1) || '—'} ft/s
                </li>
                <li>
                  Drift: {sim?.drift_ft?.toLocaleString() || '—'} ft · Warnings: {errorCount}{' '}
                  errors, {warnCount} notices
                </li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <button type="button" className="mc-run-btn" onClick={() => window.print()}>
                PRINT_RECOVERY_BRIEF →
              </button>
              <button type="button" className="mc-review-summary__action-btn" onClick={onExit}>
                OPEN_IN_MISSION_CONTROL →
              </button>
            </div>

            <div className="guided-review__callout guided-review__callout--warn">
              <span>!</span>
              <p>
                <strong>Static Packing Boundary:</strong> The recovery bay sequence is an
                organizational checklist order, not a geometric packing clearance or
                flight-readiness certification.
              </p>
            </div>
          </div>
        )}

        {/* ── Bottom Navigation Controls ────────────────────────────────── */}
        <div className="guided-review__nav">
          <button
            type="button"
            className="guided-review__back"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
          >
            ← BACK
          </button>
          <span>
            {currentStep === 5
              ? 'Complete — Ready for review'
              : `Next: ${WIZARD_STEPS[currentStep + 1]?.title.toLowerCase()}`}
          </span>
          <button
            type="button"
            className="guided-review__next"
            onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
            disabled={currentStep === 5}
          >
            NEXT →
          </button>
        </div>
      </div>
    </section>
  )
}
