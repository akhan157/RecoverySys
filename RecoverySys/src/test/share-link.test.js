import { describe, it, expect } from 'vitest'
import { encodeSharePayload as realEncode } from '../lib/shareLink.js'

// Simple codec for basic roundtrip tests (no custom-part detection)
function encodeSharePayload(payload) {
  return btoa(encodeURIComponent(JSON.stringify(payload)))
}

function decodeSharePayload(encoded) {
  return JSON.parse(decodeURIComponent(atob(encoded)))
}

const sampleConfig = {
  main_chute:      { id: 'rk-main-36', name: 'RocketMan 36"', manufacturer: 'RocketMan', category: 'main_chute', specs: { diameter_in: 36, cd: 1.5 } },
  drogue_chute:    null,
  shock_cord:      null,
  chute_protector: null,
  quick_links:     null,
  chute_device:    null,
}

const sampleSpecs = {
  rocket_mass_g:          '2500',
  motor_total_impulse_ns: '640',
  burn_time_s:            '1.8',
  airframe_od_in:         '4',
  airframe_id_in:         '3.9',
  bay_length_in:          '18',
  drag_cd:                '0.5',
  wind_speed_mph:         '10',
  main_deploy_alt_ft:     '500',
}

// ── Roundtrip ─────────────────────────────────────────────────────────────────

describe('share-link codec — encode/decode roundtrip', () => {
  it('roundtrips a full config+specs payload without data loss', () => {
    const payload  = { config: sampleConfig, specs: sampleSpecs }
    const encoded  = encodeSharePayload(payload)
    const decoded  = decodeSharePayload(encoded)
    expect(decoded).toEqual(payload)
  })

  it('roundtrips an empty config (all null parts)', () => {
    const payload = {
      config: { main_chute: null, drogue_chute: null, shock_cord: null, chute_protector: null, quick_links: null, chute_device: null },
      specs:  sampleSpecs,
    }
    const decoded = decodeSharePayload(encodeSharePayload(payload))
    expect(decoded.config.main_chute).toBeNull()
  })

  it('roundtrips when all spec fields are empty strings', () => {
    const payload = {
      config: sampleConfig,
      specs:  Object.fromEntries(Object.keys(sampleSpecs).map(k => [k, ''])),
    }
    const decoded = decodeSharePayload(encodeSharePayload(payload))
    expect(decoded.specs.rocket_mass_g).toBe('')
  })

  it('preserves numeric string values (not coerced to numbers)', () => {
    const payload = { config: sampleConfig, specs: { ...sampleSpecs, rocket_mass_g: '2500' } }
    const decoded = decodeSharePayload(encodeSharePayload(payload))
    expect(typeof decoded.specs.rocket_mass_g).toBe('string')
    expect(decoded.specs.rocket_mass_g).toBe('2500')
  })
})

// ── Unicode handling ──────────────────────────────────────────────────────────

describe('share-link codec — Unicode handling', () => {
  it('roundtrips part names with non-Latin-1 characters', () => {
    const payload = {
      config: { ...sampleConfig, main_chute: { ...sampleConfig.main_chute, name: 'Chute™ — Größe 36"' } },
      specs:  sampleSpecs,
    }
    const decoded = decodeSharePayload(encodeSharePayload(payload))
    expect(decoded.config.main_chute.name).toBe('Chute™ — Größe 36"')
  })

  it('handles Chinese characters in part names without throwing', () => {
    const payload = {
      config: { ...sampleConfig, main_chute: { ...sampleConfig.main_chute, name: '降落伞' } },
      specs:  sampleSpecs,
    }
    const decoded = decodeSharePayload(encodeSharePayload(payload))
    expect(decoded.config.main_chute.name).toBe('降落伞')
  })

  it('handles emoji in part names without throwing', () => {
    const payload = {
      config: { ...sampleConfig, main_chute: { ...sampleConfig.main_chute, name: 'Chute 🚀' } },
      specs:  sampleSpecs,
    }
    expect(() => encodeSharePayload(payload)).not.toThrow()
    const decoded = decodeSharePayload(encodeSharePayload(payload))
    expect(decoded.config.main_chute.name).toBe('Chute 🚀')
  })
})

// ── Malformed input ───────────────────────────────────────────────────────────

describe('share-link codec — error cases', () => {
  it('throws (or rejects) when given invalid base64', () => {
    // App.jsx wraps decoding in try/catch; here we verify the raw decode throws
    expect(() => decodeSharePayload('not-valid-base64!!!')).toThrow()
  })

  it('throws when given valid base64 but non-JSON content', () => {
    const notJson = btoa(encodeURIComponent('hello world'))
    expect(() => decodeSharePayload(notJson)).toThrow()
  })
})

// ── URL length ────────────────────────────────────────────────────────────────

describe('share-link URL length', () => {
  it('stays well under 8000 chars for a fully-populated config', () => {
    const payload = { config: sampleConfig, specs: sampleSpecs }
    const encoded = encodeURIComponent(encodeSharePayload(payload))
    const url     = `https://example.com/?c=${encoded}`
    expect(url.length).toBeLessThan(8000)
  })

  it('stays under 8000 chars even with custom parts in every slot', () => {
    const customPart = (cat, i) => ({
      id: `custom-test-${i}`, category: cat, manufacturer: 'Custom',
      name: `Custom Part ${i}`, specs: { weight_g: 100 },
    })
    const config = {
      main_chute: customPart('main_chute', 1),
      drogue_chute: customPart('drogue_chute', 2),
      shock_cord: customPart('shock_cord', 3),
      chute_protector: customPart('chute_protector', 4),
      quick_links: customPart('quick_links', 5),
      chute_device: customPart('chute_device', 6),
    }
    const payload = { config, specs: sampleSpecs }
    const encoded = encodeURIComponent(encodeSharePayload(payload))
    const url = `https://example.com/?c=${encoded}`
    expect(url.length).toBeLessThan(8000)
  })
})

// ── Custom part share-link roundtrip ─────────────────────────────────────────

describe('share-link codec — custom part inlining', () => {
  it('inlines custom parts as full objects, catalog parts as { id } only', () => {
    const customChute = {
      id: 'custom-abc123', category: 'main_chute', manufacturer: 'Custom',
      name: 'My 54" Toroidal', specs: { diameter_in: 54, cd: 1.5, packed_diam_in: 4, packed_length_in: 8, weight_g: 300 },
    }
    const catalogPart = sampleConfig.main_chute
    const config = { ...sampleConfig, main_chute: customChute, drogue_chute: catalogPart }
    // Use real encode which detects custom- prefix
    const encoded = realEncode({ config, specs: sampleSpecs })
    const raw = JSON.parse(decodeURIComponent(atob(encoded)))
    // Custom part should be inlined with full object
    expect(raw.config.main_chute.name).toBe('My 54" Toroidal')
    expect(raw.config.main_chute.specs.diameter_in).toBe(54)
    // Catalog part should be { id } only (no name, no specs)
    expect(raw.config.drogue_chute).toEqual({ id: catalogPart.id })
  })
})
