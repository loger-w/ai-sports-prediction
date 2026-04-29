import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { StarRating } from '@/components/predictions/StarRating'

describe('StarRating', () => {
  it('renders 5 star elements', () => {
    const { container } = render(<StarRating stars={3} />)
    const stars = container.querySelectorAll('[data-star]')
    expect(stars).toHaveLength(5)
  })

  it('marks first N stars as filled for stars=3', () => {
    const { container } = render(<StarRating stars={3} />)
    const filled = container.querySelectorAll('[data-star="filled"]')
    const empty = container.querySelectorAll('[data-star="empty"]')
    expect(filled).toHaveLength(3)
    expect(empty).toHaveLength(2)
  })

  it('marks all 5 as filled for stars=5', () => {
    const { container } = render(<StarRating stars={5} />)
    expect(container.querySelectorAll('[data-star="filled"]')).toHaveLength(5)
    expect(container.querySelectorAll('[data-star="empty"]')).toHaveLength(0)
  })

  it('marks only 1 as filled for stars=1', () => {
    const { container } = render(<StarRating stars={1} />)
    expect(container.querySelectorAll('[data-star="filled"]')).toHaveLength(1)
    expect(container.querySelectorAll('[data-star="empty"]')).toHaveLength(4)
  })
})
