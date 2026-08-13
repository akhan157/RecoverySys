import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SimulationTab from '../components/tabs/SimulationTab.jsx'
import DashboardTab from '../components/tabs/DashboardTab.jsx'
import PrintChecklist from '../components/PrintChecklist.jsx'
import RecoveryBriefTab from '../components/tabs/RecoveryBriefTab.jsx'
import SensitivityPanel from '../components/SensitivityPanel.jsx'
import { runSensitivity } from '../lib/sensitivity.js'

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
const main = { name: 'Main', specs: { diameter_in: 36, cd: 1.5 } }
const drogue = { name: 'Drogue', specs: { diameter_in: 12, cd: 1.5 } }
const config = { main_chute: main, drogue_chute: drogue }

const simulation = {
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
}

function stateFor(simulation, warnings = []) {
  return { simulation, resultFresh: true, specs, config, warnings }
}

describe('M2 stale-result and status-language closure', () => {
  it('never renders a checklist-pass conclusion from an empty warning list in SimulationTab', () => {
    render(<SimulationTab state={stateFor(simulation)} runSim={vi.fn()} canRun resultFresh />)
    expect(screen.queryByText('✓ ALL_SYSTEMS_NOMINAL')).not.toBeInTheDocument()
    expect(screen.queryByText(/No compatibility issues detected/i)).not.toBeInTheDocument()
    expect(screen.getByText('NO_COMPATIBILITY_WARNINGS_RECORDED')).toBeInTheDocument()
    expect(screen.getByText(/Absence of recorded warnings is not a clearance/i)).toBeInTheDocument()
  })

  it('never renders a checklist-pass conclusion from an empty warning list in PrintChecklist', () => {
    render(
      <PrintChecklist
        specs={specs}
        config={config}
        simulation={simulation}
        resultFresh
        warnings={[]}
      />
    )
    expect(screen.queryByText('All systems nominal')).not.toBeInTheDocument()
    expect(screen.getByText(/Absence of recorded warnings is not a clearance/i)).toBeInTheDocument()
  })

  it('classifies main descent in the dashboard summary at exact canonical boundaries', () => {
    const renderAt = (mainFps) =>
      render(
        <DashboardTab
          state={{ ...stateFor(simulation), simulation: { ...simulation, main_fps: mainFps } }}
          allParts={[]}
          customParts={[]}
          filledSlots={2}
          packingVolume={{}}
          hasWarnings={false}
          hasErrors={false}
          canRun
          resultFresh
          selectPart={vi.fn()}
          removePart={vi.fn()}
          setCategory={vi.fn()}
          runSim={vi.fn()}
          addCustomPart={vi.fn()}
          deleteCustomPart={vi.fn()}
          editCustomPart={vi.fn()}
          confidenceProps={{ specs, config, customMotor: null, simulation, resultFresh: true }}
        />
      )
    renderAt(15)
    expect(screen.getByText('WITHIN TESTED CRITERION')).toBeInTheDocument()
    cleanup()
    renderAt(15.0001)
    expect(screen.getByText('REVIEW REQUIRED')).toBeInTheDocument()
    cleanup()
    renderAt(20.0001)
    expect(screen.getByText('CRITERION EXCEEDED')).toBeInTheDocument()
  })

  it('classifies main descent in SimulationTab through the canonical criterion presentation', () => {
    render(
      <SimulationTab
        state={stateFor({ ...simulation, main_fps: 21 })}
        runSim={vi.fn()}
        canRun
        resultFresh
      />
    )
    expect(screen.getByText('FAIL')).toBeInTheDocument()
  })

  it('surfaces only defensible criterion crossings with driver, output, and classifications', () => {
    const crossingConfig = {
      specs: { ...specs, drag_cd: '0.5', wind_direction_deg: '270', rocket_mass_g: '5500' },
      config: {
        main_chute: { specs: { diameter_in: 60, cd: 2.0 } },
        drogue_chute: { specs: { diameter_in: 9, cd: 1.05 } },
      },
    }
    const result = runSensitivity(crossingConfig)
    const drogueCrossing = result.criterionCrossings.find(
      (crossing) => crossing.output === 'drogue_fps'
    )
    expect(drogueCrossing).toBeDefined()
    render(
      <SensitivityPanel
        specs={crossingConfig.specs}
        config={crossingConfig.config}
        customMotor={null}
        resultFresh
        result={result}
      />
    )
    const crossings = screen.getByLabelText('Defensible criterion crossings')
    expect(crossings.textContent).toMatch(/Rocket mass -10%: Drogue descent rate/)
    expect(crossings.textContent).toMatch(/moves from REVIEW REQUIRED to WITHIN TESTED CRITERION/)
  })

  it('renders the same crossing classifications in the Recovery Brief', () => {
    render(
      <RecoveryBriefTab
        recoveryBrief={{
          status: 'current',
          briefVersion: 'recovery-brief-v1',
          generatedAt: '2026-08-13T00:00:00.000Z',
          sensitivity: {
            status: 'complete',
            method: 'Deterministic one-at-a-time variations.',
            rows: [],
            criterionCrossings: [
              {
                output: 'drogue_fps',
                outputLabel: 'Drogue descent rate',
                unit: 'ft/s',
                driverKey: 'rocket_mass_g',
                driverLabel: 'Rocket mass',
                variantLabel: '-10%',
                baseline: { value: 158, category: 'fast-shock', severity: 'warn' },
                variant: { value: 150, category: 'nominal', severity: 'none' },
              },
            ],
          },
        }}
      />
    )
    const crossing = screen.getByLabelText('Defensible criterion crossings')
    expect(crossing.textContent).toMatch(/Rocket mass -10%: Drogue descent rate 158 ft\/s/)
    expect(crossing.textContent).toMatch(/moves from REVIEW REQUIRED to WITHIN TESTED CRITERION/)
  })
})
