import { describe, expect, it } from 'vitest'
import { reducer } from '../App.jsx'

const previousState = {
  config: { main_chute: { id: 'old-main' } },
  specs: { rocket_mass_g: '2500' },
  customMotor: { designation: 'old-motor' },
  simulation: { apogee_ft: 1200 },
  inputRevision: 7,
  warnings: [{ code: 'OLD_WARNING', message: 'Old configuration warning' }],
  activeCategory: 'main_chute',
  toasts: [],
  saveState: 'idle',
  shareState: 'idle',
  compareSnapshot: null,
  simRunning: false,
}

describe('reducer imported-state replacement', () => {
  it('clears derived results while replacing local state atomically', () => {
    const importedConfig = { main_chute: null, drogue_chute: { id: 'new-drogue' } }
    const importedSpecs = { rocket_mass_g: '3100' }
    const importedMotor = { designation: 'new-motor' }

    const nextState = reducer(previousState, {
      type: 'LOAD_SHARE',
      config: importedConfig,
      specs: importedSpecs,
      customMotor: importedMotor,
    })

    expect(nextState.config).toBe(importedConfig)
    expect(nextState.specs).toBe(importedSpecs)
    expect(nextState.customMotor).toBe(importedMotor)
    expect(nextState.simulation).toBeNull()
    expect(nextState.warnings).toEqual([])
    expect(nextState.inputRevision).toBe(8)
    expect(nextState.activeCategory).toBe('main_chute')
  })
})
