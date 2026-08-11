import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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
    fireEvent.click(screen.getAllByRole('button', { name: 'OPEN' })[0])
    expect(onOpenSimulation).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: /review method/i }))
    fireEvent.click(screen.getByRole('button', { name: /review the source inputs/i }))
    expect(onOpenSpecs).toHaveBeenCalledOnce()
  })
})
