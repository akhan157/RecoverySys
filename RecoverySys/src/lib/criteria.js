export const CRITERIA_POLICY_VERSION = 'recovery-criteria-v1'

export const CRITERION_IDS = Object.freeze({
  DEPLOY_ALTITUDE: 'recovery.deploy-altitude',
  MAIN_DESCENT_RATE: 'recovery.main-descent-rate',
  LANDING_ENERGY: 'recovery.landing-energy',
  DROGUE_DESCENT_RATE: 'recovery.drogue-descent-rate',
  OPENING_SHOCK_RATIO: 'recovery.opening-shock-ratio',
  STRENGTH_MARGIN: 'recovery.strength-margin',
  SHOCK_SAFETY_FACTOR: 'recovery.shock-safety-factor',
  PACKING_CAPACITY_RATIO: 'recovery.packing-capacity-ratio',
})

const criterion = ({ id, domain, unit, applicability, basis, bands }) =>
  Object.freeze({
    id,
    domain,
    unit,
    applicability,
    basis,
    reviewStatus: 'reviewed',
    policyVersion: CRITERIA_POLICY_VERSION,
    bands: Object.freeze(bands.map((band) => Object.freeze({ ...band }))),
  })

export const CRITERIA = Object.freeze({
  [CRITERION_IDS.DEPLOY_ALTITUDE]: criterion({
    id: CRITERION_IDS.DEPLOY_ALTITUDE,
    domain: 'recovery',
    unit: 'ft',
    applicability: 'main deployment altitude is entered',
    basis: 'deployment altitude sanity review',
    bands: [
      { category: 'invalid', severity: 'error', operator: 'lte', threshold: 0 },
      { category: 'low', severity: 'warn', operator: 'lt', threshold: 200 },
      { category: 'high', severity: 'warn', operator: 'gt', threshold: 10000 },
    ],
  }),
  [CRITERION_IDS.MAIN_DESCENT_RATE]: criterion({
    id: CRITERION_IDS.MAIN_DESCENT_RATE,
    domain: 'recovery',
    unit: 'ft/s',
    applicability: 'main canopy and loaded mass are available',
    basis: 'landing-rate screening thresholds',
    bands: [
      { category: 'hard-landing', severity: 'error', operator: 'gt', threshold: 20 },
      { category: 'fast', severity: 'warn', operator: 'gt', threshold: 15 },
      { category: 'slow-drift', severity: 'warn', operator: 'lt', threshold: 5 },
    ],
  }),
  [CRITERION_IDS.LANDING_ENERGY]: criterion({
    id: CRITERION_IDS.LANDING_ENERGY,
    domain: 'recovery',
    unit: 'ft-lbf',
    applicability: 'a positive landing rate and loaded mass are available',
    basis: 'landing kinetic-energy screening thresholds',
    bands: [
      { category: 'high-energy', severity: 'error', operator: 'gt', threshold: 100 },
      { category: 'elevated-energy', severity: 'warn', operator: 'gt', threshold: 75 },
    ],
  }),
  [CRITERION_IDS.DROGUE_DESCENT_RATE]: criterion({
    id: CRITERION_IDS.DROGUE_DESCENT_RATE,
    domain: 'recovery',
    unit: 'ft/s',
    applicability: 'drogue canopy and loaded mass are available',
    basis: 'drogue descent-rate screening thresholds',
    bands: [
      { category: 'slow-drift', severity: 'warn', operator: 'lt', threshold: 30 },
      { category: 'fast-shock', severity: 'warn', operator: 'gt', threshold: 150 },
    ],
  }),
  [CRITERION_IDS.OPENING_SHOCK_RATIO]: criterion({
    id: CRITERION_IDS.OPENING_SHOCK_RATIO,
    domain: 'recovery',
    unit: 'ratio',
    applicability: 'opening shock and weakest hardware rating are available',
    basis: 'opening-shock-to-rating screening thresholds',
    bands: [
      { category: 'exceeds-rating', severity: 'error', operator: 'gt', threshold: 1 },
      { category: 'close-to-rating', severity: 'warn', operator: 'gt', threshold: 0.7 },
    ],
  }),
  [CRITERION_IDS.STRENGTH_MARGIN]: criterion({
    id: CRITERION_IDS.STRENGTH_MARGIN,
    domain: 'recovery',
    unit: 'ratio',
    applicability: 'rated strength and required load are available',
    basis: 'static strength margin screening thresholds',
    bands: [
      { category: 'below-rating', severity: 'error', operator: 'lt', threshold: 1 },
      { category: 'marginal', severity: 'warn', operator: 'lt', threshold: 1.5 },
    ],
  }),
  [CRITERION_IDS.SHOCK_SAFETY_FACTOR]: criterion({
    id: CRITERION_IDS.SHOCK_SAFETY_FACTOR,
    domain: 'recovery',
    unit: 'ratio',
    applicability: 'shock-cord material and calculated safety factor are available',
    basis: 'material-specific ejection safety-factor screening thresholds',
    bands: [
      { category: 'fail', severity: 'error', operator: 'lt', threshold: 2 },
      { category: 'warn', severity: 'warn', operator: 'lt', threshold: 4 },
    ],
  }),
  [CRITERION_IDS.PACKING_CAPACITY_RATIO]: criterion({
    id: CRITERION_IDS.PACKING_CAPACITY_RATIO,
    domain: 'recovery',
    unit: 'ratio',
    applicability: 'packed volume and effective bay capacity are available',
    basis: 'packing capacity screening thresholds',
    bands: [
      { category: 'exceeds-capacity', severity: 'error', operator: 'gt', threshold: 1 },
      { category: 'tight', severity: 'warn', operator: 'gt', threshold: 0.85 },
    ],
  }),
})
export const SHOCK_SF_THRESHOLDS = Object.freeze({
  nylon: Object.freeze({ pass: 4, warn: 2 }),
  kevlar: Object.freeze({ pass: 8, warn: 4 }),
})

