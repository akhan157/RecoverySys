import { render, screen, within } from '@testing-library/react'
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

  it('prints key estimates, sensitivity, findings, and identity in parity with the screen brief', () => {
    render(
      <PrintChecklist
        specs={{}}
        config={{}}
        simulation={null}
        resultFresh
        warnings={[{ code: 'FIT_WARNING', slot: 'main_chute', level: 'warn', message: 'Review fit.' }]}
        recoveryBrief={{
          status: 'current',
          briefVersion: 'recovery-brief-v1',
          generatedAt: '2026-08-11T12:00:00.000Z',
          confidence: {
            label: 'Insufficient confidence',
            evidenceNote: 'No accepted evidence.',
          },
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
            rows: [
              { ranges: { apogee_ft: { min: 2800, max: 3200 }, main_fps: { min: 11, max: 13 } } },
            ],
          },
          provenance: {
            inputKey: 'sim-input-key',
            inputRevision: 4,
            modelId: 'browser-js-recovery',
            modelVersion: 'test-model',
            assumptionsVersion: 'test-assumptions',
          },
        }}
        printMode="brief"
      />
    )
    // Identity and generated time come from the brief view model, not the print clock.
    expect(screen.getByText(/Generated 2026-08-11T12:00:00.000Z/)).toBeInTheDocument()
    expect(screen.getByText(/sim-input-key/)).toBeInTheDocument()
    expect(screen.getByText(/Input revision: 4/)).toBeInTheDocument()
    // Key estimates with canonical units.
    expect(screen.getByText(/3,000 ft/)).toBeInTheDocument()
    expect(screen.getByText(/35 ft\/s/)).toBeInTheDocument()
    expect(screen.getByText(/40 ft-lbf/)).toBeInTheDocument()
    // Sensitivity ranges.
    expect(screen.getByText(/2,800–3,200 ft/)).toBeInTheDocument()
    // Compatibility findings (brief section; the checklist section also lists them).
    const findingsSection = screen
      .getByRole('heading', { name: 'Compatibility findings' })
      .closest('section')
    expect(findingsSection).toHaveClass('print-artifact--brief')
    expect(within(findingsSection).getByText(/Review fit\./)).toBeInTheDocument()
  })

  it('withholds key estimates and sensitivity ranges from a stale or not-run brief', () => {
    render(
      <PrintChecklist
        specs={{}}
        config={{}}
        simulation={{ apogee_ft: 1000 }}
        resultFresh={false}
        warnings={[]}
        recoveryBrief={{
          status: 'stale',
          confidence: { label: 'Insufficient confidence' },
          keyEstimates: null,
          sensitivity: {
            status: 'stale',
            reason: 'Sensitivity is hidden until the base simulation is current.',
          },
        }}
        printMode="brief"
      />
    )
    expect(screen.getAllByText(/RESULT_STALE/).length).toBeGreaterThan(0)
    const estimatesSection = screen
      .getByRole('heading', { name: 'Current key estimates' })
      .closest('section')
    expect(within(estimatesSection).getByText(/RESULT_STALE/)).toBeInTheDocument()
    expect(within(estimatesSection).queryByText(/1,000 ft/)).not.toBeInTheDocument()
    expect(
      screen.getByText(/Sensitivity is hidden until the base simulation is current\./)
    ).toBeInTheDocument()
    expect(screen.queryByText(/2,800/)).not.toBeInTheDocument()
  })

  it('labels the bay list as a static checklist order, not measured geometry', () => {
    render(
      <PrintChecklist
        specs={{}}
        config={{ shock_cord: { name: 'Cord' } }}
        simulation={null}
        recoveryBrief={{ status: 'not-run' }}
        printMode="checklist"
      />
    )
    expect(
      screen.getByRole('heading', { name: /Static packing \/ checklist order/ })
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        /Planning checklist order only — not measured packing geometry, an assembly instruction, or flight-readiness validation\./
      )
    ).toBeInTheDocument()
  })

  it('prints checklist descent rates in canonical ft/s units', () => {
    render(
      <PrintChecklist
        specs={{}}
        config={{}}
        simulation={{ apogee_ft: 1000, drift_ft: 25, drogue_fps: 60, main_fps: 15 }}
        resultFresh
        recoveryBrief={{ status: 'current' }}
        printMode="checklist"
      />
    )
    expect(screen.getByText('60 ft/s')).toBeInTheDocument()
    expect(screen.getByText('15 ft/s')).toBeInTheDocument()
  })
})
