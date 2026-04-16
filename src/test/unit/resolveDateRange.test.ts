import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const { resolveDateRange } = await import('@/services/predictions/api')

describe('resolveDateRange', () => {
  it('expands the date ±1 day to cover timezone boundaries', () => {
    const result = resolveDateRange('2026-04-15')
    expect(result).toEqual({ from: '2026-04-14', to: '2026-04-16' })
  })
})
