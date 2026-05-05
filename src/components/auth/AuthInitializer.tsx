import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth/authStore'
import { queryClient } from '@/lib/queryClient'

export function AuthInitializer() {
  useEffect(() => {
    const setSession = useAuthStore.getState().setSession

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      // RLS-gated views (e.g. recommendations_public) return different rows
      // depending on auth.jwt(). React Query caches don't know about JWT
      // changes, so we mark them stale on auth transitions to force a refetch.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        void queryClient.invalidateQueries()
      }
    })

    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  return null
}
