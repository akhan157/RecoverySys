import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RESULT_ACTION_DESTINATIONS } from '../lib/assessment.js'
import CausalityRow from '../components/analysis/CausalityRow.jsx'
import DetailInspector from '../components/analysis/DetailInspector.jsx'
import ResultUsabilityStrip from '../components/analysis/ResultUsabilityStrip.jsx'
import ReviewSummary from '../components/analysis/ReviewSummary.jsx'
import TestedResponseSummary from '../components/analysis/TestedResponseSummary.jsx'

describe('Analysis shared review primitives', () => {
  it('shows stale result state, reason, identity, and an explicit keyboard action', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <ResultUsabilityStrip
        usability={{ state: 'stale', reason: 'A deliberately long reason that remains readable.' }}
        resultIdentity="result-17"
        modelIdentity="rk4-v3"
        onAction={onAction}
      />
    )

    expect(screen.getAllByText('Stale')).toHaveLength(2)
    expect(
      screen.getByText('A deliberately long reason that remains readable.')
    ).toBeInTheDocument()
    expect(screen.getByText('Result: result-17')).toBeInTheDocument()

    await user.tab()
    await user.keyboard('{Enter}')
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Rerun simulation' }),
      RESULT_ACTION_DESTINATIONS.SIMULATION
    )
  })

  it('routes the default not-run action to simulation', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(<ResultUsabilityStrip state="not-run" onAction={onAction} />)

    await user.click(screen.getByRole('button', { name: 'Run simulation' }))

    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Run simulation' }),
      RESULT_ACTION_DESTINATIONS.SIMULATION
    )
  })

  it('preserves an explicit action destination over the canonical fallback', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    render(
      <ResultUsabilityStrip
        state="stale"
        action={{ label: 'Review analysis', destination: RESULT_ACTION_DESTINATIONS.ANALYSIS }}
        onAction={onAction}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Review analysis' }))

    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Review analysis',
        destination: RESULT_ACTION_DESTINATIONS.ANALYSIS,
      }),
      RESULT_ACTION_DESTINATIONS.ANALYSIS
    )
  })

  it('keeps unknown review counts neutral and does not infer a positive state', () => {
    render(
      <ReviewSummary summary={{ errors: 0, warnings: 0, notEvaluated: 2, testedCrossings: 0 }} />
    )

    expect(screen.getByLabelText('Not evaluated: 2')).toBeInTheDocument()
    expect(screen.getAllByText('Not evaluated').length).toBeGreaterThan(0)
    expect(screen.queryByText(/all checks pass|safe|flight ready/i)).not.toBeInTheDocument()
  })

  it('supports keyboard row selection and a separate direct action', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onAction = vi.fn()
    const row = {
      id: 'main-deploy',
      driver: 'Main deployment altitude',
      affectedOutcome: 'Opening load',
      finding: { state: 'not-evaluated', value: 'Screening unavailable' },
      action: { label: 'Review main deployment altitude', destination: 'config.main_deploy_ft' },
    }
    render(<CausalityRow row={row} onSelect={onSelect} onAction={onAction} />)

    const selector = screen.getByRole('button', {
      name: /Review Main deployment altitude affecting Opening load/,
    })
    selector.focus()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith(row)

    await user.click(screen.getByRole('button', { name: 'Review main deployment altitude' }))
    expect(onAction).toHaveBeenCalledWith(row.action, row)
    expect(screen.getByText('Not evaluated')).toBeInTheDocument()
  })

  it('keeps inspector details available without a selected row and expands supporting detail', async () => {
    const user = userEvent.setup()
    const longRemediation =
      'Review the manufacturer rating and document the selected shock cord before relying on this estimate.'
    const row = {
      driver: 'Shock-cord rating',
      affectedOutcome: 'Deployment load',
      finding: { state: 'warning', message: 'Rating is not documented.' },
      detail: {
        remediation: longRemediation,
        method: 'Static impulse screening',
        assumptions: 'Representative deployment impulse; no flight measurement.',
        provenance: ['catalog:cord-1'],
      },
    }
    const { rerender } = render(<DetailInspector />)
    expect(screen.getByText(/Select a review row/)).toBeInTheDocument()

    rerender(<DetailInspector row={row} />)
    expect(screen.getByText(longRemediation)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Supporting detail' }))
    expect(screen.getByText('Static impulse screening')).toBeInTheDocument()
    expect(screen.getByText('catalog:cord-1')).toBeInTheDocument()
  })

  it('labels tested output response without probability language and preserves unknown state', () => {
    render(
      <TestedResponseSummary
        response={{
          outputs: [
            {
              id: 'drift',
              label: 'Drift',
              baseline: 120,
              min: 95,
              max: 180,
              unit: 'ft',
              state: 'not-evaluated',
            },
          ],
        }}
      />
    )

    expect(screen.getByText('Tested model response')).toBeInTheDocument()
    expect(screen.getByText('Not evaluated')).toBeInTheDocument()
    expect(
      screen.getByText('No reviewed decision criterion is attached to this range.')
    ).toBeInTheDocument()
    expect(screen.getByText(/not probabilities or confidence intervals/i)).toBeInTheDocument()
  })
})
