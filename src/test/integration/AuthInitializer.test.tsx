import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, waitFor } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/auth/authStore'

const mocks = vi.hoisted(() => {
  let cb: ((event: string, session: Session | null) => void) | null = null
  const unsubscribe = vi.fn()
  return {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn(
      (handler: (event: string, session: Session | null) => void) => {
        cb = handler
        return {
          data: { subscription: { unsubscribe } },
          error: null,
        }
      },
    ),
    unsubscribe,
    triggerCallback: (event: string, session: Session | null) => {
      cb?.(event, session)
    },
    resetCallback: () => {
      cb = null
    },
  }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}))

import { AuthInitializer } from '@/components/auth/AuthInitializer'

describe('AuthInitializer', () => {
  beforeEach(() => {
    mocks.getSession.mockClear()
    mocks.onAuthStateChange.mockClear()
    mocks.unsubscribe.mockClear()
    mocks.resetCallback()
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
  })

  afterEach(() => {
    act(() => {
      useAuthStore.setState({ session: null, user: null, loading: true })
    })
  })

  it('calls supabase.auth.getSession on mount and pushes result to authStore', async () => {
    const session = {
      user: { id: 'u1', email: 'a@b.com', app_metadata: {} },
    } as unknown as Session
    mocks.getSession.mockResolvedValueOnce({ data: { session }, error: null })

    render(<AuthInitializer />)

    await waitFor(() => {
      expect(useAuthStore.getState().session).toBe(session)
      expect(useAuthStore.getState().loading).toBe(false)
    })
  })

  it('subscribes to onAuthStateChange and unsubscribes on unmount', () => {
    const { unmount } = render(<AuthInitializer />)
    expect(mocks.onAuthStateChange).toHaveBeenCalledOnce()
    unmount()
    expect(mocks.unsubscribe).toHaveBeenCalledOnce()
  })

  it('updates authStore when auth state callback fires', async () => {
    render(<AuthInitializer />)
    await waitFor(() => {
      expect(useAuthStore.getState().loading).toBe(false)
    })

    const newSession = {
      user: { id: 'u2', email: 'x@y.com', app_metadata: {} },
    } as unknown as Session

    act(() => {
      mocks.triggerCallback('SIGNED_IN', newSession)
    })

    expect(useAuthStore.getState().session).toBe(newSession)
  })

  it('renders nothing visible', () => {
    const { container } = render(<AuthInitializer />)
    expect(container.firstChild).toBeNull()
  })
})
