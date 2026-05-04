import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { useAuthStore } from '@/stores/auth/authStore'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('sonner', () => ({
  toast: {
    success: (msg: string) => mocks.toastSuccess(msg),
    error: (msg: string) => mocks.toastError(msg),
    info: vi.fn(),
  },
}))

import { CallbackHandler } from '@/components/auth/CallbackHandler'

describe('CallbackHandler', () => {
  beforeEach(() => {
    mocks.navigate.mockClear()
    mocks.toastSuccess.mockClear()
    mocks.toastError.mockClear()
    window.history.replaceState({}, '', '/auth/callback')
  })

  afterEach(() => {
    act(() => {
      useAuthStore.setState({ session: null, user: null, loading: true })
    })
    window.history.replaceState({}, '', '/auth/callback')
  })

  it('shows a 處理中 message while loading with no session', () => {
    act(() => {
      useAuthStore.setState({ loading: true, session: null })
    })
    render(<CallbackHandler />)
    expect(screen.getByText(/處理中/)).toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('navigates to / with success toast once session is set', async () => {
    act(() => {
      useAuthStore.setState({ loading: true, session: null })
    })
    render(<CallbackHandler />)

    act(() => {
      useAuthStore.setState({
        loading: false,
        session: { user: { id: 'u1' } } as never,
      })
    })

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith('驗證成功')
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/' })
    })
  })

  it('navigates to /login with error toast when URL hash carries an error', async () => {
    window.history.replaceState(
      {},
      '',
      '/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
    )
    act(() => {
      useAuthStore.setState({ loading: true, session: null })
    })
    render(<CallbackHandler />)

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        'Email link is invalid or has expired',
      )
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/login' })
    })
  })
})
