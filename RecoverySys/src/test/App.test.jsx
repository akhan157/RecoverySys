import { render, renderHook, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App, { reducer } from '../App.jsx'
import { encodeSharePayload } from '../lib/shareLink.js'
import useShareLinkLoader from '../hooks/useShareLinkLoader.js'
import { EMPTY_CONFIG, SLOT_IDS } from '../data/parts.js'

// Stub clipboard API not supported in jsdom
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
})

// ── localStorage helpers ───────────────────────────────────────────────────────

const STORAGE_KEY = 'recoverysys-config'
const VISITED_KEY = 'recoverysys-visited'

function setLocalStorage(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function clearLocalStorage() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem(VISITED_KEY)
}

// Tests run as returning users (visited = '1') so first-visit demo mode
// doesn't trigger and interfere with unrelated assertions.
function setReturningUser() {
  localStorage.setItem(VISITED_KEY, '1')
}

// ── Saved session payload (uses a real part ID so rehydration works) ──────────

const SAVED_SESSION = {
  config: {
    main_chute: { id: 'cl-24-n' }, // b2 Rocketry 24" Compact Light
    drogue_chute: null,
    shock_cord: null,
    chute_protector: null,
    quick_links: null,
    chute_device: null,
  },
  specs: {
    rocket_mass_g: '2500',
    motor_total_impulse_ns: '640',
    burn_time_s: '1.8',
    airframe_id_in: '3.9',
    bay_length_in: '18',
    drag_cd: '0.5',
    wind_speed_mph: '10',
    main_deploy_alt_ft: '500',
  },
}

// ── Restored-session toast ────────────────────────────────────────────────────

