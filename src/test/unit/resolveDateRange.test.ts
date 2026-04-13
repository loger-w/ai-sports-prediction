import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))

const { resolveDateRange } = await import('@/services/predictions/api')

describe('resolveDateRange', () => {
  it('returns the date itself for a YYYY-MM-DD string', () => {
    const result = resolveDateRange('2026-04-15')
    expect(result).toEqual({ from: '2026-04-15', to: '2026-04-15' })
  })
})
