import { describe, expect, it } from 'vitest'
import { buildCompatibilityContext, checkCompatibility } from '../lib/compatibility.js'
import { PHYSICS } from '../lib/constants.js'
import { CRITERION_IDS, evaluateCriterion } from '../lib/criteria.js'
import { LOAD_PATH_MODEL, computeLoadPath } from '../lib/loadPath.js'
import { computeDrogueDeploymentVelocity, computeOpeningShockLoad } from '../lib/recoveryLoad.js'

const specs = {
  rocket_mass_g: '2500',
  main_deploy_alt_ft: '500',
  ejection_g_factor: '20',
}

const main = {
  name: '42" Main',
  specs: { diameter_in: 42, cd: 1.5, shape: 'flat' },
}
const drogue = { name: '12" Drogue', specs: { diameter_in: 12, cd: 1.5 } }
const cord = {
  name: 'Nylon cord',
  specs: { strength_lbs: 1000, length_ft: 15, elongation_pct: 22, material: 'nylon' },
}
const links = { name: 'Quick links', specs: { strength_lbs: 880 } }
const swivel = { name: 'Swivel', specs: { rated_lbs: 400 } }

const fullConfig = {
  main_chute: main,
  drogue_chute: drogue,
  shock_cord: cord,
  quick_links: links,
  swivel,
}

const caseById = (loadPath, id) => loadPath.loadCases.find((loadCase) => loadCase.id === id)
const elementBySlot = (loadPath, slot) => loadPath.elements.find((element) => element.slot === slot)
const marginByCase = (element, caseId) => element.margins.find((margin) => margin.caseId === caseId)

describe('load path status', () => {
  it('is evaluated when every chain element is rated and every load case is available', () => {
    const loadPath = computeLoadPath({ config: fullConfig, specs })
    expect(loadPath.model).toBe(LOAD_PATH_MODEL)
    expect(loadPath.status).toBe('evaluated')
    expect(loadPath.elements.map((element) => element.slot)).toEqual([
      'shock_cord',
      'quick_links',
      'swivel',
    ])
    expect(loadPath.loadCases.every((loadCase) => loadCase.status === 'evaluated')).toBe(true)
    expect(loadPath.limitations).toHaveLength(4)
    expect(loadPath.limitations[0]).toMatch(/series/i)
    expect(loadPath.limitations[1]).toMatch(/attachment points/i)
    expect(loadPath.limitations[2]).toMatch(/not certified working loads/i)
    expect(loadPath.limitations[3]).toMatch(/screening proxies/i)
  })

  it('is unavailable when no chain element is selected', () => {
    const loadPath = computeLoadPath({
      config: { main_chute: main, drogue_chute: drogue },
      specs,
    })
    expect(loadPath.status).toBe('unavailable')
    expect(loadPath.elements).toEqual([])
    expect(loadPath.weakestLink).toBeNull()
  })

  it('is unavailable when no rocket mass is entered, even with chain hardware', () => {
    const loadPath = computeLoadPath({
      config: fullConfig,
      specs: { main_deploy_alt_ft: '500' },
    })
    expect(loadPath.status).toBe('unavailable')
    expect(loadPath.loadCases.every((loadCase) => loadCase.status === 'unavailable')).toBe(true)
    expect(loadPath.loadCases.every((loadCase) => loadCase.force_lbs === null)).toBe(true)
    expect(loadPath.loadCases.every((loadCase) => /mass/i.test(loadCase.reason))).toBe(true)
    expect(loadPath.governingCase).toBeNull()
    // Ratings stay visible so a planner can still see what is installed.
    expect(elementBySlot(loadPath, 'swivel').rating_lbs).toBe(400)
    expect(elementBySlot(loadPath, 'swivel').margins).toEqual([])
  })

  it('is partial when a selected chain element has no usable rating', () => {
    const loadPath = computeLoadPath({
      config: { ...fullConfig, swivel: { name: 'Unknown swivel', specs: {} } },
      specs,
    })
    expect(loadPath.status).toBe('partial')
    expect(elementBySlot(loadPath, 'swivel').rating_lbs).toBeNull()
    expect(elementBySlot(loadPath, 'swivel').governing).toBeNull()
    expect(loadPath.weakestLink.slot).toBe('quick_links')
  })

  it('is partial when some load cases cannot be evaluated', () => {
    const loadPath = computeLoadPath({
      config: {
        main_chute: main,
        shock_cord: cord,
        quick_links: links,
        swivel,
      },
      specs,
    })
    expect(loadPath.status).toBe('partial')
    expect(caseById(loadPath, 'main-snatch').status).toBe('unavailable')
    expect(caseById(loadPath, 'opening-shock').status).toBe('unavailable')
    expect(caseById(loadPath, 'main-snatch').reason).toMatch(/drogue/i)
  })
})

