import { currentResultOrNull } from './assessment.js'
import { parseSpec } from './schema.js'

/**
 * Ordered deployment sequence for the selected recovery architecture.
 *
 * This module is a presentation view model over `runSimulation`'s already
 * rounded result fields. It deliberately computes no physics:
 *
 *   - apogee          → result.apogee_ft / result.apogee_t_s
 *   - main deployment → result.deploy_ft at apogee_t_s + phase1_time_s
 *   - landing         → 0 ft AGL at apogee_t_s + total_time_s
 *   - burnout         → result.burnout_t_s (altitude and velocity are not
 *                       exposed by the result and stay null)
 *
 * `source` records provenance at event granularity: `'simulation'` when any of
 * the event's numbers come from a current result, `'input'` when the only
 * known number is an entered spec (main deploy altitude while the result is
 * stale or missing), and `null` when nothing numeric is known.
 */

export const DEPLOYMENT_SEQUENCE_MODEL = 'deployment-sequence-v1'

export const DEPLOYMENT_ARCHITECTURES = Object.freeze({
  DUAL_DEPLOY: 'dual-deploy',
  CHUTE_RELEASE: 'chute-release',
  SINGLE_DEPLOY_MAIN: 'single-deploy-main',
  DROGUE_ONLY: 'drogue-only',
  NONE: 'none',
})

const ARCHITECTURE_LABELS = Object.freeze({
  [DEPLOYMENT_ARCHITECTURES.DUAL_DEPLOY]: 'Dual deploy (drogue + main)',
  [DEPLOYMENT_ARCHITECTURES.CHUTE_RELEASE]: 'Chute release (main + chute-mounted device)',
  [DEPLOYMENT_ARCHITECTURES.SINGLE_DEPLOY_MAIN]: 'Single deploy (main only)',
  [DEPLOYMENT_ARCHITECTURES.DROGUE_ONLY]: 'Drogue only (no main parachute)',
  [DEPLOYMENT_ARCHITECTURES.NONE]: 'No canopy selected',
})

const has = (value) => Boolean(value)

/**
 * Architecture from selected slots only, mirroring the vocabulary the app's
 * compatibility rules already use: drogue + main is dual deploy, main alone is
 * single deploy, and a chute-mounted device beside the main is a chute release.
 */
export function resolveDeploymentArchitecture(config = {}) {
  const main = has(config?.main_chute)
  const drogue = has(config?.drogue_chute)
  const chuteDevice = has(config?.chute_device)

  if (drogue && main) return DEPLOYMENT_ARCHITECTURES.DUAL_DEPLOY
  if (main && chuteDevice) return DEPLOYMENT_ARCHITECTURES.CHUTE_RELEASE
  if (main) return DEPLOYMENT_ARCHITECTURES.SINGLE_DEPLOY_MAIN
  if (drogue) return DEPLOYMENT_ARCHITECTURES.DROGUE_ONLY
  return DEPLOYMENT_ARCHITECTURES.NONE
}

const finiteOrNull = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

const sumTimes = (left, right) => {
  const a = finiteOrNull(left)
  const b = finiteOrNull(right)
  return a != null && b != null ? a + b : null
}

function eventSource(result, values) {
  if (result && values.some((value) => value != null)) return 'simulation'
  return values.some((value) => value != null) ? 'input' : null
}

function deploymentEvent(architecture, deployAltitude, deployTime, approachVelocity, source) {
  const chuteRelease = architecture === DEPLOYMENT_ARCHITECTURES.CHUTE_RELEASE
  return {
    id: 'main-deployment',
    label: chuteRelease ? 'Main release' : 'Main deployment',
    trigger: chuteRelease
      ? 'Chute-mounted device releases the main at the deployment altitude'
      : 'Main-deploy event at the deployment altitude',
    altitude_ft: deployAltitude,
    time_s: deployTime,
    velocity_fps: approachVelocity,
    source,
  }
}

function architectureLimitations(architecture) {
  switch (architecture) {
    case DEPLOYMENT_ARCHITECTURES.CHUTE_RELEASE:
      return [
        'A chute-release main is modeled like dual deploy: the simulation holds the selected main and uses a fixed 100 ft/s stand-in descent rate above the main deploy altitude, then the main chute rate below it.',
        'The architecture label reflects the selected slots; a chute-mounted device only performs the release when it is a programmable release device, which the compatibility check verifies when the device declares a deployment-altitude range.',
      ]
    case DEPLOYMENT_ARCHITECTURES.SINGLE_DEPLOY_MAIN:
      return [
        'With no drogue chute the simulation uses a fixed 100 ft/s stand-in descent rate above the main deploy altitude; it is not a computed free-fall rate.',
      ]
    case DEPLOYMENT_ARCHITECTURES.DROGUE_ONLY:
      return [
        'With no main chute the simulation continues at the drogue descent rate below the main deploy altitude; no separate main phase is modeled.',
        'The compatibility rules mark a plan without a main parachute as an incomplete recovery system.',
      ]
    case DEPLOYMENT_ARCHITECTURES.NONE:
      return [
        'No canopy is selected. The simulation still uses its fixed 100 ft/s stand-in descent rate, so any sequence numbers do not represent a recovery system.',
        'The compatibility rules mark a plan without a main parachute as an incomplete recovery system.',
      ]
    default:
      return []
  }
}

