import React from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import useCustomParts from '../hooks/useCustomParts.js'
import { loadCustomParts } from '../lib/storage.js'

function customPart(i) {
  return { id: `custom-import-${i}`, category: 'main_chute', name: `Imported ${i}`, specs: {} }
}

describe('useCustomParts import transactions', () => {
  it('rejects an over-limit inline import without partial state or storage', () => {
    const { result } = renderHook(() => useCustomParts({ config: {}, dispatch: vi.fn() }))
    const imported = Array.from({ length: 201 }, (_, i) => customPart(i))

    let mergeResult
    act(() => {
      mergeResult = result.current.mergeCustomParts(imported)
    })

    expect(mergeResult.ok).toBe(false)
    expect(result.current.customParts).toEqual([])
    expect(loadCustomParts()).toEqual([])

    act(() => {
      mergeResult = result.current.mergeCustomParts([
        { ...customPart('huge'), specs: { serialized: 'x'.repeat(300_001) } },
      ])
    })
    expect(mergeResult.ok).toBe(false)
    expect(result.current.customParts).toEqual([])
    expect(loadCustomParts()).toEqual([])
  })
})
