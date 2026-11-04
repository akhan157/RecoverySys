import { describe, expect, it } from 'vitest'
import { buildBenchmarkReport } from '../../scripts/report-benchmarks.js'

const corpus = {
  valid: true,
  domainCoverage: [],
  caseSummaries: [
    { id: 'case', status: 'review', metrics: [{ name: 'speed', unit: 'ft/s', observed: 12 }] },
  ],
}

describe('benchmark report', () => {
  it('compares actual model output with the separate reference and preserves review status', () => {
    const result = buildBenchmarkReport(corpus, {
      cases: [{ case: 'case', unit: 'ft/s', reference: 10 }],
    })
    expect(result.analyticComparisons[0]).toMatchObject({
      observed: 12,
      reference: 10,
      difference: 2,
      relativeDifferencePercent: 20,
      status: 'review',
    })
  })

  it('does not invent a percentage for zero references and rejects mismatched units', () => {
    expect(
      buildBenchmarkReport(corpus, { cases: [{ case: 'case', unit: 'ft/s', reference: 0 }] })
        .analyticComparisons[0].relativeDifferencePercent
    ).toBeNull()
    expect(() =>
      buildBenchmarkReport(corpus, { cases: [{ case: 'case', unit: 'm/s', reference: 10 }] })
    ).toThrow('Unit mismatch')
  })
})
