import { describe, it, expect, beforeEach } from 'vitest'
import { encodeSharePayload, decodeSharePayload } from '../lib/shareLink.js'
import { normalizePayload, normalizeCustomParts } from '../lib/payloadBoundary.js'
import { SLOT_IDS, EMPTY_CONFIG } from '../data/parts.js'

const specs = { rocket_mass_g: '10', unknown: 'bad' }
const catalog = [{ id: 'same-id', category: 'main_chute', name: 'Catalog', specs: {} }]

describe('canonical payload boundary', () => {
  beforeEach(() => localStorage.clear())

  it('normalizes specs to defaults and drops unknown keys without clamping values', () => {
    const result = normalizePayload({ config: EMPTY_CONFIG, specs: { ...specs, wind_direction_deg: '999' } }, { slotIds: SLOT_IDS, emptyConfig: EMPTY_CONFIG })
    expect(result.specs.rocket_mass_g).toBe('10')
    expect(result.specs.wind_direction_deg).toBe('999')
    expect(result.specs.unknown).toBeUndefined()
    expect(result.specs.main_deploy_alt_ft).toBe('500')
  })

  it('rehydrates catalog parts by id and rejects cross-category references', () => {
    const result = normalizePayload({ config: { ...EMPTY_CONFIG, main_chute: { id: 'same-id' } } }, { allParts: catalog, slotIds: SLOT_IDS, emptyConfig: EMPTY_CONFIG })
    expect(result.config.main_chute).toBe(catalog[0])
    expect(() => normalizePayload({ config: { ...EMPTY_CONFIG, drogue_chute: { id: 'same-id', category: 'main_chute' } } }, { allParts: catalog, slotIds: SLOT_IDS, emptyConfig: EMPTY_CONFIG })).toThrow('invalid part reference')
  })

  it('rehydrates a full JSON export to the current catalog object', () => {
    const exported = { _format: 'recoverysys-config-v1', config: { ...EMPTY_CONFIG, main_chute: catalog[0] }, specs }
    const result = normalizePayload(exported, { allParts: catalog, slotIds: SLOT_IDS, emptyConfig: EMPTY_CONFIG })
    expect(result.config.main_chute).toBe(catalog[0])
  })

  it('rejects future and oversized payloads', () => {
    expect(() => normalizePayload({ schemaVersion: 999, config: EMPTY_CONFIG }, { slotIds: SLOT_IDS, emptyConfig: EMPTY_CONFIG })).toThrow()
    expect(() => normalizePayload({ config: EMPTY_CONFIG, specs: { rocket_mass_g: 'x'.repeat(600000) } }, { slotIds: SLOT_IDS, emptyConfig: EMPTY_CONFIG })).toThrow()
  })

  it('filters invalid custom parts and bounds custom motors', () => {
    expect(normalizeCustomParts([{ id: 'custom-ok', name: 'OK', category: 'main_chute', specs: {} }, { id: 'bad', name: '', category: 'main_chute', specs: {} }], SLOT_IDS)).toHaveLength(1)
    const encoded = encodeSharePayload({ config: EMPTY_CONFIG, specs, customMotor: { designation: 'bad', curve: [{ t: 0, thrust_N: 1 }], totalImpulse_ns: 1, burnTime_s: 1 } })
    expect(decodeSharePayload(encoded, { allParts: [], slotIds: SLOT_IDS, emptyConfig: EMPTY_CONFIG })).toBeNull()
  })
})
