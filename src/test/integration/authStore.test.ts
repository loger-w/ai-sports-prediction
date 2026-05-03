import { describe, expect, it } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { useAuthStore } from '@/stores/auth/authStore'

describe('authStore', () => {
  it('initial state: session=null, user=null, loading=true', () => {
    const state = useAuthStore.getState()
    expect(state.session).toBeNull()
    expect(state.user).toBeNull()
    expect(state.loading).toBe(true)
  })

  it('setSession with a session populates user and clears loading', () => {
    const fakeSession = { user: { id: 'u1', email: 'a@b.com' } } as unknown as Session
    useAuthStore.getState().setSession(fakeSession)
    const state = useAuthStore.getState()
    expect(state.session).toBe(fakeSession)
    expect(state.user).toBe(fakeSession.user)
    expect(state.loading).toBe(false)
  })

  it('setSession with null clears session and user but loading stays false', () => {
    useAuthStore.getState().setSession({ user: { id: 'u1' } } as unknown as Session)
    useAuthStore.getState().setSession(null)
    const state = useAuthStore.getState()
    expect(state.session).toBeNull()
    expect(state.user).toBeNull()
    expect(state.loading).toBe(false)
  })

  it('setLoading toggles the loading flag', () => {
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().loading).toBe(false)
    useAuthStore.getState().setLoading(true)
    expect(useAuthStore.getState().loading).toBe(true)
  })
})
