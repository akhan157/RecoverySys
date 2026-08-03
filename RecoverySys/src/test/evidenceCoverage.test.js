import { describe, expect, it } from 'vitest'
import { evidenceCoverage, EVIDENCE_LEVEL } from '../lib/evidenceCoverage.js'

describe('evidence coverage', () => {
  it('does not treat review-only evidence as accepted coverage', () => {
    expect(
      evidenceCoverage(
        [{ id: 'review', domain: 'drift', kind: 'analytic', status: 'review' }],
        'drift'
      )
    ).toMatchObject({
      level: EVIDENCE_LEVEL.UNCOVERED,
      hasReviewOnlyEvidence: true,
    })
  })

  it('uses the strongest accepted evidence level for the requested domain only', () => {
    const result = evidenceCoverage(
      [
        { id: 'drift', domain: 'drift', kind: 'analytic', status: 'accepted-for-comparison' },
        { id: 'ascent', domain: 'ascent', kind: 'real-flight', status: 'accepted-for-comparison' },
      ],
      'drift'
    )
    expect(result).toMatchObject({ level: EVIDENCE_LEVEL.ANALYTIC, acceptedCaseIds: ['drift'] })
  })
})
