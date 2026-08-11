import { ENVELOPE_STATUS } from './missionEnvelope.js'

export const ASSESSMENT_STATUS = Object.freeze({
  CURRENT: 'current',
  STALE: 'stale',
  NOT_EVALUATED: 'not-evaluated',
})

export const VALIDITY = Object.freeze({
  VALID: 'valid',
  INVALID: 'invalid',
  NOT_EVALUATED: 'not-evaluated',
})

export const EVIDENCE_STATE = Object.freeze({
  SUPPORTED: 'supported',
  CONDITIONAL: 'conditional',
  UNAVAILABLE: 'unavailable',
  NOT_EVALUATED: 'not-evaluated',
})
export const RESULT_REASON_CODES = Object.freeze({
  NO_CURRENT_RESULT: 'NO_CURRENT_RESULT',
  RESULT_STALE: 'RESULT_STALE',
  CURRENT_RESULT: 'CURRENT_RESULT',
})

export const RESULT_ACTION_DESTINATIONS = Object.freeze({
  SIMULATION: 'SIMULATION',
  ANALYSIS: 'ANALYSIS',
})

/**
 * Authored result-status semantics shared by review, brief, and artifact
 * surfaces. Consumers should reuse these codes, destinations, and copy rather
 * than inventing a surface-specific stale/missing interpretation.
 */
export const RESULT_STATUS_DETAILS = Object.freeze({
  'not-run': Object.freeze({
    reasonCode: RESULT_REASON_CODES.NO_CURRENT_RESULT,
    reason: 'No simulation result is available for review.',
    summary: 'No current simulation result is available yet.',
    nextAction: 'Run a simulation before interpreting estimates.',
    actionDestination: RESULT_ACTION_DESTINATIONS.SIMULATION,
    remediation: 'Run a simulation before interpreting derived recovery estimates.',
  }),
  stale: Object.freeze({
    reasonCode: RESULT_REASON_CODES.RESULT_STALE,
    reason: 'The stored result no longer matches the active inputs or model identity.',
    summary:
      'Current result is stale because inputs or selected hardware changed. Rerun the simulation.',
    nextAction: 'Rerun the simulation before interpreting estimates.',
    actionDestination: RESULT_ACTION_DESTINATIONS.SIMULATION,
    remediation: 'Rerun the simulation before using current results.',
  }),
  current: Object.freeze({
    reasonCode: RESULT_REASON_CODES.CURRENT_RESULT,
    reason: 'The current simulation result is available for review.',
    summary: 'This is a planning estimate, not a safety approval or certification.',
    nextAction: 'Review prioritized findings and supporting detail.',
    actionDestination: RESULT_ACTION_DESTINATIONS.ANALYSIS,
    remediation: null,
  }),
})

export function currentResultOrNull(result, fresh) {
  return result && fresh ? result : null
}

const uniqueStrings = (values) => [
  ...new Set((Array.isArray(values) ? values : values == null ? [] : [values]).filter(Boolean)),
]

const normalizeMethod = (method, methodVersion) => {
  if (method && typeof method === 'object') {
    return {
      id: method.id ?? method.name ?? null,
      version: method.version ?? methodVersion ?? null,
    }
  }
  return { id: method ?? null, version: methodVersion ?? null }
}

const normalizePolicy = (policy, policyVersion) => {
  if (policy && typeof policy === 'object') {
    return {
      id: policy.id ?? policy.name ?? null,
      version: policy.version ?? policyVersion ?? null,
    }
  }
  return { id: policy ?? null, version: policyVersion ?? null }
}

/**
 * Build the screen-independent contract for one displayed estimate.
 *
 * A missing value is deliberately represented as not-evaluated rather than a
 * positive or neutral result. `fresh` is only meaningful for evaluated data;
 * this keeps stale and unavailable states distinct for every consuming surface.
 */
