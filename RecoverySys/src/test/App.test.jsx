import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from '../App.jsx'

// Stub clipboard API not supported in jsdom
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
})

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

  it('does NOT show the restore toast when a share link ?c= param is present', async () => {
    // Both localStorage AND a share link present — URL wins, no "Restored" toast
    setLocalStorage(SAVED_SESSION)
    const original = window.location.search
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?c=dummyencodedpayload' },
      writable: true,
      configurable: true,
    })
    await act(async () => {
      render(<App />)
    })
    expect(screen.queryByText('Restored your last session.')).not.toBeInTheDocument()
    // Restore location
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: original },
      writable: true,
      configurable: true,
    })
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
