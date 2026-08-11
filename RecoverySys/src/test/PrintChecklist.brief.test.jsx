import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PrintChecklist from '../components/PrintChecklist.jsx'

describe('PrintChecklist recovery brief', () => {
  it('clearly prints stale status, evidence posture, checks, and authorization boundary', () => {
    render(
      <PrintChecklist
        specs={{}}
        config={{}}
        simulation={{ apogee_ft: 1000 }}
        resultFresh={false}
        warnings={[]}
        recoveryBrief={{
          status: 'stale',
          confidence: { label: 'Insufficient confidence', evidenceNote: 'No accepted evidence.' },
          missionEnvelope: { status: 'out-of-scope' },
          unresolvedChecks: [{ code: 'RESULT_STALE', message: 'Rerun before use.' }],
          authorization: 'This brief does not authorize launch.',
        }}
      />
    )
    expect(screen.getByText(/STALE_RESULT/)).toBeInTheDocument()
    expect(screen.getByText(/Insufficient confidence/)).toBeInTheDocument()
    expect(screen.getByText('Rerun before use.')).toBeInTheDocument()
    expect(screen.getByText('This brief does not authorize launch.')).toBeInTheDocument()
  })

  it('renders distinct brief and checklist artifact modes', () => {
    const { container, rerender } = render(
      <PrintChecklist
        specs={{}}
        config={{}}
        simulation={null}
        recoveryBrief={{ status: 'not-run' }}
        printMode="brief"
      />
    )
    expect(container.querySelector('.print-checklist--brief')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'RecoverySys Recovery Brief' })).toBeInTheDocument()

    rerender(
      <PrintChecklist
        specs={{}}
        config={{}}
        simulation={null}
        recoveryBrief={{ status: 'not-run' }}
        printMode="checklist"
      />
    )
    expect(container.querySelector('.print-checklist--checklist')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'RecoverySys Recovery Checklist' })
    ).toBeInTheDocument()
  })

  it('scopes simulation results to checklist output and withholds stale estimates', () => {
    const simulation = { apogee_ft: 1000, drift_ft: 25 }
    const { container, rerender } = render(
      <PrintChecklist
        specs={{}}
        config={{}}
        simulation={simulation}
        resultFresh
        recoveryBrief={{ status: 'current' }}
        printMode="brief"
      />
    )
    const simulationSection = screen
      .getByRole('heading', { name: 'Simulation Results' })
      .closest('section')
    expect(simulationSection).toHaveClass('print-artifact--checklist')
    expect(container.querySelector('.print-checklist--brief')).toBeInTheDocument()

    rerender(
      <PrintChecklist
        specs={{}}
        config={{}}
        simulation={simulation}
        resultFresh={false}
        recoveryBrief={{ status: 'stale' }}
        printMode="checklist"
      />
    )
    expect(container.querySelector('.print-checklist--checklist')).toBeInTheDocument()
    expect(screen.getByText(/STALE_RESULT/)).toBeInTheDocument()
    expect(screen.queryByText(/1,000 ft/)).not.toBeInTheDocument()
  })
})
