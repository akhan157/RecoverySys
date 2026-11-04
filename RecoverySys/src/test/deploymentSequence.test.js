import { describe, expect, it } from 'vitest'
import {
  buildDeploymentSequence,
  DEPLOYMENT_SEQUENCE_MODEL,
  resolveDeploymentArchitecture,
} from '../lib/deploymentSequence.js'
import { buildRecoveryBrief } from '../lib/recoveryBrief.js'
import { runSimulation } from '../lib/simulation.js'

const specs = {
  rocket_mass_g: '2500',
  motor_total_impulse_ns: '640',
  burn_time_s: '1.8',
  airframe_id_in: '3.9',
  drag_cd: '0.5',
  main_deploy_alt_ft: '700',
}

const main = { name: 'Main', specs: { diameter_in: 36, cd: 1.5 } }
const drogue = { name: 'Drogue', specs: { diameter_in: 12, cd: 0.9 } }
const chuteDevice = {
  name: 'Chute Release',
  specs: { deploy_alt_min_ft: 100, deploy_alt_max_ft: 5000 },
}

const dualConfig = { main_chute: main, drogue_chute: drogue }
const singleConfig = { main_chute: main }
const releaseConfig = { main_chute: main, chute_device: chuteDevice }
const drogueOnlyConfig = { drogue_chute: drogue }

function sequenceFor(config, overrides = {}) {
  const simulation = runSimulation({ specs, config })
  expect(simulation).not.toBeNull()
  return {
    simulation,
    sequence: buildDeploymentSequence({
      config,
      specs,
      simulation,
      resultFresh: true,
      ...overrides,
    }),
  }
}

function eventsById(sequence) {
  return Object.fromEntries(sequence.events.map((event) => [event.id, event]))
}

describe('deployment architecture', () => {
  it('derives every architecture from selected slots', () => {
    expect(resolveDeploymentArchitecture(dualConfig)).toBe('dual-deploy')
    expect(resolveDeploymentArchitecture(releaseConfig)).toBe('chute-release')
    expect(resolveDeploymentArchitecture(singleConfig)).toBe('single-deploy-main')
    expect(resolveDeploymentArchitecture(drogueOnlyConfig)).toBe('drogue-only')
    expect(resolveDeploymentArchitecture({})).toBe('none')
    // A drogue beside the main always wins over the chute-mounted device.
    expect(resolveDeploymentArchitecture({ ...dualConfig, chute_device: chuteDevice })).toBe(
      'dual-deploy'
    )
  })

  it('is versioned and safe with no inputs at all', () => {
    const sequence = buildDeploymentSequence()
    expect(sequence.model).toBe(DEPLOYMENT_SEQUENCE_MODEL)
    expect(sequence.architecture).toBe('none')
    expect(sequence.resultStatus).toBe('not-run')
    expect(sequence.events.map((event) => event.id)).toEqual([
      'liftoff',
      'burnout',
      'apogee',
      'landing',
    ])
  })
})

