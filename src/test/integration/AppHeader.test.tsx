import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppHeader } from '@/components/layout/AppHeader'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...rest }: Record<string, unknown>) => <a {...rest}>{children as React.ReactNode}</a>,
}))

describe('AppHeader', () => {
  it('renders nav links to predictions and accuracy', () => {
    render(<AppHeader />)
    expect(screen.getByText('今日推薦')).toBeInTheDocument()
    expect(screen.getByText('準確率')).toBeInTheDocument()
  })

  it('does NOT render language toggle', () => {
    render(<AppHeader />)
    expect(screen.queryByLabelText('Toggle language')).not.toBeInTheDocument()
    expect(screen.queryByText('EN')).not.toBeInTheDocument()
  })
})
