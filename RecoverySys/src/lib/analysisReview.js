/**
 * Deterministic, presentation-ready contract for the Analysis review surface.
 *
 * This module deliberately consumes plain objects. Canonical assessment and
 * sensitivity producers can evolve independently as long as they preserve the
 * fields normalized below; no React or physics thresholds belong here.
 */

export const RESULT_USABILITY_STATES = Object.freeze({
  NOT_RUN: 'not-run',
  STALE: 'stale',
  CURRENT: 'current',
})

export const FINDING_STATES = Object.freeze({
  ERROR: 'error',
  WARNING: 'warning',
  EVALUATED: 'evaluated',
  UNKNOWN: 'unknown',
  NOT_EVALUATED: 'not-evaluated',
})

export const REVIEW_ACTION_DESTINATIONS = Object.freeze({
  ANALYSIS: 'ANALYSIS',
  SIMULATION: 'SIMULATION',
  SPECS: 'SPECS',
})

const FINDING_RANK = Object.freeze({
  error: 0,
  warning: 1,
  evaluated: 2,
  unknown: 3,
  'not-evaluated': 4,
})

const SLOT_DESTINATIONS = Object.freeze({
  main_chute: 'config.main_chute',
  drogue_chute: 'config.drogue_chute',
  shock_cord: 'config.shock_cord',
  quick_links: 'config.quick_links',
  swivel: 'config.swivel',
  deployment_bag: 'config.deployment_bag',
  chute_device: 'config.chute_device',
  bay_volume: 'config.bay_volume',
  rocket_mass_g: 'specs.rocket_mass_g',
  motor_total_impulse_ns: 'specs.motor_total_impulse_ns',
  drag_cd: 'specs.drag_cd',
  main_deploy_alt_ft: 'specs.main_deploy_alt_ft',
  wind_speed_mph: 'specs.wind_speed_mph',
})

const SLOT_OUTCOMES = Object.freeze({
  main_chute: 'Main descent and landing impact',
  drogue_chute: 'Drogue descent and deployment timing',
  shock_cord: 'Deployment load path',
  quick_links: 'Deployment load path',
  swivel: 'Deployment load path',
  deployment_bag: 'Main deployment fit and release',
  chute_device: 'Deployment timing and release',
  bay_volume: 'Packed recovery hardware fit',
  rocket_mass_g: 'Ascent, descent, and recovery loads',
  motor_total_impulse_ns: 'Ascent and apogee estimate',
  drag_cd: 'Ascent and apogee estimate',
  main_deploy_alt_ft: 'Main deployment timing',
  wind_speed_mph: 'Landing drift estimate',
})

const ESTIMATE_DEFINITIONS = Object.freeze([
  ['apogee_ft', 'Apogee altitude', 'ft'],
  ['apogee_t_s', 'Apogee time', 's'],
  ['burnout_t_s', 'Burnout time', 's'],
  ['drogue_fps', 'Drogue descent rate', 'ft/s'],
  ['main_fps', 'Main descent rate', 'ft/s'],
  ['phase1_time_s', 'Drogue descent time', 's'],
  ['phase2_time_s', 'Main descent time', 's'],
  ['total_time_s', 'Total descent time', 's'],
  ['drift_ft', 'Landing drift', 'ft'],
  ['landing_ke_ftlbf', 'Landing kinetic energy', 'ft-lbf'],
])

const isObject = (value) => value !== null && typeof value === 'object'
const asArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value])
const text = (value) => (typeof value === 'string' ? value.trim() : '')
const numberOrNull = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const stableText = (value) => text(value).toLowerCase().replace(/\s+/g, ' ')

function stableId(value, fallback) {
  const source = text(value) || fallback
  return (
    source
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || fallback
  )
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null)
}

function firstText(...values) {
  return values.map(text).find(Boolean) ?? ''
}

