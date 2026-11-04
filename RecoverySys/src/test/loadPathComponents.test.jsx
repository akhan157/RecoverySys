import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PrintChecklist from '../components/PrintChecklist.jsx'
import RecoveryBriefTab from '../components/tabs/RecoveryBriefTab.jsx'
import { computeLoadPath } from '../lib/loadPath.js'

const specs = {
  rocket_mass_g: '2500',
  main_deploy_alt_ft: '500',
  ejection_g_factor: '20',
}

const main = { name: '42" Main', specs: { diameter_in: 42, cd: 1.5, shape: 'flat' } }
const drogue = { name: '12" Drogue', specs: { diameter_in: 12, cd: 1.5 } }
const cord = {
  name: 'Nylon cord',
  specs: { strength_lbs: 1000, length_ft: 15, elongation_pct: 22, material: 'nylon' },
}
const links = { name: 'Quick links', specs: { strength_lbs: 880 } }
const swivel = { name: 'Swivel', specs: { rated_lbs: 400 } }

const config = {
  main_chute: main,
  drogue_chute: drogue,
  shock_cord: cord,
  quick_links: links,
  swivel,
}

const loadPath = computeLoadPath({ config, specs })

function loadPathSection() {
  return screen.getByRole('heading', { name: 'Load path' }).closest('section')
}

function rowContaining(section, text) {
  return within(section)
    .getAllByRole('row')
    .find((row) => within(row).queryByText(text))
}

describe('load path in the recovery brief', () => {
  it('lists load cases, chain margins, chips, and the weakest link', () => {
    render(<RecoveryBriefTab recoveryBrief={{ status: 'current', loadPath }} />)

    const section = loadPathSection()
    expect(section).toHaveTextContent('All chain elements and load cases evaluated.')
    expect(within(section).getByText('Ejection pull')).toBeInTheDocument()
    expect(within(section).getByText('Main opening shock')).toBeInTheDocument()
    expect(
      within(section).getByText(
        `${loadPath.governingCase.force_lbs.toLocaleString(undefined, {
          maximumFractionDigits: 1,
        })} lbs`
      )
    ).toBeInTheDocument()
    expect(section).toHaveTextContent(/Governing load case: Main snatch proxy/)

    // The weakest-link callout names the lowest-rated element.
    expect(section).toHaveTextContent(/Weakest link: Swivel rated 400 lbs/)
    expect(section).toHaveTextContent(/Main snatch proxy margin 0\.88×/)

    // Chain elements are rows in the scrollable margin table.
    expect(section.querySelector('.mc-brief__table-scroll')).toBeInTheDocument()
    expect(within(section).getAllByRole('row')).toHaveLength(4)
    const swivelRow = rowContaining(section, 'Swivel')
    expect(within(swivelRow).getByText('400 lbs')).toBeInTheDocument()
    expect(within(swivelRow).getByText('FAIL')).toBeInTheDocument()
    expect(within(swivelRow).getByText('0.88×')).toBeInTheDocument()

    const cordRow = rowContaining(section, 'Nylon cord')
    expect(within(cordRow).getByText('OK')).toBeInTheDocument()
    expect(within(cordRow).getByText('2.20×')).toBeInTheDocument()
  })

  it('explains unavailable load cases and withholds margins', () => {
    const partial = computeLoadPath({
      config: { main_chute: main, shock_cord: cord, quick_links: links, swivel },
      specs,
    })
    expect(partial.status).toBe('partial')
    render(<RecoveryBriefTab recoveryBrief={{ status: 'current', loadPath: partial }} />)

    const section = loadPathSection()
    expect(section).toHaveTextContent(/Partial/)
    expect(within(section).getAllByText('Not evaluated')).not.toHaveLength(0)
    expect(section).toHaveTextContent('No drogue parachute is selected.')
  })

  it('shows the unavailable status and no element table without chain hardware', () => {
    const unavailable = computeLoadPath({ config: { main_chute: main }, specs })
    render(<RecoveryBriefTab recoveryBrief={{ status: 'current', loadPath: unavailable }} />)

    const section = loadPathSection()
    expect(section).toHaveTextContent(
      'Not evaluated — select chain hardware and enter a rocket mass.'
    )
    expect(within(section).queryByRole('table')).not.toBeInTheDocument()
    expect(section).toHaveTextContent('Weakest link: no rated chain element selected.')
  })
})

describe('load path in the print artifact', () => {
  it('prints the compact case and chain tables, deriving them when the brief lacks a load path', () => {
    render(
      <PrintChecklist
        specs={specs}
        config={config}
        simulation={null}
        resultFresh={false}
        warnings={[]}
        recoveryBrief={{ status: 'not-run' }}
        printMode="checklist"
      />
    )

    const section = loadPathSection()
    expect(section).toHaveTextContent('All chain elements and load cases evaluated.')
    expect(section).toHaveTextContent(/Weakest link: Swivel rated 400 lbs/)
    expect(within(section).getAllByRole('table')).toHaveLength(2)
    expect(within(section).getAllByText('Main snatch proxy').length).toBeGreaterThan(0)

    const swivelRow = rowContaining(section, 'Swivel')
    expect(within(swivelRow).getByText('400 lbs')).toBeInTheDocument()
    expect(within(swivelRow).getByText('FAIL')).toBeInTheDocument()
    expect(within(section).getAllByText('Main snatch proxy').length).toBeGreaterThan(0)
  })
})
