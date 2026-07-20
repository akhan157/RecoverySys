import { renderHook, act } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import usePersistence from '../hooks/usePersistence.js'

describe('imported-session persistence guard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => vi.useRealTimers())

  it('does not overwrite saved config while an imported session is edited, then resumes after Save', () => {
    const saved = { schemaVersion: 1, config: { old: true }, specs: { old: true }, customMotor: null }
    localStorage.setItem('recoverysys-config', JSON.stringify(saved))
    const { rerender } = renderHook(
      ({ config, disabled }) => usePersistence({ config, specs: { value: config.value }, customMotor: null, disabled }),
      { initialProps: { config: { value: 'imported' }, disabled: true } },
    )

    rerender({ config: { value: 'edited' }, disabled: true })
    act(() => vi.advanceTimersByTime(400))
    expect(JSON.parse(localStorage.getItem('recoverysys-config'))).toEqual(saved)

    rerender({ config: { value: 'edited' }, disabled: false })
    act(() => vi.advanceTimersByTime(400))
    expect(JSON.parse(localStorage.getItem('recoverysys-config')).config).toEqual({ value: 'edited' })
  })
})
