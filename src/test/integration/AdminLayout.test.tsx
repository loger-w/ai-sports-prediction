import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/auth/authStore'

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid="outlet">[child route]</div>,
  Link: ({ children, ...rest }: Record<string, unknown>) => (
    <a {...rest}>{children as React.ReactNode}</a>
  ),
  useNavigate: () => mocks.navigate,
  useParams: () => ({ lang: 'zh' }),
  createFileRoute: () => (config: unknown) => config,
}))

// SimpleLayout pulls in AppHeader → UserMenu → authClient → supabase. Already
// covered by .env.test placeholder env vars; just keep the chain intact.

import { AdminLayout } from '@/routes/admin/route'

function setSession(session: Session | null, loading = false) {
  act(() => {
    useAuthStore.setState({ session, user: session?.user ?? null, loading })
  })
}

function adminSession(role = 'admin'): Session {
  return {
    user: { id: 'u1', email: 'admin@example.com', app_metadata: { role } },
  } as unknown as Session
}

describe('AdminLayout (route guard)', () => {
  beforeEach(() => {
    mocks.navigate.mockReset()
  })

  afterEach(() => {
    act(() => {
      useAuthStore.setState({ session: null, user: null, loading: true })
    })
  })

  it('shows loading text and does not redirect while auth is loading', () => {
    setSession(null, true)
    render(<AdminLayout />)
    expect(screen.getByText(/載入中/)).toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('redirects to /login when not signed in', async () => {
    setSession(null, false)
    render(<AdminLayout />)
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/login' })
    })
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument()
  })

  it('redirects to / when signed in but not admin', async () => {
    setSession(adminSession('user'), false)
    render(<AdminLayout />)
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/' })
    })
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument()
  })

  it('renders Outlet when signed in as admin', () => {
    setSession(adminSession('admin'), false)
    render(<AdminLayout />)
    expect(screen.getByTestId('outlet')).toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
