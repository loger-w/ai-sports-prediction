import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('dayjs/plugin/timezone', () => ({
  default: () => {},
}))
vi.mock('dayjs/plugin/utc', () => ({
  default: () => {},
}))

const { getUserTimezone, toLocalTimeString, toLocalDateString, localToday } =
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
})
