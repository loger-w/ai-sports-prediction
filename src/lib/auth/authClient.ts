import { supabase } from '@/lib/supabase'
import { makeAuthClient } from '@/lib/auth/client'

const REDIRECT =
  typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : 'http://localhost:3001/auth/callback'

export const authClient = makeAuthClient(supabase, REDIRECT)
