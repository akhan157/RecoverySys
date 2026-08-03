import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PartProvenance from '../components/PartProvenance.jsx'
import NormalizedWarningList from '../components/NormalizedWarningList.jsx'

describe('v2 provenance and warning review UI', () => {
  it('labels catalog data as unverified without manufacturer claims', () => {
    render(<PartProvenance part={{ manufacturer: 'Fruity Chutes', name: 'Main' }} />)
    expect(screen.getByText('CATALOG DATA · UNVERIFIED')).toBeInTheDocument()
    expect(screen.getByLabelText(/not manufacturer verified/i)).toBeInTheDocument()
  })

  it('labels unknown and custom data as user-supplied', () => {
    render(<PartProvenance part={{ manufacturer: 'Custom', name: 'My part' }} />)
    expect(screen.getByText('USER-SUPPLIED DATA')).toBeInTheDocument()
  })

  it('exposes affected area, remediation, source classification, and acknowledgement boundary', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(
      <NormalizedWarningList
        onNavigate={onNavigate}
        warnings={[
          {
            level: 'warn',
            code: 'compatibility.main_chute.test',
            message: 'Review main chute fit',
            affectedInputPaths: ['config.main_chute'],
            remediation: 'Select a compatible part.',
            evidenceClassification: 'derived',
            sourceClassification: 'calculation',
          },
        ]}
      />
    )
    expect(screen.getByText('config.main_chute')).toBeInTheDocument()
    expect(screen.getByText('Select a compatible part.')).toBeInTheDocument()
    expect(screen.getByText('derived')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /REVIEW_AFFECTED_AREA/i }))
    expect(onNavigate).toHaveBeenCalledWith('config.main_chute')
    await user.click(screen.getByRole('button', { name: /ACKNOWLEDGE_REVIEW/i }))
    expect(screen.getByText(/Warning remains active/i)).toBeInTheDocument()
  })
})
