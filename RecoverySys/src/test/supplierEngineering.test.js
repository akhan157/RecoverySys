import { describe, it, expect } from 'vitest'
import { extractFruityEngineering } from '../lib/supplierEngineering.js'
describe('explicit supplier engineering candidates', () => {
  it('extracts explicit dimensions and grams without changing the catalog', () => {
    const result = extractFruityEngineering(
      'Weight: 1.6 oz (45 grams)<br>Packing Volume: 1.6" D x 4.4" L<br>Cd between 1.5 - 1.6'
    )
    expect(result.specs).toEqual({ weight_g: 45, packed_diam_in: 1.6, packed_length_in: 4.4 })
    expect(result.specs.cd).toBeUndefined()
  })
  it('records an explicit unit conversion and packing-density limitation', () => {
    const result = extractFruityEngineering(
      'Weight: 2.9 oz. Cd of 2.2! Packing volume assumes a packing density of 0.18 oz/cu". Packing Volume: 2.15" D x 4.4" L'
    )
    expect(result.specs.weight_g).toBeCloseTo(82.2136170625)
    expect(result.specs.cd).toBe(2.2)
    expect(result.packingAssumptions).toContain('traditional folding')
  })
  it('omits unknown or changed layouts instead of guessing', () => {
    expect(extractFruityEngineering('Compact chute; fits most bays').specs).toEqual({})
  })
})
