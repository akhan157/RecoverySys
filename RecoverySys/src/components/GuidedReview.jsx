import React, { useState } from 'react'

const STEPS = [
  { id: 'scope', index: '01', label: 'RUN SCOPE' },
  { id: 'results', index: '02', label: 'RESULTS' },
  { id: 'method', index: '03', label: 'METHOD & ASSUMPTIONS' },
]

const resultGroups = [
  {
    label: 'FLIGHT OUTCOME',
    title: 'Will the recovery sequence complete?',
    summary: 'The representative run reaches apogee, deploys the drogue, then releases the main canopy.',
    status: 'REVIEWED',
    tone: 'good',
  },
  {
    label: 'LANDING WINDOW',
    title: 'Where might the vehicle land?',
    summary: 'The projected footprint is centered downrange. Wind direction is the largest visible driver in this run.',
    status: 'REVIEW NEEDED',
    tone: 'warn',
  },
  {
    label: 'HARDWARE LOADS',
    title: 'Are the recovery loads within the chosen hardware?',
    summary: 'The available run evidence supports a preliminary check, not a final structural sign-off.',
    status: 'LIMITED',
    tone: 'quiet',
  },
]

export default function GuidedReview({ onOpenSpecs }) {
  const [step, setStep] = useState(0)
  const [showMethod, setShowMethod] = useState(false)
  const current = STEPS[step]

  return (
    <section className="guided-review" aria-label="Guided review prototype">
      <div className="guided-review__rail">
        <div className="guided-review__eyebrow">TRANSPARENCY MODE / GUIDED REVIEW</div>
        <h2>Read this run<br /><em>with confidence.</em></h2>
        <p className="guided-review__intro">A short, ordered review of what this engineering run can tell you — and where it stops.</p>
        <ol className="guided-review__steps">
          {STEPS.map((item, index) => (
            <li key={item.id} className={index === step ? 'is-active' : index < step ? 'is-complete' : ''}>
              <button onClick={() => setStep(index)} aria-current={index === step ? 'step' : undefined}>
                <span>{item.index}</span>{item.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="guided-review__rail-note">REPRESENTATIVE RUN<br /><strong>RCS-24-071 / L2 RECOVERY</strong></div>
      </div>

      <div className="guided-review__content">
        <div className="guided-review__topline">
          <span>STEP {current.index} OF 03</span>
          <span className="guided-review__quiet">No calculations are changed in this view</span>
        </div>

        {step === 0 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">START HERE</div>
            <h3>What this run can answer</h3>
            <p className="guided-review__lede">This pass is useful for a first read of recovery timing, landing spread, and relative hardware demand.</p>
            <div className="guided-review__answer-grid">
              <article><span className="guided-review__number">01</span><h4>Sequence timing</h4><p>Does the planned drogue-to-main sequence occur in the intended order?</p></article>
              <article><span className="guided-review__number">02</span><h4>Landing tendency</h4><p>How does the current wind case shape the likely landing direction?</p></article>
              <article><span className="guided-review__number">03</span><h4>Load signal</h4><p>Is there an early warning that recovery hardware deserves a closer look?</p></article>
            </div>
            <div className="guided-review__callout guided-review__callout--info"><span>i</span><p><strong>Read this as a design review, not a flight guarantee.</strong> The run reflects the current inputs and a simplified atmosphere.</p></div>
          </div>
        )}

        {step === 1 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">THE SHORT VERSION</div>
            <h3>Review results by scope</h3>
            <p className="guided-review__lede">Start with the signal that matters to your decision. Open method details only when a result needs context.</p>
            <div className="guided-review__result-list">
              {resultGroups.map(group => <article className="guided-result" key={group.label}>
                <div className={`guided-result__status guided-result__status--${group.tone}`}>{group.status}</div>
                <div><div className="guided-review__kicker">{group.label}</div><h4>{group.title}</h4><p>{group.summary}</p></div>
                <button className="guided-result__action" onClick={() => setShowMethod(true)}>WHY?</button>
              </article>)}
            </div>
            {showMethod && <div className="guided-review__callout guided-review__callout--warn"><span>!</span><p><strong>Context needed.</strong> This result is most sensitive to wind profile, deployment timing, and the selected recovery hardware.</p></div>}
          </div>
        )}

        {step === 2 && (
          <div className="guided-review__page fade-up">
            <div className="guided-review__kicker">OPTIONAL DEEP DIVE</div>
            <h3>Method & assumptions</h3>
            <p className="guided-review__lede">Only open this layer when you need to explain a result to a teammate or challenge an input.</p>
            <div className="guided-review__method-list">
              <details open><summary>Atmosphere & wind <span>+ / −</span></summary><p>Uses a steady surface wind case with a simplified change in wind above the launch site. Gusts and terrain effects are not represented.</p></details>
              <details><summary>Deployment model <span>+ / −</span></summary><p>Deployment is represented as an idealized event at the configured altitude. Line stretch, packing behavior, and hardware timing are not modeled here.</p></details>
              <details><summary>Load interpretation <span>+ / −</span></summary><p>Load signals are comparative indicators for review. Confirm material ratings, attachment geometry, and field procedures separately.</p></details>
            </div>
            <button className="guided-review__text-link" onClick={onOpenSpecs}>Review the source inputs →</button>
          </div>
        )}

        <div className="guided-review__nav">
          <button className="guided-review__back" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>← BACK</button>
          <span>{step === 2 ? 'Deep review is optional' : 'Next: ' + STEPS[step + 1].label.toLowerCase()}</span>
          <button className="guided-review__next" onClick={() => setStep(Math.min(2, step + 1))} disabled={step === 2}>{step === 1 ? 'REVIEW METHOD' : 'NEXT'} →</button>
        </div>
      </div>
    </section>
  )
}
