import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GuidedPlanWizard from '../components/GuidedPlanWizard.jsx'

describe('GuidedPlanWizard component', () => {
  const mockState = {
    specs: {
      rocket_mass_g: '2500',
      motor_total_impulse_ns: '640',
      burn_time_s: '1.8',
      airframe_id_in: '3.9',
      main_deploy_alt_ft: '500',
      wind_speed_mph: '10',
    },
    config: {
      main_chute: { id: 'm1', name: 'Main 42"', specs: { diameter_in: 42, cd: 1.5 } },
    },
    simulation: {
      apogee_ft: 1800,
      main_fps: 15.2,
      drift_ft: 800,
      apogee_method: 'integrated-curve',
    },
    warnings: [],
  }

  it('renders Step 1 (Start & Scope) by default with starting options', () => {
    render(
      <GuidedPlanWizard
        state={mockState}
        onSetSpec={vi.fn()}
        selectPart={vi.fn()}
        removePart={vi.fn()}
        runSim={vi.fn()}
        onExit={vi.fn()}
      />
    )

    expect(screen.getByText('GUIDED FIRST-PLAN // WIZARD')).toBeInTheDocument()
    expect(screen.getByText('STEP 01 OF 06 — START & SCOPE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /LOAD_DEMO/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /START_FRESH/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /CONTINUE/i })).toBeInTheDocument()
  })

  it('progresses through steps with NEXT and BACK controls', () => {
    render(
      <GuidedPlanWizard
        state={mockState}
        onSetSpec={vi.fn()}
        selectPart={vi.fn()}
        removePart={vi.fn()}
        runSim={vi.fn()}
        onExit={vi.fn()}
      />
    )

    // Click CONTINUE -> Step 2: ROCKET & MOTOR
    fireEvent.click(screen.getByRole('button', { name: /CONTINUE/i }))
    expect(screen.getByText('STEP 02 OF 06 — ROCKET & MOTOR')).toBeInTheDocument()
    expect(screen.getByText('Define rocket mass, motor, and airframe')).toBeInTheDocument()

    // Click NEXT -> Step 3: RECOVERY HARDWARE
    fireEvent.click(screen.getByRole('button', { name: /^NEXT/i }))
    expect(screen.getByText('STEP 03 OF 06 — RECOVERY HARDWARE')).toBeInTheDocument()

    // Click NEXT -> Step 4: DEPLOY & WEATHER
    fireEvent.click(screen.getByRole('button', { name: /^NEXT/i }))
    expect(screen.getByText('STEP 04 OF 06 — DEPLOY & WEATHER')).toBeInTheDocument()

    // Click BACK -> returns to Step 3
    fireEvent.click(screen.getByRole('button', { name: /← BACK/i }))
    expect(screen.getByText('STEP 03 OF 06 — RECOVERY HARDWARE')).toBeInTheDocument()
  })

  it('invokes onExit when clicking RETURN_TO_DASHBOARD', () => {
    const onExit = vi.fn()
    render(
      <GuidedPlanWizard
        state={mockState}
        onSetSpec={vi.fn()}
        selectPart={vi.fn()}
        removePart={vi.fn()}
        runSim={vi.fn()}
        onExit={onExit}
      />
    )

    const exitBtn = screen.getByRole('button', { name: /Exit guided wizard/i })
    fireEvent.click(exitBtn)
    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
