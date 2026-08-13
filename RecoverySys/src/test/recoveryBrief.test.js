import { describe, expect, it } from 'vitest'
import { buildRecoveryBrief, RECOVERY_BRIEF_VERSION } from '../lib/recoveryBrief.js'

const specs = {
  rocket_mass_g: '2500',
  motor_total_impulse_ns: '640',
  burn_time_s: '1.8',
  airframe_id_in: '3.9',
  drag_cd: '0.5',
  main_deploy_alt_ft: '500',
}

describe('recovery brief view model', () => {
  it('is versioned and conservative when evidence is not accepted', () => {
    const brief = buildRecoveryBrief({ specs, config: {}, simulation: null })
    expect(brief.briefVersion).toBe(RECOVERY_BRIEF_VERSION)
    expect(brief.status).toBe('not-run')
    expect(brief.confidence.label).toBe('Insufficient confidence')
    expect(brief.confidence.evidenceNote).toMatch(/No accepted/i)
    expect(brief.authorization).toMatch(/does not authorize launch/i)
    expect(brief.unresolvedChecks.some(({ code }) => code === 'NO_CURRENT_RESULT')).toBe(true)
  })

  it('marks a stale result, retains hardware/warnings/provenance, and withholds estimates', () => {
    const simulation = {
      apogee_ft: 3000,
      drift_ft: 700,
      drogue_fps: 35,
      main_fps: 12,
      landing_ke_ftlbf: 40,
      provenance: { modelVersion: 'test-model', inputRevision: 2 },
    }
    const brief = buildRecoveryBrief({
      specs,
      config: { main_chute: { name: 'Main', specs: { diameter_in: 24 } } },
      simulation,
      resultFresh: false,
      warnings: [{ level: 'warn', message: 'Review main chute fit', slot: 'main_chute' }],
      sensitivity: { status: 'complete', rows: [] },
    })
    expect(brief.status).toBe('stale')
    expect(brief.selectedHardware[0].name).toBe('Main')
    expect(brief.keyEstimates).toBeNull()
    expect(brief.provenance.modelVersion).toBe('test-model')
    // Stale-result closure: a passed-in sensitivity response is never
    // presented for a stale plan; the brief emits the hidden-until-current
    // placeholder instead of fresh-looking ranges.
    expect(brief.sensitivity).toEqual({
      status: 'stale',
      reason: 'Sensitivity is hidden until the base simulation is current.',
    })
    expect(brief.unresolvedChecks.some(({ code }) => code === 'RESULT_STALE')).toBe(true)
  })

  it('withholds sensitivity entirely when no simulation exists', () => {
    const brief = buildRecoveryBrief({ specs, config: {} })
    expect(brief.status).toBe('not-run')
    expect(brief.sensitivity).toEqual({
      status: 'not-run',
      reason: 'Sensitivity is unavailable until a current simulation exists.',
    })
  })

  it('preserves an explicit sensitivity response only for a current result', () => {
    const explicit = { status: 'complete', rows: [], method: 'explicit-contract' }
    const current = buildRecoveryBrief({
      specs,
      config: { main_chute: { name: 'Main', specs: { diameter_in: 24 } } },
      simulation: { apogee_ft: 3000, provenance: { modelVersion: 'test-model' } },
      resultFresh: true,
      sensitivity: explicit,
    })
    expect(current.status).toBe('current')
    expect(current.sensitivity).toBe(explicit)
  })
})
