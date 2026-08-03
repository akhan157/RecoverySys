import { describe, expect, it } from 'vitest'
import { PARTS } from '../data/parts.js'
import { provenanceForPart } from '../data/catalogProvenance.js'

describe('catalog provenance registry', () => {
  it('gives every built-in part an explicit provenance posture', () => {
    for (const part of PARTS) {
      expect(provenanceForPart(part)).toMatchObject({
        title: expect.any(String),
        status: expect.stringMatching(/^(verified|unverified)$/),
      })
    }
  })

  it('does not infer provenance for an unknown manufacturer', () => {
    expect(provenanceForPart({ manufacturer: 'Unknown' })).toBeNull()
  })
})
