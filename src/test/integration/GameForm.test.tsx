import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { GameForm, type GameFormValue } from '@/components/admin/GameForm'
import type { TeamRow } from '@/types/predictions/recommendation'

const TEAMS: TeamRow[] = [
  { id: 'lad', sport_id: 'mlb', name_zh: '道奇', abbreviation: 'LAD', logo_url: null, external_id: 119 },
  { id: 'sd',  sport_id: 'mlb', name_zh: '教士', abbreviation: 'SD',  logo_url: null, external_id: 135 },
  { id: 'nyy', sport_id: 'mlb', name_zh: '洋基', abbreviation: 'NYY', logo_url: null, external_id: 147 },
]

const BASE: GameFormValue = {
  sport_id: 'mlb',
  home_team_id: 'lad',
  away_team_id: 'sd',
  game_date: '2026-05-04',
  game_time: '2026-05-04 19:00:00',
  status: 'scheduled',
}

describe('GameForm', () => {
  it('renders home/away/date/time/status fields with current values', () => {
    render(<GameForm value={BASE} onChange={vi.fn()} teams={TEAMS} />)
    expect(screen.getByLabelText('主隊')).toHaveValue('lad')
    expect(screen.getByLabelText('客隊')).toHaveValue('sd')
    expect(screen.getByLabelText('日期')).toHaveValue('2026-05-04')
    expect(screen.getByLabelText('時間')).toHaveValue('19:00')
    expect(screen.getByLabelText('狀態')).toHaveValue('scheduled')
  })

  it('home select lists every provided team', () => {
    render(<GameForm value={BASE} onChange={vi.fn()} teams={TEAMS} />)
    const home = screen.getByLabelText('主隊') as HTMLSelectElement
    const opts = Array.from(home.options).map((o) => o.value)
    expect(opts).toEqual(['lad', 'sd', 'nyy'])
  })

  it('changing home team fires onChange with new home_team_id', () => {
    const onChange = vi.fn()
    render(<GameForm value={BASE} onChange={onChange} teams={TEAMS} />)
    fireEvent.change(screen.getByLabelText('主隊'), { target: { value: 'nyy' } })
    expect(onChange).toHaveBeenCalledWith({ ...BASE, home_team_id: 'nyy' })
  })

  it('changing time updates game_time to "YYYY-MM-DD HH:mm:00"', () => {
    const onChange = vi.fn()
    render(<GameForm value={BASE} onChange={onChange} teams={TEAMS} />)
    fireEvent.change(screen.getByLabelText('時間'), { target: { value: '20:30' } })
    expect(onChange).toHaveBeenCalledWith({
      ...BASE,
      game_time: '2026-05-04 20:30:00',
    })
  })

  it('changing date updates both game_date and the date portion of game_time', () => {
    const onChange = vi.fn()
    render(<GameForm value={BASE} onChange={onChange} teams={TEAMS} />)
    fireEvent.change(screen.getByLabelText('日期'), { target: { value: '2026-06-01' } })
    expect(onChange).toHaveBeenCalledWith({
      ...BASE,
      game_date: '2026-06-01',
      game_time: '2026-06-01 19:00:00',
    })
  })

  it('changing status fires onChange', () => {
    const onChange = vi.fn()
    render(<GameForm value={BASE} onChange={onChange} teams={TEAMS} />)
    fireEvent.change(screen.getByLabelText('狀態'), { target: { value: 'final' } })
    expect(onChange).toHaveBeenCalledWith({ ...BASE, status: 'final' })
  })
})
