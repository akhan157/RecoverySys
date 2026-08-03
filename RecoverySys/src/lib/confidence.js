import { evidenceIsSupported } from './evidenceCoverage.js'
import { ENVELOPE_STATUS } from './missionEnvelope.js'

export const CONFIDENCE_STATE = Object.freeze({
  SUPPORTED: 'supported',
  CONDITIONAL: 'conditional',
  SENSITIVITY_FLAGGED: 'sensitivity-flagged',
  INSUFFICIENT: 'insufficient-confidence',
})

export function evaluateConfidence({
  fresh = false,
  envelope = { status: ENVELOPE_STATUS.OUT_OF_SCOPE, reasons: [] },
  coverage,
  sensitivity = { flagged: false, reasons: [] },
} = {}) {
  if (!fresh) {
    return {
      state: CONFIDENCE_STATE.INSUFFICIENT,
      reasons: ['RESULT_STALE_OR_MISSING'],
      evidenceCaseIds: coverage?.caseIds ?? [],
    }
  }
  if (envelope.status === ENVELOPE_STATUS.OUT_OF_SCOPE) {
    return {
      state: CONFIDENCE_STATE.INSUFFICIENT,
      reasons: envelope.reasons.map(({ code }) => code),
      evidenceCaseIds: coverage?.caseIds ?? [],
    }
  }
  if (!evidenceIsSupported(coverage)) {
    return {
      state: CONFIDENCE_STATE.INSUFFICIENT,
      reasons: [
        'NO_ACCEPTED_APPLICABLE_EVIDENCE',
        ...(envelope.reasons ?? []).map(({ code }) => code),
      ],
      evidenceCaseIds: coverage?.caseIds ?? [],
    }
  }
  if (sensitivity.flagged) {
    return {
      state: CONFIDENCE_STATE.SENSITIVITY_FLAGGED,
      reasons: sensitivity.reasons ?? [],
      evidenceCaseIds: coverage.caseIds,
    }
  }
  if (envelope.status === ENVELOPE_STATUS.CONDITIONAL || coverage.hasReviewOnlyEvidence) {
    return {
      state: CONFIDENCE_STATE.CONDITIONAL,
      reasons: [...(envelope.reasons ?? []).map(({ code }) => code), 'CONDITIONAL_EVIDENCE_SCOPE'],
      evidenceCaseIds: coverage.caseIds,
    }
  }
  return {
    state: CONFIDENCE_STATE.SUPPORTED,
    reasons: [],
    evidenceCaseIds: coverage.caseIds,
  }
}
