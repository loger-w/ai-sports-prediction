import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SimpleLayout } from '@/components/layout/SimpleLayout'

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ lang: 'zh' }),
  useNavigate: () => vi.fn(),
  Link: ({ children, ...rest }: Record<string, unknown>) => (
    <a {...rest}>{children as React.ReactNode}</a>
  ),
}))

describe('SimpleLayout', () => {
  it('renders children inside main', () => {
    render(
      <SimpleLayout>
        <div data-testid="page-content">Hello</div>
      </SimpleLayout>,
    )
    expect(screen.getByTestId('page-content')).toBeInTheDocument()
    expect(screen.getByTestId('page-content')).toHaveTextContent('Hello')
  })

  it('renders the AppHeader nav links', () => {
    render(
      <SimpleLayout>
        <p>x</p>
      </SimpleLayout>,
    )
    expect(screen.getByText('今日推薦')).toBeInTheDocument()
    expect(screen.getByText('準確率')).toBeInTheDocument()
  })

  it('renders the AppFooter disclaimer', () => {
    render(
      <SimpleLayout>
        <p>x</p>
      </SimpleLayout>,
    )
    expect(
      screen.getByText(/本站預測由 AI 模型生成/),
    ).toBeInTheDocument()
  })
})
