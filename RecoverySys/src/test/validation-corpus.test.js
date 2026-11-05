import { describe, expect, it } from 'vitest'
import { validateCorpus } from '../../scripts/validate-corpus.js'

describe('validation corpus gate', () => {
  it('validates the checked-in corpus and production model identity', () => {
    expect(validateCorpus()).toMatchObject({ valid: true, diagnostics: [], cases: 21 })
  })

  it('reports deterministic output-domain coverage without promoting review cases', () => {
    const result = validateCorpus()
    expect(validateCorpus()).toEqual(result)

    expect(result.domainCoverage.map(({ domain, caseCount }) => ({ domain, caseCount }))).toEqual([
      { domain: 'ascent', caseCount: 3 },
      { domain: 'atmosphere', caseCount: 3 },
      { domain: 'descent', caseCount: 7 },
      { domain: 'dispersion', caseCount: 1 },
      { domain: 'drift', caseCount: 3 },
      { domain: 'end-to-end', caseCount: 2 },
      { domain: 'landing-energy', caseCount: 1 },
      { domain: 'shock-load', caseCount: 1 },
    ])
    for (const domain of result.domainCoverage) {
      expect(domain.acceptedCaseIds).toEqual([])
      expect(domain.statusCounts.review).toBe(domain.caseCount)
      expect(domain.unreviewedCaseIds).toEqual(domain.caseIds)
      expect(domain.outputMetrics.length).toBeGreaterThan(0)
    }
    const byId = new Map(result.caseSummaries.map((entry) => [entry.id, entry]))
    for (const id of [
      'isa-density-11000m',
      'terminal-descent-cd-quadrupling-metamorphic',
      'constant-wind-drift-east-1000ft',
      'constant-wind-drift-west-1000ft',
      'ascent-insufficient-thrust-edge',
      'ascent-drag-increase-metamorphic',
      'seeded-dispersion-repeatability',
    ]) {
      const summary = byId.get(id)
      expect(summary.status).toBe('review')
      expect(summary.metrics.every((metric) => metric.pass)).toBe(true)
    }
  })

  it('emits deterministic per-case summaries with observed values and review-only posture', () => {
    const result = validateCorpus()
    expect(validateCorpus()).toEqual(result) // deterministic across two consecutive runs

    expect(result.caseSummaries).toHaveLength(21)
    const byId = new Map(result.caseSummaries.map((summary) => [summary.id, summary]))
    expect([...byId.keys()].sort()).toEqual(
      [...result.domainCoverage.flatMap((d) => d.caseIds)].sort()
    )

    for (const summary of result.caseSummaries) {
      expect(summary).toMatchObject({
        id: expect.any(String),
        file: expect.stringMatching(/\.json$/),
        domain: expect.any(String),
        kind: expect.stringMatching(/^(analytic|trusted-simulator|real-flight|metamorphic)$/),
        status: expect.stringMatching(
          /^(draft|review|accepted-for-comparison|superseded|rejected)$/
        ),
        model: {
          id: expect.any(String),
          version: expect.any(String),
          assumptionsVersion: expect.any(String),
        },
      })
      expect(summary.metrics.length).toBeGreaterThan(0)
      for (const metric of summary.metrics) {
        expect(Number.isFinite(metric.observed), `${summary.id}/${metric.name} observed`).toBe(true)
        expect(Number.isFinite(metric.difference), `${summary.id}/${metric.name} difference`).toBe(
          true
        )
        expect(metric.tolerance).toMatchObject({
          basis: expect.any(String),
        })
        // Review cases report structure and reproducibility but never gate agreement.
        expect(metric.gatesAgreement).toBe(false)
      }
    }

    // The corpus contains no accepted-for-comparison or real-flight cases.
    expect(result.caseSummaries.every((s) => s.status === 'review')).toBe(true)
    expect(result.caseSummaries.every((s) => s.kind !== 'real-flight')).toBe(true)
    expect(result.caseSummaries.some((s) => s.kind === 'metamorphic')).toBe(true)
  })
})
