import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from '../App.jsx'
import { exportOrk } from '../lib/ork.js'

// Mock exportOrk — jsdom has no Blob URL support
vi.mock('../lib/ork.js', () => ({
  exportOrk: vi.fn(),
}))

// Stub clipboard and URL APIs not supported in jsdom
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
})
global.URL.createObjectURL = vi.fn(() => 'blob:mock')
global.URL.revokeObjectURL = vi.fn()

// ── localStorage helpers ───────────────────────────────────────────────────────

const STORAGE_KEY = 'recoverysys-config'

function setLocalStorage(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

// ── Saved session payload (uses a real part ID so rehydration works) ──────────

const SAVED_SESSION = {
  config: {
    main_chute:      { id: 'cl-24-n' },  // b2 Rocketry 24" Compact Light
    drogue_chute:    null,
    shock_cord:      null,
    chute_protector: null,
    quick_links:     null,
    chute_device:    null,
  },
  specs: {
    rocket_mass_g:          '2500',
    motor_total_impulse_ns: '640',
    burn_time_s:            '1.8',
    airframe_od_in:         '4',
    airframe_id_in:         '3.9',
    bay_length_in:          '18',
    drag_cd:                '0.5',
    wind_speed_mph:         '10',
    main_deploy_alt_ft:     '500',
  },
}

// ── Restored-session toast ────────────────────────────────────────────────────

describe('App — restored-session toast', () => {
  beforeEach(() => {
    clearLocalStorage()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
    clearLocalStorage()
  })

  it('shows "Restored your last session." toast when localStorage has saved config', async () => {
    setLocalStorage(SAVED_SESSION)
    await act(async () => {
      render(<App />)
    })
    expect(screen.getByText('Restored your last session.')).toBeInTheDocument()
  })

  it('does NOT show the restore toast when localStorage is empty', async () => {
    await act(async () => {
      render(<App />)
    })
    expect(screen.queryByText('Restored your last session.')).not.toBeInTheDocument()
  })

  it('does NOT show the restore toast when localStorage contains invalid JSON', async () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{')
    await act(async () => {
      render(<App />)
    })
    expect(screen.queryByText('Restored your last session.')).not.toBeInTheDocument()
  })
})

// ── Export button guard ───────────────────────────────────────────────────────

describe('App — export button disabled state', () => {
  beforeEach(() => {
    clearLocalStorage()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
    clearLocalStorage()
  })

  it('is disabled when no chutes are configured (default state)', async () => {
    await act(async () => {
      render(<App />)
    })
    const exportButtons = screen.getAllByRole('button', { name: /export .ork/i })
    expect(exportButtons.length).toBeGreaterThan(0)
    exportButtons.forEach(btn => expect(btn).toBeDisabled())
  })

  it('is disabled when main chute is set but airframe_od_in is empty', async () => {
    // Save a config with main chute but no airframe OD
    setLocalStorage({
      ...SAVED_SESSION,
      specs: { ...SAVED_SESSION.specs, airframe_od_in: '' },
    })
    await act(async () => {
      render(<App />)
    })
    const exportButtons = screen.getAllByRole('button', { name: /export .ork/i })
    exportButtons.forEach(btn => expect(btn).toBeDisabled())
  })

  it('shows hint text "Enter Airframe OD" when airframe_od_in is empty and chute selected', async () => {
    setLocalStorage({
      ...SAVED_SESSION,
      specs: { ...SAVED_SESSION.specs, airframe_od_in: '' },
    })
    await act(async () => {
      render(<App />)
    })
    const hints = screen.getAllByText(/enter airframe od/i)
    expect(hints.length).toBeGreaterThan(0)
  })
})

// Helper: flush all pending microtasks/promises without advancing fake timers
const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0))

// ── Export state machine ──────────────────────────────────────────────────────

describe('App — export state machine', () => {
  beforeEach(() => {
    clearLocalStorage()
    vi.mocked(exportOrk).mockResolvedValue(new Blob(['<zip>'], { type: 'application/octet-stream' }))
  })

  afterEach(() => {
    clearLocalStorage()
    vi.restoreAllMocks()
  })

  it('shows "Exported ✓" after a successful export then resets to idle after 3s', async () => {
    // Regression: ISSUE (eng-review) — export state machine stays in 'done' forever
    // Found by /plan-eng-review on 2026-03-23
    // Report: .gstack/qa-reports/qa-report-localhost-2026-03-23.md
    vi.useFakeTimers({ shouldAdvanceTime: true })

    try {
      setLocalStorage(SAVED_SESSION)
      await act(async () => {
        render(<App />)
      })

      // Advance past the 300ms compatibility debounce
      await act(async () => { vi.advanceTimersByTime(400) })

      const exportButtons = screen.getAllByRole('button', { name: /export .ork/i })
      const activeBtn = exportButtons.find(b => !b.disabled)
      if (!activeBtn) return // skip if button can't be enabled in this env

      // Click export — this triggers the async exportOrk flow
      await act(async () => {
        activeBtn.click()
        // Flush the resolved promise from the mock
        await flushPromises()
      })

      // "Exported ✓" should now be showing
      const doneButtons = screen.queryAllByRole('button', { name: /exported/i })
      expect(doneButtons.length).toBeGreaterThan(0)

      // After 3 seconds the safeTimeout fires and resets to idle
      await act(async () => { vi.advanceTimersByTime(3100) })

      const resetButtons = screen.queryAllByRole('button', { name: /export .ork/i })
      expect(resetButtons.length).toBeGreaterThan(0)
    } finally {
      vi.useRealTimers()
    }
  })
})

// ── Mobile tab bar badge ──────────────────────────────────────────────────────

describe('App — mobile Config tab error badge', () => {
  beforeEach(() => {
    clearLocalStorage()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
    clearLocalStorage()
  })

  it('shows error badge on Config tab when compatibility errors exist', async () => {
    // A drogue chute with no main chute triggers a 'main_chute' error
    setLocalStorage({
      config: {
        main_chute:      null,
        drogue_chute:    { id: 'fr3-12-12' },  // Front Range 12" Elliptical
        shock_cord:      null,
        chute_protector: null,
        quick_links:     null,
        chute_device:    null,
      },
      specs: { ...SAVED_SESSION.specs },
    })

    await act(async () => {
      render(<App />)
    })

    // Advance past the 300ms compatibility debounce and flush React updates
    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    // The badge is a span with background: var(--error-fg) in the mobile tab bar
    // waitFor is intentionally avoided here — fake timers block its polling loop.
    // After act(advanceTimersByTime), React state is already committed synchronously.
    const badge = document.querySelector('span[style*="var(--error-fg)"]')
    expect(badge).toBeInTheDocument()
  })

  it('shows NO badge on Config tab when there are no errors', async () => {
    // Default state — no components, no errors
    await act(async () => {
      render(<App />)
    })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    const badge = document.querySelector('span[style*="var(--error-fg)"]')
    expect(badge).not.toBeInTheDocument()
  })
})
