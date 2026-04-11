import { describe, it, expect, vi } from 'vitest'

// Mock the supabase import so the module can load without env vars
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

const { pct } = await import('@/services/predictions/api')

describe('pct', () => {
  it('calculates 1/3 as 33.3', () => {
    expect(pct(1, 3)).toBe(33.3)
  })

  it('calculates 2/3 as 66.7', () => {
    expect(pct(2, 3)).toBe(66.7)
  })

  it('calculates 0/5 as 0', () => {
    expect(pct(0, 5)).toBe(0)
  })

  it('calculates 5/5 as 100', () => {
    expect(pct(5, 5)).toBe(100)
  })

  it('returns 0 when total is 0 (division by zero guard)', () => {
    expect(pct(0, 0)).toBe(0)
  })
})
