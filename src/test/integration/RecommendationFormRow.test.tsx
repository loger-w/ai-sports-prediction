import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { RecommendationFormRow, type RecFormValue } from '@/components/admin/RecommendationFormRow'

const ML: RecFormValue = { market: 'ml', pick: 'home', line: null, stars: 3, audience: 'all' }
const SPREAD: RecFormValue = { market: 'spread', pick: 'home', line: -1.5, stars: 2, audience: 'all' }
const OU: RecFormValue = { market: 'ou', pick: 'over', line: 8.5, stars: 4, audience: 'all' }

describe('RecommendationFormRow (layout B)', () => {
  it('renders 3 market segments with the current market active', () => {
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '盤口' })
    const segs = within(group).getAllByRole('radio')
    expect(segs.map((s) => s.textContent)).toEqual(['ML', '讓分', '大小分'])
    expect(segs[0]).toHaveAttribute('aria-checked', 'true')
    expect(segs[1]).toHaveAttribute('aria-checked', 'false')
    expect(segs[2]).toHaveAttribute('aria-checked', 'false')
  })

  it('clicking an inactive market segment changes market and resets pick + line', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '盤口' })
    fireEvent.click(within(group).getByRole('radio', { name: '大小分' }))
    expect(onChange).toHaveBeenCalledWith({
      market: 'ou',
      pick: 'over',
      line: 0,
      stars: 3,
      audience: 'all',
    })
  })

  it('clicking the already-active market segment does not call onChange', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '盤口' })
    fireEvent.click(within(group).getByRole('radio', { name: 'ML' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('marketsTaken disables those segments (and ignores clicks)', () => {
    const onChange = vi.fn()
    render(
      <RecommendationFormRow
        value={ML}
        onChange={onChange}
        onRemove={vi.fn()}
        marketsTaken={['spread', 'ou']}
      />,
    )
    const group = screen.getByRole('radiogroup', { name: '盤口' })
    expect(within(group).getByRole('radio', { name: '讓分' })).toHaveAttribute('aria-disabled', 'true')
    expect(within(group).getByRole('radio', { name: '大小分' })).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(within(group).getByRole('radio', { name: '讓分' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('pick segments for ml are 客 (away) on the LEFT, 主 (home) on the RIGHT', () => {
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '選邊' })
    const segs = within(group).getAllByRole('radio')
    expect(segs.map((s) => s.textContent)).toEqual(['客', '主'])
    // pick === 'home' → 主 segment active
    expect(segs[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('pick segments for spread match ml order (客 / 主)', () => {
    render(<RecommendationFormRow value={SPREAD} onChange={vi.fn()} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '選邊' })
    const segs = within(group).getAllByRole('radio')
    expect(segs.map((s) => s.textContent)).toEqual(['客', '主'])
  })

  it('pick segments for ou are 大 / 小', () => {
    render(<RecommendationFormRow value={OU} onChange={vi.fn()} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '選邊' })
    const segs = within(group).getAllByRole('radio')
    expect(segs.map((s) => s.textContent)).toEqual(['大', '小'])
  })

  it('clicking a pick segment fires onChange with new pick (other fields unchanged)', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '選邊' })
    fireEvent.click(within(group).getByRole('radio', { name: '客' }))
    expect(onChange).toHaveBeenCalledWith({ ...ML, pick: 'away' })
  })

  it('clicking the already-active pick segment does not call onChange', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    // ML.pick = 'home' → 主 segment is active
    const group = screen.getByRole('radiogroup', { name: '選邊' })
    fireEvent.click(within(group).getByRole('radio', { name: '主' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('line input hidden for ml market', () => {
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.queryByLabelText('讓分')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('盤線')).not.toBeInTheDocument()
  })

  it('line input is labeled "讓分" for spread', () => {
    render(<RecommendationFormRow value={SPREAD} onChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByLabelText('讓分')).toHaveValue(-1.5)
  })

  it('line input is labeled "盤線" for ou', () => {
    render(<RecommendationFormRow value={OU} onChange={vi.fn()} onRemove={vi.fn()} />)
    expect(screen.getByLabelText('盤線')).toHaveValue(8.5)
  })

  it('star rating renders 5 buttons', () => {
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '星等' })
    const stars = within(group).getAllByRole('radio')
    expect(stars).toHaveLength(5)
  })

  it('clicking the 4th star fires onChange with stars=4', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    const group = screen.getByRole('radiogroup', { name: '星等' })
    fireEvent.click(within(group).getByRole('radio', { name: '4 星' }))
    expect(onChange).toHaveBeenCalledWith({ ...ML, stars: 4 })
  })

  it('audience toggle reuses AudienceToggle and changes audience on click', () => {
    const onChange = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={onChange} onRemove={vi.fn()} />)
    const group = screen.getByRole('group', { name: '受眾' })
    fireEvent.click(within(group).getByRole('button', { name: 'Premium' }))
    expect(onChange).toHaveBeenCalledWith({ ...ML, audience: 'premium' })
  })

  it('clicking remove fires onRemove', () => {
    const onRemove = vi.fn()
    render(<RecommendationFormRow value={ML} onChange={vi.fn()} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: /移除/ }))
    expect(onRemove).toHaveBeenCalledOnce()
  })
})