describe('App — restored-session toast', () => {
  beforeEach(() => {
    clearLocalStorage()
    setReturningUser()
    vi.useFakeTimers()
  })

  afterEach(() => {
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

// ── Validation badge (Dashboard tab) ────────────────────────────────────────

describe('App — status bar warning badge', () => {
  beforeEach(() => {
    clearLocalStorage()
    setReturningUser()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    clearLocalStorage()
  })

  it('shows warning badge in status bar when compatibility errors exist', async () => {
    // A drogue chute with no main chute triggers a 'main_chute' error
    setLocalStorage({
      config: {
        main_chute: null,
        drogue_chute: { id: 'fr3-12-12', category: 'drogue_chute' }, // Front Range 12" Elliptical
        shock_cord: null,
        chute_protector: null,
        quick_links: null,
        chute_device: null,
      },
      specs: { ...SAVED_SESSION.specs },
    })

    await act(async () => {
      render(<App />)
    })
    await act(async () => {
      screen.getByRole('tab', { name: 'DASHBOARD' }).click()
    })

    // Advance past the 300ms compatibility debounce and flush React updates
    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    // Dashboard tab shows validation badge when compatibility errors exist
    const badge = document.querySelector('.mc-validation--warn, .mc-validation--error')
    expect(badge).toBeInTheDocument()
  })

  it('shows NOMINAL badge when there are no errors', async () => {
    // Default state — no components, no errors
    await act(async () => {
      render(<App />)
    })
    await act(async () => {
      screen.getByRole('tab', { name: 'DASHBOARD' }).click()
    })

    await act(async () => {
      vi.advanceTimersByTime(400)
    })

    const badge = document.querySelector('.mc-validation--warn, .mc-validation--error')
    expect(badge).not.toBeInTheDocument()
  })
})

describe('MissionControl tab semantics', () => {
  beforeEach(() => {
    clearLocalStorage()
    setReturningUser()
  })

  afterEach(() => {
    clearLocalStorage()
  })

  it('matches the active tab aria-controls target to the main panel id', async () => {
    const user = userEvent.setup()
    render(<App />)

    const analysisTab = screen.getByRole('tab', { name: 'ANALYSIS' })
    const briefTab = screen.getByRole('tab', { name: 'RECOVERY_BRIEF' })
    expect(analysisTab).toHaveAttribute('aria-controls', 'mc-panel-analysis')
    expect(briefTab).toHaveAttribute('aria-controls', 'mc-panel-recovery_brief')

    await user.click(analysisTab)

    const analysisPanel = screen.getByRole('tabpanel')
    expect(analysisPanel).toHaveAttribute('id', 'mc-panel-analysis')
    expect(analysisTab).toHaveAttribute('aria-controls', analysisPanel.id)

    await user.click(briefTab)
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'mc-panel-recovery_brief')
    expect(screen.getByRole('heading', { name: 'Recovery Brief' })).toBeInTheDocument()
  })
  it('supports wrapping arrow navigation and Home/End with roving focus', async () => {
    const user = userEvent.setup()
    render(<App />)

    const guidedTab = screen.getByRole('tab', { name: 'GUIDED_REVIEW' })
    const dashboardTab = screen.getByRole('tab', { name: 'DASHBOARD' })
    const exportTab = screen.getByRole('tab', { name: 'EXPORT' })

    guidedTab.focus()
    await user.keyboard('{ArrowLeft}')
    expect(exportTab).toHaveFocus()
    expect(exportTab).toHaveAttribute('aria-selected', 'true')
    expect(exportTab).toHaveAttribute('tabindex', '0')
    expect(guidedTab).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'mc-panel-export')

    await user.keyboard('{ArrowDown}')
    expect(guidedTab).toHaveFocus()
    expect(guidedTab).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowRight}')
    expect(dashboardTab).toHaveFocus()
    expect(dashboardTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'mc-panel-dashboard')

    await user.keyboard('{ArrowUp}')
    expect(guidedTab).toHaveFocus()

    await user.keyboard('{End}')
    expect(exportTab).toHaveFocus()

    await user.keyboard('{Home}')
    expect(guidedTab).toHaveFocus()
  })
})

// ── Share-link import transaction ────────────────────────────────────────────

describe('App — rejected share-link import', () => {
  beforeEach(() => {
    clearLocalStorage()
    setReturningUser()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runAllTimers()
    vi.useRealTimers()
    clearLocalStorage()
  })

  it('does not apply configuration when inline custom parts exceed storage limits', async () => {
    const incoming = {
      id: 'custom-imported',
      category: 'main_chute',
      name: 'Should Not Load',
      specs: {},
    }
    const originalSearch = window.location.search
    Object.defineProperty(window, 'location', {
      value: {
        ...window.location,
        search: `?c=${encodeURIComponent(
          encodeSharePayload({
            config: { ...SAVED_SESSION.config, main_chute: incoming },
            specs: SAVED_SESSION.specs,
          })
        )}`,
      },
      writable: true,
      configurable: true,
    })

    const dispatch = vi.fn()
    const addToast = vi.fn()
    const mergeCustomParts = vi.fn(() => ({
      ok: false,
      importedCount: 0,
      error: 'Imported custom parts exceed local storage limits.',
    }))
    renderHook(() =>
      useShareLinkLoader({
        allParts: [],
        addToast,
        mergeCustomParts,
        dispatch,
      })
    )

    expect(mergeCustomParts).toHaveBeenCalledWith([incoming])
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'LOAD_SHARE' }))
    expect(addToast).toHaveBeenCalledWith(
      expect.anything(),
      'Imported custom parts exceed local storage limits.'
    )

    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: originalSearch },
      writable: true,
      configurable: true,
    })
  })
})

describe('App — imported state freshness', () => {
  it('clears warnings from the replaced local configuration before debounce refresh', () => {
    const previousState = {
      config: { drogue_chute: { id: 'old-drogue' } },
      specs: { rocket_mass_g: '2500' },
      customMotor: null,
      simulation: { apogee_ft: 2200 },
      warnings: [{ slot: 'drogue_chute', message: 'Old configuration warning' }],
      inputRevision: 4,
    }
    const importedConfig = { main_chute: { id: 'new-main' } }

    const nextState = reducer(previousState, {
      type: 'LOAD_SHARE',
      config: importedConfig,
      specs: { rocket_mass_g: '3000' },
      customMotor: null,
    })

    expect(nextState.config).toBe(importedConfig)
    expect(nextState.specs).toEqual({ rocket_mass_g: '3000' })
    expect(nextState.simulation).toBeNull()
    expect(nextState.warnings).toEqual([])
    expect(nextState.inputRevision).toBe(5)
  })
})