function findingState(item = {}) {
  const nested = isObject(item.finding) ? item.finding : {}
  const stateRaw = stableText(
    firstDefined(
      item.findingState,
      item.evaluationState,
      item.evaluatedState,
      item.state,
      nested.findingState,
      nested.evaluationState,
      nested.evaluatedState,
      nested.state
    )
  )
  const severityRaw = stableText(
    firstDefined(item.level, item.severity, nested.level, nested.severity)
  )
  const raw = stateRaw || severityRaw || stableText(firstDefined(item.status, item.result))

  if (
    raw === 'not-evaluated' ||
    raw === 'not_evaluated' ||
    raw === 'not evaluated' ||
    raw === 'unavailable' ||
    raw === 'not-run' ||
    raw === 'not_run'
  )
    return FINDING_STATES.NOT_EVALUATED
  if (
    raw === 'unknown' ||
    raw === 'indeterminate' ||
    raw === 'unresolved' ||
    raw === 'insufficient'
  )
    return FINDING_STATES.UNKNOWN
  if (
    severityRaw === 'error' ||
    severityRaw === 'critical' ||
    severityRaw === 'fail' ||
    severityRaw === 'failed' ||
    severityRaw === 'blocked'
  )
    return FINDING_STATES.ERROR
  if (
    severityRaw === 'warn' ||
    severityRaw === 'warning' ||
    severityRaw === 'notice' ||
    severityRaw === 'marginal'
  )
    return FINDING_STATES.WARNING
  if (
    raw === 'error' ||
    raw === 'critical' ||
    raw === 'fail' ||
    raw === 'failed' ||
    raw === 'blocked'
  )
    return FINDING_STATES.ERROR
  if (raw === 'warn' || raw === 'warning' || raw === 'notice' || raw === 'marginal')
    return FINDING_STATES.WARNING
  if (raw === 'ok' || raw === 'pass' || raw === 'passed' || raw === 'clear' || raw === 'evaluated')
    return FINDING_STATES.EVALUATED
  if (item.evaluated === false || item.available === false) return FINDING_STATES.NOT_EVALUATED
  if (item.evaluated === true || item.available === true) return FINDING_STATES.EVALUATED
  return FINDING_STATES.UNKNOWN
}

function findingItems(input) {
  const explicit = firstDefined(input.findings, input.reviewFindings, input.warnings)
  if (explicit !== undefined) return asArray(explicit)

  const assessment = input.assessment ?? input.assessments
  return asArray(assessment).flatMap((item) =>
    isObject(item) ? asArray(firstDefined(item.findings, item.warnings, item.results)) : []
  )
}

function destinationFor(item, slot) {
  const action = isObject(item.action) ? item.action : null
  const inputPath = asArray(firstDefined(item.inputPaths, item.affectedInputPaths)).find(
    (path) => typeof path === 'string' && path.trim()
  )
  return firstDefined(
    item.actionDestination,
    item.destination,
    item.actionPath,
    item.target,
    action?.destination,
    action?.path,
    inputPath,
    SLOT_DESTINATIONS[slot],
    REVIEW_ACTION_DESTINATIONS.ANALYSIS
  )
}

function driverFor(item, slot) {
  const part = asArray(
    firstDefined(item.affectedPartIds, item.partRefs, item.affectedPartRefs)
  ).find((value) => typeof value === 'string' && value.trim())
  return firstText(
    item.driver,
    item.driverLabel,
    item.input,
    item.inputLabel,
    item.cause,
    item.slotLabel,
    part,
    slot,
    'Review finding'
  )
}

function outcomeFor(item, slot) {
  return firstText(
    item.affectedOutcome,
    item.outcome,
    item.outcomeLabel,
    item.consequence,
    SLOT_OUTCOMES[slot],
    'Recovery outcome'
  )
}

function findingMessage(item, state) {
  return firstText(
    item.message,
    item.summary,
    item.consequence,
    item.description,
    item.reason,
    state === FINDING_STATES.UNKNOWN
      ? 'The available evidence does not resolve this outcome.'
      : state === FINDING_STATES.NOT_EVALUATED
        ? 'This outcome was not evaluated.'
        : 'Review finding available.'
  )
}

function normalizeFinding(item, index) {
  const value = isObject(item) ? item : { message: String(item) }
  const slot = firstText(value.slot, value.key, value.inputKey, value.driverKey, value.path)
  const state = findingState(value)
  const code = firstText(value.code, value.findingCode, value.warningCode)
  const id = stableId(firstText(value.id, code, slot, value.message), `finding-${index + 1}`)
  const actionDestination = destinationFor(value, slot)
  return {
    id,
    code: code || id,
    state,
    severity:
      state === FINDING_STATES.ERROR
        ? 'error'
        : state === FINDING_STATES.WARNING
          ? 'warning'
          : null,
    message: findingMessage(value, state),
    driver: driverFor(value, slot),
    affectedOutcome: outcomeFor(value, slot),
    slot: slot || null,
    domain: firstDefined(value.domain, null),
    consequence: firstDefined(value.consequence, null),
    remediation: firstDefined(value.remediation, null),
    evaluated: firstDefined(
      value.evaluated,
      state !== FINDING_STATES.NOT_EVALUATED && state !== FINDING_STATES.UNKNOWN
    ),
    classification: firstDefined(value.classification, value.sourceClassification, null),
    evidenceIds: asArray(firstDefined(value.evidenceIds, value.applicableEvidenceIds)).filter(
      Boolean
    ),
    sourceRefs: asArray(firstDefined(value.sourceRefs, value.references)).filter(Boolean),
    actionDestination,
    action: {
      label: firstText(
        isObject(value.action) ? value.action.label : value.action,
        value.actionLabel,
        value.remediation,
        state === FINDING_STATES.ERROR ? 'Correct input before flight' : 'Review supporting detail'
      ),
      destination: actionDestination,
    },
    inputPaths: asArray(firstDefined(value.inputPaths, value.affectedInputPaths)).filter(Boolean),
    partRefs: asArray(
      firstDefined(value.partRefs, value.affectedPartRefs, value.affectedPartIds)
    ).filter(Boolean),
    evidence: firstDefined(value.evidence, value.provenance, null),
    source: firstDefined(value.source, value.method, null),
  }
}

