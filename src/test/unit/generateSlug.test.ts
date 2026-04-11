import { describe, it, expect } from 'vitest'
import { generateSlug } from '@/lib/predictions/ingest-helpers'

describe('generateSlug', () => {
  it('generates slug in "home-vs-away-date" format', () => {
    expect(generateSlug('lakers', 'celtics', '2026-04-12')).toBe('lakers-vs-celtics-2026-04-12')
  })

  it('works with different team ids and dates', () => {
    expect(generateSlug('warriors', 'heat', '2026-01-01')).toBe('warriors-vs-heat-2026-01-01')
  })
})
