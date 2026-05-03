import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseAuth = SupabaseClient['auth']

export interface AuthClient {
  signInWithEmail: (email: string, password: string) => ReturnType<SupabaseAuth['signInWithPassword']>
  signUpWithEmail: (email: string, password: string) => ReturnType<SupabaseAuth['signUp']>
  signInWithGoogle: () => ReturnType<SupabaseAuth['signInWithOAuth']>
  signOut: () => ReturnType<SupabaseAuth['signOut']>
}

export function makeAuthClient(supabase: SupabaseClient, redirectTo: string): AuthClient {
  return {
    signInWithEmail: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signUpWithEmail: (email, password) =>
      supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      }),
    signInWithGoogle: () =>
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      }),
    signOut: () => supabase.auth.signOut(),
  }
}
