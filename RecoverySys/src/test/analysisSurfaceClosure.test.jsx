import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDefaultSpecs } from '../lib/schema.js'
import AnalysisTab from '../components/tabs/AnalysisTab.jsx'
import SimulationTab from '../components/tabs/SimulationTab.jsx'
import SpecsTab from '../components/tabs/SpecsTab.jsx'
import DashboardTab from '../components/tabs/DashboardTab.jsx'

vi.mock('../components/FlightChart.jsx', () => ({
  default: () => <div data-testid="flight-chart" />,
}))

afterEach(cleanup)

const specs = {
  ...getDefaultSpecs(),
  rocket_mass_g: '2500',
  motor_total_impulse_ns: '640',
  burn_time_s: '1.8',
  airframe_id_in: '3.9',
  bay_length_in: '18',
  main_deploy_alt_ft: '500',
  drag_cd: '0.5',
  wind_speed_mph: '10',
}
const config = {
  main_chute: {
    id: 'chute-24',
    category: 'main_chute',
    name: '24 inch Compact Light',
    specs: { diameter_in: 24, cd: 1.5, packed_length_in: 4 },
  },
  drogue_chute: {
    id: 'drogue-12',
    category: 'drogue_chute',
    name: '12 inch Pilot',
    specs: { diameter_in: 12, cd: 1.5, packed_length_in: 2 },
  },
  shock_cord: {
    id: 'cord-nylon',
    category: 'shock_cord',
    name: 'Nylon cord',
    specs: { strength_lbs: 2000, length_ft: 20, elongation_pct: 12, material: 'nylon' },
  },
}
const simulation = {
  apogee_ft: 6000,
  apogee_method: 'rk4',
  apogee_t_s: 30,
  burnout_t_s: 5,
  drogue_fps: 50,
  main_fps: 14.2,
  phase1_time_s: 100,
  phase2_time_s: 35,
  total_time_s: 135,
  drift_ft: 1000,
  deploy_ft: 500,
  landing_ke_ftlbf: 20,
  timeline: [],
  // Distinctive canonical values: local re-derivation (2.5 kg × 20G × g)
  // would produce ~110 lbs / ~18× — these values only appear when the UI
  // consumes the canonical shock_load result.
  shock_load: {
    peak_load_lbs: 314,
    safety_factor: 6.4,
    strain_energy_J: 10,
    sf_status: 'pass',
    material: 'nylon',
    criterion: { evaluated: true, category: 'nominal', severity: 'none' },
  },
  main_snatch: { status: 'unavailable', reason: 'Single-deploy configuration: no drogue phase.' },
}
const warning = {
  level: 'error',
  slot: 'main_chute',
  code: 'compatibility.main_chute.main-descent-rate-hard-landing',
  message: 'Main descent rate 31.6 fps exceeds 20 fps — hard landing risk',
  remediation: 'Select a larger main chute or reduce mass before flight.',
  inputPaths: ['config.main_chute'],
  affectedPartIds: ['main_chute'],
  actionDestination: 'config.main_chute',
}
const sensitivity = { status: 'complete', rows: [], criterionCrossings: [] }

function baseState(overrides = {}) {
  return {
    simulation,
    resultFresh: true,
    specs,
    config,
    warnings: [warning],
    sensitivity,
    ...overrides,
  }
}

function confidenceProps(onNavigate = vi.fn()) {
  return {
    specs,
    config,
    customMotor: null,
    simulation,
    resultFresh: true,
    onNavigate,
  }
}

