import { describe, expect, it } from 'vitest'
import { validateCorpus } from '../../scripts/validate-corpus.js'

describe('validation corpus gate', () => {
  it('validates the checked-in corpus and production model identity', () => {
    expect(validateCorpus()).toMatchObject({ valid: true, diagnostics: [], cases: 6 })
  })

  it('reports deterministic output-domain coverage without promoting review cases', () => {
    const result = validateCorpus()
    expect(validateCorpus()).toEqual(result)

    expect(result.domainCoverage).toEqual([
      {
        domain: 'atmosphere',
        caseCount: 2,
        caseIds: ['isa-density-5000m', 'isa-density-sea-level'],
        outputMetrics: ['density_kg_m3'],
        statusCounts: { draft: 0, review: 2, 'accepted-for-comparison': 0, superseded: 0, rejected: 0 },
        acceptedCaseIds: [],
        unreviewedCaseIds: ['isa-density-5000m', 'isa-density-sea-level'],
      },
      {
        domain: 'descent',
        caseCount: 1,
        caseIds: ['terminal-descent-36in-main-sea-level'],
        outputMetrics: ['descent_rate_fps'],
        statusCounts: { draft: 0, review: 1, 'accepted-for-comparison': 0, superseded: 0, rejected: 0 },
        acceptedCaseIds: [],
        unreviewedCaseIds: ['terminal-descent-36in-main-sea-level'],
      },
      {
        domain: 'drift',
        caseCount: 1,
        caseIds: ['layered-wind-linear-interpolation-drift'],
        outputMetrics: ['bearing_deg', 'drift_ft'],
        statusCounts: { draft: 0, review: 1, 'accepted-for-comparison': 0, superseded: 0, rejected: 0 },
        acceptedCaseIds: [],
        unreviewedCaseIds: ['layered-wind-linear-interpolation-drift'],
      },
      {
        domain: 'landing-energy',
        caseCount: 1,
        caseIds: ['landing-energy-36in-main-sea-level'],
        outputMetrics: ['landing_ke_ftlbf'],
        statusCounts: { draft: 0, review: 1, 'accepted-for-comparison': 0, superseded: 0, rejected: 0 },
        acceptedCaseIds: [],
        unreviewedCaseIds: ['landing-energy-36in-main-sea-level'],
      },
      {
        domain: 'shock-load',
        caseCount: 1,
        caseIds: ['static-ejection-load-nylon-screening'],
        outputMetrics: ['peak_load_lbs', 'safety_factor', 'strain_energy_J'],
        statusCounts: { draft: 0, review: 1, 'accepted-for-comparison': 0, superseded: 0, rejected: 0 },
        acceptedCaseIds: [],
        unreviewedCaseIds: ['static-ejection-load-nylon-screening'],
      },
    ])
  })
})
