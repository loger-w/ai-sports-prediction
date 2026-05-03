import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const TW_TZ = 'Asia/Taipei'
const STATSAPI_BASE = 'https://statsapi.mlb.com/api/v1'

export interface MlbScheduleGame {
  external_game_id: number
  game_time_utc: string
  game_time_tw: string
  game_date_tw: string
  home_team_external_id: number
  away_team_external_id: number
  home_team_name: string
  away_team_name: string
  status: string
}

interface StatsapiTeam {
  id: number
  name: string
}

interface StatsapiGame {
  gamePk: number
  gameDate: string
  status?: { detailedState?: string }
  teams: {
    home: { team: StatsapiTeam }
    away: { team: StatsapiTeam }
  }
}

interface StatsapiSchedule {
  dates: { date: string; games: StatsapiGame[] }[]
}

/**
 * Fetches MLB games whose Taiwan-local date equals `twDate`.
 *
 * Implementation: queries statsapi for ET (twDate-1 day) through twDate
 * to cover the typical ET-evening → TW-morning offset, then filters
 * client-side by Taiwan date.
 */
export async function fetchMlbScheduleByTaiwanDate(
  twDate: string,
): Promise<MlbScheduleGame[]> {
  const startEt = dayjs(twDate).subtract(1, 'day').format('YYYY-MM-DD')
  const endEt = twDate
  const url = `${STATSAPI_BASE}/schedule?sportId=1&startDate=${startEt}&endDate=${endEt}`

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`MLB API error: ${res.status} ${res.statusText}`)
  }
  const json = (await res.json()) as StatsapiSchedule

  const games: MlbScheduleGame[] = []
  for (const date of json.dates ?? []) {
    for (const g of date.games ?? []) {
      const tw = dayjs.utc(g.gameDate).tz(TW_TZ)
      const gameDateTw = tw.format('YYYY-MM-DD')
      if (gameDateTw !== twDate) continue
      games.push({
        external_game_id: g.gamePk,
        game_time_utc: g.gameDate,
        game_time_tw: tw.format('YYYY-MM-DD HH:mm:ss'),
        game_date_tw: gameDateTw,
        home_team_external_id: g.teams.home.team.id,
        away_team_external_id: g.teams.away.team.id,
        home_team_name: g.teams.home.team.name,
        away_team_name: g.teams.away.team.name,
        status: g.status?.detailedState ?? 'Scheduled',
      })
    }
  }
  games.sort((a, b) => a.game_time_utc.localeCompare(b.game_time_utc))
  return games
}
