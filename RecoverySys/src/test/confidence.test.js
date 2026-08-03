import { describe, expect, it } from 'vitest'
import { CONFIDENCE_STATE, evaluateConfidence } from '../lib/confidence.js'
import { EVIDENCE_LEVEL } from '../lib/evidenceCoverage.js'
import { ENVELOPE_STATUS } from '../lib/missionEnvelope.js'

const coverage = {
  level: EVIDENCE_LEVEL.ANALYTIC,
  caseIds: ['case-1'],
  hasReviewOnlyEvidence: false,
}
const inScope = { status: ENVELOPE_STATUS.IN_SCOPE, reasons: [] }

describe('confidence evaluator', () => {
  it('never permits a stale or missing result to be supported', () => {
    expect(evaluateConfidence({ fresh: false, envelope: inScope, coverage }).state).toBe(
      CONFIDENCE_STATE.INSUFFICIENT
    )
  })

  it('never permits out-of-scope inputs to be supported', () => {
    const result = evaluateConfidence({
      fresh: true,
      coverage,
      envelope: { status: ENVELOPE_STATUS.OUT_OF_SCOPE, reasons: [{ code: 'MISSING_MASS' }] },
    })
    expect(result).toMatchObject({
      state: CONFIDENCE_STATE.INSUFFICIENT,
      reasons: ['MISSING_MASS'],
    })
  })

  it('requires accepted applicable evidence before it can support an output', () => {
    expect(
      evaluateConfidence({
        fresh: true,
        envelope: inScope,
        coverage: { level: EVIDENCE_LEVEL.UNCOVERED, caseIds: [], hasReviewOnlyEvidence: true },
      }).state
    ).toBe(CONFIDENCE_STATE.INSUFFICIENT)
  })

  it('prioritizes sensitivity flags above otherwise applicable evidence', () => {
    expect(
      evaluateConfidence({
        fresh: true,
        envelope: inScope,
        coverage,
        sensitivity: { flagged: true, reasons: ['WIND_VARIATION_CHANGES_DRIFT'] },
      })
    ).toMatchObject({ state: CONFIDENCE_STATE.SENSITIVITY_FLAGGED })
  })

  it('uses conditional when evidence or assumptions have a limited scope', () => {
    expect(
      evaluateConfidence({
        fresh: true,
        coverage: { ...coverage, hasReviewOnlyEvidence: true },
        envelope: inScope,
      }).state
    ).toBe(CONFIDENCE_STATE.CONDITIONAL)
  })

  it('only emits supported after all higher-priority checks pass', () => {
    expect(evaluateConfidence({ fresh: true, envelope: inScope, coverage }).state).toBe(
      CONFIDENCE_STATE.SUPPORTED
    )
  })
})
