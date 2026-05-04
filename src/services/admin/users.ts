// src/services/admin/users.ts
// Client wrapper around the admin-users Edge Function. Caller's JWT is attached
// automatically; server enforces app_metadata.role === 'admin'.

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type UserRole = 'admin' | 'premium' | 'regular'

export interface AdminUserRow {
  id: string
  email: string | null
  role: UserRole
  created_at: string
  last_sign_in_at: string | null
}

export interface ListUsersResult {
  users: AdminUserRow[]
  page: number
  perPage: number
}

export interface AdminUsersApi {
  list(opts?: { q?: string; page?: number; perPage?: number }): Promise<ListUsersResult>
  setRole(id: string, role: UserRole): Promise<{ error: { message: string } | null }>
}

export function makeAdminUsersApi(client: SupabaseClient): AdminUsersApi {
  async function authHeader(): Promise<HeadersInit> {
    const { data } = await client.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  function functionsBase(): string {
    const url = (client as unknown as { supabaseUrl: string }).supabaseUrl
    return `${url}/functions/v1`
  }

  async function list(
    opts: { q?: string; page?: number; perPage?: number } = {},
  ): Promise<ListUsersResult> {
    const params = new URLSearchParams()
    if (opts.q) params.set('q', opts.q)
    if (opts.page) params.set('page', String(opts.page))
    if (opts.perPage) params.set('perPage', String(opts.perPage))

    const headers = await authHeader()
    const res = await fetch(`${functionsBase()}/admin-users?${params.toString()}`, {
      headers,
    })
    if (!res.ok) throw new Error(`admin-users list failed: ${res.status}`)
    return (await res.json()) as ListUsersResult
  }

  async function setRole(id: string, role: UserRole) {
    const headers = await authHeader()
    const res = await fetch(`${functionsBase()}/admin-users/${id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.status === 204) return { error: null }
    let message = `admin-users PATCH failed: ${res.status}`
    try {
      const body = await res.json()
      if (body && typeof body.error === 'string') message = body.error
    } catch {
      // ignore json parse errors
    }
    return { error: { message } }
  }

  return { list, setRole }
}

export const adminUsersApi = makeAdminUsersApi(supabase)
