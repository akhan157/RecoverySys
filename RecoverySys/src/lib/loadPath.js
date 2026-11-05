import {
  buildCompatibilityContext,
  computeEjectionSnatchLoad,
  computeOpeningShockForContext,
} from './compatibility.js'
import { CRITERION_IDS, evaluateCriterion } from './criteria.js'

/**
 * Load-path margin view model.
 *
 * Recovery hardware is a series chain: the same force passes through the shock
 * cord, quick links and swivel. This module is presentation only — it computes
 * no new physics. Every load-case number is read from the functions the
 * compatibility rules already use:
 *
 *   - ejection pull      → compatibility's buildCompatibilityContext required_lbs
 *   - ejection snatch    → compatibility's computeEjectionSnatchLoad
 *   - main snatch proxy  → recoveryLoad's computeMainSnatchLoad (via the context)
 *   - main opening shock → compatibility's computeOpeningShockForContext
 *
 * Compatibility also screens series-chain links and swivels against these
 * forces. This view adds no warnings and changes no thresholds: margin
 * categories come from the shared STRENGTH_MARGIN criterion, except opening
 * shock, which uses OPENING_SHOCK_RATIO exactly as rule_openingShock does.
 */

export const LOAD_PATH_MODEL = 'load-path-margins-v1'

export const LOAD_PATH_CASE_IDS = Object.freeze({
  EJECTION: 'ejection',
  EJECTION_SNATCH: 'ejection-snatch',
  MAIN_SNATCH: 'main-snatch',
  OPENING_SHOCK: 'opening-shock',
})

const CHAIN_SLOTS = Object.freeze(['shock_cord', 'quick_links', 'swivel'])

const RATING_FIELDS = Object.freeze({
  shock_cord: 'strength_lbs',
  quick_links: 'strength_lbs',
  swivel: 'rated_lbs',
})

const SOURCES = Object.freeze({
  [LOAD_PATH_CASE_IDS.EJECTION]: 'src/lib/compatibility.js#buildCompatibilityContext',
  [LOAD_PATH_CASE_IDS.EJECTION_SNATCH]: 'src/lib/compatibility.js#computeEjectionSnatchLoad',
  [LOAD_PATH_CASE_IDS.MAIN_SNATCH]: 'src/lib/recoveryLoad.js#computeMainSnatchLoad',
  [LOAD_PATH_CASE_IDS.OPENING_SHOCK]: 'src/lib/recoveryLoad.js#computeOpeningShockLoad',
})

const LABELS = Object.freeze({
  [LOAD_PATH_CASE_IDS.EJECTION]: 'Ejection pull',
  [LOAD_PATH_CASE_IDS.EJECTION_SNATCH]: 'Elongation-amplified snatch',
  [LOAD_PATH_CASE_IDS.MAIN_SNATCH]: 'Main snatch proxy',
  [LOAD_PATH_CASE_IDS.OPENING_SHOCK]: 'Main opening shock',
})

const NO_MASS_REASON = 'No rocket mass is entered, so no load is evaluated.'

const finitePositive = (value) => {
  const n = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}

const evaluatedCase = (id, force_lbs) => ({
  id,
  label: LABELS[id],
  force_lbs,
  status: 'evaluated',
  source: SOURCES[id],
  reason: null,
})

const unavailableCase = (id, reason) => ({
  id,
  label: LABELS[id],
  force_lbs: null,
  status: 'unavailable',
  source: SOURCES[id],
  reason,
})

function mainSnatchReason(reason) {
  switch (reason) {
    case 'single-deploy-no-main':
      return 'No main parachute is selected.'
    case 'single-deploy-no-drogue':
      return 'No drogue parachute is selected.'
    case 'missing-cord':
      return 'No shock cord is selected.'
    case 'invalid-cord-or-input-values':
      return 'The shock cord or entered inputs are incomplete (mass, deploy altitude, strength, length, elongation).'
    default:
      return 'Main snatch screening is unavailable for the selected hardware.'
  }
}

function openingShockReason(ctx) {
  if (!ctx.config?.main_chute) return 'No main parachute is selected.'
  if (!ctx.config?.drogue_chute) return 'No drogue parachute is selected.'
  if (!ctx.mass_kg) return NO_MASS_REASON
  return 'The main chute diameter or drogue approach velocity is unavailable.'
}

