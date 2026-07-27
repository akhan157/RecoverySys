import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AnalysisTab from '../components/tabs/AnalysisTab.jsx'
import PrintChecklist from '../components/PrintChecklist.jsx'
import SimulationTab from '../components/tabs/SimulationTab.jsx'
import { checkCompatibility } from '../lib/compatibility.js'
import { computeDrogueDeploymentVelocity, computeMainSnatchLoad } from '../lib/recoveryLoad.js'

vi.mock('../components/FlightChart.jsx', () => ({
  default: () => <div data-testid="flight-chart" />,
}))

afterEach(cleanup)

const specs = {
  rocket_mass_g: '2500',
  motor_total_impulse_ns: '2000',
  burn_time_s: '5',
  airframe_id_in: '4',
  bay_length_in: '18',
  main_deploy_alt_ft: '500',
  wind_speed_mph: '10',
}
const main = { name: 'Main', specs: { diameter_in: 36, cd: 1.5, shape: 'flat' } }
const drogue = { name: 'Drogue', specs: { diameter_in: 12, cd: 1.5 } }
const cord = {
  name: 'Cord',
  specs: { strength_lbs: 2000, length_ft: 15, elongation_pct: 22, material: 'nylon' },
}
const config = { main_chute: main, drogue_chute: drogue, shock_cord: cord }

function canonicalSimulation() {
  const approachVelocity = computeDrogueDeploymentVelocity(drogue.specs, 2.5, 500)
  const mainSnatch = computeMainSnatchLoad({
    config,
    mass_kg: 2.5,
    deploy_alt_ft: 500,
    approach_velocity_fps: approachVelocity,
  })
  return {
    apogee_ft: 6000,
    apogee_method: 'rk4',
    apogee_t_s: 30,
    burnout_t_s: 5,
    drogue_fps: 50,
    main_fps: 12,
    phase1_time_s: 100,
    phase2_time_s: 42,
    total_time_s: 142,
    drift_ft: 1000,
    deploy_ft: 500,
    landing_ke_ftlbf: 20,
    timeline: [],
    shock_load: null,
    main_snatch: mainSnatch,
  }
}

function simulationAtMargin(targetMargin) {
  const reference = canonicalSimulation()
  const strength_lbs =
    cord.specs.strength_lbs * (targetMargin / reference.main_snatch.rating_margin) ** 2
  const statusConfig = {
    ...config,
    shock_cord: { ...cord, specs: { ...cord.specs, strength_lbs } },
  }
  const approach_velocity_fps = computeDrogueDeploymentVelocity(drogue.specs, 2.5, 500)
  return {
    ...reference,
    main_snatch: computeMainSnatchLoad({
      config: statusConfig,
      mass_kg: 2.5,
      deploy_alt_ft: 500,
      approach_velocity_fps,
    }),
  }
}

function stateFor(simulation, warnings = []) {
  return { simulation, resultFresh: true, specs, config, warnings }
}

