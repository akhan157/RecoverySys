import { describe, expect, it } from 'vitest'
import {
  createFlightEntry,
  exportFlightRecords,
  importFlightRecords,
  migrateFlightEntry,
  exportCandidateEvidence,
  importCandidateEvidence,
  predictionIdentity,
  mergeFlightEntries,
  readFlightLog,
} from '../lib/flightEvidence.js'

describe('flight evidence storage', () => {
  it('migrates legacy records with explicit provenance and no corpus promotion', () => {
    const entry = migrateFlightEntry({ id: 1, date: '2026-01-01', actual_apogee_ft: '' })
    expect(entry.schemaVersion).toBe(2)
    expect(entry.observationProvenance.source).toBe('unknown')
    expect(entry.missingData).toContain('actual_apogee_ft')
    expect(entry.corpusEvidence).toBe(false)
    expect(Object.isFrozen(entry)).toBe(true)
  })

  it('captures a complete immutable fresh simulation snapshot', () => {
    const simulation = { apogee_ft: 4000, main_fps: 18, provenance: { inputKey: 'sim-x' } }
    const entry = createFlightEntry(
      { date: '2026-01-01', observation_source: 'altimeter' },
      { simulation, specs: { rocket_mass_g: '1000' }, resultFresh: true }
    )
    expect(entry.predicted).toEqual(simulation)
    expect(entry.simulationProvenance).toEqual(simulation.provenance)
    expect(entry.observationProvenance.source).toBe('altimeter')
    expect(Object.isFrozen(entry.predicted)).toBe(true)
  })

  it('never snapshots predictions from a stale simulation', () => {
    const entry = createFlightEntry(
      { date: '2026-01-01', observation_source: 'manual' },
      { simulation: { apogee_ft: 4000 }, specs: {}, resultFresh: false }
    )

    expect(entry.predicted).toBeNull()
    expect(entry.simulationProvenance).toBeNull()
  })

  it('validates export/import envelope', () => {
    const records = [{ id: 1, date: '2026-01-01' }]
    expect(importFlightRecords(exportFlightRecords(records))).toHaveLength(1)
    expect(() => importFlightRecords('{}')).toThrow()
  })

  it('reports an unreadable stored log instead of returning a clean empty log', () => {
    const storage = { getItem: () => '{corrupt' }
    expect(readFlightLog(storage)).toEqual({ ok: false, entries: [] })
    expect(readFlightLog({ getItem: () => '[]' })).toEqual({ ok: true, entries: [] })
  })

  it('stores free-text instrumentation as a device list', () => {
    const entry = createFlightEntry(
      { date: '2026-01-01', instrumentation: 'Raven, GPS ' },
      { resultFresh: false }
    )
    expect(entry.instrumentation.devices).toEqual(['Raven', 'GPS'])
  })

  it('merges imported records without duplicating stable ids', () => {
    const existing = [{ id: 'flight-existing', date: '2026-01-01' }]
    const imported = [
      { id: 'flight-new', date: '2026-01-02' },
      { id: 'flight-existing', date: '2026-01-01' },
      { id: 'flight-new', date: '2026-01-02' },
    ]

    const merged = mergeFlightEntries(existing, imported)

    expect(merged.added).toBe(1)
    expect(merged.entries.map((entry) => entry.id)).toEqual(['flight-new', 'flight-existing'])
  })
})

