const PRESENTATIONS = Object.freeze({
  ok: Object.freeze({
    status: 'ok',
    token: 'CRITERION_NOMINAL',
    label: 'WITHIN TESTED CRITERION',
    metricStatus: 'ok',
    metricLabel: 'OK',
  }),
  warn: Object.freeze({
    status: 'warn',
    token: 'CRITERION_REVIEW',
    label: 'REVIEW REQUIRED',
    metricStatus: 'marginal',
    metricLabel: 'MARGINAL',
  }),
  error: Object.freeze({
    status: 'error',
    token: 'CRITERION_EXCEEDED',
    label: 'CRITERION EXCEEDED',
    metricStatus: 'fail',
    metricLabel: 'FAIL',
  }),
  neutral: Object.freeze({
    status: 'neutral',
    token: 'CRITERION_NOT_EVALUATED',
    label: 'NOT EVALUATED',
    metricStatus: 'neutral',
    metricLabel: 'NOT EVALUATED',
  }),
})
/**
 * Map one canonical criterion result to shared UI status vocabularies.
 * Missing or unresolved criteria never become a positive status.
 *
 * `status`/`label` are the canonical Analysis vocabulary. `metricStatus` and
 * `metricLabel` project the same result to MetricCard's ok/marginal/fail
 * vocabulary; neutral is retained for an unrendered unavailable metric.
 */
export function criterionStatus(criterion = null) {
  if (!criterion?.evaluated) return 'neutral'
  if (criterion.severity === 'error') return 'error'
  if (criterion.severity === 'warn') return 'warn'
  if (criterion.category === 'nominal' || criterion.severity === 'none') return 'ok'
  return 'neutral'
}

export function presentCriterion(criterion = null) {
  const status = criterionStatus(criterion)
  const presentation = PRESENTATIONS[status]
  return {
    ...presentation,
    evaluated: Boolean(criterion?.evaluated),
    reasonCode: criterion?.reasonCode ?? null,
    criterionId: criterion?.criterionId ?? null,
  }
}

/** Combine criteria without treating an unevaluated criterion as nominal. */
export function aggregateCriterionStatus(criteria = []) {
  const statuses = criteria.map(criterionStatus)
  if (statuses.includes('error')) return 'error'
  if (statuses.includes('warn')) return 'warn'
  if (statuses.length > 0 && statuses.every((status) => status === 'ok')) return 'ok'
  return 'neutral'
}

export function criterionStatusLabel(status) {
  return PRESENTATIONS[status]?.label ?? PRESENTATIONS.neutral.label
}
