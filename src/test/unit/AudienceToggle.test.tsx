import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { AudienceToggle } from '@/components/admin/AudienceToggle'

describe('AudienceToggle', () => {
  it('renders both segments with correct aria-pressed when value="all"', () => {
    render(<AudienceToggle value="all" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '公開' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Premium' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders both segments with correct aria-pressed when value="premium"', () => {
    render(<AudienceToggle value="premium" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '公開' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Premium' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking the inactive segment calls onChange with that value', () => {
    const onChange = vi.fn()
    render(<AudienceToggle value="all" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Premium' }))
    expect(onChange).toHaveBeenCalledWith('premium')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('clicking the already-active segment does NOT call onChange', () => {
    const onChange = vi.fn()
    render(<AudienceToggle value="all" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '公開' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('disabled prop blocks onChange and sets disabled attribute on both segments', () => {
    const onChange = vi.fn()
    render(<AudienceToggle value="all" onChange={onChange} disabled />)
    const allBtn = screen.getByRole('button', { name: '公開' })
    const premBtn = screen.getByRole('button', { name: 'Premium' })
    expect(allBtn).toBeDisabled()
    expect(premBtn).toBeDisabled()
    fireEvent.click(premBtn)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('exposes an aria-label on the group (default 受眾)', () => {
    const { container } = render(<AudienceToggle value="all" onChange={() => {}} />)
    const group = container.querySelector('[role="group"]')
    expect(group).toHaveAttribute('aria-label', '受眾')
  })

  it('respects custom label prop', () => {
    const { container } = render(
      <AudienceToggle value="all" onChange={() => {}} label="可見性" />,
    )
    const group = container.querySelector('[role="group"]')
    expect(group).toHaveAttribute('aria-label', '可見性')
  })
})
