import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { makeAdminUsersApi } from '@/services/admin/users'

function makeClient(token: string | null): SupabaseClient {
  return {
    supabaseUrl: 'https://example.supabase.co',
    auth: {
      getSession: () =>
        Promise.resolve({
          data: {
            session: token ? { access_token: token } : null,
          },
          error: null,
        }),
    },
  } as unknown as SupabaseClient
}

describe('makeAdminUsersApi', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  it('list calls Edge Function with bearer token and parsed query', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ users: [{ id: 'u1', email: 'a@b', role: 'regular', created_at: '', last_sign_in_at: null }], page: 2, perPage: 50 }),
        { status: 200 },
      ),
    )

    const api = makeAdminUsersApi(makeClient('tok'))
    const result = await api.list({ q: 'al', page: 2, perPage: 50 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.supabase.co/functions/v1/admin-users?q=al&page=2&perPage=50')
    expect(init.headers).toMatchObject({ Authorization: 'Bearer tok' })
    expect(result.users).toHaveLength(1)
    expect(result.users[0]!.id).toBe('u1')
  })

  it('list throws on non-200', async () => {
    fetchMock.mockResolvedValueOnce(new Response('forbidden', { status: 403 }))
    const api = makeAdminUsersApi(makeClient('tok'))
    await expect(api.list()).rejects.toThrow(/403/)
  })

  it('setRole sends PATCH with JSON body and returns null error on 204', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const api = makeAdminUsersApi(makeClient('tok'))
    const result = await api.setRole('u1', 'premium')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.supabase.co/functions/v1/admin-users/u1')
    expect(init.method).toBe('PATCH')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer tok',
      'Content-Type': 'application/json',
    })
    expect(JSON.parse(init.body as string)).toEqual({ role: 'premium' })
    expect(result.error).toBeNull()
  })

  it('setRole returns server error message on non-204', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'invalid role' }), { status: 400 }),
    )
    const api = makeAdminUsersApi(makeClient('tok'))
    const result = await api.setRole('u1', 'admin')
    expect(result.error?.message).toBe('invalid role')
  })

  it('omits Authorization header when no session token', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ users: [], page: 1, perPage: 50 }), { status: 200 }),
    )
    const api = makeAdminUsersApi(makeClient(null))
    await api.list()
    const [, init] = fetchMock.mock.calls[0]
    expect(init.headers).not.toHaveProperty('Authorization')
  })
})
