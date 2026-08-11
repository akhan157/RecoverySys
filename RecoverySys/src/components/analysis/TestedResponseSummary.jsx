import SectionLabel from '../primitives/SectionLabel.jsx'
import StatusChip from '../primitives/StatusChip.jsx'
import './AnalysisPrimitives.css'

function normalizeOutputs(response) {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.outputs)) return response.outputs
  if (Array.isArray(response?.ranges)) return response.ranges
  return []
}

function formatValue(value, unit) {
  if (value == null || value === '') return 'Not evaluated'
  if (typeof value === 'object') {
    if (value.value != null) return formatValue(value.value, value.unit ?? unit)
    return value.label ?? value.name ?? 'Not evaluated'
  }
  return `${value}${unit ? ` ${unit}` : ''}`
}

function formatRange(output) {
  const range = output.range && typeof output.range === 'object' ? output.range : output
  const unit = output.unit ?? range.unit
  const min = range.min ?? range.minimum
  const max = range.max ?? range.maximum
  if (min == null && max == null) return 'Not evaluated'
  if (min == null) return `≤ ${formatValue(max, unit)}`
  if (max == null) return `≥ ${formatValue(min, unit)}`
  return `${formatValue(min, unit)} to ${formatValue(max, unit)}`
}

function outputState(output) {
  const raw = String(output.state ?? (output.evaluated === false ? 'not-evaluated' : 'evaluated'))
    .trim()
    .toLowerCase()
    .replace(/[_ ]+/g, '-')
  if (raw === 'out-of-scope' || raw === 'unusable')
    return { label: 'Out of scope', status: 'neutral' }
  if (raw === 'not-evaluated' || raw === 'unknown' || raw === 'unavailable') {
    return { label: 'Not evaluated', status: 'neutral' }
  }
  return { label: 'Evaluated', status: 'ok' }
}

function outputCrossing(output) {
  return Boolean(output.criterionCrossing ?? output.criterion_crossing ?? output.crossedCriterion)
}

export default function TestedResponseSummary({
  response,
  testedResponse,
  title = 'Tested model response',
}) {
  const source = testedResponse ?? response ?? {}
  const outputs = normalizeOutputs(source)

  return (
    <section className="analysis-tested-response" aria-label="Tested model response">
      <div className="analysis-tested-response__header">
        <SectionLabel>{title}</SectionLabel>
        {source.identity && <StatusChip status="neutral" label={String(source.identity)} />}
      </div>
      <p className="analysis-tested-response__intro">
        Per-output ranges show tested model response only. They are not probabilities or confidence
        intervals.
      </p>

      {outputs.length === 0 ? (
        <p className="analysis-tested-response__empty">No tested model response is available.</p>
      ) : (
        <div className="analysis-tested-response__table-wrap">
          <table className="analysis-tested-response__table">
            <caption className="analysis-visually-hidden">Tested model response by output</caption>
            <thead>
              <tr>
                <th scope="col">Output</th>
                <th scope="col">Baseline</th>
                <th scope="col">Tested range</th>
                <th scope="col">Evaluation</th>
              </tr>
            </thead>
            <tbody>
              {outputs.map((output, index) => {
                const state = outputState(output)
                const label = output.label ?? output.output ?? output.id ?? `Output ${index + 1}`
                const unit = output.unit
                const crossing = outputCrossing(output)
                return (
                  <tr key={output.id ?? output.key ?? `${label}-${index}`}>
                    <th scope="row">{label}</th>
                    <td>{formatValue(output.baseline ?? output.value, unit)}</td>
                    <td>
                      {formatRange(output)}
                      {output.delta != null && (
                        <span className="analysis-tested-response__criterion">
                          Change: {formatValue(output.delta, unit)}
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusChip
                        status={crossing ? 'warn' : state.status}
                        label={crossing ? 'Criterion exceeded' : state.label}
                      />
                      {(output.criterion || output.note || !crossing) && (
                        <span className="analysis-tested-response__criterion">
                          {output.criterion ??
                            output.note ??
                            'No reviewed decision criterion is attached to this range.'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export { formatRange, normalizeOutputs, outputState }
