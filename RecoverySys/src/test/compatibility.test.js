import { describe, it, expect } from 'vitest'
import { checkCompatibility, slotStatus } from '../lib/compatibility.js'

const baseSpecs = {
  rocket_mass_g:      '2500',
  airframe_od_in:     '4',
  airframe_id_in:     '3.9',
  bay_length_in:      '18',
  main_deploy_alt_ft: '500',
}

// 42" Cd=1.5 chute for 2500g rocket → ~17.9 fps (safe landing range, no warnings)
const validMain = {
  name: 'Test Main',
  specs: { diameter_in: 42, cd: 1.5, packed_diam_in: 3, packed_length_in: 4 },
}

const validDrogue = {
  name: 'Test Drogue',
  specs: { diameter_in: 12, cd: 1.5, packed_diam_in: 2, packed_length_in: 2 },
}

describe('checkCompatibility', () => {
  it('returns no warnings for a well-configured setup', () => {
    const warnings = checkCompatibility({
      config: { main_chute: validMain, drogue_chute: validDrogue },
      specs: baseSpecs,
    })
    const errors = warnings.filter(w => w.level === 'error')
    expect(errors).toHaveLength(0)
  })

  it('returns no-main error when only a drogue is selected', () => {
    const warnings = checkCompatibility({
      config: { drogue_chute: validDrogue },
      specs: baseSpecs,
    })
    expect(warnings.some(w => w.slot === 'main_chute' && w.level === 'error')).toBe(true)
  })

  it('warns single-deploy when main but no drogue', () => {
    const warnings = checkCompatibility({
      config: { main_chute: validMain },
      specs: baseSpecs,
    })
    expect(warnings.some(w => w.slot === 'drogue_chute' && w.level === 'warn')).toBe(true)
  })

  it('errors when packed chute diameter exceeds inner bore', () => {
    const bigChute = { name: 'Big', specs: { diameter_in: 60, cd: 1.5, packed_diam_in: 5, packed_length_in: 6 } }
    const warnings = checkCompatibility({
      // airframe_id is 3.9" but packed_diam is 5"
      config: { main_chute: bigChute, drogue_chute: validDrogue },
      specs: baseSpecs,
    })
    expect(warnings.some(w => w.slot === 'main_chute' && w.level === 'error' && w.message.includes("won't fit"))).toBe(true)
  })

  it('errors when shock cord is too weak for 20G ejection load', () => {
    const weakCord = { name: 'Weak Cord', specs: { strength_lbs: 10, packed_height_in: 2 } }
    const warnings = checkCompatibility({
      config: { main_chute: validMain, shock_cord: weakCord },
      specs: { ...baseSpecs, rocket_mass_g: '2500' },
    })
    expect(warnings.some(w => w.slot === 'shock_cord' && w.level === 'error')).toBe(true)
  })

  it('returns empty warnings when config is completely empty', () => {
    const warnings = checkCompatibility({ config: {}, specs: baseSpecs })
    expect(warnings).toHaveLength(0)
  })

  it('errors when bay stacked height exceeds bay length', () => {
    // Stuff the bay with massive chutes
    const hugeDrogue = { name: 'Huge', specs: { diameter_in: 12, cd: 1.5, packed_diam_in: 2, packed_length_in: 20 } }
    const warnings = checkCompatibility({
      config: { main_chute: validMain, drogue_chute: hugeDrogue },
      specs: { ...baseSpecs, bay_length_in: '5' }, // 5" bay, 20+4 = 24" stacked
    })
    expect(warnings.some(w => w.slot === 'bay_length' && w.level === 'error')).toBe(true)
  })
})

describe('slotStatus', () => {
  it('returns error when there is an error warning for the slot', () => {
    const warnings = [{ level: 'error', slot: 'main_chute', message: 'test' }]
    expect(slotStatus('main_chute', warnings)).toBe('error')
  })

  it('returns warn when there is only a warn', () => {
    const warnings = [{ level: 'warn', slot: 'main_chute', message: 'test' }]
    expect(slotStatus('main_chute', warnings)).toBe('warn')
  })

  it('returns ok when no warnings for slot', () => {
    expect(slotStatus('main_chute', [])).toBe('ok')
  })

  it('error takes priority over warn', () => {
    const warnings = [
      { level: 'warn',  slot: 'main_chute', message: 'warn' },
      { level: 'error', slot: 'main_chute', message: 'error' },
    ]
    expect(slotStatus('main_chute', warnings)).toBe('error')
  })
})
