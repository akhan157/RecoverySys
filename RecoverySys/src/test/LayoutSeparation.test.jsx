import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MissionControlLayout from '../components/MissionControlLayout.jsx'
import { getDefaultSpecs } from '../lib/schema.js'
import { EMPTY_CONFIG, PARTS } from '../data/parts.js'

describe('Layout Separation (Classic vs Revamp)', () => {
  const mockState = {
    specs: getDefaultSpecs(),
    config: EMPTY_CONFIG,
    warnings: [],
    simulation: null,
    resultEnvelope: null,
    customMotor: null,
    compareSnapshot: null,
  }

  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to Revamp mode with StatusStrip and Guided Review button', () => {
    render(
      <MissionControlLayout
        state={mockState}
        allParts={PARTS}
        customParts={[]}
        selectPart={() => {}}
        removePart={() => {}}
        setSpec={() => {}}
        setCategory={() => {}}
        runSim={() => {}}
        saveConfig={() => {}}
        copyShareLink={() => {}}
        addCustomPart={() => {}}
        deleteCustomPart={() => {}}
        editCustomPart={() => {}}
        setCustomMotor={() => {}}
        clearCustomMotor={() => {}}
        loadConfig={() => {}}
        addToast={() => {}}
        saveCompareSnapshot={() => {}}
        clearCompareSnapshot={() => {}}
      />
    )

    // Revamp features should be present
    expect(screen.getByRole('button', { name: /guided review/i })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: /system status/i })).toBeInTheDocument()

    // Mode buttons
    const classicBtn = screen.getByRole('button', { name: 'CLASSIC' })
    const revampBtn = screen.getByRole('button', { name: 'REVAMP' })
    expect(classicBtn).toHaveAttribute('aria-pressed', 'false')
    expect(revampBtn).toHaveAttribute('aria-pressed', 'true')

    // Atlas should NOT exist anywhere
    expect(screen.queryByRole('button', { name: 'ATLAS' })).not.toBeInTheDocument()
    expect(screen.queryByText('Recovery Atlas')).not.toBeInTheDocument()
  })

  it('switches to Classic mode when clicking CLASSIC button and hides StatusStrip and Guided Review', () => {
    render(
      <MissionControlLayout
        state={mockState}
        allParts={PARTS}
        customParts={[]}
        selectPart={() => {}}
        removePart={() => {}}
        setSpec={() => {}}
        setCategory={() => {}}
        runSim={() => {}}
        saveConfig={() => {}}
        copyShareLink={() => {}}
        addCustomPart={() => {}}
        deleteCustomPart={() => {}}
        editCustomPart={() => {}}
        setCustomMotor={() => {}}
        clearCustomMotor={() => {}}
        loadConfig={() => {}}
        addToast={() => {}}
        saveCompareSnapshot={() => {}}
        clearCompareSnapshot={() => {}}
      />
    )

    const classicBtn = screen.getByRole('button', { name: 'CLASSIC' })
    fireEvent.click(classicBtn)

    // localStorage should be updated to classic
    expect(localStorage.getItem('recoverysys-ui-mode')).toBe('classic')

    // Classic layout should be active: no status strip and no guided review button
    expect(screen.queryByRole('button', { name: /guided review/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: /system status/i })).not.toBeInTheDocument()

    // Classic button should now be pressed
    expect(screen.getByRole('button', { name: 'CLASSIC' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'REVAMP' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('boots directly into Classic mode if localStorage is set to classic', () => {
    localStorage.setItem('recoverysys-ui-mode', 'classic')
    render(
      <MissionControlLayout
        state={mockState}
        allParts={PARTS}
        customParts={[]}
        selectPart={() => {}}
        removePart={() => {}}
        setSpec={() => {}}
        setCategory={() => {}}
        runSim={() => {}}
        saveConfig={() => {}}
        copyShareLink={() => {}}
        addCustomPart={() => {}}
        deleteCustomPart={() => {}}
        editCustomPart={() => {}}
        setCustomMotor={() => {}}
        clearCustomMotor={() => {}}
        loadConfig={() => {}}
        addToast={() => {}}
        saveCompareSnapshot={() => {}}
        clearCompareSnapshot={() => {}}
      />
    )

    expect(screen.queryByRole('complementary', { name: /system status/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CLASSIC' })).toHaveAttribute('aria-pressed', 'true')
  })
})
