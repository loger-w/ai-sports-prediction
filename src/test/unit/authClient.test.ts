import { describe, expect, it, vi } from 'vitest'
import { makeAuthClient } from '@/lib/auth/client'

function stubSupabase() {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }
}

const REDIRECT = 'http://localhost:3001/auth/callback'

describe('makeAuthClient', () => {
  it('signInWithEmail calls supabase.auth.signInWithPassword with email + password', async () => {
    const supabase = stubSupabase()
    const client = makeAuthClient(supabase as never, REDIRECT)
    await client.signInWithEmail('user@example.com', 'pw123')
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'pw123',
    })
  })

  it('signUpWithEmail forwards email/password and sets emailRedirectTo', async () => {
    const supabase = stubSupabase()
    const client = makeAuthClient(supabase as never, REDIRECT)
    await client.signUpWithEmail('new@example.com', 'newpw')
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'newpw',
      options: { emailRedirectTo: REDIRECT },
    })
  })

  it('signInWithGoogle uses provider=google and sets redirectTo', async () => {
    const supabase = stubSupabase()
    const client = makeAuthClient(supabase as never, REDIRECT)
    await client.signInWithGoogle()
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: REDIRECT },
    })
  })

  it('signOut calls supabase.auth.signOut', async () => {
    const supabase = stubSupabase()
    const client = makeAuthClient(supabase as never, REDIRECT)
    await client.signOut()
    expect(supabase.auth.signOut).toHaveBeenCalledOnce()
  })

  it('returns the supabase response from each call', async () => {
    const supabase = stubSupabase()
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    const client = makeAuthClient(supabase as never, REDIRECT)
    const result = await client.signInWithEmail('a@b.com', 'pw')
    expect(result).toEqual({ data: { user: { id: 'u1' } }, error: null })
  })
})
