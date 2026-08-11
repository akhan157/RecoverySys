import { describe, expect, it } from 'vitest'
import { runSensitivity } from '../lib/sensitivity.js'

const specs = {
  rocket_mass_g: '2500',
  motor_total_impulse_ns: '640',
  burn_time_s: '1.8',
  airframe_id_in: '3.9',
  drag_cd: '0.5',
  main_deploy_alt_ft: '500',
  wind_speed_mph: '10',
  wind_direction_deg: '270',
}
const chute = { specs: { diameter_in: 24, cd: 1.5 } }
const config = { main_chute: chute, drogue_chute: chute }

describe('deterministic sensitivity analysis', () => {
  it('runs one-at-a-time documented variations and returns unit-specific output ranges', () => {
    const result = runSensitivity({ specs, config })
    expect(result.status).toBe('complete')
    expect(result.rows.map(({ key }) => key)).toEqual([
      'rocket_mass_g',
      'drag_cd',
      'main_deploy_alt_ft',
      'wind_speed_mph',
    ])
    expect(result).not.toHaveProperty('influentialInputs')
    expect(result.baseline.identity).toMatchObject({
      modelId: 'browser-js-recovery',
      modelVersion: 'isa-apogee-descent-v1',
      sensitivityVersion: 'sensitivity-one-at-a-time-v2',
    })
    expect(result.scenario).toMatchObject({
      method: 'one-at-a-time',
      rangeBasisVersion: 'sensitivity-range-v1',
      criteriaVersion: 'recovery-criteria-v1',
    })
    expect(result.rows[0].variants).toHaveLength(3)
    expect(result.rows[0].usableVariants).toHaveLength(3)
    expect(result.rows[0].unusableVariants).toHaveLength(0)
    expect(result.rows[0].ranges.apogee_ft.min).toBeLessThan(result.rows[0].ranges.apogee_ft.max)
    expect(result.rows[0].deltas.apogee_ft).toEqual({
      min: expect.any(Number),
      max: expect.any(Number),
    })
    expect(result.criterionCrossings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          criterionId: 'recovery.landing-energy',
          criterionVersion: 'recovery-criteria-v1',
        }),
      ])
    )
    expect(result.method).toMatch(/model response/i)
    expect(result.method).toMatch(/not probability or confidence intervals/i)
    expect(runSensitivity({ specs, config })).toEqual(result)
  })

  it('reports unavailable inputs rather than inventing a wind range', () => {
    const result = runSensitivity({ specs: { ...specs, wind_speed_mph: '' }, config })
    const wind = result.rows.find(({ key }) => key === 'wind_speed_mph')
    expect(wind.status).toBe('unavailable')
    expect(wind.reason).toMatch(/positive surface wind speed/i)
    expect(wind.usableVariants).toEqual([])
    expect(wind.unusableVariants).toEqual([])
  })

  it('partitions unusable variants instead of including them in ranges', () => {
    const result = runSensitivity({ specs: { ...specs, main_deploy_alt_ft: '3500' }, config })
    const deploy = result.rows.find(({ key }) => key === 'main_deploy_alt_ft')
    expect(deploy.variants.some(({ valid }) => !valid)).toBe(true)
    expect(deploy.status).toBe('partially-tested')
    expect(deploy.unusableVariants.length).toBeGreaterThan(0)
    expect(deploy.unusableVariants.every(({ usable, output }) => !usable && output === null)).toBe(
      true
    )
    expect(deploy.criterionCrossings).toEqual([])
  })
})
