import React from 'react'
import { describe, it, expect } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RESULT_STATUS_DETAILS } from '../lib/assessment.js'
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
    expect(screen.getByRole('alert')).toHaveTextContent(RESULT_STATUS_DETAILS['not-run'].reasonCode)
    expect(screen.getByRole('alert')).toHaveTextContent('No current-B simulation available')

    rerender(
      <CompareTab
        state={{ ...state, simulation: { apogee_ft: 1000 } }}
        resultFresh={false}
        snapshot={snapshot}
        onSaveSnapshot={onSaveSnapshot}
        onClearSnapshot={() => {}}
      />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(RESULT_STATUS_DETAILS.stale.reasonCode)
    expect(screen.getByRole('alert')).toHaveTextContent('Current-B simulation is stale')
  })
})
