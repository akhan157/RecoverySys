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

function responseRange(result, outputKey) {
  const ranges = result.rows.map((row) => row.ranges?.[outputKey]).filter(Boolean)
  if (!ranges.length) return null
  return {
    min: Math.min(...ranges.map((range) => range.min)),
    max: Math.max(...ranges.map((range) => range.max)),
    testedInputs: ranges.length,
  }
}

export default function SensitivityPanel({
  specs,
  config,
  customMotor,
  resultFresh = true,
  result: providedResult = null,
}) {
  const result = useMemo(() => {
    if (providedResult) return providedResult
    if (!resultFresh) {
      return {
        status: 'stale',
        reason:
          'Sensitivity is hidden until the base simulation is current. Rerun simulation first.',
        rows: [],
      }
    }
    return runSensitivity({ specs, config, customMotor })
  }, [providedResult, specs, config, customMotor, resultFresh])
  return (
    <section
      className="mc-analysis__section mc-analysis__section--wide mc-sensitivity"
      aria-labelledby="sensitivity-title"
    >
      <div className="mc-panel-header" id="sensitivity-title">
        TESTED MODEL RESPONSE // ONE-AT-A-TIME
      </div>
      {result.status !== 'complete' ? (
        <div className="mc-sensitivity__empty">{result.reason}</div>
      ) : (
        <>
          <p className="mc-sensitivity__intro">
            Each input is varied separately around the current plan. These ranges describe model
            response only—not probability, accuracy, or a confidence interval.
          </p>
          <div className="mc-sensitivity__outputs" aria-label="Tested response by output">
            {OUTPUTS.map(([key, label, unit]) => {
              const range = responseRange(result, key)
              return (
                <section
                  className="mc-sensitivity__output"
                  key={key}
                  aria-labelledby={`sensitivity-${key}`}
                >
                  <h3 id={`sensitivity-${key}`}>{label}</h3>
                  <span className="mc-sensitivity__unit">{unit}</span>
                  <strong className="mc-sensitivity__output-range">{rangeText(range, unit)}</strong>
                  <span className="mc-sensitivity__output-note">
                    {range
                      ? `Across ${range.testedInputs} tested input variations`
                      : 'No tested response is available for this output.'}
                  </span>
                </section>
              )
            })}
          </div>
          <details className="mc-sensitivity__details">
            <summary>TESTED INPUTS / INVALID VARIANTS</summary>
            <div className="mc-sensitivity__detail-grid">
              {result.rows.map((row) => (
                <div key={row.key}>
                  <strong>{row.label}</strong>
                  <span>
                    {row.status === 'unavailable'
                      ? row.reason
                      : `${row.description || 'One-at-a-time variation'} ${row.variants?.length ? `(${row.variants.length} variants tested)` : ''}`}
                  </span>
                  {row.reason && <em>{row.reason}</em>}
                </div>
              ))}
            </div>
          </details>
          <p className="mc-sensitivity__boundary">
            These model responses are estimates. They are not measured confidence intervals and do
            not establish safety, approval, certification, or launch readiness.
          </p>
        </>
      )}
    </section>
  )
}
