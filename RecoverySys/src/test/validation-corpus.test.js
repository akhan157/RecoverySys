import { describe, expect, it } from 'vitest'
import { validateCorpus } from '../../scripts/validate-corpus.js'

describe('validation corpus gate', () => {
  it('validates the checked-in corpus and production model identity', () => {
    expect(validateCorpus()).toMatchObject({ valid: true, diagnostics: [], cases: 5 })
  })
})
