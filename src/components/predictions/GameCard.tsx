import dayjs from 'dayjs'
import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { toLocalDateString, toLocalTimeString } from '@/lib/timezone'
import type { GameWithPrediction } from '@/services/predictions/api'
import { PredictionColumn } from './PredictionColumn'

interface GameCardProps {
  game: GameWithPrediction
}

export function GameCard({ game }: GameCardProps) {
  const { t, lang } = useTranslation()
  const prediction = game.predictions[0]

  if (!prediction) return null

  const homeTeam = game.home_team
  const awayTeam = game.away_team
  const homeWins = prediction.moneyline_pick === 'home'

  const homeName = lang === 'zh' ? homeTeam.name_zh : homeTeam.name_en
  const awayName = lang === 'zh' ? awayTeam.name_zh : awayTeam.name_en

  const localTime = toLocalTimeString(game.game_time)
  const gameDate = game.game_time
    ? dayjs(toLocalDateString(game.game_time)).format('MMM D')
    : game.game_date

  // Moneyline pick text
  const moneylinePick = homeWins ? homeTeam.abbreviation : awayTeam.abbreviation

  // Spread pick text: e.g. "LAL -3.5"
  let spreadPick = ''
  if (prediction.spread_line !== null && prediction.spread_pick !== null) {
    const isSpreaderHome = prediction.spread_pick === 'home'
    const abbr = isSpreaderHome ? homeTeam.abbreviation : awayTeam.abbreviation
    const line = prediction.spread_line
    spreadPick = `${abbr} ${line > 0 ? '+' : ''}${line}`
  }

  // O/U pick text: e.g. "O 218.5" or "U 218.5"
  let ouPick = ''
  let ouLineRef: string | null = null
  if (prediction.over_under_line !== null) {
    ouLineRef = String(prediction.over_under_line)
    const isOver = (prediction.over_pct ?? 0) >= (prediction.under_pct ?? 0)
    ouPick = `${isOver ? 'O' : 'U'} ${prediction.over_under_line}`
  }

  return (
    <div
      className={cn(
        'rounded-[10px] border overflow-hidden',
        'bg-[#161b22] border-[#1e2733]',
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d1117] border-b border-[#1e2733]">
        <span
          className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#00e5a0]"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {game.sport_id.toUpperCase()}
        </span>
        {localTime && (
          <span
            className="text-[10px] text-[#3a4a5a]"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {localTime}
          </span>
        )}
        <span
          className="text-[10px] text-[#3a4a5a]"
          style={{ fontFamily: 'var(--font-barlow-condensed)' }}
        >
          {gameDate}
        </span>
      </div>

      {/* Teams */}
      <div className="px-4 pt-3.5 pb-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="min-w-0">
            <div
              className="text-[32px] font-black leading-none mb-1"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                color: homeWins ? '#e2e8f0' : '#2d3748',
              }}
            >
              {homeTeam.abbreviation}
            </div>
            <div
              className="text-[10px] uppercase tracking-widest text-[#3a4a5a] truncate"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              {homeName}
            </div>
          </div>

          <div
            className="text-[13px] font-bold text-[#2d3748] shrink-0"
            style={{ fontFamily: 'var(--font-barlow-condensed)' }}
          >
            {t.predictions.vs}
          </div>

          <div className="text-right min-w-0">
            <div
              className="text-[32px] font-black leading-none mb-1"
              style={{
                fontFamily: 'var(--font-barlow-condensed)',
                color: !homeWins ? '#e2e8f0' : '#2d3748',
              }}
            >
              {awayTeam.abbreviation}
            </div>
            <div
              className="text-[10px] uppercase tracking-widest text-[#3a4a5a] truncate"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              {awayName}
            </div>
          </div>
        </div>
      </div>

      {/* Three prediction columns */}
      <div className="grid grid-cols-3 border-t border-[#1e2733]">
        <PredictionColumn
          label={t.predictions.moneyline}
          stars={prediction.moneyline_stars}
          pick={moneylinePick}
          pct={prediction.moneyline_home_pct > prediction.moneyline_away_pct
            ? prediction.moneyline_home_pct
            : prediction.moneyline_away_pct}
          lineRef={null}
        />
        <PredictionColumn
          label={t.predictions.spread}
          stars={prediction.spread_stars}
          pick={spreadPick}
          pct={prediction.spread_pct}
          lineRef={prediction.spread_line !== null ? String(prediction.spread_line) : null}
        />
        <PredictionColumn
          label={t.predictions.overUnder}
          stars={prediction.over_under_stars}
          pick={ouPick}
          pct={(prediction.over_pct ?? 0) >= (prediction.under_pct ?? 0)
            ? prediction.over_pct
            : prediction.under_pct}
          lineRef={ouLineRef}
          isLast
        />
      </div>

      {/* Card footer */}
      <Link
        to="/$lang/$sport/$slug"
        params={{ lang, sport: game.sport_id, slug: game.slug }}
        className="flex items-center justify-end px-4 py-2 border-t border-[#1e2733] text-[10px] font-bold tracking-wide text-[#3a4a5a] hover:text-[#00e5a0] transition-colors"
        style={{ fontFamily: 'var(--font-barlow-condensed)' }}
      >
        {t.gameDetail.viewDetail}
      </Link>
    </div>
  )
}
