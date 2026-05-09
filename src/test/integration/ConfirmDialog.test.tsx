import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Delete?"
        description="Are you sure?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.queryByText('Delete?')).not.toBeInTheDocument()
  })

  it('renders title, description, and 2 action buttons when open', () => {
    render(
      <ConfirmDialog
        open
        title="Delete this game?"
        description="It cannot be undone."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText('Delete this game?')).toBeInTheDocument()
    expect(screen.getByText('It cannot be undone.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '確認' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '取消' })).toBeInTheDocument()
  })

  it('clicking confirm fires onConfirm', () => {
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        title="t"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '確認' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('clicking cancel fires onCancel', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDialog
        open
        title="t"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('uses custom labels when provided', () => {
    render(
      <ConfirmDialog
        open
        title="t"
        confirmLabel="離開"
        cancelLabel="留在這"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '離開' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '留在這' })).toBeInTheDocument()
  })

  it('destructive variant applies a destructive class to the confirm button', () => {
    render(
      <ConfirmDialog
        open
        title="t"
        destructive
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    const confirm = screen.getByRole('button', { name: '確認' })
    expect(confirm.className).toMatch(/fc8181/)
  })
})
