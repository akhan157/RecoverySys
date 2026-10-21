import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import WorkspaceBoundary from '../components/WorkspaceBoundary.jsx'

afterEach(() => vi.restoreAllMocks())

it('contains a render failure and preserves the edited plan when the workspace is retried', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  let broken = false
  function Workspace({ mass }) {
    if (broken) throw new Error('Unable to display the current view')
    return <p>Rocket mass: {mass} g</p>
  }
  function Session() {
    const [mass, setMass] = useState('2500')
    return (
      <>
        <label>
          Rocket mass
          <input value={mass} onChange={(event) => setMass(event.target.value)} />
        </label>
        <WorkspaceBoundary>
          <Workspace mass={mass} />
        </WorkspaceBoundary>
      </>
    )
  }
  const user = userEvent.setup()
  render(<Session />)
  const mass = screen.getByRole('textbox', { name: 'Rocket mass' })
  await user.clear(mass)
  await user.type(mass, '3100')
  broken = true
  await user.type(mass, '0')
  expect(screen.getByRole('alert')).toHaveTextContent('The workspace could not be displayed')
  expect(mass).toHaveValue('31000')
  broken = false
  await user.click(screen.getByRole('button', { name: 'Retry workspace' }))
  expect(screen.getByText('Rocket mass: 31000 g')).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
