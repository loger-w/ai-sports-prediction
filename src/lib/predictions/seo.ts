import type { GameWithPrediction } from '@/services/predictions/api'

export function buildSportsEventSchema(game: GameWithPrediction) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${game.away_team.name_en} at ${game.home_team.name_en}`,
    startDate: game.game_time ?? game.game_date,
    sport: game.sport_id === 'nba' ? 'Basketball' : 'Baseball',
    location: {
      '@type': 'Place',
      name: `${game.home_team.name_en} Home`,
    },
    homeTeam: {
      '@type': 'SportsTeam',
      name: game.home_team.name_en,
    },
    awayTeam: {
      '@type': 'SportsTeam',
      name: game.away_team.name_en,
    },
  }

  if (game.status === 'final' && game.home_score !== null && game.away_score !== null) {
    schema.eventStatus = 'https://schema.org/EventScheduled'
    schema.homeTeamScore = game.home_score
    schema.awayTeamScore = game.away_score
  }

  return schema
}

export function buildPageTitle(game: GameWithPrediction, lang: string): string {
  const away = lang === 'zh' ? game.away_team.name_zh : game.away_team.name_en
  const home = lang === 'zh' ? game.home_team.name_zh : game.home_team.name_en
  const sport = game.sport_id.toUpperCase()
  return lang === 'zh'
    ? `${away} vs ${home} AI 預測 | ${sport} | AISports`
    : `${away} vs ${home} AI Prediction | ${sport} | AISports`
}
