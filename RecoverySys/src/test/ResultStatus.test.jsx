import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ResultStatus from '../components/ResultStatus.jsx'
import ReviewLink from '../components/primitives/ReviewLink.jsx'
import ReviewSummary from '../components/primitives/ReviewSummary.jsx'

describe('ResultStatus primitive', () => {
  it('renders STALE_RESULT and fires onRerun when clicked', () => {
    const onRerun = vi.fn()
    render(
      <ResultStatus
        specs={{ rocket_mass_g: '2500', motor_total_impulse_ns: '640' }}
        config={{}}
        simulation={{ apogee_ft: 1200 }}
        resultFresh={false}
        onRerun={onRerun}
      />
    )

    expect(screen.getByText('STALE_RESULT')).toBeInTheDocument()
    const rerunBtn = screen.getByRole('button', { name: /RERUN SIMULATION/i })
    expect(rerunBtn).toBeInTheDocument()
    fireEvent.click(rerunBtn)
    expect(onRerun).toHaveBeenCalledTimes(1)
  })

  it('renders CURRENT_RESULT with planning estimate summary', () => {
    render(
      <ResultStatus
        specs={{ rocket_mass_g: '2500', motor_total_impulse_ns: '640' }}
        config={{}}
        simulation={{ apogee_ft: 1200 }}
        resultFresh={true}
      />
    )

    expect(screen.getByText('CURRENT_RESULT')).toBeInTheDocument()
    expect(screen.getByText(/planning estimate, not a safety approval/i)).toBeInTheDocument()
  })
})

describe('ReviewLink primitive', () => {
  it('invokes onNavigate with target when clicked', () => {
    const onNavigate = vi.fn()
    render(
      <ReviewLink target="specs.airframe_id_in" onNavigate={onNavigate}>
        Review Airframe ID
      </ReviewLink>
    )

    const btn = screen.getByRole('button', { name: 'Review Airframe ID' })
    fireEvent.click(btn)
    expect(onNavigate).toHaveBeenCalledWith('specs.airframe_id_in')
  })
})

describe('ReviewSummary primitive', () => {
  it('renders error and warning counts and executes action', () => {
    const onAction = vi.fn()
    render(
      <ReviewSummary
        errorsCount={2}
        warningsCount={3}
        highestPriorityAction={{ label: 'Fix Airframe ID', onClick: onAction }}
      />
    )

    expect(screen.getByText('2 ERRORS')).toBeInTheDocument()
    expect(screen.getByText('3 WARNINGS')).toBeInTheDocument()
    const actionBtn = screen.getByRole('button', { name: 'Fix Airframe ID' })
    fireEvent.click(actionBtn)
    expect(onAction).toHaveBeenCalledTimes(1)
  })
})
