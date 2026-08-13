import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import FlightLogTab from '../components/tabs/FlightLogTab.jsx'

function renderTab(props = {}) {
  const addToast = vi.fn()
  render(
    <FlightLogTab
      state={{ simulation: null, specs: {} }}
      resultFresh={false}
      addToast={addToast}
      {...props}
    />
  )
  return addToast
}

describe('FlightLogTab candidate-evidence UI', () => {
  it('offers conditions capture and distinct candidate-evidence export/import actions', () => {
    renderTab()
    expect(screen.getByLabelText('Conditions (optional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /EXPORT_CANDIDATE_EVIDENCE/ })).toBeInTheDocument()
    expect(screen.getByLabelText('IMPORT_CANDIDATE_EVIDENCE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /EXPORT_RECORDS/ })).toBeInTheDocument()
    expect(screen.getByLabelText('IMPORT_RECORDS')).toBeInTheDocument()
  })

  it('toasts a rejection for a malformed candidate-evidence file', async () => {
    const addToast = renderTab()
    const file = new File(['{bad'], 'evidence.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('IMPORT_CANDIDATE_EVIDENCE'), {
      target: { files: [file] },
    })
    await waitFor(() =>
      expect(addToast).toHaveBeenCalledWith('error', expect.stringMatching(/Invalid candidate evidence/))
    )
  })

  it('imports a valid candidate-evidence record, preserves the derived prediction identity, and never promotes to corpus evidence', async () => {
    const addToast = renderTab()
    const payload = {
      type: 'recoverysys-candidate-evidence',
      exportVersion: 1,
      entries: [
        {
          id: 'ev-1',
          date: '2026-01-01',
          location: 'FAR Mojave',
          actual_apogee_ft: '4050',
          observationProvenance: {
            source: 'altimeter',
            recordedAt: '2026-01-01T00:00:00Z',
            method: 'manual-entry',
          },
          predicted: { apogee_ft: 4000, main_fps: 18 },
          simulationProvenance: { inputKey: 'sim-xyz' },
          specs_snapshot: {},
          instrumentation: { devices: [], notes: '' },
        },
      ],
    }
    const file = new File([JSON.stringify(payload)], 'evidence.json', { type: 'application/json' })
    fireEvent.change(screen.getByLabelText('IMPORT_CANDIDATE_EVIDENCE'), {
      target: { files: [file] },
    })
    await waitFor(() =>
      expect(addToast).toHaveBeenCalledWith(
        'ok',
        expect.stringContaining('Imported 1 candidate evidence record')
      )
    )
    expect(screen.getByText('FAR Mojave')).toBeInTheDocument()
    expect(screen.getByText(/4050 ft/)).toBeInTheDocument()
  })
})
