import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ExportTab from '../components/tabs/ExportTab.jsx'

describe('ExportTab custom-part import', () => {
  it('passes decoded inline custom parts to the app owner for persistence', async () => {
    const onLoadConfig = vi.fn()
    const custom = { id: 'custom-imported', category: 'main_chute', name: 'Imported', specs: {} }
    const file = new File(
      [
        JSON.stringify({
          _format: 'recoverysys-config-v1',
          schemaVersion: 1,
          config: { main_chute: custom },
          specs: {},
          customMotor: null,
        }),
      ],
      'config.json',
      { type: 'application/json' }
    )

    render(
      <ExportTab
        state={{ saveState: 'idle', shareState: 'idle' }}
        saveConfig={vi.fn()}
        copyShareLink={vi.fn()}
        onLoadConfig={onLoadConfig}
      />
    )

    fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } })
    await waitFor(() =>
      expect(onLoadConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          inlinedCustomParts: [custom],
        })
      )
    )
  })

  it('shows the versioned brief handoff status and routes open and print actions', () => {
    const onOpenBrief = vi.fn()
    const onPrintBrief = vi.fn()
    const onPrintChecklist = vi.fn()
    render(
      <ExportTab
        state={{ saveState: 'idle', shareState: 'idle' }}
        saveConfig={vi.fn()}
        copyShareLink={vi.fn()}
        onLoadConfig={vi.fn()}
        onOpenBrief={onOpenBrief}
        onPrintBrief={onPrintBrief}
        onPrintChecklist={onPrintChecklist}
        recoveryBrief={{ status: 'stale', confidence: { label: 'Insufficient confidence' } }}
      />
    )
    expect(screen.getByRole('status')).toHaveTextContent(/RESULT_STALE/)
    expect(screen.getByRole('status')).toHaveTextContent(/Insufficient confidence/)

    fireEvent.click(screen.getByRole('button', { name: /OPEN_RECOVERY_BRIEF/i }))
    fireEvent.click(screen.getByRole('button', { name: /PRINT_RECOVERY_BRIEF/i }))
    fireEvent.click(screen.getByRole('button', { name: /PRINT_CHECKLIST/i }))
    expect(onOpenBrief).toHaveBeenCalledOnce()
    expect(onPrintBrief).toHaveBeenCalledOnce()
    expect(onPrintChecklist).toHaveBeenCalledOnce()
  })
})

describe('ExportTab OpenRocket snapshot review', () => {
  it('requires explicit source selections before accepting a snapshot', () => {
    const onAcceptOpenRocket = vi.fn()
    const exchange = {
      project: {
        name: 'Imported rocket',
        configurations: [{ id: 'cfg-1', default: true }],
        stages: [{ name: 'Booster', number: 1, sourcePath: '/openrocket/rocket/stage[1]' }],
      },
      source: {
        sourceFilename: 'rocket.ork',
        sourceHash: 'abc123',
        formatVersion: '1.10',
      },
      externalResults: [{ id: 'saved-1' }],
      motorContext: [{ id: 'motor-1' }],
      omitted: { typedFlightBranchCount: 2 },
      warnings: [],
      vehicleCandidates: [
        {
          id: 'tube-id',
          targetField: 'airframe_id_in',
          normalizedValue: 3.9,
          normalizedUnit: 'in',
          status: 'needs-confirmation',
          tube: {
            componentName: 'Recovery tube',
            stage: { sourcePath: '/openrocket/rocket/stage[1]' },
          },
        },
        {
          id: 'tube-length',
          targetField: 'bay_length_in',
          normalizedValue: 18,
          normalizedUnit: 'in',
          status: 'needs-confirmation',
          tube: {
            componentName: 'Recovery tube',
            stage: { sourcePath: '/openrocket/rocket/stage[1]' },
          },
        },
      ],
      massCandidates: [
        {
          id: 'mass-1',
          normalizedValue: 2500,
          status: 'needs-confirmation',
          simulation: { configId: 'cfg-1', name: 'Saved flight' },
        },
      ],
    }

    render(
      <ExportTab
        state={{ saveState: 'idle', shareState: 'idle' }}
        saveConfig={vi.fn()}
        copyShareLink={vi.fn()}
        onLoadConfig={vi.fn()}
        openRocketImport={exchange}
        onAcceptOpenRocket={onAcceptOpenRocket}
      />
    )

    expect(screen.getByRole('button', { name: /ACCEPT_VEHICLE_SNAPSHOT/i })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('CONFIGURATION'), { target: { value: 'cfg-1' } })
    fireEvent.change(screen.getByLabelText('STAGE'), {
      target: { value: '/openrocket/rocket/stage[1]' },
    })
    fireEvent.change(screen.getByLabelText('AIRFRAME_ID_CANDIDATE'), {
      target: { value: 'tube-id' },
    })
    fireEvent.change(screen.getByLabelText('BAY_LENGTH_CANDIDATE'), {
      target: { value: 'tube-length' },
    })
    fireEvent.change(screen.getByLabelText('PRE_LAUNCH_MASS (OPTIONAL)'), {
      target: { value: 'mass-1' },
    })

    const accept = screen.getByRole('button', { name: /ACCEPT_VEHICLE_SNAPSHOT/i })
    expect(accept).toBeEnabled()
    fireEvent.click(accept)
    expect(onAcceptOpenRocket).toHaveBeenCalledWith({
      configurationId: 'cfg-1',
      stagePath: '/openrocket/rocket/stage[1]',
      airframeCandidateId: 'tube-id',
      bayCandidateId: 'tube-length',
      massCandidateId: 'mass-1',
    })
  })
})