export function buildDeploymentSequence({
  config = {},
  specs = {},
  simulation = null,
  resultFresh = false,
} = {}) {
  const resultStatus = !simulation ? 'not-run' : resultFresh ? 'current' : 'stale'
  const result = currentResultOrNull(simulation, resultStatus === 'current')
  const architecture = resolveDeploymentArchitecture(config)
  const hasMain =
    architecture !== DEPLOYMENT_ARCHITECTURES.DROGUE_ONLY &&
    architecture !== DEPLOYMENT_ARCHITECTURES.NONE
  const hasDrogue =
    architecture === DEPLOYMENT_ARCHITECTURES.DUAL_DEPLOY ||
    architecture === DEPLOYMENT_ARCHITECTURES.DROGUE_ONLY

  const apogeeAltitude = result ? finiteOrNull(result.apogee_ft) : null
  // Without a burn time the simulation estimates apogee heuristically and
  // leaves apogee_t_s at a 0 placeholder, so elapsed-from-liftoff times are
  // unknown. Descent durations are still modeled and are reported relative to
  // apogee instead.
  const ascentTimed = Boolean(result) && result.apogee_method !== 'heuristic'
  const apogeeTime = ascentTimed ? finiteOrNull(result.apogee_t_s) : null
  const afterApogee = (value) => (result ? finiteOrNull(value) : null)
  // The simulation stops integrating ascent at its zero-velocity turnaround, so
  // apogee and ground contact are modeled at 0 ft/s and 0 ft AGL respectively.
  const apogeeVelocity = result && apogeeAltitude != null ? 0 : null

  const events = [
    {
      id: 'liftoff',
      label: 'Liftoff',
      trigger: 'Motor ignition on the pad',
      altitude_ft: result ? 0 : null,
      time_s: result ? 0 : null,
      velocity_fps: result ? 0 : null,
      source: result ? 'simulation' : null,
    },
  ]

  if (!result || result.burnout_t_s != null) {
    const burnoutTime = result ? finiteOrNull(result.burnout_t_s) : null
    events.push({
      id: 'burnout',
      label: 'Burnout',
      trigger: 'Motor thrust ends',
      altitude_ft: null,
      time_s: burnoutTime,
      velocity_fps: null,
      source: eventSource(result, [burnoutTime]),
    })
  }

  events.push({
    id: 'apogee',
    label: hasDrogue ? 'Apogee — drogue deployment' : 'Apogee — free-fall begins',
    trigger: hasDrogue
      ? 'Apogee detected; drogue deploys'
      : hasMain
        ? 'Apogee detected; no drogue selected, main remains packed'
        : 'Apogee detected; no canopy selected',
    altitude_ft: apogeeAltitude,
    time_s: apogeeTime,
    time_after_apogee_s: afterApogee(0),
    velocity_fps: apogeeVelocity,
    source: eventSource(result, [apogeeAltitude, apogeeTime, apogeeVelocity]),
  })

  if (hasMain) {
    const enteredDeployAltitude = parseSpec('main_deploy_alt_ft', specs?.main_deploy_alt_ft)
    const resultDeployAltitude = result ? finiteOrNull(result.deploy_ft) : null
    const deployAltitude = resultDeployAltitude ?? enteredDeployAltitude
    const deployTime = ascentTimed ? sumTimes(result.apogee_t_s, result.phase1_time_s) : null
    const approachVelocity = result ? finiteOrNull(result.drogue_fps) : null
    // The altitude can be an entered spec while the time and approach speed are
    // simulation fields; label the event by the strongest provenance present.
    const hasSimulationValue =
      result != null &&
      (resultDeployAltitude != null || deployTime != null || approachVelocity != null)
    const deploySource = hasSimulationValue ? 'simulation' : deployAltitude != null ? 'input' : null
    events.push({
      ...deploymentEvent(architecture, deployAltitude, deployTime, approachVelocity, deploySource),
      time_after_apogee_s: afterApogee(result?.phase1_time_s),
    })
  }

  const landingAltitude = result ? 0 : null
  const landingTime = ascentTimed ? sumTimes(result.apogee_t_s, result.total_time_s) : null
  const landingVelocity = result
    ? (finiteOrNull(result.main_fps) ?? finiteOrNull(result.drogue_fps))
    : null
  events.push({
    id: 'landing',
    label: 'Landing',
    trigger: 'Ground contact at the modeled terminal descent rate',
    altitude_ft: landingAltitude,
    time_s: landingTime,
    time_after_apogee_s: afterApogee(result?.total_time_s),
    velocity_fps: landingVelocity,
    source: eventSource(result, [landingAltitude, landingTime, landingVelocity]),
  })

  const limitations = [
    ascentTimed || !result
      ? 'Event times are elapsed seconds from liftoff; altitudes are above ground level as modeled.'
      : 'Altitudes are above ground level as modeled.',
    'The simulation uses one terminal velocity per phase with no opening transient; times and speeds shown here are its rounded result fields.',
    'Ejection-charge sizing and deployment-hardware timing are not modeled.',
    ...architectureLimitations(architecture),
  ]
  if (result && !ascentTimed) {
    limitations.push(
      'No burn time was entered, so apogee is a heuristic estimate with no ascent timing; descent events are timed from apogee instead of liftoff.'
    )
  }
  if (resultStatus !== 'current') {
    limitations.push(
      'Simulation-derived values are withheld until a current result exists; entered deployment altitudes remain visible.'
    )
  }

  return {
    model: DEPLOYMENT_SEQUENCE_MODEL,
    architecture,
    architectureLabel: ARCHITECTURE_LABELS[architecture],
    events,
    resultStatus,
    ascentTimed,
    limitations,
  }
}
