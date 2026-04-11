// Translations type uses string (not literal) so zh can have different string values
export type Translations = {
  nav: { predictions: string; accuracy: string }
  accuracy: {
    title: string; winnerAccuracy: string; ouAccuracy: string; totalGames: string
    bySport: string; trend: string; noData: string; record: string
    nba: string; mlb: string; winner: string; overUnder: string
  }
  filter: {
    sport: string; allSports: string; today: string; tomorrow: string
    thisWeek: string; confidence: string; direction: string
    high: string; medium: string; low: string
    all: string; home: string; away: string; filterButton: string
  }
  predictions: {
    homeWinPct: string; awayWinPct: string; ouLine: string
    over: string; under: string; vs: string
    noResults: string; noData: string; resetFilters: string; retry: string
    confidence: { high: string; medium: string; low: string }
  }
  gameDetail: {
    back: string; finalScore: string; scheduled: string
    aiPick: string; explanation: string; winProbability: string
    overUnder: string; notFound: string; viewDetail: string
  }
  month: { prev: string; next: string }
}

export const en: Translations = {
  nav: {
    predictions: "Today's Picks",
    accuracy: 'Accuracy',
  },
  filter: {
    sport: 'Sport',
    allSports: 'All',
    today: 'Today',
    tomorrow: 'Tomorrow',
    thisWeek: 'This Week',
    confidence: 'Confidence',
    direction: 'Prediction',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    all: 'All',
    home: 'Home Win',
    away: 'Away Win',
    filterButton: 'Filters',
  },
  predictions: {
    homeWinPct: 'Home Win %',
    awayWinPct: 'Away Win %',
    ouLine: 'O/U',
    over: 'Over',
    under: 'Under',
    vs: 'VS',
    noResults: 'No predictions match your filters.',
    noData: 'Predictions are usually updated each morning.',
    resetFilters: 'Reset Filters',
    retry: 'Retry',
    confidence: {
      high: 'High Confidence',
      medium: 'Med Confidence',
      low: 'Low Confidence',
    },
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
  month: {
    prev: 'Previous month',
    next: 'Next month',
  },
}
