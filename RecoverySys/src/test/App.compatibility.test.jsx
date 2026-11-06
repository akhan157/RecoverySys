import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import App from '../App.jsx'

vi.mock('../components/MissionControlLayout.jsx', () => ({
  default: ({ state, setSpec }) => (
    <>
      <output aria-label="Compatibility findings">
        {state.warnings.map((item) => item.code).join('\n')}
      </output>
      <button onClick={() => setSpec('rocket_mass_g', '500')}>Reduce mass</button>
    </>
  ),
}))

describe('current-input compatibility at the application boundary', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    localStorage.setItem('recoverysys-visited', '1')
    localStorage.setItem(
      'recoverysys-config',
      JSON.stringify({
        schemaVersion: 1,
        config: { main_chute: { id: 'cl-24-n' } },
        specs: { rocket_mass_g: '2500', motor_total_impulse_ns: '640', burn_time_s: '1.8' },
      })
    )
    window.history.replaceState({}, '', '/')
  })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    localStorage.clear()
  })

  it('supplies warnings on the initial render before any timer advances', () => {
    render(<App />)
    expect(screen.getByLabelText('Compatibility findings')).toHaveTextContent(
      'compatibility.main_chute.main-descent-rate-hard-landing'
    )
  })

  it('replaces obsolete findings in the input-change render without a debounce gap', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Reduce mass' }))
    const findings = screen.getByLabelText('Compatibility findings')
    expect(findings).not.toHaveTextContent('main-descent-rate-hard-landing')
    expect(findings).toHaveTextContent('compatibility.main_chute.main-descent-rate-fast')
  })
})
