import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PrintChecklist from '../components/PrintChecklist.jsx'
import RecoveryBriefTab from '../components/tabs/RecoveryBriefTab.jsx'
import { buildDeploymentSequence } from '../lib/deploymentSequence.js'
import { runSimulation } from '../lib/simulation.js'

const specs = {
  rocket_mass_g: '2500',
  motor_total_impulse_ns: '640',
  burn_time_s: '1.8',
  airframe_id_in: '3.9',
  drag_cd: '0.5',
  main_deploy_alt_ft: '700',
}

const main = { name: 'Main', specs: { diameter_in: 36, cd: 1.5 } }
const drogue = { name: 'Drogue', specs: { diameter_in: 12, cd: 0.9 } }
const config = { main_chute: main, drogue_chute: drogue }
const simulation = runSimulation({ specs, config })

function briefSection() {
  return screen.getByRole('heading', { name: 'Deployment sequence' }).closest('section')
}

function timelineValues(section) {
  return [...section.querySelectorAll('.mc-brief__timeline-facts dd')].map(
    (item) => item.textContent
  )
}

describe('deployment sequence in the recovery brief', () => {
  it('renders the architecture and ordered timeline from a current result', () => {
    const deploymentSequence = buildDeploymentSequence({
      config,
      specs,
      simulation,
      resultFresh: true,
    })
    render(<RecoveryBriefTab recoveryBrief={{ status: 'current', deploymentSequence }} />)

    const section = briefSection()
    expect(within(section).getByText('Dual deploy (drogue + main)')).toBeInTheDocument()
    const items = section.querySelectorAll('.mc-brief__timeline-item')
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent('Liftoff')
    expect(items[1]).toHaveTextContent('Burnout')
    expect(items[2]).toHaveTextContent('Apogee — drogue deployment')
    expect(items[3]).toHaveTextContent('Main deployment')
    expect(items[4]).toHaveTextContent('Landing')

    expect(
      within(items[2]).getByText(`${simulation.apogee_ft.toLocaleString()} ft`)
    ).toBeInTheDocument()
    expect(within(items[2]).getByText(`${simulation.apogee_t_s} s`)).toBeInTheDocument()
    expect(
      within(items[3]).getByText(`${simulation.deploy_ft.toLocaleString()} ft`)
    ).toBeInTheDocument()
    expect(
      within(items[3]).getByText(`${simulation.apogee_t_s + simulation.phase1_time_s} s`)
    ).toBeInTheDocument()
    expect(
      within(items[4]).getByText(`${simulation.apogee_t_s + simulation.total_time_s} s`)
    ).toBeInTheDocument()
    expect(within(section).getAllByText('Simulation')).toHaveLength(5)
  })

  it('shows Run simulation instead of zero when no result exists', () => {
    const deploymentSequence = buildDeploymentSequence({
      config,
      specs,
      simulation: null,
    })
    render(<RecoveryBriefTab recoveryBrief={{ status: 'not-run', deploymentSequence }} />)

    const section = briefSection()
    const values = timelineValues(section)
    expect(values).toContain('Run simulation')
    expect(values).toContain('700 ft')
    expect(values).not.toContain('0 ft')
    expect(values).not.toContain('0 s')
    expect(values).not.toContain('0 ft/s')
    expect(within(section).getByText('Entered spec')).toBeInTheDocument()
    expect(section).toHaveTextContent(/NO_CURRENT_RESULT/)
  })

  it('dashes withheld stale values while keeping the entered deploy altitude', () => {
    const deploymentSequence = buildDeploymentSequence({
      config,
      specs,
      simulation,
      resultFresh: false,
    })
    render(<RecoveryBriefTab recoveryBrief={{ status: 'stale', deploymentSequence }} />)

    const section = briefSection()
    const values = timelineValues(section)
    expect(values).toContain('—')
    expect(values).not.toContain('Run simulation')
    expect(values).toContain('700 ft')
    expect(section).toHaveTextContent(/RESULT_STALE/)
  })
})

describe('deployment sequence in the print artifact', () => {
  it('prints the compact table from the brief view model', () => {
    const deploymentSequence = buildDeploymentSequence({
      config,
      specs,
      simulation,
      resultFresh: true,
    })
    render(
      <PrintChecklist
        specs={specs}
        config={config}
        simulation={simulation}
        resultFresh
        warnings={[]}
        recoveryBrief={{ status: 'current', deploymentSequence }}
        printMode="checklist"
      />
    )

    const section = briefSection()
    expect(section).toHaveTextContent('Dual deploy (drogue + main)')
    const rows = within(section).getAllByRole('row')
    expect(rows).toHaveLength(deploymentSequence.events.length + 1)
    expect(rows[1]).toHaveTextContent('Liftoff')
    expect(rows[4]).toHaveTextContent('Main deployment')
    expect(
      within(rows[5]).getByText(`${simulation.apogee_t_s + simulation.total_time_s}`)
    ).toBeInTheDocument()
    expect(within(section).getByRole('columnheader', { name: 'Altitude (ft)' })).toBeInTheDocument()
    expect(within(section).getByRole('columnheader', { name: 'Speed (ft/s)' })).toBeInTheDocument()
  })

  it('derives the table when the brief predates the deployment sequence', () => {
    render(
      <PrintChecklist
        specs={specs}
        config={config}
        simulation={simulation}
        resultFresh
        warnings={[]}
        recoveryBrief={{ status: 'current' }}
        printMode="brief"
      />
    )

    const section = briefSection()
    expect(section).toHaveTextContent('Dual deploy (drogue + main)')
    expect(section.querySelectorAll('tbody tr')).toHaveLength(5)
  })
})
