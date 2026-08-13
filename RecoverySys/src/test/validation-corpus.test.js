import { describe, expect, it } from 'vitest'
import { validateCorpus } from '../../scripts/validate-corpus.js'

describe('validation corpus gate', () => {
  it('validates the checked-in corpus and production model identity', () => {
    expect(validateCorpus()).toMatchObject({ valid: true, diagnostics: [], cases: 14 })
  })

  it('reports deterministic output-domain coverage without promoting review cases', () => {
    const result = validateCorpus()
    expect(validateCorpus()).toEqual(result)

    expect(result.domainCoverage).toEqual([
      {
        domain: 'ascent',
        caseCount: 1,
        caseIds: ['ascent-apogee-scalar-2kg-2000ns'],
        outputMetrics: ['apogee_ft', 'apogee_t_s', 'burnout_t_s'],
        statusCounts: {
          draft: 0,
          review: 1,
          'accepted-for-comparison': 0,
          superseded: 0,
          rejected: 0,
        },
        acceptedCaseIds: [],
        unreviewedCaseIds: ['ascent-apogee-scalar-2kg-2000ns'],
      },
      {
        domain: 'atmosphere',
        caseCount: 2,
        caseIds: ['isa-density-5000m', 'isa-density-sea-level'],
        outputMetrics: ['density_kg_m3'],
        statusCounts: {
          draft: 0,
          review: 2,
          'accepted-for-comparison': 0,
          superseded: 0,
          rejected: 0,
        },
        acceptedCaseIds: [],
        unreviewedCaseIds: ['isa-density-5000m', 'isa-density-sea-level'],
      },
      {
        domain: 'descent',
        caseCount: 6,
        caseIds: [
          'recovery-descent-main-2kg-500ft',
          'terminal-descent-36in-main-sea-level',
          'terminal-descent-altitude-ft-unit-conversion',
          'terminal-descent-diameter-doubling-metamorphic',
          'terminal-descent-invalid-chute-edge',
          'terminal-descent-mass-doubling-metamorphic',
        ],
        outputMetrics: ['descent_rate_fps', 'descent_rate_ratio'],
        statusCounts: {
          draft: 0,
          review: 6,
          'accepted-for-comparison': 0,
          superseded: 0,
          rejected: 0,
        },
        acceptedCaseIds: [],
        unreviewedCaseIds: [
          'recovery-descent-main-2kg-500ft',
          'terminal-descent-36in-main-sea-level',
          'terminal-descent-altitude-ft-unit-conversion',
          'terminal-descent-diameter-doubling-metamorphic',
          'terminal-descent-invalid-chute-edge',
          'terminal-descent-mass-doubling-metamorphic',
        ],
      },
      {
        domain: 'drift',
        caseCount: 1,
        caseIds: ['layered-wind-linear-interpolation-drift'],
        outputMetrics: ['bearing_deg', 'drift_ft'],
        statusCounts: {
          draft: 0,
          review: 1,
          'accepted-for-comparison': 0,
          superseded: 0,
          rejected: 0,
        },
        acceptedCaseIds: [],
        unreviewedCaseIds: ['layered-wind-linear-interpolation-drift'],
      },
      {
        domain: 'end-to-end',
        caseCount: 2,
        caseIds: ['end-to-end-curve-2kg-main-500ft', 'end-to-end-scalar-2kg-main-500ft'],
        outputMetrics: [
          'apogee_ft',
          'apogee_t_s',
          'burnout_t_s',
          'deploy_ft',
          'landing_ke_ftlbf',
          'total_time_s',
        ],
        statusCounts: {
          draft: 0,
          review: 2,
          'accepted-for-comparison': 0,
          superseded: 0,
          rejected: 0,
        },
        acceptedCaseIds: [],
        unreviewedCaseIds: ['end-to-end-curve-2kg-main-500ft', 'end-to-end-scalar-2kg-main-500ft'],
      },
      {
        domain: 'landing-energy',
        caseCount: 1,
        caseIds: ['landing-energy-36in-main-sea-level'],
        outputMetrics: ['landing_ke_ftlbf'],
        statusCounts: {
          draft: 0,
          review: 1,
          'accepted-for-comparison': 0,
          superseded: 0,
          rejected: 0,
        },
        acceptedCaseIds: [],
        unreviewedCaseIds: ['landing-energy-36in-main-sea-level'],
      },
      {
        domain: 'shock-load',
        caseCount: 1,
        caseIds: ['static-ejection-load-nylon-screening'],
        outputMetrics: ['peak_load_lbs', 'safety_factor', 'strain_energy_J'],
        statusCounts: {
          draft: 0,
          review: 1,
          'accepted-for-comparison': 0,
          superseded: 0,
          rejected: 0,
        },
        acceptedCaseIds: [],
        unreviewedCaseIds: ['static-ejection-load-nylon-screening'],
      },
    ])
  })

  it('emits deterministic per-case summaries with observed values and review-only posture', () => {
    const result = validateCorpus()
    expect(validateCorpus()).toEqual(result) // deterministic across two consecutive runs

    expect(result.caseSummaries).toHaveLength(14)
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
