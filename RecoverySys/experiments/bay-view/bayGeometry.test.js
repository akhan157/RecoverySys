import { describe, expect, it } from 'vitest'
import { buildBayGeometry } from './bayGeometry.js'
const specs = { airframe_id_in: '4', bay_length_in: '14' }
describe('individual dimension references', () => {
  it('never stacks, sums occupied space or classifies assembly fit', () => {
    const geometry = buildBayGeometry(
      {
        main_chute: { name: 'Main', specs: { packed_diam_in: 5, packed_length_in: 12 } },
        drogue_chute: { name: 'Drogue', specs: { packed_diam_in: 2, packed_length_in: 4 } },
      },
      specs,
      'main_chute'
    )
    expect(geometry.reference.name).toBe('Main')
    expect(geometry.parts.every((part) => !('offset' in part))).toBe(true)
    expect(geometry).not.toHaveProperty('knownLength')
    expect(geometry).not.toHaveProperty('overLength')
    expect(geometry).not.toHaveProperty('overDiameter')
  })
  it('requires rigid body dimensions and never treats hardware as a flexible cylinder', () => {
    const config = {
      quick_links: {
        name: 'Link',
        specs: { size_in: 0.25, packed_diam_in: 2, packed_length_in: 3 },
      },
    }
    expect(buildBayGeometry(config, specs, 'quick_links').reference).toBeNull()
    config.quick_links.specs = { body_length_in: 3, body_width_in: 1, body_depth_in: 0.4 }
    const reference = buildBayGeometry(config, specs, 'quick_links').reference
    expect(reference.shape).toBe('box')
    expect(reference.depth).toBe(0.4)
  })
  it('uses explicitly recorded ranges without inventing compression', () => {
    const geometry = buildBayGeometry(
      {
        main_chute: {
          name: 'Main',
          specs: {
            packed_length_min_in: 5,
            packed_length_max_in: 9,
            packed_diam_min_in: 2,
            packed_diam_max_in: 3,
          },
        },
      },
      specs
    )
    expect(geometry.reference.range).toEqual({
      lengthMin: 5,
      lengthMax: 9,
      widthMin: 2,
      widthMax: 3,
    })
    expect(geometry.reference.length).toBe(9)
  })
  it('does not draw incomplete/reversed ranges or borrow cord width and deployed diameter', () => {
    const geometry = buildBayGeometry(
      {
        shock_cord: { name: 'Cord', specs: { width_in: 0.5, packed_height_in: 3 } },
        main_chute: {
          name: 'Main',
          specs: {
            diameter_in: 48,
            packed_length_min_in: 10,
            packed_length_max_in: 5,
            packed_diam_min_in: 2,
            packed_diam_max_in: 3,
          },
        },
      },
      specs
    )
    expect(geometry.incomplete).toHaveLength(2)
    expect(geometry.parts[0].invalidRange).toBe(true)
    expect(geometry.reference).toBeNull()
  })
  it('bounds render scale to include the selected reference and rejects nonfinite data', () => {
    const geometry = buildBayGeometry(
      { main_chute: { name: 'Oversize', specs: { packed_length_in: 8, packed_diam_in: 100 } } },
      specs
    )
    expect(geometry.extent).toBeGreaterThan(100)
    expect(buildBayGeometry({}, { airframe_id_in: '', bay_length_in: Infinity }).length).toBeNull()
  })
})
