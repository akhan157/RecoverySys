import React from 'react'
import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import CompareTab from '../components/tabs/CompareTab.jsx'

const state = {
  config: {},
  specs: {},
  customMotor: null,
  simulation: null,
}

describe('CompareTab current-B result integrity', () => {
  it('distinguishes no current-B result from a stale current-B result', () => {
    let snapshot = null
    const onSaveSnapshot = () => {
      snapshot = { config: {}, specs: {}, customMotor: null, savedAt: 'now' }
    }
    const { rerender } = render(
      <CompareTab
        state={state}
        resultFresh={false}
        snapshot={snapshot}
        onSaveSnapshot={onSaveSnapshot}
        onClearSnapshot={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /SAVE_AS_CONFIG_A/i }))
    rerender(
      <CompareTab
        state={state}
        resultFresh={false}
        snapshot={snapshot}
        onSaveSnapshot={onSaveSnapshot}
        onClearSnapshot={() => {}}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/no current-b simulation available/i)

    rerender(
      <CompareTab
        state={{ ...state, simulation: { apogee_ft: 1000 } }}
        resultFresh={false}
        snapshot={snapshot}
        onSaveSnapshot={onSaveSnapshot}
        onClearSnapshot={() => {}}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(/current-b simulation is stale/i)
  })
})
