import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BayView from './BayView.jsx'
const config = {
  main_chute: { id: 'main', name: 'Test Main', specs: { packed_diam_in: 3, packed_length_in: 8 } },
  shock_cord: { id: 'cord', name: 'Test Cord', specs: { packed_height_in: 2 } },
}
describe('dimensional bay view', () => {
  it('shows scaled known parts, exposes omissions, and selects parts using the keyboard-accessible list', () => {
    const select = vi.fn()
    render(
      <BayView
        config={config}
        specs={{ airframe_id_in: '4', bay_length_in: '18' }}
        activeCategory="main_chute"
        onSelectCategory={select}
      />
    )
    expect(screen.getByRole('img', { name: /To-scale empty bay reference/ })).toBeInTheDocument()
    expect(screen.getByText(/Physical fit is unknown/)).toBeInTheDocument()
    expect(screen.getByText(/Packing variation has not been measured/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Test Cord/ }))
    expect(select).toHaveBeenCalledWith('shock_cord')
    expect(screen.getByRole('button', { name: '3D', exact: true })).toBeInTheDocument()
  })
  it('asks for missing bay dimensions instead of drawing a fictitious bay', () => {
    render(<BayView config={{}} specs={{}} onSelectCategory={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent(/Enter airframe inner diameter/)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
  it('exposes missing rigid dimensions instead of presenting stock size as hardware shape', () => {
    render(
      <BayView
        config={{
          quick_links: {
            name: 'Link',
            specs: { size_in: 0.25, packed_diam_in: 1, packed_length_in: 2 },
          },
        }}
        specs={{ airframe_id_in: '4', bay_length_in: '18' }}
        activeCategory="quick_links"
        onSelectCategory={() => {}}
      />
    )
    expect(screen.getByRole('status')).toHaveTextContent(
      'Rigid hardware needs body length, width and depth'
    )
    expect(screen.getByText(/Rigid hardware · Not drawn/)).toBeInTheDocument()
  })
  it('labels recorded extremes without implying a compression limit', () => {
    render(
      <BayView
        config={{
          main_chute: {
            name: 'Range chute',
            specs: {
              packed_diam_min_in: 2,
              packed_diam_max_in: 3,
              packed_length_min_in: 5,
              packed_length_max_in: 9,
            },
          },
        }}
        specs={{ airframe_id_in: '4', bay_length_in: '18' }}
        activeCategory="main_chute"
        onSelectCategory={() => {}}
      />
    )
    expect(screen.getByText(/not specific tested arrangements/)).toBeInTheDocument()
    expect(screen.getByText(/2–3 in Ø × 5–9 in L/)).toBeInTheDocument()
  })
})
