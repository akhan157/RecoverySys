import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchRcConfig, extractRcSpecs } from '../lib/rc.js'

// ── extractRcSpecs ────────────────────────────────────────────────────────────

const VALID_KEYS = new Set([
  'rocket_mass_g',
  'motor_total_impulse_ns',
  'burn_time_s',
  'airframe_od_in',
  'airframe_id_in',
  'bay_length_in',
  'drag_cd',
  'wind_speed_mph',
  'main_deploy_alt_ft',
])

describe('extractRcSpecs', () => {
  it('returns empty object for null input', () => {
    expect(extractRcSpecs(null, VALID_KEYS)).toEqual({})
  })

  it('returns empty object for missing specs key', () => {
    expect(extractRcSpecs({}, VALID_KEYS)).toEqual({})
    expect(extractRcSpecs({ other: 'stuff' }, VALID_KEYS)).toEqual({})
  })

  it('returns empty object when specs is not an object', () => {
    expect(extractRcSpecs({ specs: 'bad' }, VALID_KEYS)).toEqual({})
    expect(extractRcSpecs({ specs: 42 }, VALID_KEYS)).toEqual({})
    expect(extractRcSpecs({ specs: null }, VALID_KEYS)).toEqual({})
    expect(extractRcSpecs({ specs: [] }, VALID_KEYS)).toEqual({})
  })

  it('extracts valid spec keys', () => {
    const rc = { specs: { main_deploy_alt_ft: '800', drag_cd: '0.6' } }
    expect(extractRcSpecs(rc, VALID_KEYS)).toEqual({ main_deploy_alt_ft: '800', drag_cd: '0.6' })
  })

  it('silently ignores unknown spec keys', () => {
    const rc = { specs: { main_deploy_alt_ft: '800', unknown_key: 'foo' } }
    expect(extractRcSpecs(rc, VALID_KEYS)).toEqual({ main_deploy_alt_ft: '800' })
  })

  it('coerces numeric values to strings', () => {
    const rc = { specs: { main_deploy_alt_ft: 800, drag_cd: 0.6 } }
    const result = extractRcSpecs(rc, VALID_KEYS)
    expect(result.main_deploy_alt_ft).toBe('800')
    expect(result.drag_cd).toBe('0.6')
  })

  it('preserves string values as-is', () => {
    const rc = { specs: { main_deploy_alt_ft: '500' } }
    expect(extractRcSpecs(rc, VALID_KEYS).main_deploy_alt_ft).toBe('500')
  })

  it('returns empty object when all keys are unknown', () => {
    const rc = { specs: { not_a_spec: 'x', also_bad: 'y' } }
    expect(extractRcSpecs(rc, VALID_KEYS)).toEqual({})
  })

  it('handles top-level array gracefully', () => {
    expect(extractRcSpecs([], VALID_KEYS)).toEqual({})
  })

  it('handles extra top-level keys alongside specs', () => {
    const rc = { specs: { drag_cd: '0.5' }, version: '1', club: 'NXRS' }
    expect(extractRcSpecs(rc, VALID_KEYS)).toEqual({ drag_cd: '0.5' })
  })
})

// ── fetchRcConfig ─────────────────────────────────────────────────────────────

describe('fetchRcConfig', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns parsed JSON when fetch succeeds', async () => {
    const payload = { specs: { main_deploy_alt_ft: '800' } }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    }))
    expect(await fetchRcConfig()).toEqual(payload)
  })

  it('returns null when file is absent (404)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await fetchRcConfig()).toBeNull()
  })

  it('returns null when fetch rejects (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await fetchRcConfig()).toBeNull()
  })

  it('returns null when response JSON is invalid', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError('bad json')),
    }))
    expect(await fetchRcConfig()).toBeNull()
  })
})
