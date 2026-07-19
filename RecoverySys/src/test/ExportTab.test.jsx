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
})
