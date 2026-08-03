import { useMemo } from 'react'
import { runSensitivity } from '../lib/sensitivity.js'

const OUTPUTS = [
  ['apogee_ft', 'Apogee', 'ft'],
  ['drift_ft', 'Drift', 'ft'],
  ['main_fps', 'Main descent', 'ft/s'],
  ['landing_ke_ftlbf', 'Landing energy', 'ft-lbf'],
]

function format(value) {
  return value == null ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function rangeText(range, unit) {
  return range ? `${format(range.min)}–${format(range.max)} ${unit}` : 'Not available'
}

export default function SensitivityPanel({ specs, config, customMotor }) {
  const result = useMemo(
    () => runSensitivity({ specs, config, customMotor }),
    [specs, config, customMotor]
  )

  return (
    <section
      className="mc-analysis__section mc-analysis__section--wide mc-sensitivity"
      aria-labelledby="sensitivity-title"
    >
      <div className="mc-panel-header" id="sensitivity-title">
        SENSITIVITY // ONE-AT-A-TIME
      </div>
      {result.status !== 'complete' ? (
        <div className="mc-sensitivity__empty">{result.reason}</div>
      ) : (
        <>
          <p className="mc-sensitivity__intro">
            Each input is varied separately around the current plan. These ranges show model
            response, not probability, accuracy, or a confidence interval.
          </p>
          <div className="mc-sensitivity__influence" aria-label="Most influential tested inputs">
            <strong>INFLUENTIAL_INPUTS</strong>
            <span>
              {result.influentialInputs
                .slice(0, 3)
                .map(({ label }) => label)
                .join(' · ')}
            </span>
          </div>
          <div className="mc-sensitivity__table-wrap">
            <table className="mc-sensitivity__table">
              <caption className="sr-only">Tested sensitivity ranges</caption>
              <thead>
                <tr>
                  <th scope="col">Input</th>
                  <th scope="col">Tested range</th>
                  {OUTPUTS.slice(0, 2).map(([, label]) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">{row.label}</th>
                    <td>{row.status === 'unavailable' ? row.reason : row.description}</td>
                    {OUTPUTS.slice(0, 2).map(([key, , unit]) => (
                      <td key={key}>{rangeText(row.ranges?.[key], unit)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="mc-sensitivity__details">
            <summary>OUTPUTS / INVALID VARIANTS</summary>
            <div className="mc-sensitivity__detail-grid">
              {result.rows.map((row) => (
                <div key={row.key}>
                  <strong>{row.label}</strong>
                  <span>
                    {OUTPUTS.map(
                      ([key, label, unit]) => `${label}: ${rangeText(row.ranges?.[key], unit)}`
                    ).join(' · ')}
                  </span>
                  {row.reason && <em>{row.reason}</em>}
                  {row.variants.some(({ valid }) => !valid) && (
                    <em>Some tested variants are outside the simulation result envelope.</em>
                  )}
                </div>
              ))}
            </div>
          </details>
          <p className="mc-sensitivity__boundary">
            Dispersion and sensitivity results are estimates from this model. They are not measured
            confidence intervals and do not establish safety, approval, certification, or launch
            readiness.
          </p>
        </>
      )}
    </section>
  )
}