describe('canonical main snatch component contract', () => {
  it.each([
    [1.5, 'MARGINAL'],
    [0.75, 'EXCEEDS RATING'],
    [2.5, 'SCREENED'],
  ])('displays canonical %s status and rating margin in every surface', (targetMargin, label) => {
    const simulation = simulationAtMargin(targetMargin)
    expect(simulation.main_snatch.status).toBe(label.toLowerCase().replace(' ', '_'))

    render(<SimulationTab state={stateFor(simulation)} runSim={vi.fn()} canRun resultFresh />)
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(
      screen.getByText(
        simulation.main_snatch.rating_margin.toLocaleString(undefined, { maximumFractionDigits: 2 })
      )
    ).toBeInTheDocument()
    cleanup()

    render(<AnalysisTab state={stateFor(simulation)} />)
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(
      screen.getByText(
        simulation.main_snatch.rating_margin.toLocaleString(undefined, { maximumFractionDigits: 2 })
      )
    ).toBeInTheDocument()
    cleanup()

    render(
      <PrintChecklist
        specs={specs}
        config={config}
        simulation={simulation}
        resultFresh
        warnings={[]}
      />
    )
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(String(simulation.main_snatch.rating_margin))).toBeInTheDocument()
  })

  it('renders canonical force, velocity, extension, and source in SimulationTab', () => {
    const simulation = canonicalSimulation()
    render(<SimulationTab state={stateFor(simulation)} runSim={vi.fn()} canRun resultFresh />)
    expect(screen.getByText(/ESTIMATED_MAIN_DEPLOYMENT_SNATCH/)).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(
          `${simulation.main_snatch.peak_force_proxy_lbs.toLocaleString(undefined, { maximumFractionDigits: 2 })} lbs`
        )
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(
          `${simulation.main_snatch.approach_velocity_fps.toLocaleString(undefined, { maximumFractionDigits: 2 })} ft/s`
        )
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(
          `${simulation.main_snatch.predicted_extension_m.toLocaleString(undefined, { maximumFractionDigits: 2 })} m`
        )
      )
    ).toBeInTheDocument()
    expect(screen.getByText(simulation.main_snatch.approach_velocity_source)).toBeInTheDocument()
  })

  it('keeps marginal compatibility non-nominal in SimulationTab', () => {
    const simulation = simulationAtMargin(1.5)
    const marginalConfig = {
      ...config,
      shock_cord: {
        ...cord,
        specs: {
          ...cord.specs,
          strength_lbs:
            cord.specs.strength_lbs * (1.5 / canonicalSimulation().main_snatch.rating_margin) ** 2,
        },
      },
    }
    const warnings = checkCompatibility({ config: marginalConfig, specs })
    expect(simulation.main_snatch.status).toBe('marginal')
    expect(
      warnings.some(
        (warning) => warning.level === 'warn' && warning.message.includes('is marginal')
      )
    ).toBe(true)

    render(
      <SimulationTab state={stateFor(simulation, warnings)} runSim={vi.fn()} canRun resultFresh />
    )
    expect(screen.getByText('MARGINAL')).toBeInTheDocument()
    expect(screen.queryAllByText('✓ ALL_SYSTEMS_NOMINAL')).toHaveLength(0)
  })

  it('renders canonical force, velocity, extension, and source in AnalysisTab', () => {
    const simulation = canonicalSimulation()
    render(<AnalysisTab state={stateFor(simulation)} />)
    expect(screen.getByText(/ESTIMATED_MAIN_DEPLOYMENT_SNATCH/)).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(
          `${simulation.main_snatch.peak_force_proxy_lbs.toLocaleString(undefined, { maximumFractionDigits: 2 })} lbs`
        )
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(
          `${simulation.main_snatch.approach_velocity_fps.toLocaleString(undefined, { maximumFractionDigits: 2 })} ft/s`
        )
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        new RegExp(
          `${simulation.main_snatch.predicted_extension_m.toLocaleString(undefined, { maximumFractionDigits: 2 })} m`
        )
      )
    ).toBeInTheDocument()
    expect(screen.getByText(simulation.main_snatch.approach_velocity_source)).toBeInTheDocument()
  })

  it('renders canonical force, velocity, extension, and source in PrintChecklist', () => {
    const simulation = canonicalSimulation()
    render(
      <PrintChecklist
        specs={specs}
        config={config}
        simulation={simulation}
        resultFresh
        warnings={[]}
      />
    )
    expect(
      screen.getByText(new RegExp(`${simulation.main_snatch.peak_force_proxy_lbs} lbs`))
    ).toBeInTheDocument()
    expect(
      screen.getByText(`${simulation.main_snatch.approach_velocity_fps} ft/s`)
    ).toBeInTheDocument()
    expect(
      screen.getByText(`${simulation.main_snatch.predicted_extension_m} m`)
    ).toBeInTheDocument()
    expect(
      screen.getByText(new RegExp(simulation.main_snatch.approach_velocity_source))
    ).toBeInTheDocument()
  })
})

describe('unavailable canonical main snatch contract', () => {
  it('renders Not Evaluated and the core reason, without all-nominal safety state', () => {
    const unavailable = computeMainSnatchLoad({
      config: { main_chute: main, drogue_chute: drogue },
      mass_kg: 2.5,
      deploy_alt_ft: 500,
      approach_velocity_fps: computeDrogueDeploymentVelocity(drogue.specs, 2.5, 500),
    })
    const warnings = checkCompatibility({
      config: { main_chute: main, drogue_chute: drogue },
      specs,
    })
    expect(unavailable.status).toBe('unavailable')
    expect(warnings.some((warning) => warning.message.includes(unavailable.reason))).toBe(true)

    const simulation = { ...canonicalSimulation(), main_snatch: unavailable }
    render(
      <SimulationTab state={stateFor(simulation, warnings)} runSim={vi.fn()} canRun resultFresh />
    )
    expect(screen.getByText('NOT EVALUATED')).toBeInTheDocument()
    expect(screen.getByText(unavailable.reason)).toBeInTheDocument()
    expect(screen.queryByText('✓ ALL_SYSTEMS_NOMINAL')).not.toBeInTheDocument()
  })

  it('renders Not Evaluated and the same core reason in AnalysisTab and PrintChecklist', () => {
    const unavailable = computeMainSnatchLoad({
      config: { main_chute: main, drogue_chute: drogue },
    })
    const simulation = { ...canonicalSimulation(), main_snatch: unavailable }
    render(<AnalysisTab state={stateFor(simulation)} />)
    expect(screen.getByText('NOT EVALUATED')).toBeInTheDocument()
    expect(screen.getByText(unavailable.reason)).toBeInTheDocument()
    cleanup()
    render(
      <PrintChecklist
        specs={specs}
        config={{ main_chute: main, drogue_chute: drogue }}
        simulation={simulation}
        resultFresh
        warnings={[]}
      />
    )
    expect(screen.getAllByText('NOT EVALUATED')).toHaveLength(2)
    expect(screen.getByText(unavailable.reason)).toBeInTheDocument()
  })
})
