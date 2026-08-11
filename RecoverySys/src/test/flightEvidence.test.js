import { describe, expect, it } from 'vitest'
import {
  createFlightEntry,
  exportFlightRecords,
  importFlightRecords,
  migrateFlightEntry,
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
})
