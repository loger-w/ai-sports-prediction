import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminUsersApi, type UserRole } from '@/services/admin/users'

const FONT = { fontFamily: 'var(--font-barlow-condensed)' as const }

const FIELD =
  'w-full px-3 py-2 rounded bg-[#0d1117] border border-[#1e2733] text-[#e2e8f0] focus:outline-none focus:border-[#00e5a0]'

const ROLE_PILL: Record<UserRole, string> = {
  admin: 'bg-[rgba(0,229,160,0.15)] text-[#00e5a0] border-[rgba(0,229,160,0.40)]',
  premium: 'bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border-[rgba(251,191,36,0.35)]',
  regular: 'bg-[rgba(148,163,184,0.10)] text-[#94a3b8] border-[rgba(148,163,184,0.25)]',
}

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  premium: 'Premium',
  regular: '一般',
}

const ROLES: UserRole[] = ['admin', 'premium', 'regular']

function fmtDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function UsersList() {
  const [q, setQ] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', q],
    queryFn: () => adminUsersApi.list({ q, perPage: 100 }),
  })

  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRole }) =>
      adminUsersApi.setRole(id, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })

  const rows = useMemo(() => data?.users ?? [], [data])

  return (
    <div className="py-8 px-4" style={FONT}>
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-[#e2e8f0]">Admin · 使用者</h1>
      </header>

      <div className="mb-4">
        <label htmlFor="users-search" className="sr-only">搜尋 email</label>
        <input
          id="users-search"
          type="text"
          placeholder="🔍 搜尋 email…"
          className={FIELD}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {isLoading ? (
        <p className="text-[#94a3b8]">載入中…</p>
      ) : error ? (
        <p className="text-[#fc8181]">載入失敗：{(error as Error).message}</p>
      ) : rows.length === 0 ? (
        <p className="text-[#94a3b8]">沒有符合的使用者。</p>
      ) : (
        <div className="rounded-[10px] border border-[#1e2733] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#0d1117] border-b border-[#1e2733]">
              <tr className="text-left text-xs text-[#94a3b8] uppercase tracking-wider">
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">等級</th>
                <th className="px-4 py-3">註冊</th>
                <th className="px-4 py-3">最近登入</th>
              </tr>
            </thead>
            <tbody className="bg-[#161b22]">
              {rows.map((u) => {
                const pillClass = ROLE_PILL[u.role]
                const isPending = setRole.isPending && setRole.variables?.id === u.id
                return (
                  <tr
                    key={u.id}
                    className="border-b border-[#1e2733] last:border-0 text-[#e2e8f0]"
                  >
                    <td className="px-4 py-3 text-sm font-bold truncate max-w-[260px]">
                      {u.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <label className="sr-only" htmlFor={`role-${u.id}`}>等級</label>
                      <select
                        id={`role-${u.id}`}
                        aria-label={`${u.email ?? u.id} 的等級`}
                        disabled={isPending}
                        className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider border ${pillClass} cursor-pointer disabled:opacity-60`}
                        value={u.role}
                        onChange={(e) =>
                          setRole.mutate({ id: u.id, role: e.target.value as UserRole })
                        }
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} className="bg-[#0d1117] text-[#e2e8f0]">
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#94a3b8]">
                      {fmtDate(u.created_at)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#94a3b8]">
                      {fmtDate(u.last_sign_in_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {setRole.isError ? (
        <p className="mt-3 text-sm text-[#fc8181]">
          更新失敗：{(setRole.error as Error).message}
        </p>
      ) : null}
    </div>
  )
}
