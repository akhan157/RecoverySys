import { useState } from 'react'
import { SPECS_SCHEMA } from '../../lib/schema.js'

const SECTIONS = [
  { id: 'inputs', label: '01 / INPUT REGISTER', note: 'user supplied values' },
  { id: 'ascent', label: '02 / ASCENT MODEL', note: 'vertical trajectory' },
  { id: 'descent', label: '03 / DESCENT MODEL', note: 'terminal velocity' },
  { id: 'drift', label: '04 / DRIFT MODEL', note: 'wind coupling' },
  { id: 'loads', label: '05 / LOADS & ENERGY', note: 'cord and opening shock' },
  { id: 'uncertainty', label: '06 / UNCERTAINTY', note: 'Monte Carlo treatment' },
]
const CAVEATS = {
  ascent: [
    [
      '1-DOF vertical trajectory',
      'No launch angle, weathercocking, or wind-induced trajectory tilt. A 5–10° rail angle can reduce apogee 2–5% and shift it downwind.',
    ],
    [
      'Generic Cd(M) curve',
      'Assumes a 4:1 ogive. A Von Karman 5:1 has ~15% less transonic drag; a blunt payload fairing has ~30% more.',
    ],
    [
      'APCP Isp = 195 s',
      'Used to estimate propellant mass when no .eng file is imported. Importing an .eng file bypasses this assumption.',
    ],
    [
      'No rail friction loss',
      'The sim starts at v=0 with full thrust, so marginal-thrust launches may have optimistic apogee.',
    ],
  ],
  descent: [
    [
      'Single terminal velocity per phase',
      'Transient acceleration after chute deployment is not modeled. This can mean 5–15% more drift than predicted, especially for short drogue phases.',
    ],
    [
      'Drogue sampled at one altitude',
      'Air density changes with altitude; the single-point average biases phase timing by ~5%.',
    ],
    [
      'Constant parachute Cd',
      'Oscillation and partial inflation are not modeled. The catalog Cd is the manufacturer’s ideal rated value.',
    ],
  ],
  drift: [
    [
      'Instant wind coupling',
      'No horizontal inertia. Matching wind instantly can slightly overestimate drift when wind direction changes sharply.',
    ],
    [
      'Linear 3-layer wind profile',
      'Real surface layers follow a logarithmic profile. Linear interpolation underestimates wind speed in the first ~300 ft AGL.',
    ],
  ],
  loads: [
    [
      'Static impulse model',
      'F = m × G × g₀. Real ejection is a pressure pulse; the G-factor approach can be off by ±30%.',
    ],
    [
      'Linear elastic cord model',
      'Nylon is nonlinear above ~10% strain. The strain-energy calculation is conservative for high-load events near cord failure.',
    ],
    [
      'Cx = 1.8 for all chute shapes',
      'A deployment bag and chute shape can change opening shock by about 30%; shape-specific data is not modeled.',
    ],
    [
      'Landing KE at deploy altitude',
      'Ground air is denser, so actual landing speed is 3–5% slower. The check is slightly conservative.',
    ],
  ],
  uncertainty: [
    [
      'Linear apogee perturbation',
      'Monte Carlo perturbs apogee × impulse / mass / Cd instead of re-integrating ascent. Nonlinear transonic thresholds are not captured.',
    ],
    [
      'Independent wind layers',
      'Real weather layers correlate. Independent perturbation slightly overpredicts the dispersion ellipse width.',
    ],
  ],
}
function EvidenceSection({ id, title, children }) {
  return (
    <section id={`method-${id}`} className="dossier-section">
      <div className="dossier-section__rule" />
      <h2>
        {title}
        <span>STATIC REFERENCE</span>
      </h2>
      {children}
    </section>
  )
}
export default function MethodDetailsTab({ state }) {
  const [active, setActive] = useState('inputs')
  const jumpTo = (id) => {
    setActive(id)
    document.getElementById(`method-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <div className="method-dossier">
      <header className="dossier-hero">
        <div>
          <div className="dossier-kicker">RECOVERYSYS / REFERENCE_SURFACE / MD-01</div>
          <h1>Technical method dossier</h1>
          <p>
            Readable evidence for the model behind the recovery estimate. Values below are observed
            from this configuration; explanatory material is static.
          </p>
        </div>
        <div className="dossier-stamp">
          <strong>MODEL STATUS</strong>
          <span>DOCUMENTED / NOT VALIDATED</span>
        </div>
      </header>
      <div className="dossier-layout">
        <aside className="dossier-nav" aria-label="Dossier sections">
          <label htmlFor="dossier-select">SECTION INDEX</label>
          <select id="dossier-select" value={active} onChange={(e) => jumpTo(e.target.value)}>
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <nav>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                className={active === s.id ? 'is-active' : ''}
                onClick={() => jumpTo(s.id)}
              >
                <b>{s.label}</b>
                <small>{s.note}</small>
              </button>
            ))}
          </nav>
          <div className="dossier-nav__note">
            READING ORDER
            <br />
            <span>Inputs → assumptions → limits</span>
          </div>
        </aside>
        <div className="dossier-content">
          <EvidenceSection id="inputs" title="Input register">
            <p className="dossier-lede">
              The current run boundary. Blank values remain blank; defaults are not silently
              presented as measurements.
            </p>
            <div className="dossier-table-wrap">
              <table className="dossier-table">
                <thead>
                  <tr>
                    <th>PARAMETER</th>
                    <th>CURRENT</th>
                    <th>DEFAULT</th>
                    <th>UNIT</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(SPECS_SCHEMA).map(([key, field]) => (
                    <tr key={key}>
                      <th>
                        {field.label}
                        <small>{key}</small>
                      </th>
                      <td className={state.specs[key] ? 'has-value' : 'is-blank'}>
                        {state.specs[key] || '— blank —'}
                      </td>
                      <td>{field.default || '—'}</td>
                      <td>{field.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="dossier-details">
              <summary>How to read this register</summary>
              <p>
                Current values are the inputs held by the active session. Defaults are schema values
                used when a new configuration is created. This surface does not alter either set.
              </p>
            </details>
          </EvidenceSection>
          {['ascent', 'descent', 'drift', 'loads', 'uncertainty'].map((id, i) => (
            <EvidenceSection key={id} id={id} title={SECTIONS[i + 1].label.replace(/^\d+ \/ /, '')}>
              <div className="evidence-list">
                {CAVEATS[id].map(([title, copy]) => (
                  <details key={title} className="evidence-item">
                    <summary>
                      <span className="evidence-marker">{id.slice(0, 2).toUpperCase()}</span>
                      <strong>{title}</strong>
                      <em>ASSUMPTION</em>
                    </summary>
                    <p>{copy}</p>
                  </details>
                ))}
              </div>
            </EvidenceSection>
          ))}
        </div>
      </div>
    </div>
  )
}
