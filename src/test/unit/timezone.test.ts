import { describe, it, expect, vi, afterEach } from 'vitest'

// Import after setup (no mocks needed - dayjs plugins work in jsdom)
const { getUserTimezone, toLocalTimeString, toLocalDateString, localToday, toLocalDisplayDateTime } =
  await import('@/lib/timezone')

describe('timezone utilities', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getUserTimezone returns a non-empty string', () => {
    const tz = getUserTimezone()
    expect(typeof tz).toBe('string')
    expect(tz.length).toBeGreaterThan(0)
  })

  it('localToday returns YYYY-MM-DD format', () => {
    const today = localToday()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('toLocalTimeString formats UTC timestamp to time string', () => {
    const result = toLocalTimeString('2026-04-12T02:30:00Z')
    expect(result).toMatch(/^\d{2}:\d{2}$/)
  })

  it('toLocalTimeString returns null for null input', () => {
    expect(toLocalTimeString(null)).toBeNull()
  })

  it('toLocalDateString formats UTC timestamp to date string', () => {
    const result = toLocalDateString('2026-04-12T02:30:00Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('toLocalDisplayDateTime formats UTC timestamp for display', () => {
    const result = toLocalDisplayDateTime('2026-04-12T02:30:00Z')
    // Should be non-null and contain a date-like string
    expect(result).not.toBeNull()
    expect(result).toMatch(/\w+ \d+, \d{4} · \d{2}:\d{2}/)
  })

  it('toLocalDisplayDateTime returns null for null input', () => {
    expect(toLocalDisplayDateTime(null)).toBeNull()
  })
})
