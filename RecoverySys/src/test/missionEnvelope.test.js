import { describe, expect, it } from 'vitest'
import { ENVELOPE_STATUS, evaluateMissionEnvelope } from '../lib/missionEnvelope.js'

const complete = {
  specs: {
    rocket_mass_g: '2500',
    motor_total_impulse_ns: '640',
    burn_time_s: '1.8',
    airframe_id_in: '3.9',
    drag_cd: '0.5',
    wind_speed_mph: '10',
    wind_direction_deg: '270',
  },
  config: { main_chute: {}, drogue_chute: {} },
}

describe('mission envelope', () => {
  it('reports a complete supported-input plan as in scope', () => {
    expect(evaluateMissionEnvelope(complete)).toMatchObject({
      status: ENVELOPE_STATUS.IN_SCOPE,
      reasons: [],
    })
  })

  it('reports required missing inputs as out of scope with actionable paths', () => {
    const result = evaluateMissionEnvelope({
      ...complete,
      specs: { ...complete.specs, rocket_mass_g: '' },
    })
    expect(result.status).toBe(ENVELOPE_STATUS.OUT_OF_SCOPE)
    expect(result.reasons).toContainEqual(
      expect.objectContaining({ code: 'MISSING_MASS', path: 'specs.rocket_mass_g' })
    )
  })

  it('does not silently accept a wind speed without its direction', () => {
    const result = evaluateMissionEnvelope({
      ...complete,
      specs: { ...complete.specs, wind_direction_deg: '' },
    })
    expect(result.status).toBe(ENVELOPE_STATUS.OUT_OF_SCOPE)
    expect(result.reasons).toContainEqual(
      expect.objectContaining({ code: 'INVALID_WIND_DIRECTION' })
    )
  })

  it('exposes model fallbacks as conditional rather than inventing a numeric boundary', () => {
    const result = evaluateMissionEnvelope({
      specs: { rocket_mass_g: '2500', motor_total_impulse_ns: '640' },
      config: {},
    })
    expect(result.status).toBe(ENVELOPE_STATUS.CONDITIONAL)
    expect(result.reasons.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'HEURISTIC_ASCENT',
        'DEFAULT_AIRFRAME',
        'DEFAULT_DRAG',
        'NO_WIND_PROFILE',
      ])
    )
  })
})