export function buildAssessment({
  domain,
  output,
  outputId = output,
  value = null,
  unit = null,
  fresh = false,
  evaluated = value != null,
  valid = evaluated,
  envelope = evaluated ? ENVELOPE_STATUS.CONDITIONAL : ENVELOPE_STATUS.OUT_OF_SCOPE,
  evidenceState,
  evidenceIds = [],
  reasonCodes = [],
  method = null,
  methodVersion = null,
  policy = null,
  policyVersion = null,
} = {}) {
  const hasValue = value !== null && value !== undefined && Number.isFinite(Number(value))
  const isEvaluated = Boolean(evaluated && hasValue)
  const isValid = Boolean(isEvaluated && valid)
  const status = !isEvaluated
    ? ASSESSMENT_STATUS.NOT_EVALUATED
    : fresh
      ? ASSESSMENT_STATUS.CURRENT
      : ASSESSMENT_STATUS.STALE
  const normalizedReasonCodes = uniqueStrings(reasonCodes)
  if (!isEvaluated && normalizedReasonCodes.length === 0)
    normalizedReasonCodes.push('NOT_EVALUATED')

  const normalizedEvidenceState =
    evidenceState ??
    (isEvaluated
      ? evidenceIds.length > 0
        ? EVIDENCE_STATE.SUPPORTED
        : EVIDENCE_STATE.CONDITIONAL
      : EVIDENCE_STATE.NOT_EVALUATED)
  const normalizedEnvelope = envelope ?? ENVELOPE_STATUS.OUT_OF_SCOPE
  const assessment = {
    domain: domain ?? null,
    output: outputId ?? null,
    outputId: outputId ?? null,
    value: isEvaluated ? value : null,
    unit: unit ?? null,
    status,
    evaluated: isEvaluated,
    valid: isValid,
    validity: isEvaluated ? (isValid ? VALIDITY.VALID : VALIDITY.INVALID) : VALIDITY.NOT_EVALUATED,
    fresh: status === ASSESSMENT_STATUS.CURRENT,
    freshness: status,
    envelope: normalizedEnvelope,
    envelopeState: normalizedEnvelope,
    evidenceState: normalizedEvidenceState,
    evidenceIds: uniqueStrings(evidenceIds),
    evidence: {
      state: normalizedEvidenceState,
      ids: uniqueStrings(evidenceIds),
    },
    reasonCodes: normalizedReasonCodes,
    method: normalizeMethod(method, methodVersion),
    policy: normalizePolicy(policy, policyVersion),
  }
  return assessment
}

export const assessOutput = buildAssessment

export function isAssessmentUsable(assessment) {
  return Boolean(
    assessment?.evaluated &&
    assessment.valid &&
    assessment.status === ASSESSMENT_STATUS.CURRENT &&
    assessment.envelope !== ENVELOPE_STATUS.OUT_OF_SCOPE
  )
}
const RESULT_OUTPUTS = Object.freeze({
  apogee_ft: { domain: 'ascent', unit: 'ft' },
  drift_ft: { domain: 'landing', unit: 'ft' },
  drogue_fps: { domain: 'recovery', unit: 'ft/s' },
  main_fps: { domain: 'recovery', unit: 'ft/s' },
  phase1_time_s: { domain: 'recovery', unit: 's' },
  phase2_time_s: { domain: 'recovery', unit: 's' },
  total_time_s: { domain: 'recovery', unit: 's' },
  landing_ke_ftlbf: { domain: 'landing', unit: 'ft-lbf' },
})

/** Build assessments for the scalar outputs already exposed by a simulation result. */
export function buildResultAssessments(
  result,
  { fresh = true, envelope, evidenceState, evidenceIds } = {}
) {
  return Object.fromEntries(
    Object.entries(RESULT_OUTPUTS).map(([output, metadata]) => [
      output,
      buildAssessment({
        ...metadata,
        output,
        value: result?.[output] ?? null,
        fresh,
        envelope,
        evidenceState,
        evidenceIds,
        method: result?.apogee_method ?? 'browser-js-recovery',
        methodVersion: 'isa-apogee-descent-v1',
        policy: 'recovery-assumptions',
        policyVersion: 'recovery-assumptions-v1',
      }),
    ])
  )
}