export function shockSafetyFactorBands(material = 'nylon') {
  const thresholds = SHOCK_SF_THRESHOLDS[material] ?? SHOCK_SF_THRESHOLDS.nylon
  return [
    { category: 'fail', severity: 'error', operator: 'lt', threshold: thresholds.warn },
    { category: 'warn', severity: 'warn', operator: 'lt', threshold: thresholds.pass },
  ]
}

const matches = (value, operator, threshold) => {
  switch (operator) {
    case 'lt':
      return value < threshold
    case 'lte':
      return value <= threshold
    case 'gt':
      return value > threshold
    case 'gte':
      return value >= threshold
    case 'eq':
      return value === threshold
    default:
      return false
  }
}

const marginFor = (value, operator, threshold) => {
  if (operator === 'lt' || operator === 'lte') return threshold - value
  if (operator === 'gt' || operator === 'gte') return value - threshold
  return value === threshold ? 0 : null
}

/**
 * Evaluate a registered criterion without rounding or changing its boundary
 * operator. The first matching band wins, so exact threshold behavior is
 * defined once for every consuming surface.
 */
export function evaluateCriterion(criterionOrId, value, { bands } = {}) {
  const definition = typeof criterionOrId === 'string' ? CRITERIA[criterionOrId] : criterionOrId
  const numericValue =
    value == null || value === '' ? NaN : typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) {
    return {
      criterionId: definition.id,
      domain: definition.domain,
      unit: definition.unit,
      applicability: definition.applicability,
      evaluated: false,
      category: 'not-evaluated',
      severity: 'neutral',
      value: null,
      threshold: null,
      operator: null,
      margin: null,
      basis: definition.basis,
      reviewStatus: definition.reviewStatus,
      policyVersion: definition.policyVersion,
      reasonCode: 'CRITERION_VALUE_UNAVAILABLE',
    }
  }

  const selectedBands = bands ?? definition.bands
  const matched = selectedBands.find((band) =>
    matches(numericValue, band.operator, Number(band.threshold))
  )
  return {
    criterionId: definition.id,
    domain: definition.domain,
    unit: definition.unit,
    applicability: definition.applicability,
    evaluated: true,
    category: matched?.category ?? 'nominal',
    severity: matched?.severity ?? 'none',
    value: numericValue,
    threshold: matched?.threshold ?? null,
    operator: matched?.operator ?? null,
    margin: matched ? marginFor(numericValue, matched.operator, Number(matched.threshold)) : null,
    basis: definition.basis,
    reviewStatus: definition.reviewStatus,
    policyVersion: definition.policyVersion,
  }
}

export const classifyCriterion = evaluateCriterion

export function criterionDefinition(criterionId) {
  return CRITERIA[criterionId] ?? null
}
