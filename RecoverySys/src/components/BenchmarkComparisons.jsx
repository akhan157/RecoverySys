import { getBenchmarkComparisons } from '../lib/benchmarkComparisons.js'

const format = (number) => Number(number.toPrecision(7)).toString()

export default function BenchmarkComparisons() {
  const comparisons = getBenchmarkComparisons()
  return (
    <details className="mc-confidence__details">
      <summary>Model benchmark comparisons</summary>
      <p>
        These fixed examples compare the current model with analytic calculations, not with your
        particular flight. All are awaiting independent review; no accepted comparison or
        real-flight cases are available.
      </p>
      {comparisons.length === 0 ? (
        <p>Benchmark comparisons are unavailable.</p>
      ) : (
        <ul className="mc-confidence__reasons">
          {comparisons.map((row) => (
            <li key={row.id}>
              <strong>{row.label}</strong> — model {format(row.observed)} {row.unit}; reference{' '}
              {format(row.reference)} {row.unit}; difference{' '}
              {row.percent === null
                ? `${format(row.difference)} ${row.unit}`
                : `${row.percent >= 0 ? '+' : ''}${row.percent.toFixed(4)}%`}
              . {row.status === 'review' ? 'Review only.' : `Status: ${row.status}.`}
            </li>
          ))}
        </ul>
      )}
      {comparisons.length > 0 && comparisons.length < 3 && (
        <p>Some benchmark comparisons are unavailable.</p>
      )}
      <p>
        Shared equations and assumed inputs limit these comparisons. They do not measure flight
        accuracy, uncertainty, or safety.
      </p>
    </details>
  )
}