describe('M3 Analysis usability closure', () => {
  it('offers a Run simulation action before any result exists', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <AnalysisTab
        state={baseState({ simulation: null, resultFresh: false })}
        confidenceProps={confidenceProps(onNavigate)}
      />
    )

    expect(screen.getAllByText('Not run').length).toBeGreaterThan(0)
    await user.click(screen.getByRole('button', { name: 'Run simulation' }))
    expect(onNavigate).toHaveBeenCalledWith('SIMULATION')
    // No conclusions may populate the board without a result.
    expect(screen.queryByText(/CAUSE → CONSEQUENCE REVIEW/)).not.toBeInTheDocument()
  })

  it('withholds the board for a stale result and offers a rerun action', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <AnalysisTab
        state={baseState({ resultFresh: false })}
        confidenceProps={confidenceProps(onNavigate)}
      />
    )

    expect(screen.getAllByText('Stale').length).toBeGreaterThan(0)
    expect(screen.getByText(/no longer matches the active inputs/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Rerun simulation' }))
    expect(onNavigate).toHaveBeenCalledWith('SIMULATION')
    expect(screen.queryByText(/CAUSE → CONSEQUENCE REVIEW/)).not.toBeInTheDocument()
  })

  it('renders canonical causality rows with text status labels and keyboard selection', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <AnalysisTab
        state={baseState()}
        confidenceProps={confidenceProps(onNavigate)}
      />
    )

    const rowButton = screen.getByRole('button', {
      name: /Review main_chute affecting Main descent and landing impact/,
    })
    expect(rowButton).toBeInTheDocument()
    // Status is carried by text, not color alone.
    expect(screen.getAllByText('Error').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Errors: 1')).toBeInTheDocument()

    // Keyboard selection updates the inspector without hiding the queue.
    rowButton.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: 'main_chute' })).toBeInTheDocument()
    expect(screen.getAllByText('Main descent and landing impact').length).toBeGreaterThan(0)
    expect(screen.getByText(/CAUSE → CONSEQUENCE REVIEW/)).toBeInTheDocument()

    // The direct action navigates to the affected hardware slot. Both the
    // summary and the row carry the same remediation label — pick the row's.
    const actionButton = screen
      .getAllByRole('button', {
        name: /Select a larger main chute or reduce mass before flight/,
      })
      .find((button) => button.closest('.analysis-causality-row'))
    expect(actionButton).toBeTruthy()
    await user.click(actionButton)
    expect(onNavigate).toHaveBeenCalledWith('config.main_chute')
  })

  it('consumes the canonical shock_load for static ejection load and cord safety factor', () => {
    render(<AnalysisTab state={baseState()} confidenceProps={confidenceProps()} />)

    // 314 LBS / 6.4× only exist in the canonical simulation result; a local
    // F = m × G × g₀ derivation would render ~110 LBS and ~18.1×.
    expect(screen.getByText('314 LBS')).toBeInTheDocument()
    expect(screen.getByText('6.4×')).toBeInTheDocument()
    expect(screen.getByText(/2000 lbs rated ÷ 314 lbs required/)).toBeInTheDocument()
    expect(screen.getByText(/canonical static impulse model/)).toBeInTheDocument()
  })

  it('moves the flight timeline and packing detail to Simulation', () => {
    const { unmount } = render(
      <AnalysisTab state={baseState()} confidenceProps={confidenceProps()} />
    )
    expect(screen.queryByText(/FLIGHT_TIMELINE/)).not.toBeInTheDocument()
    expect(screen.queryByText(/PACKING_VOLUME/)).not.toBeInTheDocument()
    unmount()

    render(<SimulationTab state={baseState()} runSim={vi.fn()} canRun resultFresh />)
    expect(screen.getByText(/FLIGHT_TIMELINE/)).toBeInTheDocument()
    expect(screen.getByText('LAUNCH')).toBeInTheDocument()
    expect(screen.getByText(/APOGEE @ 6,000 FT/)).toBeInTheDocument()
    expect(screen.getByText(/MAIN_DEPLOY @ 500 FT/)).toBeInTheDocument()
    expect(screen.getByText(/LANDING @ 1,000 FT DOWNWIND/)).toBeInTheDocument()
    expect(screen.getByText(/PACKING_VOLUME/)).toBeInTheDocument()
    expect(screen.getByText(/STACKED_COMPONENTS/)).toBeInTheDocument()
  })

  it('focuses the destination spec input and shows a return path from a review action', async () => {
    const user = userEvent.setup()
    const onReturnToAnalysis = vi.fn()
    const onFocusConsumed = vi.fn()
    const { unmount } = render(
      <SpecsTab
        state={baseState()}
        setSpec={vi.fn()}
        removePart={vi.fn()}
        setCategory={vi.fn()}
        saveConfig={vi.fn()}
        copyShareLink={vi.fn()}
        setCustomMotor={vi.fn()}
        clearCustomMotor={vi.fn()}
        addToast={vi.fn()}
        reviewOrigin="ANALYSIS"
        focusTarget="specs.rocket_mass_g"
        onFocusConsumed={onFocusConsumed}
        onReturnToAnalysis={onReturnToAnalysis}
      />
    )

    expect(document.activeElement).toBe(document.getElementById('mass'))
    expect(onFocusConsumed).toHaveBeenCalledTimes(1)

    const returnButton = screen.getByRole('button', { name: 'Return to Analysis' })
    expect(returnButton).toBeInTheDocument()
    await user.click(returnButton)
    expect(onReturnToAnalysis).toHaveBeenCalledTimes(1)
    unmount()

    cleanup()
    const dashboardOnReturn = vi.fn()
    const dashboardConsumed = vi.fn()
    render(
      <DashboardTab
        state={baseState()}
        allParts={[]}
        customParts={[]}
        filledSlots={2}
        packingVolume={{ bay_known: true, stacked_in3: 0, effective_in3: 100, fraction: 0 }}
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
        confidenceProps={confidenceProps()}
        reviewOrigin="ANALYSIS"
        focusTarget="config.main_chute"
        onFocusConsumed={dashboardConsumed}
        onReturnToAnalysis={dashboardOnReturn}
      />
    )

    expect(document.activeElement?.getAttribute('data-slot')).toBe('main_chute')
    expect(dashboardConsumed).toHaveBeenCalledTimes(1)
    expect(
      screen.getByRole('button', { name: 'Return to Analysis' })
    ).toBeInTheDocument()
  })

  it('clears the focus request when no destination element matches', () => {
    const onFocusConsumed = vi.fn()
    render(
      <SpecsTab
        state={baseState()}
        setSpec={vi.fn()}
        removePart={vi.fn()}
        setCategory={vi.fn()}
        saveConfig={vi.fn()}
        copyShareLink={vi.fn()}
        setCustomMotor={vi.fn()}
        clearCustomMotor={vi.fn()}
        addToast={vi.fn()}
        focusTarget="specs.unknown_key"
        onFocusConsumed={onFocusConsumed}
      />
    )
    // Unknown targets are dropped silently; the app never throws or mis-focuses.
    expect(onFocusConsumed).not.toHaveBeenCalled()
    expect(document.activeElement).not.toBe(document.getElementById('mass'))
  })
})
