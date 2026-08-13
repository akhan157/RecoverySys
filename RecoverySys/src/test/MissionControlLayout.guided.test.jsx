import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import MissionControlLayout from '../components/MissionControlLayout.jsx'
import { PARTS } from '../data/parts.js'

const baseState = {
  config: {},
  specs: {},
  customMotor: null,
  activeCategory: 'main_chute',
  simulation: null,
  inputRevision: 0,
  simRunning: false,
  warnings: [],
  toasts: [],
  saveState: 'idle',
  shareState: 'idle',
  compareSnapshot: null,
}

function renderGuided(overrides = {}) {
  const callbacks = {
    selectPart: vi.fn(),
    removePart: vi.fn(),
    setSpec: vi.fn(),
    setCategory: vi.fn(),
    runSim: vi.fn(),
    saveConfig: vi.fn(),
    copyShareLink: vi.fn(),
    addCustomPart: vi.fn(),
    deleteCustomPart: vi.fn(),
    editCustomPart: vi.fn(),
    setCustomMotor: vi.fn(),
    clearCustomMotor: vi.fn(),
    loadConfig: vi.fn(),
    clearAll: vi.fn(),
    addToast: vi.fn(),
    saveCompareSnapshot: vi.fn(),
    clearCompareSnapshot: vi.fn(),
  }
  render(
    <MissionControlLayout
      state={baseState}
      allParts={PARTS}
      customParts={[]}
      {...callbacks}
      {...overrides}
    />
  )
  return { ...callbacks, ...overrides }
}

describe('MissionControlLayout guided start-fresh', () => {
  it('routes start-fresh through demo exit while a demo session is active', () => {
    const onExitDemo = vi.fn()
    const { clearAll } = renderGuided({ demoMode: true, onExitDemo })
    fireEvent.click(screen.getByRole('button', { name: /start a new plan/i }))
    expect(onExitDemo).toHaveBeenCalledOnce()
    expect(clearAll).not.toHaveBeenCalled()
  })

  it('clears the plan locally when no demo session is active', () => {
    const { clearAll } = renderGuided()
    fireEvent.click(screen.getByRole('button', { name: /start a new plan/i }))
    expect(clearAll).toHaveBeenCalledOnce()
  })
})
