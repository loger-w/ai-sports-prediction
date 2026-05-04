// supabase/functions/admin-users/index.ts
// Admin-only Edge Function for listing users and updating their role tier.
// Verifies the caller's JWT carries app_metadata.role === 'admin' before
// using the service-role key to call auth.admin.* APIs.

import { createClient } from 'jsr:@supabase/supabase-js@2'

type Role = 'admin' | 'premium' | 'regular'
const ROLES: Role[] = ['admin', 'premium', 'regular']

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

function noContent(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

interface UserRow {
  id: string
  email: string | null
  role: Role
  created_at: string
  last_sign_in_at: string | null
}

function roleOf(meta: Record<string, unknown> | undefined | null): Role {
  const r = meta?.role
  if (r === 'admin' || r === 'premium' || r === 'regular') return r
  return 'regular'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'function misconfigured' }, { status: 500 })
  }

  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  if (!token) return json({ error: 'missing token' }, { status: 401 })

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: caller, error: callerErr } = await admin.auth.getUser(token)
  if (callerErr || !caller.user) {
    return json({ error: 'invalid token' }, { status: 401 })
  }
  if (roleOf(caller.user.app_metadata as Record<string, unknown>) !== 'admin') {
    return json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const segments = url.pathname.split('/').filter(Boolean)
  // Routes:
  //  GET  /admin-users           → list
  //  PATCH /admin-users/:id      → update role
  const tail = segments[segments.length - 1]
  const isRoot = tail === 'admin-users'

  if (req.method === 'GET' && isRoot) {
    const q = (url.searchParams.get('q') ?? '').toLowerCase().trim()
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
    const perPage = Math.min(
      200,
      Math.max(10, parseInt(url.searchParams.get('perPage') ?? '50', 10)),
    )

    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) return json({ error: error.message }, { status: 500 })

    const rows: UserRow[] = data.users
      .filter((u) => !q || (u.email ?? '').toLowerCase().includes(q))
      .map((u) => ({
        id: u.id,
        email: u.email ?? null,
        role: roleOf(u.app_metadata as Record<string, unknown>),
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      }))

    return json({ users: rows, page, perPage })
  }

  if (req.method === 'PATCH' && !isRoot && segments[segments.length - 2] === 'admin-users') {
    const id = tail
    let body: { role?: unknown } = {}
    try {
      body = await req.json()
    } catch {
      return json({ error: 'invalid json' }, { status: 400 })
    }
    const role = body.role
    if (typeof role !== 'string' || !ROLES.includes(role as Role)) {
      return json({ error: 'invalid role' }, { status: 400 })
    }

    const { error } = await admin.auth.admin.updateUserById(id, {
      app_metadata: { role },
    })
    if (error) return json({ error: error.message }, { status: 500 })

    return noContent()
  }

  return json({ error: 'not found' }, { status: 404 })
})
