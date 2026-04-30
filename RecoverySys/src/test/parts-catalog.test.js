// Catalog integrity tests. Pass 2's testing review pointed out that with 233
// part entries hand-maintained in a single file, ID collisions and category
// typos would silently break share-link rehydration and selection state.
// These assertions catch the whole class at CI time instead of in production.

import { describe, it, expect } from 'vitest'
import { PARTS, CATEGORIES, SLOT_IDS } from '../data/parts.js'

describe('parts catalog integrity', () => {
  it('every part has the minimum shape (id, name, category, specs)', () => {
    for (const part of PARTS) {
      expect(typeof part.id, `part missing id: ${JSON.stringify(part)}`).toBe('string')
      expect(part.id.length, `part id is empty: ${JSON.stringify(part)}`).toBeGreaterThan(0)
      expect(typeof part.name, `part ${part.id} missing name`).toBe('string')
      expect(typeof part.category, `part ${part.id} missing category`).toBe('string')
      expect(part.specs, `part ${part.id} missing specs`).toBeTruthy()
      expect(typeof part.specs, `part ${part.id} specs not an object`).toBe('object')
    }
  })

  it('every part.category is a valid slot id from CATEGORIES', () => {
    const validCategories = new Set(SLOT_IDS)
    for (const part of PARTS) {
      expect(
        validCategories.has(part.category),
        `part ${part.id} has invalid category "${part.category}" — not in CATEGORIES`,
      ).toBe(true)
    }
  })

  it('(id, category) pairs are unique across the catalog', () => {
    // Note: bare `id` is NOT unique — there are historical collisions between
    // main_chute and drogue_chute variants of the same part (e.g. fr3-12-30
    // exists in both). The (id, category) composite IS unique, which is why
    // App.jsx and shareLink.js look parts up via that composite key. This
    // test pins that invariant so a future drift causes a clear test
    // failure instead of a silent share-link rehydration bug.
    const seen = new Set()
    const collisions = []
    for (const part of PARTS) {
      const key = `${part.category}:${part.id}`
      if (seen.has(key)) collisions.push(key)
      else seen.add(key)
    }
    expect(collisions, `(id, category) collisions: ${collisions.join(', ')}`).toEqual([])
  })

  it('every category in CATEGORIES has at least one part in the catalog', () => {
    // Drift detector: if someone adds a category without parts, or removes
    // every part from a category, the UI tab is empty and Pass 2's "orphan
    // category" finding (flight_computer / battery cases pre-cleanup) recurs.
    const populatedCategories = new Set(PARTS.map(p => p.category))
    for (const slot of SLOT_IDS) {
      expect(
        populatedCategories.has(slot),
        `category "${slot}" exists in CATEGORIES but has zero parts in PARTS`,
      ).toBe(true)
    }
  })

  it('CATEGORIES.id values are unique', () => {
    const ids = CATEGORIES.map(c => c.id)
    expect(new Set(ids).size, `duplicate slot ids in CATEGORIES`).toBe(ids.length)
  })
})