describe('deployment sequence simulation mapping', () => {
  it('mirrors a current dual-deploy result field for field', () => {
    const { simulation, sequence } = sequenceFor(dualConfig)
    expect(sequence.resultStatus).toBe('current')
    expect(sequence.architecture).toBe('dual-deploy')
    expect(sequence.events.map((event) => event.id)).toEqual([
      'liftoff',
      'burnout',
      'apogee',
      'main-deployment',
      'landing',
    ])

    const events = eventsById(sequence)
    expect(events.liftoff).toMatchObject({
      altitude_ft: 0,
      time_s: 0,
      velocity_fps: 0,
      source: 'simulation',
    })
    expect(events.burnout.time_s).toBe(simulation.burnout_t_s)
    expect(events.burnout.source).toBe('simulation')
    expect(events.apogee.altitude_ft).toBe(simulation.apogee_ft)
    expect(events.apogee.time_s).toBe(simulation.apogee_t_s)
    expect(events.apogee.velocity_fps).toBe(0)
    expect(events.apogee.source).toBe('simulation')
    expect(events['main-deployment'].altitude_ft).toBe(simulation.deploy_ft)
    expect(events['main-deployment'].time_s).toBe(simulation.apogee_t_s + simulation.phase1_time_s)
    expect(events['main-deployment'].velocity_fps).toBe(simulation.drogue_fps)
    expect(events['main-deployment'].source).toBe('simulation')
    expect(events.landing.altitude_ft).toBe(0)
    expect(events.landing.time_s).toBe(simulation.apogee_t_s + simulation.total_time_s)
    expect(events.landing.velocity_fps).toBe(simulation.main_fps)
    expect(events.landing.source).toBe('simulation')
  })

  it('omits burnout when the current result has no burnout field', () => {
    const heuristics = {
      rocket_mass_g: '2500',
      motor_total_impulse_ns: '640',
      main_deploy_alt_ft: '700',
    }
    const simulation = runSimulation({ specs: heuristics, config: dualConfig })
    expect(simulation).not.toBeNull()
    expect(simulation.burnout_t_s).toBeNull()
    const sequence = buildDeploymentSequence({
      config: dualConfig,
      specs: heuristics,
      simulation,
      resultFresh: true,
    })
    expect(sequence.events.map((event) => event.id)).toEqual([
      'liftoff',
      'apogee',
      'main-deployment',
      'landing',
    ])
    // Heuristic apogee has a 0 s placeholder apogee time; the sequence must not
    // present it, or deploy/landing times derived from it, as elapsed time.
    expect(simulation.apogee_method).toBe('heuristic')
    expect(sequence.ascentTimed).toBe(false)
    const events = Object.fromEntries(sequence.events.map((event) => [event.id, event]))
    expect(events.apogee.time_s).toBeNull()
    expect(events['main-deployment'].time_s).toBeNull()
    expect(events.landing.time_s).toBeNull()
    expect(events['main-deployment'].time_after_apogee_s).toBe(simulation.phase1_time_s)
    expect(events.landing.time_after_apogee_s).toBe(simulation.total_time_s)
    expect(sequence.limitations.join(' ')).toMatch(/timed from apogee/)
  })

  it('never lets a stale result contribute simulation numbers', () => {
    const { simulation } = sequenceFor(dualConfig)
    const sequence = buildDeploymentSequence({
      config: dualConfig,
      specs,
      simulation,
      resultFresh: false,
    })
    expect(sequence.resultStatus).toBe('stale')
    const events = eventsById(sequence)
    for (const id of ['liftoff', 'burnout', 'apogee', 'landing']) {
      expect(events[id]).toMatchObject({
        altitude_ft: null,
        time_s: null,
        velocity_fps: null,
        source: null,
      })
    }
    // The entered main deploy altitude is not a simulation output.
    expect(events['main-deployment']).toMatchObject({
      altitude_ft: 700,
      time_s: null,
      velocity_fps: null,
      source: 'input',
    })
    expect(sequence.limitations.join(' ')).toMatch(/withheld until a current result exists/i)
  })

  it('labels a partial current result deploy altitude as entered input', () => {
    const sequence = buildDeploymentSequence({
      config: singleConfig,
      specs,
      simulation: { apogee_ft: 3000, apogee_t_s: 20 },
      resultFresh: true,
    })
    const deployment = eventsById(sequence)['main-deployment']
    expect(deployment.altitude_ft).toBe(700)
    expect(deployment.time_s).toBeNull()
    expect(deployment.velocity_fps).toBeNull()
    expect(deployment.source).toBe('input')
  })

  it('keeps everything numeric unknown when no result exists', () => {
    const sequence = buildDeploymentSequence({
      config: dualConfig,
      specs,
      simulation: null,
      resultFresh: true,
    })
    expect(sequence.resultStatus).toBe('not-run')
    const events = eventsById(sequence)
    expect(events.liftoff).toMatchObject({ altitude_ft: null, time_s: null, velocity_fps: null })
    expect(events.apogee).toMatchObject({ altitude_ft: null, time_s: null, velocity_fps: null })
    expect(events.landing).toMatchObject({ altitude_ft: null, time_s: null, velocity_fps: null })
    expect(events['main-deployment']).toMatchObject({
      altitude_ft: 700,
      time_s: null,
      velocity_fps: null,
      source: 'input',
    })
  })

  it('discloses the 100 fps stand-in for a main-only plan', () => {
    const { simulation, sequence } = sequenceFor(singleConfig)
    expect(simulation.drogue_fps).toBe(100)
    expect(sequence.architecture).toBe('single-deploy-main')
    expect(eventsById(sequence).apogee.label).toBe('Apogee — free-fall begins')
    expect(eventsById(sequence)['main-deployment'].velocity_fps).toBe(100)
    expect(sequence.limitations.join(' ')).toMatch(/fixed 100 ft\/s stand-in/i)
  })

  it('models a chute release like dual deploy and says so', () => {
    const { simulation, sequence } = sequenceFor(releaseConfig)
    expect(sequence.architecture).toBe('chute-release')
    expect(simulation.drogue_fps).toBe(100)
    const deployment = eventsById(sequence)['main-deployment']
    expect(deployment.label).toBe('Main release')
    expect(deployment.velocity_fps).toBe(simulation.drogue_fps)
    expect(deployment.time_s).toBe(simulation.apogee_t_s + simulation.phase1_time_s)
    expect(sequence.limitations.join(' ')).toMatch(
      /chute-release main is modeled like dual deploy/i
    )
  })

  it('continues a drogue-only plan at the drogue rate below deploy altitude', () => {
    const { simulation, sequence } = sequenceFor(drogueOnlyConfig)
    expect(sequence.architecture).toBe('drogue-only')
    expect(simulation.main_fps).toBeNull()
    expect(sequence.events.map((event) => event.id)).toEqual([
      'liftoff',
      'burnout',
      'apogee',
      'landing',
    ])
    expect(eventsById(sequence).landing.velocity_fps).toBe(simulation.drogue_fps)
    expect(eventsById(sequence).landing.time_s).toBe(
      simulation.apogee_t_s + simulation.total_time_s
    )
    expect(sequence.limitations.join(' ')).toMatch(
      /continues at the drogue descent rate below the main deploy altitude/i
    )
  })

  it('labels a canopy-less plan as none and never invents a main event', () => {
    const simulation = runSimulation({ specs, config: {} })
    expect(simulation).not.toBeNull()
    const sequence = buildDeploymentSequence({
      config: {},
      specs,
      simulation,
      resultFresh: true,
    })
    expect(sequence.architecture).toBe('none')
    expect(sequence.events.map((event) => event.id)).not.toContain('main-deployment')
    expect(eventsById(sequence).landing.velocity_fps).toBe(simulation.drogue_fps)
    expect(sequence.limitations.join(' ')).toMatch(/no canopy is selected/i)
  })
})

describe('recovery brief deployment sequence', () => {
  it('adds the sequence without replacing existing brief fields', () => {
    const { simulation } = sequenceFor(dualConfig)
    const brief = buildRecoveryBrief({
      specs,
      config: dualConfig,
      simulation,
      resultFresh: true,
    })
    expect(brief.deploymentSequence.model).toBe(DEPLOYMENT_SEQUENCE_MODEL)
    expect(brief.deploymentSequence.architecture).toBe('dual-deploy')
    expect(brief.deploymentSequence.resultStatus).toBe('current')
    expect(brief.keyEstimates.apogee_ft).toBe(simulation.apogee_ft)
    expect(brief.recoveryMass.items.map((item) => item.slot)).toEqual([
      'main_chute',
      'drogue_chute',
    ])
  })

  it('carries stale status into the sequence', () => {
    const { simulation } = sequenceFor(dualConfig)
    const brief = buildRecoveryBrief({
      specs,
      config: dualConfig,
      simulation,
      resultFresh: false,
    })
    expect(brief.status).toBe('stale')
    expect(brief.deploymentSequence.resultStatus).toBe('stale')
    expect(brief.deploymentSequence.events[0].time_s).toBeNull()
  })
})
