import { describe, it, expect } from 'vitest'
import { deriveConfidence } from '@/lib/predictions/ingest-helpers'

describe('deriveConfidence', () => {
  it.each([
    [75, 'high'],
    [25, 'high'],
  ] as const)('returns "high" for homeWinPct=%d (edge > 20)', (input, expected) => {
    expect(deriveConfidence(input)).toBe(expected)
  })

  it.each([
    [62, 'medium'],
    [38, 'medium'],
  ] as const)('returns "medium" for homeWinPct=%d (10 < edge <= 20)', (input, expected) => {
    expect(deriveConfidence(input)).toBe(expected)
  })

  it.each([
    [55, 'low'],
    [50, 'low'],
  ] as const)('returns "low" for homeWinPct=%d (edge <= 10)', (input, expected) => {
    expect(deriveConfidence(input)).toBe(expected)
  })

  // Boundary tests
  it('returns "high" when edge is just above 20 (70.01)', () => {
    expect(deriveConfidence(70.01)).toBe('high')
  })

  it('returns "medium" when edge is exactly 20 (70)', () => {
    expect(deriveConfidence(70)).toBe('medium')
  })

  it('returns "medium" when edge is just above 10 (60.01)', () => {
    expect(deriveConfidence(60.01)).toBe('medium')
  })

  it('returns "low" when edge is exactly 10 (60)', () => {
    expect(deriveConfidence(60)).toBe('low')
  })
})