describe('flight evidence — candidate-evidence transfer', () => {
  const freshSimulation = {
    apogee_ft: 4000,
    main_fps: 18,
    drogue_fps: 60,
    drift_ft: 900,
    landing_ke_ftlbf: 20,
    provenance: { inputKey: 'sim-x', revision: 'sim-x', modelId: 'browser-js-recovery' },
  }

  it('records observations with canonical units, conditions, and unreviewed reviewer status', () => {
    const entry = createFlightEntry(
      {
        date: '2026-01-01',
        observation_source: 'altimeter',
        conditions: '10 mph wind, clear',
        actual_apogee_ft: '3950',
      },
      { simulation: freshSimulation, specs: { rocket_mass_g: '1000' }, resultFresh: true }
    )
    expect(entry.units).toEqual({
      apogee_ft: 'ft',
      drift_ft: 'ft',
      drogue_fps: 'ft/s',
      main_fps: 'ft/s',
      landing_ke_ftlbf: 'ft-lbf',
    })
    expect(entry.conditions).toBe('10 mph wind, clear')
    expect(entry.reviewerStatus).toBe('unreviewed')
    expect(predictionIdentity(entry)).toBe('sim-x')
  })

  it('exports candidate evidence with source, units, conditions, reviewer status, and immutable prediction identity', () => {
    const entry = createFlightEntry(
      {
        date: '2026-01-01',
        observation_source: 'tracker',
        conditions: 'calm',
        actual_apogee_ft: '4050',
      },
      { simulation: freshSimulation, specs: {}, resultFresh: true }
    )
    const payload = JSON.parse(exportCandidateEvidence([entry]))
    expect(payload.type).toBe('recoverysys-candidate-evidence')
    expect(payload.exportVersion).toBe(1)
    expect(payload.entries).toHaveLength(1)
    const exported = payload.entries[0]
    expect(exported.observationProvenance.source).toBe('tracker')
    expect(exported.units.main_fps).toBe('ft/s')
    expect(exported.conditions).toBe('calm')
    expect(exported.reviewerStatus).toBe('unreviewed')
    expect(exported.predictionIdentity).toBe('sim-x')
    expect(exported.corpusEvidence).toBe(false)
  })

  it('excludes observations without a prediction identity from candidate evidence', () => {
    const payload = JSON.parse(
      exportCandidateEvidence([{ date: '2026-01-01', actual_apogee_ft: '1000' }])
    )
    expect(payload.entries).toHaveLength(0)
  })

  it('round-trips candidate evidence and re-derives identity from provenance, never the wire', () => {
    const entry = createFlightEntry(
      { date: '2026-01-01', observation_source: 'video', actual_apogee_ft: '4100' },
      { simulation: freshSimulation, specs: {}, resultFresh: true }
    )
    // Forge a bogus wire-level identity claim; intake must ignore it.
    const exported = JSON.parse(exportCandidateEvidence([entry]))
    exported.entries[0].predictionIdentity = 'forged-identity'
    exported.entries[0].simulationProvenance.inputKey = 'sim-x'
    const imported = importCandidateEvidence(JSON.stringify(exported))
    expect(imported).toHaveLength(1)
    expect(imported[0].predictionIdentity).toBe('sim-x')
  })

  it('rejects malformed or wrong-version candidate evidence envelopes', () => {
    expect(() => importCandidateEvidence('{bad')).toThrow('Invalid candidate evidence JSON')
    expect(() => importCandidateEvidence('{"type":"recoverysys-flight-records"}')).toThrow(
      'Unsupported candidate evidence format'
    )
    expect(() =>
      importCandidateEvidence(
        JSON.stringify({ type: 'recoverysys-candidate-evidence', exportVersion: 99, entries: [] })
      )
    ).toThrow('Unsupported candidate evidence format')
  })

  it('drops candidate-evidence entries that carry no provenance snapshot', () => {
    const payload = {
      type: 'recoverysys-candidate-evidence',
      exportVersion: 1,
      entries: [{ date: '2026-01-01', actual_apogee_ft: '1000' }],
    }
    expect(importCandidateEvidence(JSON.stringify(payload))).toHaveLength(0)
  })

  it('backfills units, conditions, and reviewer status on legacy entries', () => {
    const entry = migrateFlightEntry({
      id: 7,
      date: '2026-01-01',
      actual_apogee_ft: '3900',
      reviewerStatus: 'not-a-real-status',
    })
    expect(entry.units.apogee_ft).toBe('ft')
    expect(entry.units.main_fps).toBe('ft/s')
    expect(entry.conditions).toBe('')
    expect(entry.reviewerStatus).toBe('unreviewed')
    expect(entry.corpusEvidence).toBe(false)
  })

  it('never snapshots predictions or identity from a stale simulation', () => {
    const entry = createFlightEntry(
      { date: '2026-01-01', observation_source: 'manual', conditions: 'gusty' },
      { simulation: freshSimulation, specs: {}, resultFresh: false }
    )
    expect(entry.predicted).toBeNull()
    expect(entry.simulationProvenance).toBeNull()
    expect(predictionIdentity(entry)).toBeNull()
    expect(JSON.parse(exportCandidateEvidence([entry])).entries).toHaveLength(0)
  })
})
