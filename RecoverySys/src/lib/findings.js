export const FINDING_STATE = Object.freeze({
  EVALUATED: 'evaluated',
  NOT_EVALUATED: 'not-evaluated',
})

export const FINDING_CLASSIFICATION = Object.freeze({
  CALCULATION: 'calculation',
  HEURISTIC: 'heuristic',
  EVIDENCE: 'evidence',
  CHECKLIST: 'checklist',
})

const uniqueStrings = (values) => [
  ...new Set((Array.isArray(values) ? values : values == null ? [] : [values]).filter(Boolean)),
]

const stableFallbackCode = ({ domain, slot, rule }) =>
  [domain ?? 'finding', slot ?? 'general', rule ?? 'unclassified']
    .map((part) =>
      String(part)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
    )
    .filter(Boolean)
    .join('.')

/**
 * Compatibility warning text is intentionally not an identity. Rule callers
 * may supply an authored code; this fallback maps known rule families to
 * authored IDs and never includes dynamic numeric values or part names.
 */
export function compatibilityFindingCode(slot, rule = 'unclassified') {
  const text = String(rule)
  const lower = text.toLowerCase()
  const family = (name) => `compatibility.${slot}.${name}`
  if (lower.startsWith('no main parachute selected')) {
    return family('no-main-parachute-selected-recovery-system-incomplete')
  }
  if (lower.startsWith('no drogue chute')) return family('single-deploy')
  if (lower.startsWith('deploy altitude')) {
    if (lower.includes('invalid')) return family('deploy-altitude-invalid')
    if (lower.includes('dangerously low')) return family('deploy-altitude-low')
    if (lower.includes('unusually high')) return family('deploy-altitude-high')
  }
  if (lower.startsWith('main descent rate')) {
    if (lower.includes('exceeds')) return family('main-descent-rate-hard-landing')
    if (lower.includes('above')) return family('main-descent-rate-fast')
    if (lower.includes('very slow')) return family('main-descent-rate-slow-drift')
  }
  if (lower.startsWith('landing ke')) {
    if (lower.includes('exceeds 100')) return family('landing-energy-high')
    if (lower.includes('exceeds 75')) return family('landing-energy-elevated')
  }
  if (lower.startsWith('drogue descent rate')) {
    if (lower.includes('too slow')) return family('drogue-descent-rate-slow-drift')
    if (lower.includes('very fast')) return family('drogue-descent-rate-fast-shock')
  }
  if (lower.startsWith('main chute opening shock')) {
    if (lower.includes('may exceed')) return family('opening-shock-exceeds-rating')
    return family('opening-shock-close-to-rating')
  }
  if (lower.startsWith('shock cord rated')) {
    if (lower.includes('may fail')) return family('shock-cord-below-rating')
    return family('shock-cord-marginal')
  }
  if (lower.startsWith('snatch force')) return family('snatch-force-marginal')
  if (lower.startsWith('main snatch-load model')) return family('snatch-load-exceeds-rating')
  if (lower.startsWith('main snatch-load screening')) return family('snatch-load-not-evaluated')
  if (lower.startsWith('harness length')) return family('harness-length-short')
  if (lower.startsWith('kevlar cord with nylon chute'))
    return family('chute-cord-material-mismatch')
  if (lower.includes("won't fit") && lower.startsWith('quick link'))
    return family('quick-link-opening-small')
  if (lower.includes('max altitude is')) return family('chute-device-max-altitude')
  if (lower.includes('minimum altitude is')) return family('chute-device-min-altitude')
  if (lower.includes('may be too small for')) return family('deployment-bag-diameter')
  if (lower.startsWith('main chute packed length')) return family('deployment-bag-length')
  if (lower.startsWith('packed components')) return family('packing-capacity-exceeded')
  if (lower.startsWith('bay is')) return family('packing-capacity-tight')
  if (lower.startsWith('dual-deploy without')) return family('dual-deploy-without-deployment-bag')
  return stableFallbackCode({ domain: 'compatibility', slot, rule: 'unclassified' })
}

export function buildFinding({
  code,
  domain = 'recovery',
  slot = null,
  severity = 'warn',
  state = FINDING_STATE.EVALUATED,
  consequence = '',
  remediation = '',
  inputPaths = [],
  affectedPartIds = [],
  classification = FINDING_CLASSIFICATION.CALCULATION,
  evidenceRefs = [],
  criterion = null,
  source = null,
  rule = null,
  message = consequence,
} = {}) {
  if (!code) throw new Error('Finding code is required')
  const normalizedState = state === FINDING_STATE.NOT_EVALUATED ? state : FINDING_STATE.EVALUATED
  return {
    code,
    domain,
    slot,
    severity,
    state: normalizedState,
    evaluated: normalizedState === FINDING_STATE.EVALUATED,
    consequence: consequence || message || '',
    message: message || consequence || '',
    remediation: remediation || 'Review the affected input and address the finding before flight.',
    inputPaths: uniqueStrings(inputPaths),
    affectedInputPaths: uniqueStrings(inputPaths),
    affectedPartIds: uniqueStrings(affectedPartIds),
    partRefs: uniqueStrings(affectedPartIds),
    classification,
    evidenceRefs: uniqueStrings(evidenceRefs),
    criterion,
    source,
    rule,
  }
}

export const createFinding = buildFinding

export function normalizeFinding(finding = {}) {
  const message = finding.message ?? finding.consequence ?? ''
  const code =
    finding.code ??
    finding.warningCode ??
    compatibilityFindingCode(finding.slot, finding.rule ?? message)
  return buildFinding({
    ...finding,
    code,
    domain: finding.domain ?? 'compatibility',
    severity: finding.severity ?? finding.level ?? 'warn',
    state:
      finding.state ??
      (message.toLowerCase().includes('not evaluated')
        ? FINDING_STATE.NOT_EVALUATED
        : FINDING_STATE.EVALUATED),
    affectedPartIds: finding.affectedPartIds ?? finding.partRefs ?? finding.affectedPartRefs,
    classification:
      finding.classification ?? finding.sourceClassification ?? FINDING_CLASSIFICATION.CALCULATION,
    consequence: finding.consequence ?? message,
    evidenceRefs: finding.evidenceRefs ?? finding.evidence?.ids,
    source: finding.source ?? { classification: 'calculation', reference: 'compatibility-rule' },
  })
}
