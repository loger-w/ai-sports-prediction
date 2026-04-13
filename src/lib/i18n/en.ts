// Translations type uses string (not literal) so zh can have different string values
export type Translations = {
  nav: { predictions: string; accuracy: string }
  accuracy: {
    title: string; winnerAccuracy: string; ouAccuracy: string; totalGames: string
    bySport: string; trend: string; noData: string; record: string
    nba: string; mlb: string; winner: string; overUnder: string
  }
  filter: {
    sport: string; allSports: string; minStars: string
    confidence: string; filterButton: string
    basketball: string; baseball: string
    leagues: string; basketballLeagues: string; baseballLeagues: string
  }
  predictions: {
    moneyline: string; spread: string; overUnder: string; pass: string
    vs: string
    noResults: string; noData: string; resetFilters: string; retry: string
  }
  gameDetail: {
    back: string; finalScore: string; scheduled: string
    aiPick: string; explanation: string; winProbability: string
    overUnder: string; notFound: string; viewDetail: string
  }
}

export const en: Translations = {
  nav: {
    predictions: "Today's Picks",
    accuracy: 'Accuracy',
  },
  filter: {
    sport: 'Sport',
    allSports: 'All',
    minStars: 'Min Stars',
    confidence: 'Confidence',
    filterButton: 'Filters',
    basketball: 'Basketball',
    baseball: 'Baseball',
    leagues: 'Leagues',
    basketballLeagues: 'Basketball Leagues',
    baseballLeagues: 'Baseball Leagues',
  },
  predictions: {
    moneyline: 'Moneyline',
    spread: 'Spread',
    overUnder: 'O/U',
    pass: 'PASS',
    vs: 'VS',
    noResults: 'No predictions match your filters.',
    noData: 'Predictions are usually updated each morning.',
    resetFilters: 'Reset Filters',
    retry: 'Retry',
  },
  accuracy: {
    title: 'Prediction Accuracy',
    winnerAccuracy: 'Winner Accuracy',
    ouAccuracy: 'O/U Accuracy',
    totalGames: 'Games Resolved',
    bySport: 'By Sport',
    trend: 'Accuracy Trend',
    noData: 'No resolved games yet. Check back after games finish.',
    record: 'Record',
    nba: 'NBA',
    mlb: 'MLB',
    winner: 'Winner',
    overUnder: 'O/U',
  },
  gameDetail: {
    back: '← Back to Picks',
    finalScore: 'Final Score',
    scheduled: 'Scheduled',
    aiPick: 'AI Pick',
    explanation: 'AI Analysis',
    winProbability: 'Win Probability',
    overUnder: 'Over / Under',
    notFound: 'Game not found.',
    viewDetail: 'Details →',
  },
}
