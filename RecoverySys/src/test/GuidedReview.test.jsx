import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import GuidedReview from '../components/GuidedReview.jsx'

describe('GuidedReview component', () => {
  it('renders Step 1 by default with scope guidance', () => {
    render(<GuidedReview onOpenSpecs={vi.fn()} />)
    expect(screen.getByText('TRANSPARENCY MODE / GUIDED REVIEW')).toBeInTheDocument()
    expect(screen.getByText('What this run can answer')).toBeInTheDocument()
    expect(screen.getByText('STEP 01 OF 03')).toBeInTheDocument()
  })

  it('steps forward through results to method deep dive', () => {
    const onOpenSpecs = vi.fn()
    render(<GuidedReview onOpenSpecs={onOpenSpecs} />)

    // Click NEXT -> Step 2
    const nextBtn = screen.getByRole('button', { name: /NEXT/i })
    fireEvent.click(nextBtn)
    expect(screen.getByText('STEP 02 OF 03')).toBeInTheDocument()
    expect(screen.getByText('Review results by scope')).toBeInTheDocument()

    // Click REVIEW METHOD -> Step 3
    const reviewMethodBtn = screen.getByRole('button', { name: /REVIEW METHOD/i })
    fireEvent.click(reviewMethodBtn)
    expect(screen.getByText('STEP 03 OF 03')).toBeInTheDocument()
    expect(screen.getByText('Method & assumptions')).toBeInTheDocument()

    // Click Review the source inputs
    const openSpecsBtn = screen.getByRole('button', { name: /Review the source inputs/i })
    fireEvent.click(openSpecsBtn)
    expect(onOpenSpecs).toHaveBeenCalledTimes(1)
  })
})
