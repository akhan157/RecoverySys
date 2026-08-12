import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RecoveryBriefTab from '../components/tabs/RecoveryBriefTab.jsx'

const currentBrief = {
  briefVersion: 'recovery-brief-v1',
  generatedAt: '2026-08-11T12:00:00.000Z',
  status: 'current',
  missionEnvelope: {
    status: 'conditional',
    reasons: [
      {
        code: 'NO_WIND_PROFILE',
        message: 'No populated wind profile is available.',
        remediation: 'Enter a measured wind profile.',
      },
    ],
  },
  confidence: {
    label: 'Insufficient confidence',
    evidenceNote: 'No accepted comparison or flight evidence is available.',
    reasons: ['Review-only evidence'],
  },
  selectedHardware: [{ slot: 'main_chute', name: 'Main Chute', specification: {} }],
  warnings: [{ code: 'FIT_WARNING', level: 'warn', message: 'Review main chute fit.' }],
  keyEstimates: {
    apogee_ft: 3000,
    drift_ft: 700,
    drogue_fps: 35,
    main_fps: 12,
    landing_ke_ftlbf: 40,
  },
  sensitivity: {
    status: 'complete',
    method: 'Deterministic one-at-a-time variations.',
    rows: [{ ranges: { apogee_ft: { min: 2800, max: 3200 }, drift_ft: { min: 600, max: 800 } } }],
  },
  unresolvedChecks: [
    {
      code: 'NO_WIND_PROFILE',
      message: 'No wind profile is available.',
      remediation: 'Enter measured wind data.',
    },
  ],
  provenance: {
    inputKey: 'input-key',
    inputRevision: 4,
    modelId: 'browser-js-recovery',
    modelVersion: 'test-model',
    assumptionsVersion: 'test-assumptions',
  },
  authorization: 'This brief does not authorize launch or replace independent review.',
}

describe('RecoveryBriefTab', () => {
  it('renders the view-model sections with semantic headings and text statuses', () => {
    render(<RecoveryBriefTab recoveryBrief={currentBrief} />)

    expect(screen.getByRole('heading', { name: 'Recovery Brief' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('CURRENT RESULT')
    expect(
      screen.getByRole('heading', { name: 'Confidence and evidence posture' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('No accepted comparison or flight evidence is available.')
    ).toBeInTheDocument()
    const listItems = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(listItems.some((text) => /NO_WIND_PROFILE.*No populated wind profile/.test(text))).toBe(
      true
    )
    expect(listItems.some((text) => /NO_WIND_PROFILE.*No wind profile/.test(text))).toBe(true)
    expect(screen.getAllByText('Apogee')).not.toHaveLength(0)
    expect(screen.getByText('3,000')).toBeInTheDocument()
    expect(screen.getByText('Main Chute')).toBeInTheDocument()
    expect(listItems.some((text) => /FIT_WARNING.*Review main chute fit/.test(text))).toBe(true)
    expect(screen.getByText('Deterministic one-at-a-time variations.')).toBeInTheDocument()
    expect(
      screen.getByText(/not probability, accuracy, or a confidence interval/i)
    ).toBeInTheDocument()
    expect(screen.getByText('input-key')).toBeInTheDocument()
    expect(screen.getByText(currentBrief.authorization)).toBeInTheDocument()
  })

  it('withholds stale and not-run key estimates while retaining the remediation status', () => {
    const stale = {
      ...currentBrief,
      status: 'stale',
      keyEstimates: null,
      sensitivity: {
        status: 'stale',
        reason: 'Sensitivity is hidden until the base simulation is current.',
      },
    }
    const { rerender } = render(<RecoveryBriefTab recoveryBrief={stale} />)

    expect(screen.getByRole('status')).toHaveTextContent('STALE RESULT')
    expect(screen.getByText(/RESULT_STALE/)).toBeInTheDocument()
    expect(screen.queryByText('3,000')).not.toBeInTheDocument()
    expect(
      screen.getByText(/Sensitivity is hidden until the base simulation is current/)
    ).toBeInTheDocument()

    rerender(<RecoveryBriefTab recoveryBrief={{ ...stale, status: 'not-run' }} />)
    expect(screen.getByRole('status')).toHaveTextContent('NO CURRENT RESULT')
    expect(screen.getByText(/NO_CURRENT_RESULT/)).toBeInTheDocument()
    expect(screen.queryByText('3,000')).not.toBeInTheDocument()
  })
})
