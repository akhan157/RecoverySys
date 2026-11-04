import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import BenchmarkComparisons from '../components/BenchmarkComparisons.jsx'
import { getBenchmarkComparisons } from '../lib/benchmarkComparisons.js'

describe('model benchmark comparisons', () => {
  it('compares current results to the fixed analytic references', () => {
    const rows = getBenchmarkComparisons()
    expect(rows).toHaveLength(3)
    expect(rows[0].observed).toBeCloseTo(1.2249781262, 9)
    expect(rows[0].reference).toBeCloseTo(1.2250000181, 9)
    expect(rows[0].percent).toBeCloseTo(-0.001787, 6)
    expect(rows.every((row) => row.status === 'review')).toBe(true)
  })

  it('makes the evidence limits visible alongside the results', () => {
    render(<BenchmarkComparisons />)
    expect(screen.getByText(/no accepted comparison or real-flight cases/i)).toBeInTheDocument()
    expect(screen.getByText(/do not measure flight accuracy/i)).toBeInTheDocument()
    expect(screen.getByText(/Terminal descent at sea level/)).toBeInTheDocument()
  })
})
