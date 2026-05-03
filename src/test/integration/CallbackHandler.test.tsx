import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { useAuthStore } from '@/stores/auth/authStore'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}))

import { CallbackHandler } from '@/components/auth/CallbackHandler'

describe('CallbackHandler', () => {
  beforeEach(() => {
    mocks.navigate.mockClear()
  })

  afterEach(() => {
    act(() => {
      useAuthStore.setState({ session: null, user: null, loading: true })
    })
  })

  it('shows a 處理中 message while loading', () => {
    act(() => {
      useAuthStore.setState({ loading: true })
    })
    render(<CallbackHandler />)
    expect(screen.getByText(/處理中/)).toBeInTheDocument()
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('navigates to / after auth state settles (loading=false)', async () => {
    act(() => {
      useAuthStore.setState({ loading: true })
    })
    render(<CallbackHandler />)

    act(() => {
      useAuthStore.setState({ loading: false })
    })

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/' })
    })
  })

  it('navigates immediately if loading is already false on mount', async () => {
    act(() => {
      useAuthStore.setState({ loading: false })
    })
    render(<CallbackHandler />)
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({ to: '/' })
    })
  })
})