export function summarizeReviewFindings(input = {}) {
  const items = findingItems(input).map(normalizeFinding)
  const counts = {
    error: items.filter((item) => item.state === FINDING_STATES.ERROR).length,
    warning: items.filter((item) => item.state === FINDING_STATES.WARNING).length,
    unknown: items.filter((item) => item.state === FINDING_STATES.UNKNOWN).length,
    notEvaluated: items.filter(
      (item) => item.state === FINDING_STATES.NOT_EVALUATED || item.state === FINDING_STATES.UNKNOWN
    ).length,
  }
  const hasFindingEvidence = items.length > 0
  const hasExplicitEvaluation = items.some(
    (item) =>
      item.state === FINDING_STATES.ERROR ||
      item.state === FINDING_STATES.WARNING ||
      item.state === FINDING_STATES.EVALUATED
  )
  return {
    counts,
    errorCount: counts.error,
    warningCount: counts.warning,
    notEvaluatedCount: counts.notEvaluated,
    unknownCount: counts.unknown,
    total: items.length,
    evaluated: hasExplicitEvaluation,
    posture: hasExplicitEvaluation
      ? counts.error > 0
        ? 'error'
        : counts.warning > 0
          ? 'warning'
          : 'reviewed'
      : 'not-evaluated',
    findings: items,
    hasFindingEvidence,
  }
}

function normalizeRelationship(item, index) {
  const value = isObject(item) ? item : { driver: String(item) }
  const slot = firstText(value.slot, value.key, value.inputKey, value.driverKey, value.path)
  const state = findingState(value.finding ?? value)
  const nestedFinding = isObject(value.finding) ? value.finding : value
  const id = stableId(
    firstText(value.id, value.code, slot, value.driver),
    `relationship-${index + 1}`
  )
  const destination = destinationFor(value, slot)
  return {
    id,
    driver: driverFor(value, slot),
    affectedOutcome: outcomeFor(value, slot),
    findingState: state,
    evaluated: firstDefined(
      value.evaluated,
      state !== FINDING_STATES.NOT_EVALUATED && state !== FINDING_STATES.UNKNOWN
    ),
    state,
    domain: firstDefined(value.domain, null),
    consequence: firstDefined(value.consequence, null),
    remediation: firstDefined(value.remediation, null),
    classification: firstDefined(value.classification, value.sourceClassification, null),
    evidenceIds: asArray(firstDefined(value.evidenceIds, value.applicableEvidenceIds)).filter(
      Boolean
    ),
    sourceRefs: asArray(firstDefined(value.sourceRefs, value.references)).filter(Boolean),
    finding: {
      state,
      code: firstText(nestedFinding.code, nestedFinding.findingCode, value.code, id),
      message: findingMessage(nestedFinding, state),
      consequence: firstDefined(nestedFinding.consequence, value.consequence, null),
      remediation: firstDefined(nestedFinding.remediation, value.remediation, null),
    },
    actionDestination: destination,
    action: {
      label: firstText(
        isObject(value.action) ? value.action.label : value.action,
        value.actionLabel,
        value.remediation,
        state === FINDING_STATES.UNKNOWN || state === FINDING_STATES.NOT_EVALUATED
          ? 'Review what is missing'
          : 'Open affected input'
      ),
      destination,
    },
    priority: numberOrNull(firstDefined(value.priority, value.priorityRank, value.order)),
    inputPaths: asArray(firstDefined(value.inputPaths, value.affectedInputPaths)).filter(Boolean),
    partRefs: asArray(firstDefined(value.partRefs, value.affectedPartRefs)).filter(Boolean),
    evidence: firstDefined(value.evidence, value.provenance, null),
    details: asArray(firstDefined(value.detailRefs, value.details)).filter(Boolean),
  }
}