function buildLoadCases(ctx) {
  const ejectionForce = finitePositive(ctx.required_lbs)
  const cases = [
    ejectionForce != null
      ? evaluatedCase(LOAD_PATH_CASE_IDS.EJECTION, ejectionForce)
      : unavailableCase(LOAD_PATH_CASE_IDS.EJECTION, NO_MASS_REASON),
  ]

  const snatch = computeEjectionSnatchLoad(ctx)
  if (snatch && finitePositive(snatch.force_lbs) != null) {
    cases.push(evaluatedCase(LOAD_PATH_CASE_IDS.EJECTION_SNATCH, snatch.force_lbs))
  } else if (!ctx.mass_kg) {
    cases.push(unavailableCase(LOAD_PATH_CASE_IDS.EJECTION_SNATCH, NO_MASS_REASON))
  } else if (!ctx.config?.shock_cord) {
    cases.push(unavailableCase(LOAD_PATH_CASE_IDS.EJECTION_SNATCH, 'No shock cord is selected.'))
  } else {
    cases.push(
      unavailableCase(
        LOAD_PATH_CASE_IDS.EJECTION_SNATCH,
        'The selected shock cord has no elongation, so no snatch amplification is evaluated.'
      )
    )
  }

  const mainSnatch = ctx.main_snatch
  const mainSnatchForce =
    mainSnatch?.status !== 'unavailable' ? finitePositive(mainSnatch?.peak_force_proxy_lbs) : null
  if (mainSnatchForce != null) {
    cases.push(evaluatedCase(LOAD_PATH_CASE_IDS.MAIN_SNATCH, mainSnatchForce))
  } else if (!ctx.mass_kg) {
    cases.push(unavailableCase(LOAD_PATH_CASE_IDS.MAIN_SNATCH, NO_MASS_REASON))
  } else {
    cases.push(
      unavailableCase(LOAD_PATH_CASE_IDS.MAIN_SNATCH, mainSnatchReason(mainSnatch?.reason))
    )
  }

  const { opening } = computeOpeningShockForContext(ctx)
  const openingForce = opening?.status === 'evaluated' ? finitePositive(opening.force_lbs) : null
  if (openingForce != null) {
    cases.push(evaluatedCase(LOAD_PATH_CASE_IDS.OPENING_SHOCK, openingForce))
  } else {
    cases.push(unavailableCase(LOAD_PATH_CASE_IDS.OPENING_SHOCK, openingShockReason(ctx)))
  }

  return cases
}

function ratingFor(slot, part) {
  return finitePositive(part?.specs?.[RATING_FIELDS[slot]])
}

function buildElement(slot, part, loadCases) {
  const rating_lbs = ratingFor(slot, part)
  const margins =
    rating_lbs == null
      ? []
      : loadCases
          .filter((loadCase) => loadCase.status === 'evaluated')
          .map((loadCase) => {
            const ratio = rating_lbs / loadCase.force_lbs
            // Opening shock is classified by the same criterion rule_openingShock
            // uses (force / rating), so the view never disagrees with the
            // compatibility warning for that case. Every other case uses the
            // shared strength-margin criterion (rating / force).
            const criterion =
              loadCase.id === LOAD_PATH_CASE_IDS.OPENING_SHOCK
                ? evaluateCriterion(
                    CRITERION_IDS.OPENING_SHOCK_RATIO,
                    loadCase.force_lbs / rating_lbs
                  )
                : evaluateCriterion(CRITERION_IDS.STRENGTH_MARGIN, ratio)
            return {
              caseId: loadCase.id,
              ratio,
              criterionId: criterion.criterionId,
              category: criterion.category,
              severity: criterion.severity,
            }
          })
  // The governing case is the one that consumes the most of the element's
  // rating. Ties keep the earlier load case (ejection is listed first).
  const governing = margins.length
    ? margins.reduce((lowest, margin) => (margin.ratio < lowest.ratio ? margin : lowest))
    : null
  return {
    slot,
    name: typeof part?.name === 'string' && part.name.length > 0 ? part.name : null,
    rating_lbs,
    margins,
    governing,
  }
}

const lowestRating = (left, right) => (right.rating_lbs < left.rating_lbs ? right : left)

const largestForce = (left, right) => (right.force_lbs > left.force_lbs ? right : left)

export function computeLoadPath({ config = {}, specs = {} } = {}) {
  const ctx = buildCompatibilityContext({ config, specs })
  const loadCases = buildLoadCases(ctx)
  const elements = CHAIN_SLOTS.filter((slot) => config?.[slot]).map((slot) =>
    buildElement(slot, config[slot], loadCases)
  )

  const ratedElements = elements.filter((element) => element.rating_lbs != null)
  const evaluatedCases = loadCases.filter((loadCase) => loadCase.status === 'evaluated')

  let status
  if (elements.length === 0 || ctx.mass_kg == null) {
    status = 'unavailable'
  } else if (
    elements.some((element) => element.rating_lbs == null) ||
    loadCases.some((loadCase) => loadCase.status !== 'evaluated')
  ) {
    status = 'partial'
  } else {
    status = 'evaluated'
  }

  return {
    model: LOAD_PATH_MODEL,
    status,
    elements,
    loadCases,
    governingCase: evaluatedCases.length ? evaluatedCases.reduce(largestForce) : null,
    weakestLink: ratedElements.length ? ratedElements.reduce(lowestRating) : null,
    limitations: [
      'The chain is modeled as a series: every evaluated load case is assumed to pass through every selected element in order.',
      'Airframe attachment points (eye bolts, U-bolts, bulkheads) are not modeled.',
      'Catalog ratings are published part ratings, not certified working loads.',
      'Load cases are screening proxies computed by the existing compatibility and recovery-load models, not measured flight loads.',
    ],
  }
}
