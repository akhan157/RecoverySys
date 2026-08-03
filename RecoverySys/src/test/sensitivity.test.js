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
  it('runs one-at-a-time documented variations and returns output ranges', () => {
    const result = runSensitivity({ specs, config })
    expect(result.status).toBe('complete')
    expect(result.rows.map(({ key }) => key)).toEqual([
      'rocket_mass_g',
      'drag_cd',
      'main_deploy_alt_ft',
      'wind_speed_mph',
    ])
    expect(result.rows[0].variants).toHaveLength(3)
    expect(result.rows[0].ranges.apogee_ft.min).toBeLessThan(result.rows[0].ranges.apogee_ft.max)
    expect(result.method).toMatch(/no random sampling/i)
  })

  it('reports unavailable inputs rather than inventing a wind range', () => {
    const result = runSensitivity({ specs: { ...specs, wind_speed_mph: '' }, config })
    const wind = result.rows.find(({ key }) => key === 'wind_speed_mph')
    expect(wind.status).toBe('unavailable')
    expect(wind.reason).toMatch(/positive surface wind speed/i)
  })

  it('marks variants that cannot produce a valid result', () => {
    const result = runSensitivity({ specs: { ...specs, main_deploy_alt_ft: '3500' }, config })
    const deploy = result.rows.find(({ key }) => key === 'main_deploy_alt_ft')
    expect(deploy.variants.some(({ valid }) => !valid)).toBe(true)
    expect(deploy.status).toBe('partially-tested')
  })
})