export function buildCausalityRows(input = {}, summary = summarizeReviewFindings(input)) {
  const explicit = firstDefined(
    input.causalityRows,
    input.causeToOutcome,
    input.relationships,
    input.assessment?.relationships
  )
  const source = explicit === undefined ? summary.findings : asArray(explicit)
  return source
    .map(normalizeRelationship)
    .map((row, index) => ({ ...row, _index: index }))
    .sort((a, b) => {
      const aPriority = a.priority ?? FINDING_RANK[a.findingState]
      const bPriority = b.priority ?? FINDING_RANK[b.findingState]
      return (
        aPriority - bPriority ||
        a.findingState.localeCompare(b.findingState) ||
        a.id.localeCompare(b.id) ||
        a._index - b._index
      )
    })
    .map((row, index) => {
      const { _index, priority, ...clean } = row
      return { ...clean, priority: index + 1, sourcePriority: priority }
    })
}

function estimateValue(result, key) {
  const value = result?.[key]
  if (isObject(value)) return firstDefined(value.value, value.estimate, value.current, null)
  return value
}

export function buildKeyEstimates(result = null, input = {}) {
  if (!isObject(result)) return []
  const explicit = firstDefined(input.keyEstimates, input.estimates)
  if (explicit !== undefined) {
    return asArray(explicit).map((item, index) => {
      const value = isObject(item) ? item : { value: item }
      return {
        id: stableId(firstText(value.id, value.key, value.label), `estimate-${index + 1}`),
        label: firstText(value.label, value.key, `Estimate ${index + 1}`),
        value: firstDefined(value.value, value.estimate, null),
        unit: firstText(value.unit),
        status: firstText(value.status) || 'available',
        source: firstDefined(value.source, result.provenance ?? null),
        detailRefs: asArray(value.detailRefs).filter(Boolean),
      }
    })
  }
  return ESTIMATE_DEFINITIONS.flatMap(([key, label, unit]) => {
    const value = estimateValue(result, key)
    return value === undefined || value === null
      ? []
      : [{ id: key, key, label, value, unit, status: 'available', source: 'simulation-result' }]
  })
}

function normalizeVariant(variant, index) {
  const value = isObject(variant) ? variant : { value: variant }
  const valid =
    value.valid === undefined ? value.status !== 'invalid' && value.output != null : value.valid
  const state =
    valid === false
      ? 'unusable'
      : value.envelopeStatus === 'out-of-scope'
        ? 'out-of-envelope'
        : 'usable'
  return {
    id: stableId(firstText(value.id, value.key, value.label), `variant-${index + 1}`),
    label: firstText(value.label, value.name, `Variant ${index + 1}`),
    value: firstDefined(value.value, null),
    delta: firstDefined(value.delta, null),
    state,
    valid: Boolean(valid),
    envelopeStatus: firstDefined(value.envelopeStatus, null),
    output: firstDefined(value.output, value.result, null),
    reason: firstDefined(
      value.reason,
      valid === false ? 'Variant did not produce a usable result.' : null
    ),
  }
}

function normalizeResponseRow(row, index) {
  const value = isObject(row) ? row : { label: String(row) }
  const variants = asArray(value.variants).map(normalizeVariant)
  const rowStatus = firstText(value.status) || (variants.length ? 'tested' : 'not-evaluated')
  return {
    id: stableId(firstText(value.id, value.key, value.label), `response-${index + 1}`),
    key: firstText(value.key, value.inputKey),
    label: firstText(value.label, value.key, `Tested input ${index + 1}`),
    unit: firstText(value.unit),
    status: rowStatus,
    reason: firstDefined(value.reason, null),
    description: firstText(value.description),
    baseOutput: firstDefined(value.baseOutput, value.baseline, null),
    ranges: firstDefined(value.ranges, value.range, null),
    variants,
    criterionCrossings: asArray(value.criterionCrossings).filter(Boolean),
    assumptions: asArray(value.assumptions).filter(Boolean),
  }
}

export function buildTestedResponse(input = {}) {
  const source = firstDefined(
    input.testedResponse,
    input.modelResponse,
    input.sensitivity,
    input.sensitivityResult
  )
  if (source === undefined || source === null) {
    return {
      status: 'not-evaluated',
      reason: 'No per-output response evaluation is available.',
      method: null,
      rows: [],
    }
  }
  const value = isObject(source) && !Array.isArray(source) ? source : { rows: source }
  const rows = asArray(firstDefined(value.rows, value.outputs, value.results)).map(
    normalizeResponseRow
  )
  return {
    status: firstText(value.status) || (rows.length ? 'tested' : 'not-evaluated'),
    reason: firstDefined(
      value.reason,
      rows.length ? null : 'No per-output response evaluation is available.'
    ),
    method: firstDefined(value.method, null),
    rows,
    limitations: asArray(value.limitations).filter(Boolean),
  }
}

