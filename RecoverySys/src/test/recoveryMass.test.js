import { describe, expect, it } from 'vitest'
import { SLOT_IDS } from '../data/parts.js'
import { checkCompatibility } from '../lib/compatibility.js'
import { buildRecoveryBrief } from '../lib/recoveryBrief.js'
import { computeRecoveryMass, RECOVERY_MASS_MODEL } from '../lib/recoveryMass.js'

const part = (name, weight_g) => ({
  name,
  specs: weight_g === undefined ? {} : { weight_g },
})

const ruleCode = 'compatibility.recovery_mass.recovery-mass-exceeds-rocket-mass'

describe('computeRecoveryMass', () => {
  it('is unavailable when no parts are selected', () => {
    const result = computeRecoveryMass({ config: {}, specs: { rocket_mass_g: '2500' } })

    expect(result).toMatchObject({
      model: RECOVERY_MASS_MODEL,
      status: 'unavailable',
      items: [],
      missing: [],
      total_g: 0,
      rocket_mass_g: 2500,
      fraction_of_rocket: 0,
      exceeds_rocket_mass: false,
    })
    expect(result.limitations.join(' ')).toMatch(/one selected part per slot/i)
  })

  it('rolls up selected slots in SLOT_IDS order and accepts string weights', () => {
    const config = {
      swivel: part('Swivel', 25),
      main_chute: part('Main', '300'),
      shock_cord: part('Cord', '100'),
    }
    const result = computeRecoveryMass({ config, specs: { rocket_mass_g: '2500' } })
    const selectedInSlotOrder = SLOT_IDS.filter((slot) => config[slot])

    expect(result.status).toBe('evaluated')
    expect(result.items.map((item) => item.slot)).toEqual(selectedInSlotOrder)
    expect(result.items).toEqual([
      { slot: 'main_chute', name: 'Main', weight_g: 300 },
      { slot: 'shock_cord', name: 'Cord', weight_g: 100 },
      { slot: 'swivel', name: 'Swivel', weight_g: 25 },
    ])
    expect(result.missing).toEqual([])
    expect(result.total_g).toBe(425)
    expect(result.fraction_of_rocket).toBeCloseTo(0.17)
    expect(result.exceeds_rocket_mass).toBe(false)
  })

  it('marks missing or invalid weights as partial and excludes them from the total', () => {
    const config = {
      main_chute: part('Known main', 300),
      drogue_chute: part('Zero drogue', 0),
      shock_cord: part('Bad cord', 'not-a-number'),
    }
    const result = computeRecoveryMass({ config, specs: { rocket_mass_g: '2500' } })

    expect(result.status).toBe('partial')
    expect(result.missing).toEqual(['drogue_chute', 'shock_cord'])
    expect(result.items.find((item) => item.slot === 'drogue_chute').weight_g).toBeNull()
    expect(result.total_g).toBe(300)
    expect(result.fraction_of_rocket).toBeCloseTo(0.12)
  })

  it('leaves the rocket comparison unavailable when rocket mass is absent or invalid', () => {
    const config = { main_chute: part('Main', 300) }

    for (const rocket_mass_g of ['', '2500g', '0']) {
      const result = computeRecoveryMass({ config, specs: { rocket_mass_g } })
      expect(result.rocket_mass_g).toBeNull()
      expect(result.fraction_of_rocket).toBeNull()
      expect(result.exceeds_rocket_mass).toBe(false)
    }
  })

  it('flags the exceed case at and above the entered rocket mass, not below it', () => {
    const config = { main_chute: part('Main', 300) }

    expect(
      computeRecoveryMass({ config, specs: { rocket_mass_g: '301' } }).exceeds_rocket_mass
    ).toBe(false)
    expect(
      computeRecoveryMass({ config, specs: { rocket_mass_g: '300' } }).exceeds_rocket_mass
    ).toBe(true)
    expect(
      computeRecoveryMass({ config, specs: { rocket_mass_g: '299' } }).exceeds_rocket_mass
    ).toBe(true)
  })
})

describe('recovery brief integration', () => {
  it('exposes the roll-up as a new field without replacing existing fields', () => {
    const brief = buildRecoveryBrief({
      specs: { rocket_mass_g: '2500' },
      config: { main_chute: part('Main', 300) },
    })

    expect(brief.recoveryMass).toMatchObject({
      model: RECOVERY_MASS_MODEL,
      status: 'evaluated',
      total_g: 300,
      fraction_of_rocket: 0.12,
    })
    expect(brief.selectedHardware).toEqual([
      { slot: 'main_chute', name: 'Main', specification: { weight_g: 300 } },
    ])
    expect(brief.briefVersion).toBe('recovery-brief-v1')
  })
})

describe('recovery mass compatibility rule', () => {
  it('emits one stable WARN finding when known recovery mass meets the entered mass', () => {
    const warnings = checkCompatibility({
      config: { main_chute: part('Main', 300) },
      specs: { rocket_mass_g: '300' },
    })
    const warning = warnings.find((item) => item.code === ruleCode)

    expect(warning).toMatchObject({
      level: 'warn',
      slot: 'recovery_mass',
      code: ruleCode,
      warningCode: ruleCode,
    })
    expect(warning.message).toMatch(/entered rocket mass must include recovery hardware/i)
    expect(warning.inputPaths).toEqual(['specs.rocket_mass_g'])
    expect(warning.affectedInputPaths).toEqual(['specs.rocket_mass_g'])
    expect(warning.partRefs).toEqual(['recovery_mass'])
    expect(warnings.filter((item) => item.code === ruleCode)).toHaveLength(1)
  })

  it('does not fire below the boundary or when rocket mass is missing', () => {
    const config = { main_chute: part('Main', 300) }

    expect(
      checkCompatibility({ config, specs: { rocket_mass_g: '301' } }).some(
        (item) => item.code === ruleCode
      )
    ).toBe(false)
    expect(checkCompatibility({ config, specs: {} }).some((item) => item.code === ruleCode)).toBe(
      false
    )
  })
})
