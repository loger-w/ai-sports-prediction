import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const navigateMock = vi.fn()

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'en' }),
  useNavigate: () => navigateMock,
  Link: ({ children, activeProps, className, ...props }: Record<string, unknown>) => (
    <a className={className as string} {...props}>{children as React.ReactNode}</a>
  ),
}))

import { AppHeader } from '@/components/layout/AppHeader'

describe('AppHeader', () => {
  it('shows EN and 中 language toggles', () => {
    render(<AppHeader />)
    expect(screen.getByText('EN')).toBeInTheDocument()
    expect(screen.getByText('中')).toBeInTheDocument()
  })

  it('shows nav links', () => {
    render(<AppHeader />)
    expect(screen.getByText("Today's Picks")).toBeInTheDocument()
    expect(screen.getByText('Accuracy')).toBeInTheDocument()
  })

  it('navigates to zh path when language toggle is clicked', async () => {
    const user = userEvent.setup()
    render(<AppHeader />)
    const toggleButton = screen.getByLabelText('Toggle language')
    await user.click(toggleButton)
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/$lang/predictions',
      params: { lang: 'zh' },
    })
  })
})
