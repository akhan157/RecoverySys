import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ConfidenceStatus from '../components/ConfidenceStatus.jsx'

describe('ConfidenceStatus', () => {
  it('does not present an unrun result as supported', () => {
    render(
      <ConfidenceStatus
        specs={{}}
        config={{}}
        simulation={null}
        resultFresh={false}
        onNavigate={vi.fn()}
      />
    )

    const status = screen.getByLabelText('Insufficient confidence')
    expect(status).toHaveTextContent('Insufficient confidence')
    expect(status).toHaveTextContent('No current simulation result')
    expect(status).not.toHaveTextContent('Supported')
    expect(status).toHaveTextContent(/safety approval.*certification/i)
  })

  it('explains stale state and offers a route to changed inputs', () => {
    const onNavigate = vi.fn()
    render(
      <ConfidenceStatus
        specs={{ rocket_mass_g: '2500', motor_total_impulse_ns: '640' }}
        config={{}}
        simulation={{ apogee_ft: 1000 }}
        resultFresh={false}
        onNavigate={onNavigate}
      />
    )

    expect(screen.getByText('STALE_RESULT')).toBeInTheDocument()
    expect(screen.getByLabelText('Insufficient confidence')).toHaveTextContent(
      'inputs or selected hardware changed'
    )
    expect(screen.getAllByRole('button', { name: /Review/ }).length).toBeGreaterThan(0)
  })
})
