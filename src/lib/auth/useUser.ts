import { useAuthStore } from '@/stores/auth/authStore'

interface UseUserResult {
  user: ReturnType<typeof useAuthStore.getState>['user']
  role: string | null
  isAdmin: boolean
  loading: boolean
}

export function useUser(): UseUserResult {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const role =
    (user?.app_metadata as { role?: unknown } | undefined)?.role
  const roleStr = typeof role === 'string' ? role : null

  return {
    user,
    role: roleStr,
    isAdmin: roleStr === 'admin',
    loading,
  }
}
