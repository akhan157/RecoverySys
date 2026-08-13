import { describe, expect, it } from 'vitest'
import { PARTS } from '../data/parts.js'
import {
  MANUFACTURER_PROVENANCE,
  provenanceForPart,
  validateCatalogProvenance,
} from '../data/catalogProvenance.js'

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

  it('accepts the checked-in provenance registry shape', () => {
    expect(validateCatalogProvenance(MANUFACTURER_PROVENANCE)).toEqual({
      valid: true,
      diagnostics: [],
    })
  })

  it('rejects malformed records with actionable manufacturer names', () => {
    const result = validateCatalogProvenance({
      'Bad Co': {
        title: '',
        url: 'ftp://nope',
        status: 'approved',
        accessed: 'yesterday',
        sourceType: 'scraped',
      },
    })
    expect(result.valid).toBe(false)
    const text = result.diagnostics.join('\n')
    expect(text).toMatch(/Bad Co: title must be a non-empty string/)
    expect(text).toMatch(/Bad Co: url must be an http\(s\) URL or null/)
    expect(text).toMatch(/Bad Co: status must be one of verified, unverified/)
    expect(text).toMatch(/Bad Co: accessed must be an ISO date \(YYYY-MM-DD\) or null/)
    expect(text).toMatch(/Bad Co: sourceType must be one of/)
  })

  it('requires review metadata before a record may claim verified status', () => {
    const verified = validateCatalogProvenance({
      'Test Co': {
        title: 'Source',
        url: 'https://example.com',
        status: 'verified',
        accessed: '2026-08-01',
        sourceType: 'manufacturer-spec',
      },
    })
    expect(verified.valid).toBe(false)
    expect(verified.diagnostics.join('\n')).toMatch(/Test Co: verified status requires reviewedBy/)
    expect(verified.diagnostics.join('\n')).toMatch(
      /Test Co: verified status requires reviewedAt ISO date/
    )

    const complete = validateCatalogProvenance({
      'Test Co': {
        title: 'Source',
        url: 'https://example.com',
        status: 'verified',
        accessed: '2026-08-01',
        sourceType: 'manufacturer-spec',
        reviewedBy: 'Independent Reviewer',
        reviewedAt: '2026-08-10',
      },
    })
    expect(complete).toEqual({ valid: true, diagnostics: [] })
  })

  it('rejects a missing or non-object record', () => {
    const result = validateCatalogProvenance({ Ghost: null })
    expect(result.valid).toBe(false)
    expect(result.diagnostics.join('\n')).toMatch(/Ghost: provenance record must be an object/)
  })
})
