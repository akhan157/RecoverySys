import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import StatusStrip from '../components/StatusStrip.jsx'

describe('StatusStrip component', () => {
  it('renders NO RUN when simulation is missing', () => {
    render(<StatusStrip simulation={null} resultFresh={false} filledSlots={2} totalSlots={8} />)

    expect(screen.getByText('NO RUN')).toBeInTheDocument()
    expect(screen.getByText('2/8')).toBeInTheDocument()
    expect(screen.getByText('BAYS LOADED')).toBeInTheDocument()
  })

  it('renders CURRENT with apogee and packed percentage when fresh', () => {
    render(
      <StatusStrip
        simulation={{ apogee_ft: 9701 }}
        resultFresh={true}
        filledSlots={5}
        totalSlots={8}
        packingVolume={{ fraction: 0.68 }}
      />
    )

    expect(screen.getByText('CURRENT')).toBeInTheDocument()
    expect(screen.getByText('5/8')).toBeInTheDocument()
    expect(screen.getByText(/68%/)).toBeInTheDocument()
    expect(screen.getByText('9,701')).toBeInTheDocument()
  })

  it('renders STALE with RERUN SIM button and triggers navigation', () => {
    const onNavigate = vi.fn()
    render(
      <StatusStrip simulation={{ apogee_ft: 9701 }} resultFresh={false} onNavigate={onNavigate} />
    )

    expect(screen.getByText('STALE')).toBeInTheDocument()
    const rerunBtn = screen.getByRole('button', { name: /RERUN SIM/i })
    expect(rerunBtn).toBeInTheDocument()
    fireEvent.click(rerunBtn)
    expect(onNavigate).toHaveBeenCalledWith('SIMULATION')
  })

  it('renders error and warning tally', () => {
    render(
      <StatusStrip
        simulation={{ apogee_ft: 5000 }}
        resultFresh={true}
        warnings={[
          { level: 'error', message: 'Fatal' },
          { level: 'warn', message: 'Warn 1' },
          { level: 'warn', message: 'Warn 2' },
        ]}
      />
    )

    expect(screen.getByText('1 ERR')).toBeInTheDocument()
    expect(screen.getByText('2 WARN')).toBeInTheDocument()
  })
})
