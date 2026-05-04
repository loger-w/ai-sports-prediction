import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RecommendationFormRow, type RecFormValue } from '@/components/admin/RecommendationFormRow'

const ML: RecFormValue = { market: 'ml', pick: 'home', line: null, stars: 3, audience: 'all' }
const SPREAD: RecFormValue = { market: 'spread', pick: 'home', line: -1.5, stars: 2, audience: 'all' }
const OU: RecFormValue = { market: 'ou', pick: 'over', line: 8.5, stars: 4, audience: 'all' }

describe('RecommendationFormRow', () => {
  it('renders market / pick / line / stars selects', () => {
    render(<RecommendationFormRow value={SPREAD} onChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByLabelText('盤口')).toHaveValue('spread')
    expect(screen.getByLabelText('選邊')).toHaveValue('home')
    expect(screen.getByLabelText('讓分')).toHaveValue(-1.5)
    expect(screen.getByLabelText('星等')).toHaveValue('2')
  })

  it('pick options for ml/spread are home + away', () => {
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={vi.fn()} />)
    const pick = screen.getByLabelText('選邊') as HTMLSelectElement
    const opts = Array.from(pick.options).map((o) => o.value)
    expect(opts).toEqual(['home', 'away'])
  })

  it('pick options for ou are over + under', () => {
    render(<RecommendationFormRow value={OU} onChange={vi.fn()} onRemove={vi.fn()} />)
    const pick = screen.getByLabelText('選邊') as HTMLSelectElement
    const opts = Array.from(pick.options).map((o) => o.value)
    expect(opts).toEqual(['over', 'under'])
  })

  it('line is hidden for ml market', () => {
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.queryByLabelText('讓分')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('盤線')).not.toBeInTheDocument()
  })

  it('line is required and labeled "盤線" for ou market', () => {
    render(<RecommendationFormRow value={OU} onChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByLabelText('盤線')).toHaveValue(8.5)
  })

  it('changing market resets pick + line to sensible defaults', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('盤口'), { target: { value: 'ou' } })
    expect(onChange).toHaveBeenCalledWith({
      market: 'ou',
      pick: 'over',
      line: 0,
      stars: 3,
      audience: 'all',
    })
  })

  it('clicking remove fires onRemove', () => {
    const onRemove = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: /移除/ }))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})
