import { afterEach, describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/auth/authStore'
import { useUser } from '@/lib/auth/useUser'

describe('useUser', () => {
  afterEach(() => {
    act(() => {
      useAuthStore.setState({ session: null, user: null, loading: true })
    })
  })

  it('returns null user and isAdmin=false when no session', () => {
    useAuthStore.setState({ session: null, user: null, loading: false })
    const { result } = renderHook(() => useUser())
    expect(result.current.user).toBeNull()
    expect(result.current.role).toBeNull()
    expect(result.current.isAdmin).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('returns the user when a session is set', () => {
    const session = {
      user: { id: 'u1', email: 'a@b.com', app_metadata: {} },
    } as unknown as Session
    act(() => {
      useAuthStore.getState().setSession(session)
    })
    const { result } = renderHook(() => useUser())
    expect(result.current.user).toBe(session.user)
  })

  it('isAdmin=true when app_metadata.role is "admin"', () => {
    const session = {
      user: { id: 'u1', app_metadata: { role: 'admin' } },
    } as unknown as Session
    act(() => {
      useAuthStore.getState().setSession(session)
    })
    const { result } = renderHook(() => useUser())
    expect(result.current.role).toBe('admin')
    expect(result.current.isAdmin).toBe(true)
  })

  it('isAdmin=false when app_metadata.role is missing', () => {
    const session = {
      user: { id: 'u1', app_metadata: {} },
    } as unknown as Session
    act(() => {
      useAuthStore.getState().setSession(session)
    })
    const { result } = renderHook(() => useUser())
    expect(result.current.role).toBeNull()
    expect(result.current.isAdmin).toBe(false)
  })

  it('isAdmin=false when app_metadata.role is some non-admin string', () => {
    const session = {
      user: { id: 'u1', app_metadata: { role: 'editor' } },
    } as unknown as Session
    act(() => {
      useAuthStore.getState().setSession(session)
    })
    const { result } = renderHook(() => useUser())
    expect(result.current.role).toBe('editor')
    expect(result.current.isAdmin).toBe(false)
  })
})
