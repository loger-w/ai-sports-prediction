import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/auth/authStore'
import { UserMenu } from '@/components/layout/UserMenu'

const signOutMock = vi.fn()

vi.mock('@/lib/auth/authClient', () => ({
  authClient: {
    signOut: () => signOutMock(),
  },
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: Record<string, unknown>) => (
    <a {...rest}>{children as React.ReactNode}</a>
  ),
  useNavigate: () => vi.fn(),
}))

function setUser(session: Session | null) {
  act(() => {
    useAuthStore.getState().setSession(session)
  })
}

function setLoadingState(loading: boolean) {
  act(() => {
    useAuthStore.setState({ loading })
  })
}

describe('UserMenu', () => {
  afterEach(() => {
    act(() => {
      useAuthStore.setState({ session: null, user: null, loading: true })
    })
    signOutMock.mockReset()
  })

  it('renders a placeholder when loading', () => {
    setLoadingState(true)
    const { container } = render(<UserMenu />)
    expect(screen.queryByText('登入')).not.toBeInTheDocument()
    // Placeholder is just an empty div with sized box; no textual content
    expect(container.textContent).toBe('')
  })

  it('renders the 登入 link when no user is signed in', () => {
    setLoadingState(false)
    render(<UserMenu />)
    const link = screen.getByText('登入')
    expect(link).toBeInTheDocument()
    expect(link.getAttribute('to')).toBe('/login')
  })

  it('renders an avatar button (initial of email) when signed in', () => {
    setUser({
      user: { id: 'u1', email: 'alice@example.com', app_metadata: {} },
    } as unknown as Session)

    render(<UserMenu />)
    const trigger = screen.getByRole('button', { name: /user menu/i })
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveTextContent('A')
    // Dropdown closed by default
    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument()
  })

  it('opens dropdown with email + 登出 when avatar clicked (non-admin hides admin link)', () => {
    setUser({
      user: { id: 'u1', email: 'alice@example.com', app_metadata: {} },
    } as unknown as Session)

    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button', { name: /user menu/i }))

    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('登出')).toBeInTheDocument()
    expect(screen.queryByText(/Admin 後台/)).not.toBeInTheDocument()
  })

  it('shows "→ Admin 後台" link in dropdown only when isAdmin', () => {
    setUser({
      user: {
        id: 'u1',
        email: 'admin@example.com',
        app_metadata: { role: 'admin' },
      },
    } as unknown as Session)

    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button', { name: /user menu/i }))
    expect(screen.getByText(/Admin 後台/)).toBeInTheDocument()
  })

  it('clicking 登出 calls authClient.signOut', () => {
    setUser({
      user: { id: 'u1', email: 'alice@example.com', app_metadata: {} },
    } as unknown as Session)

    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button', { name: /user menu/i }))
    fireEvent.click(screen.getByText('登出'))
    expect(signOutMock).toHaveBeenCalledOnce()
  })
})
