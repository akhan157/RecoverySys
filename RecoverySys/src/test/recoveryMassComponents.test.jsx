import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PrintChecklist from '../components/PrintChecklist.jsx'
import RocketSpecs from '../components/RocketSpecs.jsx'
import RecoveryBriefTab from '../components/tabs/RecoveryBriefTab.jsx'
import { computeRecoveryMass } from '../lib/recoveryMass.js'

const specs = { rocket_mass_g: '2500' }
const config = {
  main_chute: { name: 'Fruity 36', specs: { weight_g: 300 } },
  shock_cord: { name: 'Nylon 20 ft', specs: { weight_g: 125 } },
}

function renderRocketSpecs(overrides = {}) {
  return render(
    <RocketSpecs
      specs={specs}
      config={config}
      onSetSpec={vi.fn()}
      customMotor={null}
      onSetCustomMotor={vi.fn()}
      onClearCustomMotor={vi.fn()}
      onToast={vi.fn()}
      {...overrides}
    />
  )
}

describe('recovery hardware mass surfaces', () => {
  it('renders the brief section with per-part weights, total, and share of rocket mass', () => {
    render(
      <RecoveryBriefTab
        recoveryBrief={{
          status: 'current',
          recoveryMass: computeRecoveryMass({ config, specs }),
        }}
      />
    )

    const section = screen
      .getByRole('heading', { name: 'Recovery hardware mass' })
      .closest('section')
    expect(within(section).getByText('Fruity 36')).toBeInTheDocument()
    expect(within(section).getByText('300 g')).toBeInTheDocument()
    expect(within(section).getByText('Nylon 20 ft')).toBeInTheDocument()
    expect(within(section).getByText('125 g')).toBeInTheDocument()

    const facts = section.querySelector('.mc-brief__facts')
    expect(facts).toHaveTextContent('425 g')
    expect(facts).toHaveTextContent('2,500 g')
    expect(facts).toHaveTextContent('17%')
  })

  it('notes selected slots whose catalog weight is missing', () => {
    const partialConfig = {
      main_chute: { name: 'Known main', specs: { weight_g: 300 } },
      drogue_chute: { name: 'Unknown drogue', specs: {} },
    }
    render(
      <RecoveryBriefTab
        recoveryBrief={{
          status: 'current',
          recoveryMass: computeRecoveryMass({ config: partialConfig, specs }),
        }}
      />
    )

    const section = screen
      .getByRole('heading', { name: 'Recovery hardware mass' })
      .closest('section')
    expect(within(section).getByText('Missing weight')).toBeInTheDocument()
    expect(section).toHaveTextContent(/Missing catalog weight: Drogue Chute/)
    expect(section).toHaveTextContent(/reported total excludes those selected slots/i)
  })

  it('shows the one-line hint beside rocket mass and hides it with no selected hardware', () => {
    const { unmount } = renderRocketSpecs()
    expect(
      screen.getByText('Selected recovery hardware: 425 g (17% of entered mass)')
    ).toBeInTheDocument()
    unmount()

    renderRocketSpecs({ config: {} })
    expect(screen.queryByText(/Selected recovery hardware:/)).not.toBeInTheDocument()
  })

  it('prints the total and per-part recovery weights', () => {
    render(
      <PrintChecklist
        specs={specs}
        config={config}
        simulation={null}
        recoveryBrief={{ status: 'not-run' }}
        printMode="checklist"
      />
    )

    const section = screen
      .getByRole('heading', { name: 'Recovery hardware mass' })
      .closest('section')
    expect(section).toHaveTextContent(
      'Total known recovery mass: 425 g (17% of entered rocket mass)'
    )
    expect(within(section).getByText('Fruity 36')).toBeInTheDocument()
    expect(within(section).getByText('Nylon 20 ft')).toBeInTheDocument()
    expect(within(section).getByText('300 g')).toBeInTheDocument()
    expect(within(section).getByText('125 g')).toBeInTheDocument()
  })
})
