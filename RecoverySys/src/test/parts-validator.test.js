import { describe, expect, it } from 'vitest'
import { PARTS, CATEGORIES } from '../data/parts.js'
import { validateCatalog, validateParts } from '../../scripts/validate-parts.js'

const copy = (value) => structuredClone(value)
const validPart = () => copy(PARTS[0])

describe('parts catalog validator', () => {
  it('accepts the real catalog', () => {
    expect(validateParts()).toMatchObject({ valid: true, diagnostics: [] })
  })

  it('reports missing core fields', () => {
    const part = validPart()
    delete part.name
    delete part.manufacturer
    const result = validateCatalog([part], ['main_chute'])
    expect(result.valid).toBe(false)
    expect(result.diagnostics.join('\n')).toMatch(/path=\/name/)
    expect(result.diagnostics.join('\n')).toMatch(/path=\/manufacturer/)
  })

  it('reports an invalid category', () => {
    const part = validPart()
    part.category = 'not-a-slot'
    expect(validateCatalog([part], []).diagnostics.join('\n')).toMatch(/path=\/category/)
  })

  it('rejects unknown top-level and spec fields', () => {
    const topLevel = validPart()
    topLevel.source = 'unknown'
    const specField = validPart()
    specField.specs.unexpected = 1
    expect(validateCatalog([topLevel], []).diagnostics.join('\n')).toMatch(
      /path=\/ must NOT have additional properties/
    )
    expect(validateCatalog([specField], []).diagnostics.join('\n')).toMatch(
      /path=\/specs must NOT have additional properties/
    )
  })

  it('reports duplicate composite keys but permits duplicate ids across categories', () => {
    const first = copy(
      PARTS.find((part) => part.id === 'fr3-12-30' && part.category === 'main_chute')
    )
    const duplicate = copy(first)
    const otherCategory = copy(
      PARTS.find((part) => part.id === 'fr3-12-30' && part.category === 'drogue_chute')
    )
    expect(validateCatalog([first, duplicate], ['main_chute']).diagnostics.join('\n')).toMatch(
      /duplicate composite key/
    )
    expect(validateCatalog([first, otherCategory], []).valid).toBe(true)
  })

  it('rejects empty and non-object specs', () => {
    const empty = validPart()
    empty.specs = {}
    const nonObject = validPart()
    nonObject.specs = null
    expect(validateCatalog([empty], []).valid).toBe(false)
    expect(validateCatalog([nonObject], []).valid).toBe(false)
  })

  it.each(['strength_lbs', 'length_ft', 'elongation_pct'])('rejects bad shock-cord %s', (key) => {
    const part = copy(PARTS.find((entry) => entry.category === 'shock_cord'))
    part.specs[key] = 0
    expect(validateCatalog([part], []).valid).toBe(false)
    part.specs[key] = Number.NaN
    expect(validateCatalog([part], []).valid).toBe(false)
  })

  it('enforces every category requirement', () => {
    for (const category of CATEGORIES) {
      const part = copy(PARTS.find((entry) => entry.category === category.id))
      const required = {
        main_chute: 'diameter_in',
        drogue_chute: 'diameter_in',
        shock_cord: 'strength_lbs',
        chute_protector: 'size_in',
        deployment_bag: 'max_chute_diam_in',
        quick_links: 'strength_lbs',
        swivel: 'rated_lbs',
        chute_device: 'weight_g',
      }[category.id]
      delete part.specs[required]
      expect(validateCatalog([part], []).valid, category.id).toBe(false)
    }
  })

  it.each([
    ['main_chute', 'shape'],
    ['main_chute', 'material'],
    ['drogue_chute', 'shape'],
    ['drogue_chute', 'material'],
    ['shock_cord', 'weight_g'],
    ['shock_cord', 'material'],
    ['shock_cord', 'width_in'],
    ['shock_cord', 'packed_height_in'],
    ['chute_protector', 'packed_height_in'],
    ['swivel', 'packed_height_in'],
  ])('rejects removal of required %s.%s', (category, field) => {
    const part = copy(PARTS.find((entry) => entry.category === category))
    delete part.specs[field]
    expect(validateCatalog([part], []).valid, `${category}.${field}`).toBe(false)
  })

  it('requires paired, ordered deployment altitude endpoints', () => {
    const part = copy(PARTS.find((entry) => entry.id === 'jl-chute-release'))
    delete part.specs.deploy_alt_max_ft
    expect(validateCatalog([part], []).valid).toBe(false)

    const maxOnly = copy(PARTS.find((entry) => entry.id === 'jl-chute-release'))
    delete maxOnly.specs.deploy_alt_min_ft
    expect(validateCatalog([maxOnly], []).valid).toBe(false)

    part.specs.deploy_alt_max_ft = 50
    expect(validateCatalog([part], []).diagnostics.join('\n')).toMatch(
      /minimum must be less than or equal to maximum/
    )

    part.specs.deploy_alt_min_ft = 0
    expect(validateCatalog([part], []).valid).toBe(true)
    part.specs.deploy_alt_max_ft = -1
    expect(validateCatalog([part], []).valid).toBe(false)
  })

  it('reports catalog slot coverage gaps', () => {
    const withoutShockCord = PARTS.filter((part) => part.category !== 'shock_cord')
    const result = validateCatalog(withoutShockCord, CATEGORIES)
    expect(result.valid).toBe(false)
    expect(result.diagnostics.join('\n')).toMatch(/category=shock_cord.*slot has no parts/)
  })
})
