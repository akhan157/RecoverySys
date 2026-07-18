import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import CompareTab from '../components/tabs/CompareTab.jsx'

const state = {
  config: {},
  specs: {},
  customMotor: null,
  simulation: null,
}

describe('CompareTab current-B result integrity', () => {
  it('distinguishes no current-B result from a stale current-B result', () => {
    const { rerender } = render(<CompareTab state={state} resultFresh={false} />)
    screen.getByRole('button', { name: /save as config a/i }).click()
    expect(screen.getByRole('alert')).toHaveTextContent(/no current-b simulation available/i)

    rerender(<CompareTab state={{ ...state, simulation: { apogee_ft: 1000 } }} resultFresh={false} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/current-b simulation is stale/i)
  })
})
