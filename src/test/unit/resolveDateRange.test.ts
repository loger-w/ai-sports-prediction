import { describe, it, expect, vi, afterEach } from 'vitest'
import dayjs from 'dayjs'

// Mock the supabase import so the module can load without env vars
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

// Must import after mock is set up
const { resolveDateRange } = await import('@/services/predictions/api')

describe('resolveDateRange', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns today for "today"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12'))
    const result = resolveDateRange('today')
    expect(result).toEqual({ from: '2026-04-12', to: '2026-04-12' })
  })

  it('returns tomorrow for "tomorrow"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12'))
    const result = resolveDateRange('tomorrow')
    expect(result).toEqual({ from: '2026-04-13', to: '2026-04-13' })
  })

  it('returns today to end of week for "week"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-12')) // Sunday
    const result = resolveDateRange('week')
    expect(result.from).toBe('2026-04-12')
    // End of week depends on dayjs locale, just verify it's a valid date after from
    expect(dayjs(result.to).isAfter(dayjs(result.from).subtract(1, 'day'))).toBe(true)
  })

  it('returns the date itself for a specific date string', () => {
    const result = resolveDateRange('2026-04-15')
    expect(result).toEqual({ from: '2026-04-15', to: '2026-04-15' })
  })
})
