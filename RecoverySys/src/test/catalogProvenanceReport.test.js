import { describe, expect, it } from 'vitest'
import { catalogProvenanceReport } from '../../scripts/report-catalog-provenance.js'

describe('catalog provenance report', () => {
  it('groups all checked-in parts and identifies no unregistered manufacturer', () => {
    const report = catalogProvenanceReport()
    expect(report.totalParts).toBe(225)
    expect(report.missing).toEqual([])
    expect(report.groups.every((group) => group.status === 'unverified')).toBe(true)
  })

  it('reports an unregistered catalog entry by category and ID', () => {
    expect(
      catalogProvenanceReport([{ id: 'unknown', category: 'main_chute', manufacturer: 'Unknown' }])
        .missing
    ).toEqual(['main_chute:unknown'])
  })
})
