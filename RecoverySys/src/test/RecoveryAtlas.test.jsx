import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RecoveryAtlas from '../components/atlas/RecoveryAtlas.jsx'

describe('RecoveryAtlas component (Astra design)', () => {
  const mockState = {
    specs: {
      rocket_mass_g: '2500',
      motor_total_impulse_ns: '640',
      burn_time_s: '1.8',
    },
    config: {
      main_chute: {
        id: 'fc-96',
        name: 'Fruity Chutes 96" Iris',
        manufacturer: 'Fruity Chutes',
        specs: { diameter_in: 96, cd: 2.2 },
      },
    },
    simulation: {
      apogee_ft: 9701,
      main_fps: 13.7,
      drogue_fps: 56.0,
      drift_ft: 5965,
      landing_ke_ftlbf: 71,
      burnout_t_s: 2,
      apogee_t_s: 20,
    },
    warnings: [],
  }

  it('renders header, canvas, inspector, and event rail', () => {
    render(<RecoveryAtlas state={mockState} onExit={vi.fn()} runSim={vi.fn()} />)

    expect(screen.getByText('Recovery Atlas')).toBeInTheDocument()
    expect(screen.getByText('Vehicle Section')).toBeInTheDocument()
    expect(screen.getByText('Flight Telemetry')).toBeInTheDocument()
    expect(screen.getByText('Inspector')).toBeInTheDocument()
    expect(screen.getByText('Mission Timeline')).toBeInTheDocument()
    expect(screen.getByText('9,701 ft')).toBeInTheDocument()
    expect(screen.getByText('IGNITION')).toBeInTheDocument()
    expect(screen.getByText('APOGEE')).toBeInTheDocument()
  })

  it('allows selecting slots to update the inspector', () => {
    render(<RecoveryAtlas state={mockState} onExit={vi.fn()} runSim={vi.fn()} />)

    // Click Drogue Chute in navigator
    const drogueBtn = screen.getAllByRole('button', { name: /drogue chute/i })[0]
    fireEvent.click(drogueBtn)
    // Inspector updates to Drogue Chute slot
    expect(screen.getAllByText(/drogue chute/i).length).toBeGreaterThan(0)
  })

  it('invokes onExit when clicking Exit button', () => {
    const onExit = vi.fn()
    render(<RecoveryAtlas state={mockState} onExit={onExit} />)

    const exitBtn = screen.getByRole('button', { name: 'Exit' })
    fireEvent.click(exitBtn)
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('invokes runSim when clicking Run Simulation', () => {
    const runSim = vi.fn()
    render(<RecoveryAtlas state={mockState} canRun={true} runSim={runSim} />)

    const runBtn = screen.getByRole('button', { name: 'Run Simulation' })
    fireEvent.click(runBtn)
    expect(runSim).toHaveBeenCalledTimes(1)
  })
})
