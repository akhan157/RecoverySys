import { describe, expect, it } from 'vitest'
import { decodeMigrateValidateNormalize, encodeJsonPayload, PAYLOAD_LIMITS, isPayloadSizeAllowed } from '../lib/payloadBoundary.js'
import { loadSaved, loadCustomParts, saveConfigToStorage, saveCustomPartsToStorage, STORAGE_KEYS } from '../lib/storage.js'
import { PARTS } from '../data/parts.js'
import { SCHEMA_VERSION } from '../lib/schema.js'

const options = { slotIds: ['main_chute'], emptyConfig: { main_chute: null }, allParts: [] }
const valid = { schemaVersion: SCHEMA_VERSION, config: { main_chute: null }, specs: {}, customMotor: null }

describe('payload boundary', () => {
  it('rejects malformed payloads', () => expect(decodeMigrateValidateNormalize('{bad', options).ok).toBe(false))
  it('rejects future versions', () => expect(decodeMigrateValidateNormalize({ ...valid, schemaVersion: SCHEMA_VERSION + 1 }, options).error.code).toBe('future-version'))
  it('rejects oversized payloads', () => expect(decodeMigrateValidateNormalize({ ...valid, specs: { rocket_mass_g: 'x'.repeat(PAYLOAD_LIMITS.jsonBytes) } }, options).error.code).toBe('oversized'))
  it('rejects invalid categories instead of dropping them', () => expect(decodeMigrateValidateNormalize({ ...valid, config: { unknown: { id: 'part' } } }, options).error.code).toBe('invalid-category-or-config'))
  it('preserves id and category catalog lookup', () => {
    const part = { id: 'same-id', category: 'main_chute', name: 'Catalog', specs: {} }
    const result = decodeMigrateValidateNormalize({ ...valid, config: { main_chute: { id: part.id } } }, { ...options, allParts: [part] })
    expect(result.config.main_chute).toBe(part)
  })

  it('normalizes saved catalog selections using the full catalog', () => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify({ ...valid, config: { main_chute: { id: 'same-id' } } }))
    const part = { id: 'same-id', category: 'main_chute', name: 'Catalog', specs: {} }
    expect(loadSaved()?.config.main_chute).toBe(PARTS.find(candidate => candidate.id === 'same-id' && candidate.category === 'main_chute') ?? null)
    expect(decodeMigrateValidateNormalize(JSON.stringify({ ...valid, config: { main_chute: { id: part.id } } }), { ...options, allParts: [part] }).config.main_chute).toBe(part)
  })

  it('exports catalog references and imports them back through the boundary', () => {
    const part = { id: 'same-id', category: 'main_chute', name: 'Catalog', specs: {} }
    const exported = JSON.parse(encodeJsonPayload({ config: { main_chute: part }, specs: {}, customMotor: null }))
    expect(exported.config.main_chute).toEqual({ id: 'same-id' })
    expect(decodeMigrateValidateNormalize(exported, { ...options, allParts: [part] }).config.main_chute).toBe(part)
  })

  it('handles share catalog references and valid inline custom parts', () => {
    const custom = { id: 'custom-one', category: 'main_chute', name: 'Custom', specs: {} }
    const result = decodeMigrateValidateNormalize({ ...valid, config: { main_chute: custom } }, options)
    expect(result.config.main_chute).toEqual(custom)
    expect(result.inlinedCustomParts).toEqual([custom])
  })

  it('preserves selected custom parts through saved config and JSON export/import', () => {
    const custom = { id: 'custom-one', category: 'main_chute', name: 'Custom', specs: { diameter_in: 36, cd: 1.5 } }
    saveConfigToStorage({ config: { main_chute: custom }, specs: {}, customMotor: null })
    expect(loadSaved()?.config.main_chute).toEqual(custom)

    const exported = JSON.parse(encodeJsonPayload({ config: { main_chute: custom }, specs: {}, customMotor: null }))
    expect(exported.config.main_chute).toEqual(custom)
    expect(decodeMigrateValidateNormalize(exported, options).config.main_chute).toEqual(custom)
  })

  it('uses the shared byte limit for raw JSON and file-size guards', () => {
    expect(isPayloadSizeAllowed(PAYLOAD_LIMITS.jsonBytes)).toBe(true)
    expect(isPayloadSizeAllowed(PAYLOAD_LIMITS.jsonBytes + 1)).toBe(false)
    expect(decodeMigrateValidateNormalize(' '.repeat(PAYLOAD_LIMITS.jsonBytes + 1), options).ok).toBe(false)
  })

  it('rejects oversized and over-limit custom-part storage', () => {
    expect(saveCustomPartsToStorage(Array.from({ length: PAYLOAD_LIMITS.customParts + 1 }, (_, i) => ({ id: `custom-${i}` })))).toBe(false)
    expect(saveCustomPartsToStorage([{ id: 'custom-huge', name: 'x'.repeat(PAYLOAD_LIMITS.customPartsJsonBytes), category: 'main_chute', specs: {} }])).toBe(false)
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PARTS, JSON.stringify(Array.from({ length: PAYLOAD_LIMITS.customParts + 1 }, () => ({ id: 'custom-x', name: 'x', category: 'main_chute', specs: {} }))))
    expect(loadCustomParts()).toEqual([])
  })
})
