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
})
