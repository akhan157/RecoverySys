import { useMemo, useState } from 'react'
import { provenanceForPart } from '../data/catalogProvenance.js'
import { getDefaultSpecs } from '../lib/schema.js'

const STEPS = [
  { id: 'scope', index: '01', label: 'PLAN SCOPE' },
  { id: 'results', index: '02', label: 'RESULTS' },
  { id: 'method', index: '03', label: 'METHOD & ASSUMPTIONS' },
]

const EMPTY_CONFIG = {}
const DEFAULT_SPECS = getDefaultSpecs()
const noop = () => {}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== ''
}

function partSource(part) {
  return part && (part.manufacturer === 'Custom' || !provenanceForPart(part))
    ? 'USER-SUPPLIED DATA'
    : 'CATALOG DATA · UNVERIFIED'
}

function resultStatus(simulation, resultFresh) {
  if (!simulation) return { label: 'NOT RUN', tone: 'quiet' }
  if (!resultFresh) return { label: 'STALE RESULT', tone: 'warn' }
  return { label: 'CURRENT RESULT', tone: 'good' }
}

export default function GuidedReview({
  state = { config: {}, specs: {}, simulation: null },
  resultFresh = false,
  recoveryBrief = null,
  onOpenDashboard = noop,
  onOpenSpecs = noop,
  onOpenSimulation = noop,
  onOpenImport = noop,
  onStartFresh = noop,
}) {
  const [step, setStep] = useState(0)
  const [showMethod, setShowMethod] = useState(false)
  const current = STEPS[step]
  const specs = state.specs ?? {}
  const config = state.config ?? EMPTY_CONFIG
  const selectedParts = useMemo(() => Object.values(config).filter(Boolean), [config])
  const hasEnteredSpec = Object.entries(specs).some(
    ([key, value]) => hasValue(value) && String(value) !== String(DEFAULT_SPECS[key] ?? '')
  )
  const hasPlan = selectedParts.length > 0 || hasEnteredSpec
  const status = resultStatus(state.simulation, resultFresh)
  const confidenceLabel = recoveryBrief?.confidence?.label ?? 'Insufficient confidence'
  const evidenceNote =
    recoveryBrief?.confidence?.evidenceNote ??
    'No accepted comparison or flight evidence is available in the current corpus.'
  const requiredInputs = [
    { label: 'Rocket mass', value: specs.rocket_mass_g, unit: 'g' },
    { label: 'Motor total impulse', value: specs.motor_total_impulse_ns, unit: 'N·s' },
  ]
  const optionalInputs = [
    {
      label: 'Main deploy altitude',
      value: hasValue(specs.main_deploy_alt_ft)
        ? `${specs.main_deploy_alt_ft} ft · current value`
        : '500 ft · default if blank',
    },
    {
      label: 'Ejection G-factor',
      value: hasValue(specs.ejection_g_factor)
        ? `${specs.ejection_g_factor}G · current value`
        : 'Auto by mass · default if blank',
    },
  ]

  return (
    <section className="guided-review" aria-label="Guided first plan">
      <div className="guided-review__rail">
        <div className="guided-review__eyebrow">TRANSPARENCY MODE / GUIDED FIRST PLAN</div>
        <h2>
          Start a recovery plan
          <br />
          <em>with clear limits.</em>
        </h2>
        <p className="guided-review__intro">
          A short path from inputs to a reviewable estimate. You can pause, resume, import, or use
          the direct navigation at any time.
        </p>
        <ol className="guided-review__steps">
          {STEPS.map((item, index) => (
            <li
              key={item.id}
              className={index === step ? 'is-active' : index < step ? 'is-complete' : ''}
            >
              <button
                onClick={() => setStep(index)}
                aria-current={index === step ? 'step' : undefined}
              >
                <span>{item.index}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="guided-review__rail-note">
          PLAN STATE
          <br />
          <strong>{hasPlan ? 'INPUTS IN PROGRESS' : 'NEW PLAN'}</strong>
        </div>
      </div>

      <div className="guided-review__content">
        <div className="guided-review__topline">
          <span>STEP {current.index} OF 03</span>
          <span className="guided-review__quiet">No calculations are changed in this view</span>
        </div>

        {step === 0 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">START HERE</div>
            <h3>Set the scope of your first plan</h3>
            <p className="guided-review__lede">
              Required values come from the current plan. Optional values may stay blank when a
              documented calculation default exists; blank values are not measured or verified.
            </p>

            <div className="guided-review__plan-actions" aria-label="Plan actions">
              <button className="guided-review__action-card" onClick={onStartFresh}>
                <strong>START A NEW PLAN</strong>
                <span>Clear current inputs and enter a plan from the beginning.</span>
              </button>
              <button
                className="guided-review__action-card"
                onClick={onOpenDashboard}
                disabled={!hasPlan}
              >
                <strong>RESUME THIS PLAN</strong>
                <span>
                  {hasPlan
                    ? 'Keep entered values and continue in the dashboard.'
                    : 'No entered values to resume yet.'}
                </span>
              </button>
              <button className="guided-review__action-card" onClick={onOpenImport}>
                <strong>IMPORT A PLAN</strong>
                <span>Load a saved JSON plan without replacing state until it validates.</span>
              </button>
            </div>

            <div className="guided-review__value-grid">
              <section>
                <div className="guided-review__kicker">REQUIRED INPUTS</div>
                <dl>
                  {requiredInputs.map((input) => (
                    <div key={input.label}>
                      <dt>{input.label}</dt>
                      <dd>{hasValue(input.value) ? `${input.value} ${input.unit}` : 'Not set'}</dd>
                    </div>
                  ))}
                </dl>
              </section>
              <section>
                <div className="guided-review__kicker">OPTIONAL / DEFAULT IF BLANK</div>
                <dl>
                  {optionalInputs.map((input) => (
                    <div key={input.label}>
                      <dt>{input.label}</dt>
                      <dd>{input.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>

            <div className="guided-review__hardware-summary">
              <div className="guided-review__kicker">RECOVERY HARDWARE / SOURCE</div>
              {selectedParts.length > 0 ? (
                selectedParts.map((part) => (
                  <div className="guided-review__hardware-row" key={`${part.category}-${part.id}`}>
                    <span>{part.name || part.id}</span>
                    <small>{partSource(part)}</small>
                  </div>
                ))
              ) : (
                <p>
                  No recovery hardware selected yet. Catalog values remain unverified; custom values
                  remain user supplied.
                </p>
              )}
            </div>

            <div className="guided-review__callout guided-review__callout--info">
              <span>i</span>
              <p>
                <strong>
                  This is a planning estimate, not a safety approval or certification.
                </strong>{' '}
                Review engineering, manufacturer, and range requirements separately.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">THE SHORT VERSION</div>
            <h3>Review results by scope</h3>
            <p className="guided-review__lede">
              Results remain estimates and screening signals. Open method details only when a result
              needs context.
            </p>
            <div className="guided-review__result-list">
              <article className="guided-result">
                <div className={`guided-result__status guided-result__status--${status.tone}`}>
                  {status.label}
                </div>
                <div>
                  <div className="guided-review__kicker">FLIGHT OUTCOME</div>
                  <h4>Recovery sequence estimate</h4>
                  <p>
                    {state.simulation
                      ? 'A simulation result is available for this plan.'
                      : 'Run the simulation after required inputs and recovery hardware are supplied.'}
                  </p>
                </div>
                <button className="guided-result__action" onClick={onOpenSimulation}>
                  OPEN
                </button>
              </article>
              <article className="guided-result">
                <div className="guided-result__status guided-result__status--quiet">SCREENING</div>
                <div>
                  <div className="guided-review__kicker">LANDING WINDOW</div>
                  <h4>Where might the vehicle land?</h4>
                  <p>
                    {resultFresh && state.simulation?.drift_ft != null
                      ? `Estimated drift: ${state.simulation.drift_ft.toFixed(0)} ft.`
                      : 'Landing drift is unavailable until a current simulation exists.'}
                  </p>
                </div>
                <button className="guided-result__action" onClick={onOpenSimulation}>
                  OPEN
                </button>
              </article>
              <article className="guided-result">
                <div className="guided-result__status guided-result__status--quiet">SCREENING</div>
                <div>
                  <div className="guided-review__kicker">HARDWARE LOADS</div>
                  <h4>What deserves a closer look?</h4>
                  <p>
                    The available evidence supports a preliminary check, not a final structural
                    sign-off.
                  </p>
                </div>
                <button className="guided-result__action" onClick={() => setShowMethod(true)}>
                  WHY?
                </button>
              </article>
            </div>
            <div className="guided-review__callout guided-review__callout--warn">
              <span>!</span>
              <p>
                <strong>{confidenceLabel}.</strong> {evidenceNote} Guided results remain estimates
                and do not establish safety, approval, certification, or launch readiness.
              </p>
            </div>
            {showMethod && (
              <div className="guided-review__callout guided-review__callout--warn">
                <span>!</span>
                <p>
                  <strong>Context needed.</strong> Load signals are comparative indicators. Confirm
                  material ratings, attachment geometry, and field procedures separately.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">OPTIONAL DEEP DIVE</div>
            <h3>Method & assumptions</h3>
            <p className="guided-review__lede">
              Open this layer when you need to explain a result to a teammate or challenge an input.
            </p>
            <div className="guided-review__method-list">
              <details open>
                <summary>
                  Atmosphere & wind <span>+ / −</span>
                </summary>
                <p>
                  Uses a steady surface wind case with a simplified change in wind above the launch
                  site. Gusts and terrain effects are not represented.
                </p>
              </details>
              <details>
                <summary>
                  Deployment model <span>+ / −</span>
                </summary>
                <p>
                  Deployment is represented as an idealized event at the configured altitude. Line
                  stretch, packing behavior, and hardware timing are not modeled here.
                </p>
              </details>
              <details>
                <summary>
                  Load interpretation <span>+ / −</span>
                </summary>
                <p>
                  Load signals are comparative indicators for review. Confirm material ratings,
                  attachment geometry, and field procedures separately.
                </p>
              </details>
            </div>
            <button className="guided-review__text-link" onClick={onOpenSpecs}>
              Review the source inputs →
            </button>
          </div>
        )}

        <div className="guided-review__nav">
          <button
            className="guided-review__back"
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
          >
            ← BACK
          </button>
          <button className="guided-review__pause" onClick={onOpenDashboard}>
            PAUSE AND RETURN
          </button>
          <span>
            {step === 2
              ? 'Deep review is optional'
              : `Next: ${STEPS[step + 1].label.toLowerCase()}`}
          </span>
          <button
            className="guided-review__next"
            onClick={() => setStep(Math.min(2, step + 1))}
            disabled={step === 2}
          >
            {step === 1 ? 'REVIEW METHOD' : 'NEXT'} →
          </button>
        </div>
      </div>
    </section>
  )
}