describe('load cases', () => {
  it('evaluates ejection pull from the entered mass and ejection g-factor', () => {
    const loadPath = computeLoadPath({ config: fullConfig, specs })
    const ejection = caseById(loadPath, 'ejection')
    expect(ejection.status).toBe('evaluated')
    expect(ejection.force_lbs).toBeCloseTo(110.23, 2)
    expect(ejection.source).toMatch(/compatibility\.js/)
  })

  it('omits every load case without a mass', () => {
    const loadPath = computeLoadPath({ config: fullConfig, specs: {} })
    for (const id of ['ejection', 'ejection-snatch', 'main-snatch', 'opening-shock']) {
      expect(caseById(loadPath, id).status).toBe('unavailable')
      expect(caseById(loadPath, id).force_lbs).toBeNull()
    }
  })

  it('evaluates the elongation-amplified snatch only for a cord with elongation', () => {
    const withElongation = computeLoadPath({ config: fullConfig, specs })
    expect(caseById(withElongation, 'ejection-snatch').status).toBe('evaluated')

    const zeroElongation = computeLoadPath({
      config: {
        ...fullConfig,
        shock_cord: { name: 'No stretch', specs: { ...cord.specs, elongation_pct: 0 } },
      },
      specs,
    })
    expect(caseById(zeroElongation, 'ejection-snatch').status).toBe('unavailable')
    expect(caseById(zeroElongation, 'ejection-snatch').reason).toMatch(/no elongation/i)

    const noCord = computeLoadPath({
      config: { main_chute: main, drogue_chute: drogue, quick_links: links },
      specs,
    })
    expect(caseById(noCord, 'ejection-snatch').status).toBe('unavailable')
    expect(caseById(noCord, 'ejection-snatch').reason).toMatch(/no shock cord/i)
  })

  it('evaluates the main snatch proxy only when the dual-deploy model is available', () => {
    const dual = computeLoadPath({ config: fullConfig, specs })
    const snatch = caseById(dual, 'main-snatch')
    expect(snatch.status).toBe('evaluated')
    expect(snatch.force_lbs).toBeGreaterThan(0)

    const single = computeLoadPath({
      config: { main_chute: main, shock_cord: cord, quick_links: links, swivel },
      specs,
    })
    expect(caseById(single, 'main-snatch').status).toBe('unavailable')
    expect(caseById(single, 'main-snatch').reason).toMatch(/no drogue parachute/i)
  })

  it('evaluates main opening shock only with a drogue approach velocity', () => {
    const dual = computeLoadPath({ config: fullConfig, specs })
    expect(caseById(dual, 'opening-shock').status).toBe('evaluated')
    expect(caseById(dual, 'opening-shock').force_lbs).toBeGreaterThan(0)

    const noDrogue = computeLoadPath({
      config: { main_chute: main, shock_cord: cord, quick_links: links, swivel },
      specs,
    })
    expect(caseById(noDrogue, 'opening-shock').status).toBe('unavailable')
    expect(caseById(noDrogue, 'opening-shock').reason).toMatch(/no drogue parachute/i)
    expect(caseById(noDrogue, 'opening-shock').force_lbs).toBeNull()
  })
})

describe('element margins', () => {
  it('rates the swivel from rated_lbs, never strength_lbs', () => {
    const loadPath = computeLoadPath({
      config: {
        ...fullConfig,
        swivel: { name: 'Rated swivel', specs: { rated_lbs: 400, strength_lbs: 9000 } },
      },
      specs,
    })
    expect(elementBySlot(loadPath, 'swivel').rating_lbs).toBe(400)
  })

  it('classifies margins at the strength threshold boundaries via the shared criterion', () => {
    const single = { shock_cord: cord }
    const force = caseById(computeLoadPath({ config: single, specs }), 'ejection').force_lbs
    const loadPathAt = (rating) =>
      computeLoadPath({
        config: {
          shock_cord: { name: 'Cord', specs: { ...cord.specs, strength_lbs: rating } },
        },
        specs,
      })
    const ejectionCategory = (rating) =>
      marginByCase(elementBySlot(loadPathAt(rating), 'shock_cord'), 'ejection').category

    // Below-rating is strictly `< 1`; 1.0 is still marginal (strict `< 1.5`).
    expect(ejectionCategory(force)).toBe('marginal')
    expect(ejectionCategory(force * 0.5)).toBe('below-rating')
    expect(ejectionCategory(force * 1.49)).toBe('marginal')
    expect(ejectionCategory(force * 1.51)).toBe('nominal')
    expect(ejectionCategory(force * 2)).toBe('nominal')

    // Every margin category is the shared STRENGTH_MARGIN evaluation of its ratio.
    for (const element of loadPathAt(force).elements) {
      for (const margin of element.margins) {
        expect(margin.category).toBe(
          evaluateCriterion(CRITERION_IDS.STRENGTH_MARGIN, margin.ratio).category
        )
      }
    }
    expect(evaluateCriterion(CRITERION_IDS.STRENGTH_MARGIN, 1.5).category).toBe('nominal')
    expect(evaluateCriterion(CRITERION_IDS.STRENGTH_MARGIN, 1.4999999).category).toBe('marginal')
  })

  it('reports only evaluated load cases in each element margin list', () => {
    const loadPath = computeLoadPath({
      config: { main_chute: main, shock_cord: cord, quick_links: links, swivel },
      specs,
    })
    const caseIds = loadPath.loadCases
      .filter((loadCase) => loadCase.status === 'evaluated')
      .map((loadCase) => loadCase.id)
    for (const element of loadPath.elements) {
      expect(element.margins.map((margin) => margin.caseId)).toEqual(caseIds)
    }
  })

  it('picks the governing margin case as the largest evaluated force', () => {
    const loadPath = computeLoadPath({ config: fullConfig, specs })
    const evaluated = loadPath.loadCases.filter((loadCase) => loadCase.status === 'evaluated')
    const largest = evaluated.reduce((best, loadCase) =>
      loadCase.force_lbs > best.force_lbs ? loadCase : best
    )
    expect(loadPath.governingCase.id).toBe(largest.id)
    expect(loadPath.governingCase.force_lbs).toBe(largest.force_lbs)
    for (const element of loadPath.elements) {
      expect(element.governing.caseId).toBe(largest.id)
    }
  })
})

