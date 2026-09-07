import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RecoveryAtlas from '../components/atlas/RecoveryAtlas.jsx'

describe('RecoveryAtlas component (Astra design)', () => {
  const mockState = {
    specs: {
      rocket_mass_g: '2500',
      motor_total_impulse_ns: '640',
      burn_time_s: '1.8',
      airframe_id_in: '3.9',
      bay_length_in: '18',
    },
    config: {
      main_chute: {
        id: 'fc-96',
        name: 'Fruity Chutes 96" Iris',
        manufacturer: 'Fruity Chutes',
        specs: { diameter_in: 96, cd: 2.2, packed_diam_in: 4, packed_length_in: 8 },
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
      phase1_time_s: 161,
      total_time_s: 212,
      deploy_ft: 700,
      timeline: [
        { t: 0, alt: 0 },
        { t: 20, alt: 9701 },
        { t: 181, alt: 700 },
        { t: 212, alt: 0 },
      ],
    },
    warnings: [{ level: 'warn', slot: 'shock_cord', message: 'Marginal snatch factor' }],
  }

  it('renders header, canvas, inspector, and event rail', () => {
    render(<RecoveryAtlas state={mockState} onExit={vi.fn()} runSim={vi.fn()} />)

    expect(screen.getByText('Recovery Atlas')).toBeInTheDocument()
    expect(screen.getByText('Recovery Bay — Section View')).toBeInTheDocument()
    expect(screen.getByText('Flight Arc — Altitude vs Time')).toBeInTheDocument()
    expect(screen.getByText('Vehicle Inspector')).toBeInTheDocument()
    expect(screen.getByText('Mission Timeline')).toBeInTheDocument()
    expect(screen.getByText(/9,701/)).toBeInTheDocument()
  })

  it('edits rocket specs from the Vehicle inspector via onSetSpec', () => {
    const onSetSpec = vi.fn()
    render(<RecoveryAtlas state={mockState} onSetSpec={onSetSpec} />)

    const massInput = screen.getByLabelText(/Rocket Mass/i)
    fireEvent.change(massInput, { target: { value: '3000' } })
    expect(onSetSpec).toHaveBeenCalledWith('rocket_mass_g', '3000')
  })

  it('selects a catalog part from the picker and calls selectPart', () => {
    const selectPart = vi.fn()
    const candidate = {
      id: 'fc-72',
      category: 'main_chute',
      name: 'Fruity Chutes 72" Iris',
      manufacturer: 'Fruity Chutes',
      specs: { diameter_in: 72, cd: 2.2 },
    }
    render(
      <RecoveryAtlas
        state={mockState}
        allParts={[mockState.config.main_chute, candidate]}
        selectPart={selectPart}
      />
    )

    // Navigate to a slot, open the picker, choose, apply
    fireEvent.click(screen.getAllByRole('button', { name: /main chute/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /Change Part/i }))
    fireEvent.change(screen.getByLabelText(/Catalog — Main Chute/i), {
      target: { value: 'fc-72' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Apply to Bay/i }))

    expect(selectPart).toHaveBeenCalledWith('main_chute', candidate)
  })

  it('removes a part from the bay', () => {
    const removePart = vi.fn()
    render(<RecoveryAtlas state={mockState} removePart={removePart} />)

    fireEvent.click(screen.getAllByRole('button', { name: /main chute/i })[0])
    fireEvent.click(screen.getByRole('button', { name: /Remove from Bay/i }))
    expect(removePart).toHaveBeenCalledWith('main_chute')
  })

  it('shows slot findings in the inspector', () => {
    render(<RecoveryAtlas state={mockState} />)

    fireEvent.click(screen.getAllByRole('button', { name: /shock cord/i })[0])
    expect(screen.getByText(/Marginal snatch factor/)).toBeInTheDocument()
  })

  it('event rail selection shows event time and altitude', () => {
    render(<RecoveryAtlas state={mockState} />)

    fireEvent.click(screen.getByRole('button', { name: /APOGEE/ }))
    const detail = screen.getByRole('status')
    expect(detail).toHaveTextContent('APOGEE')
    expect(detail).toHaveTextContent('T+20s')
    expect(detail).toHaveTextContent('9,701 ft')
  })

  it('draws the flight arc with event markers when simulation exists', () => {
    const { container } = render(<RecoveryAtlas state={mockState} />)
    const svg = container.querySelector('svg.atlas-arc')
    expect(svg).toBeInTheDocument()
    expect(container.querySelector('.atlas-arc-line')).toBeInTheDocument()
    expect(container.querySelectorAll('.atlas-arc-marker').length).toBeGreaterThan(2)
  })

  it('invokes save and share handlers from the header', () => {
    const saveConfig = vi.fn()
    const copyShareLink = vi.fn()
    render(
      <RecoveryAtlas state={mockState} saveConfig={saveConfig} copyShareLink={copyShareLink} />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    expect(saveConfig).toHaveBeenCalledTimes(1)
    expect(copyShareLink).toHaveBeenCalledTimes(1)
  })

  it('invokes onExit when clicking Exit button', () => {
    const onExit = vi.fn()
    render(<RecoveryAtlas state={mockState} onExit={onExit} />)

    fireEvent.click(screen.getByRole('button', { name: 'Exit' }))
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('invokes runSim when clicking Run Simulation', () => {
    const runSim = vi.fn()
    render(<RecoveryAtlas state={mockState} canRun={true} runSim={runSim} />)

    fireEvent.click(screen.getByRole('button', { name: 'Run Simulation' }))
    expect(runSim).toHaveBeenCalledTimes(1)
  })
})
