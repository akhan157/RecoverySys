import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GuidedReview from '../components/GuidedReview.jsx'

const state = {
  specs: {
    rocket_mass_g: '2500',
    motor_total_impulse_ns: '640',
    main_deploy_alt_ft: '',
    ejection_g_factor: '',
  },
  config: {
    main_chute: {
      id: 'cl-24-n',
      category: 'main_chute',
      name: 'Catalog main',
      manufacturer: 'b2 Rocketry Company',
    },
    drogue_chute: {
      id: 'custom-drogue',
      category: 'drogue_chute',
      name: 'User drogue',
      manufacturer: 'Custom',
    },
  },
  simulation: null,
}

describe('GuidedReview first-plan entry', () => {
  it('keeps plan actions and value sources explicit', () => {
    const onStartFresh = vi.fn()
    const onOpenDashboard = vi.fn()
    const onOpenImport = vi.fn()

    render(
      <GuidedReview
        state={state}
        onStartFresh={onStartFresh}
        onOpenDashboard={onOpenDashboard}
        onOpenImport={onOpenImport}
      />
    )

    expect(
      screen.getByRole('heading', { name: /set the scope of your first plan/i })
    ).toBeInTheDocument()
    expect(screen.getByText(/500 ft · default if blank/i)).toBeInTheDocument()
    expect(screen.getByText(/Auto by mass · default if blank/i)).toBeInTheDocument()
    expect(screen.getByText('CATALOG DATA · UNVERIFIED')).toBeInTheDocument()
    expect(screen.getByText('USER-SUPPLIED DATA')).toBeInTheDocument()
    expect(screen.getByText(/not a safety approval or certification/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /start a new plan/i }))
    fireEvent.click(screen.getByRole('button', { name: /resume this plan/i }))
    fireEvent.click(screen.getByRole('button', { name: /import a plan/i }))
    expect(onStartFresh).toHaveBeenCalledOnce()
    expect(onOpenDashboard).toHaveBeenCalledOnce()
    expect(onOpenImport).toHaveBeenCalledOnce()
  })

  it('keeps result status conservative and source-input navigation available', () => {
    const onOpenSimulation = vi.fn()
    const onOpenSpecs = vi.fn()

    render(
      <GuidedReview state={state} onOpenSimulation={onOpenSimulation} onOpenSpecs={onOpenSpecs} />
    )
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('NOT RUN')).toBeInTheDocument()
    expect(screen.queryByText(/reviewed/i)).not.toBeInTheDocument()
    expect(screen.getByText(/insufficient confidence/i)).toBeInTheDocument()
    expect(screen.getByText(/no accepted comparison or flight evidence/i)).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'OPEN' })[0])
    expect(onOpenSimulation).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: /review method/i }))
    fireEvent.click(screen.getByRole('button', { name: /review the source inputs/i }))
    expect(onOpenSpecs).toHaveBeenCalledOnce()
  })

  it('labels a fresh plan explicitly: new-plan state, not-set requireds, defaulted optionals, no hardware', () => {
    render(<GuidedReview state={{ config: {}, specs: {}, simulation: null }} />)
    expect(screen.getByText('NEW PLAN')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resume this plan/i })).toBeDisabled()
    expect(screen.getAllByText('Not set')).toHaveLength(2)
    expect(screen.getByText(/500 ft · default if blank/i)).toBeInTheDocument()
    expect(screen.getByText(/Auto by mass · default if blank/i)).toBeInTheDocument()
    expect(screen.getByText(/No recovery hardware selected yet/i)).toBeInTheDocument()
  })

  it('labels a schema-defaulted optional as a default, not a current value', () => {
    const defaulted = {
      ...state,
      specs: { ...state.specs, main_deploy_alt_ft: '500', ejection_g_factor: '' },
    }
    render(<GuidedReview state={defaulted} />)
    expect(screen.getByText(/500 ft · default if blank/i)).toBeInTheDocument()
    expect(screen.queryByText(/500 ft · current value/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Auto by mass · default if blank/i)).toBeInTheDocument()
  })

  it('labels user-supplied values as current values with units', () => {
    const supplied = {
      ...state,
      specs: { ...state.specs, main_deploy_alt_ft: '700', ejection_g_factor: '30' },
    }
    render(<GuidedReview state={supplied} />)
    expect(screen.getByText('2500 g')).toBeInTheDocument()
    expect(screen.getByText('640 N·s')).toBeInTheDocument()
    expect(screen.getByText(/700 ft · current value/i)).toBeInTheDocument()
    expect(screen.getByText(/30G · current value/i)).toBeInTheDocument()
  })

  it('pause returns to the dashboard without losing the entered plan', () => {
    const onOpenDashboard = vi.fn()
    render(<GuidedReview state={state} onOpenDashboard={onOpenDashboard} />)
    expect(screen.getByText('INPUTS IN PROGRESS')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /pause and return/i }))
    expect(onOpenDashboard).toHaveBeenCalledOnce()
  })

  it('supports keyboard completion of the guided steps and pause', async () => {
    const user = userEvent.setup()
    const onOpenDashboard = vi.fn()
    render(<GuidedReview state={state} onOpenDashboard={onOpenDashboard} />)

    const next = screen.getByRole('button', { name: /next/i })
    next.focus()
    await user.keyboard('{Enter}')
    expect(
      screen.getByRole('heading', { name: /review results by scope/i })
    ).toBeInTheDocument()

    const reviewMethod = screen.getByRole('button', { name: /review method/i })
    reviewMethod.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: /method & assumptions/i })).toBeInTheDocument()

    const back = screen.getByRole('button', { name: /← BACK/i })
    back.focus()
    await user.keyboard('{Enter}')
    expect(
      screen.getByRole('heading', { name: /review results by scope/i })
    ).toBeInTheDocument()

    const pause = screen.getByRole('button', { name: /pause and return/i })
    pause.focus()
    await user.keyboard('{Enter}')
    expect(onOpenDashboard).toHaveBeenCalledOnce()
  })
})
