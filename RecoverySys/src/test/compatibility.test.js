import { describe, it, expect } from 'vitest'
import { checkCompatibility, slotStatus } from '../lib/compatibility.js'

const baseSpecs = {
  rocket_mass_g:      '2500',
  airframe_od_in:     '4',
  airframe_id_in:     '3.9',  // standard 4" airframe tube
  bay_length_in:      '18',   // π × (3.9/2)² × 18 ≈ 215 in³ usable bay
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

  it('errors when chute packed volumes exceed bay volume', () => {
    // bay_cross_area ≈ 11.95 in²; hugeDrogue packed_length=20 → vol ≈ 239 in³
    // bay: 3.9" ID × 5" → vol ≈ 60 in³ → error triggered
    const hugeDrogue = { name: 'Huge', specs: { diameter_in: 12, cd: 1.5, packed_diam_in: 2, packed_length_in: 20 } }
    const warnings = checkCompatibility({
      config: { main_chute: validMain, drogue_chute: hugeDrogue },
      specs: { ...baseSpecs, bay_length_in: '5' },
    })
    expect(warnings.some(w => w.slot === 'bay_volume' && w.level === 'error')).toBe(true)
  })

  it('errors when main descent exceeds 20 fps', () => {
    // 36" cd=1.34 at 2500g ≈ 21.4fps — above the 20fps hard limit
    const medChute = { name: 'Med', specs: { diameter_in: 36, cd: 1.34, packed_diam_in: 2, packed_length_in: 4 } }
    const warnings = checkCompatibility({
      config: { main_chute: medChute, drogue_chute: validDrogue },
      specs: { ...baseSpecs, rocket_mass_g: '2500' },
    })
    expect(warnings.some(w => w.slot === 'main_chute' && w.level === 'error' && w.message.includes('20 fps'))).toBe(true)
  })

  it('errors when quick links are weaker than ejection load even without shock cord', () => {
    // 880-lb QL, 50kg L3 rocket → required = 50 * 9.81 * 30G / 4.448 ≈ 3305 lbs > 880
    const weakQL = { name: 'Weak QL', specs: { strength_lbs: 880 } }
    const warnings = checkCompatibility({
      config: { main_chute: validMain, drogue_chute: validDrogue, quick_links: weakQL },
      specs: { ...baseSpecs, rocket_mass_g: '50000' },
    })
    expect(warnings.some(w => w.slot === 'quick_links' && w.level === 'error')).toBe(true)
  })

  it('user-supplied ejection_g_factor overrides auto-default', () => {
    // 2500g rocket, auto would be 20G → required ≈ 110 lbs
    // User sets 10G (CO2/Tender Descender) → required ≈ 55 lbs
    // 75-lb cord passes at 10G but would fail at 20G
    const marginalCord = { name: 'Cord', specs: { strength_lbs: 75, packed_height_in: 2 } }
    const warningsAuto = checkCompatibility({
      config: { main_chute: validMain, drogue_chute: validDrogue, shock_cord: marginalCord },
      specs: { ...baseSpecs, rocket_mass_g: '2500' },          // auto = 20G
    })
    const warningsLowG = checkCompatibility({
      config: { main_chute: validMain, drogue_chute: validDrogue, shock_cord: marginalCord },
      specs: { ...baseSpecs, rocket_mass_g: '2500', ejection_g_factor: '10' }, // user = 10G
    })
    // At auto 20G the cord should error; at user-set 10G it should not
    expect(warningsAuto.some(w => w.slot === 'shock_cord' && w.level === 'error')).toBe(true)
    expect(warningsLowG.some(w => w.slot === 'shock_cord' && w.level === 'error')).toBe(false)
  })

  it('user-supplied ejection_g_factor applies to quick links too', () => {
    // 2500g rocket at 40G (high-performance BP) → required ≈ 221 lbs
    // 200-lb QL passes at default 20G but fails at 40G
    const ql = { name: 'QL', specs: { strength_lbs: 200 } }
    const warnings = checkCompatibility({
      config: { main_chute: validMain, drogue_chute: validDrogue, quick_links: ql },
      specs: { ...baseSpecs, rocket_mass_g: '2500', ejection_g_factor: '40' },
    })
    expect(warnings.some(w => w.slot === 'quick_links' && w.level === 'error')).toBe(true)
  })

  it('warns when deploy bag is too small for main chute', () => {
    const smallBag = { name: 'Small Bag', specs: { max_chute_diam_in: 36, packed_height_in: 2.5, weight_g: 60 } }
    const bigChute = { ...validMain, specs: { ...validMain.specs, diameter_in: 60 } }
    const warnings = checkCompatibility({
      config: { main_chute: bigChute, drogue_chute: validDrogue, deployment_bag: smallBag },
      specs: baseSpecs,
    })
    expect(warnings.some(w => w.slot === 'deployment_bag' && w.level === 'warn')).toBe(true)
  })

  it('no deployment bag warning when bag fits the chute', () => {
    const bigBag = { name: 'Big Bag', specs: { max_chute_diam_in: 96, packed_height_in: 6.0, weight_g: 175 } }
    const warnings = checkCompatibility({
      config: { main_chute: validMain, drogue_chute: validDrogue, deployment_bag: bigBag },
      specs: baseSpecs,
    })
    expect(warnings.some(w => w.slot === 'deployment_bag')).toBe(false)
  })

  it('errors when swivel is too weak for ejection load', () => {
    // 50kg L3 rocket, auto 30G → required ≈ 3305 lbs; 400-lb snap swivel fails
    const weakSwivel = { name: 'Snap Swivel', specs: { rated_lbs: 400, packed_height_in: 0.5 } }
    const warnings = checkCompatibility({
      config: { main_chute: validMain, drogue_chute: validDrogue, swivel: weakSwivel },
      specs: { ...baseSpecs, rocket_mass_g: '50000' },
    })
    expect(warnings.some(w => w.slot === 'swivel' && w.level === 'error')).toBe(true)
  })

  it('warns on tiered bridle length for L1 rocket (< 2.5kg)', () => {
    // 1500g L1 rocket, minimum 5ft; 3ft cord should warn
    const shortCord = { name: 'Short Cord', specs: { strength_lbs: 300, length_ft: 3, material: 'nylon', packed_height_in: 1 } }
    const warnings = checkCompatibility({
      config: { main_chute: validMain, drogue_chute: validDrogue, shock_cord: shortCord },
      specs: { ...baseSpecs, rocket_mass_g: '1500' },
    })
    expect(warnings.some(w => w.slot === 'shock_cord' && w.level === 'warn' && w.message.includes('5ft'))).toBe(true)
  })

  it('warns on tiered bridle length for L2 rocket (2.5–10kg)', () => {
    // 5000g L2 rocket, minimum 10ft; 8ft cord should warn
    const shortCord = { name: 'Med Cord', specs: { strength_lbs: 600, length_ft: 8, material: 'nylon', packed_height_in: 1.5 } }
    const warnings = checkCompatibility({
      config: { main_chute: validMain, drogue_chute: validDrogue, shock_cord: shortCord },
      specs: { ...baseSpecs, rocket_mass_g: '5000' },
    })
    expect(warnings.some(w => w.slot === 'shock_cord' && w.level === 'warn' && w.message.includes('10ft'))).toBe(true)
  })

  it('errors when chute volumes alone exceed the bay volume', () => {
    // bay_cross_area ≈ 11.95 in²; smallMain(4) + hugeDrogue(20) → vol ≈ 287 in³
    // bay: 3.9" ID × 2.5" → vol ≈ 30 in³ → error
    const smallMain  = { name: 'SM',  specs: { diameter_in: 36, cd: 1.5, packed_diam_in: 2, packed_length_in: 4 } }
    const hugeDrogue = { name: 'HD',  specs: { diameter_in: 12, cd: 1.5, packed_diam_in: 2, packed_length_in: 20 } }
    const warnings = checkCompatibility({
      config: { main_chute: smallMain, drogue_chute: hugeDrogue },
      specs: { ...baseSpecs, bay_length_in: '2.5' },
    })
    expect(warnings.some(w => w.slot === 'bay_volume' && w.level === 'error')).toBe(true)
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