describe('weakest link', () => {
  it('is the element with the lowest rating', () => {
    const loadPath = computeLoadPath({ config: fullConfig, specs })
    expect(loadPath.weakestLink.slot).toBe('swivel')
    expect(loadPath.weakestLink.rating_lbs).toBe(400)
  })

  it('keeps chain order for equal ratings', () => {
    const loadPath = computeLoadPath({
      config: {
        ...fullConfig,
        shock_cord: { name: 'Cord', specs: { ...cord.specs, strength_lbs: 880 } },
        quick_links: { name: 'Links', specs: { strength_lbs: 880 } },
        swivel: { name: 'Swivel', specs: { rated_lbs: 880 } },
      },
      specs,
    })
    expect(loadPath.weakestLink.slot).toBe('shock_cord')
  })
})

describe('parity with the existing compatibility path', () => {
  it('reuses every force the compatibility rules read, bit for bit', () => {
    const loadPath = computeLoadPath({ config: fullConfig, specs })
    const ctx = buildCompatibilityContext({ config: fullConfig, specs })

    // Ejection pull: independently re-derived from the shared physics constants.
    const ejection = (2.5 * PHYSICS.G * 20) / (1 / PHYSICS.LBS_PER_N)
    expect(caseById(loadPath, 'ejection').force_lbs).toBe(ejection)
    expect(caseById(loadPath, 'ejection').force_lbs).toBe(ctx.required_lbs)
    // The shock-cord static warning prints Math.ceil(required_lbs); the raw
    // value the rule compares ratings against is the one above.

    // Elongation-amplified snatch: the rule's own multiplier arithmetic.
    const snatch = ejection * Math.sqrt(1 / (22 / 100))
    expect(caseById(loadPath, 'ejection-snatch').force_lbs).toBe(snatch)

    // Main snatch: the exact proxy rule_shockCordStrength reads from ctx.
    expect(caseById(loadPath, 'main-snatch').force_lbs).toBe(ctx.main_snatch.peak_force_proxy_lbs)
    expect(ctx.main_snatch.status).not.toBe('unavailable')

    // Opening shock: the canonical model with rule_openingShock's inputs.
    const approach = computeDrogueDeploymentVelocity(drogue.specs, 2.5, 500)
    const opening = computeOpeningShockLoad({
      mainSpecs: main.specs,
      deploy_alt_ft: 500,
      approach_velocity_fps: approach,
    })
    expect(caseById(loadPath, 'opening-shock').force_lbs).toBe(opening.force_lbs)
  })

  it('does not change the compatibility warnings for the same input', () => {
    // Guard against the extraction moving any arithmetic: the two rules that
    // now share helpers still fire with their exact prior wording.
    const weak = {
      main_chute: main,
      drogue_chute: drogue,
      shock_cord: {
        name: 'Weak cord',
        specs: { strength_lbs: 30, length_ft: 10, elongation_pct: 10, material: 'nylon' },
      },
      quick_links: { name: 'Links', specs: { strength_lbs: 40 } },
      swivel: { name: 'Swivel', specs: { rated_lbs: 35 } },
    }
    const warnings = checkCompatibility({ config: weak, specs })
    const messages = warnings.map((warning) => warning.message)
    expect(
      messages.some((message) =>
        /^Shock cord rated 30 lbs may fail at ejection \(need ~\d+ lbs at 20G/.test(message)
      )
    ).toBe(true)
    expect(
      messages.some((message) =>
        /^Cord with 10% elongation amplifies snatch force ~3\.2×/.test(message)
      )
    ).toBe(true)
    expect(
      messages.some((message) => /^Main chute opening shock ~\d+ lbs at \d+ fps/.test(message))
    ).toBe(true)
  })
})