function detailItems(input = {}, result = null) {
  const explicit = firstDefined(
    input.detailRefs,
    input.detailReferences,
    input.supportingDetails,
    input.details
  )
  if (explicit !== undefined) return asArray(explicit)
  return [
    ...asArray(input.assumptions).map((value) => ({ type: 'assumption', value })),
    ...asArray(input.evidence).map((value) => ({ type: 'evidence', value })),
    ...(result?.provenance ? [{ type: 'provenance', value: result.provenance }] : []),
  ]
}

export function buildDetailReferences(input = {}, result = null) {
  return detailItems(input, result).map((item, index) => {
    const value = isObject(item) ? item : { value: item }
    const nested = isObject(value.value) ? value.value : {}
    return {
      id: stableId(
        firstText(
          value.id,
          nested.id,
          value.key,
          nested.key,
          value.type,
          nested.type,
          value.label,
          nested.label
        ),
        `detail-${index + 1}`
      ),
      type: firstText(value.type, nested.type, 'supporting-detail'),
      label: firstText(
        value.label,
        value.title,
        nested.label,
        nested.title,
        value.type,
        nested.type,
        'Supporting detail'
      ),
      reference: firstDefined(
        value.reference,
        value.href,
        nested.reference,
        nested.href,
        nested.value,
        value.value,
        null
      ),
      section: firstText(value.section, nested.section),
    }
  })
}

export function buildResultUsability(input = {}) {
  const result = firstDefined(input.result, input.simulation, null)
  const explicitStatus = stableText(
    firstDefined(input.resultStatus, input.usabilityStatus, input.status)
  )
  const fresh = firstDefined(input.resultFresh, input.fresh, input.current)
  const status = !result
    ? RESULT_USABILITY_STATES.NOT_RUN
    : explicitStatus === RESULT_USABILITY_STATES.STALE || explicitStatus === 'stale'
      ? RESULT_USABILITY_STATES.STALE
      : fresh === false
        ? RESULT_USABILITY_STATES.STALE
        : RESULT_USABILITY_STATES.CURRENT
  const details = {
    [RESULT_USABILITY_STATES.NOT_RUN]: {
      reasonCode: 'NO_CURRENT_RESULT',
      reason: 'No simulation result is available for review.',
      nextAction: 'Run a simulation before interpreting estimates.',
      actionDestination: REVIEW_ACTION_DESTINATIONS.SIMULATION,
    },
    [RESULT_USABILITY_STATES.STALE]: {
      reasonCode: 'RESULT_STALE',
      reason: 'The stored result no longer matches the active inputs or model identity.',
      nextAction: 'Rerun the simulation before interpreting estimates.',
      actionDestination: REVIEW_ACTION_DESTINATIONS.SIMULATION,
    },
    [RESULT_USABILITY_STATES.CURRENT]: {
      reasonCode: 'CURRENT_RESULT',
      reason: 'The current simulation result is available for review.',
      nextAction: 'Review prioritized findings and supporting detail.',
      actionDestination: REVIEW_ACTION_DESTINATIONS.ANALYSIS,
    },
  }[status]
  return { status, state: status, ...details }
}

export function buildAnalysisReviewModel(input = {}) {
  const value = isObject(input) ? input : {}
  const result = firstDefined(value.result, value.simulation, null)
  const resultUsability = buildResultUsability(value)
  const summary = summarizeReviewFindings(value)
  const causalityRows = buildCausalityRows(value, summary)
  const testedResponse = buildTestedResponse(value)
  const keyEstimates = buildKeyEstimates(result, value)
  const detailRefs = buildDetailReferences(value, result)
  const reviewSummary = {
    errorCount: summary.errorCount,
    warningCount: summary.warningCount,
    notEvaluatedCount: summary.notEvaluatedCount,
    unknownCount: summary.unknownCount,
    counts: summary.counts,
    posture: summary.posture,
    evaluated: summary.evaluated,
    hasFindingEvidence: summary.hasFindingEvidence,
  }
  return {
    resultUsability,
    reviewSummary,
    causalityRows,
    keyEstimates,
    testedResponse,
    detailRefs,
    // These aliases keep the contract readable for consumers without creating
    // a second derivation path or changing the canonical values above.
    estimates: keyEstimates,
    supportingDetails: detailRefs,
  }
}
