import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ResultEntry } from '@/components/admin/ResultEntry'

describe('ResultEntry', () => {
  it('renders win/loss/push/void buttons', () => {
    render(<ResultEntry market="ml" value={null} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /贏/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /輸/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /和/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /退/ })).toBeInTheDocument()
  })

  it('clicking win fires onChange("win")', () => {
    const onChange = vi.fn()
    render(<ResultEntry market="ml" value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /贏/ }))
    expect(onChange).toHaveBeenCalledWith('win')
  })

  it('clicking the currently selected result clears it (onChange null)', () => {
    const onChange = vi.fn()
    render(<ResultEntry market="ml" value="win" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /贏/ }))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('marks the selected button as pressed (aria-pressed)', () => {
    render(<ResultEntry market="ml" value="loss" onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: /贏/ })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: /輸/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
