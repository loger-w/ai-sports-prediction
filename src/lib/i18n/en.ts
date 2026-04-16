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
  analysis: {
    // Section titles
    recentForm: string; pitchingMatchup: string; lineupAnalysis: string
    bullpenInjuries: string; environment: string; signalAdjustments: string
    winProbability: string; scorePrediction: string; bettingRec: string
    // Team / common
    home: string; away: string; advantage: string; even: string
    // Stats sections
    season: string; expected: string; gameLog: string; priorYear: string
    platoonSplits: string; pitchTypes: string; teamSummary: string
    // Recent form
    record: string; streak: string; runsScored: string; runsAllowed: string
    runDiff: string; last5: string; seriesPrev: string; win: string; loss: string
    // Environment
    parkFactor: string; temperature: string; wind: string
    roofOpen: string; roofClosed: string; roofRetractable: string
    // Win prob
    crossValidation: string; confidence: string
    // Score
    predictedScore: string; range: string; scenarios: string
    // Betting
    pick: string; edge: string; risk: string; reasons: string
    modelPct: string; impliedPct: string; stars: string; line: string
    // Signals
    totalAdj: string; runValue: string
    // Bullpen
    bullpenEra: string; injuredList: string
    // PitcherTier
    tierAce: string; tierStrongAce: string; tierSolid: string
    tierBackEnd: string; tierBelow: string
    // LineupTier
    ltElite: string; ltStrong: string; ltAverage: string
    ltBelow: string; ltWeak: string
    // HeatLevel
    heatOnFire: string; heatHot: string; heatNormal: string
    heatCold: string; heatIceCold: string
    // InjuryImpact
    injCritical: string; injSignificant: string; injMinor: string; injNone: string
    // RiskLevel
    riskLow: string; riskMedium: string; riskHigh: string
    // CrossValidation
    cvConsistent: string; cvDivergent: string; cvInsufficient: string
    // Confidence
    confHigh: string; confMedium: string; confLow: string
    // ScenarioType
    scBlowoutFav: string; scComfyFav: string; scCloseFav: string
    scCloseDog: string; scComfyDog: string; scBlowoutDog: string
    // BetReasonCode
    rcPitcherMismatch: string; rcLineupAdvantage: string; rcBullpenEdge: string
    rcRecentForm: string; rcValueOdds: string; rcInjuryImpact: string
    rcRegression: string; rcPlatoonEdge: string; rcBvpAdvantage: string
    rcConsistentModels: string; rcLowTotalPitching: string; rcHighTotalOffense: string
    // SignalCode
    sgParkFactor: string; sgBullpenIl2: string; sgBullpenIl3: string
    sgBullpenHeavy: string; sgBothKHigh: string; sgBothLineupHot: string
    sgBothLineupCold: string; sgBothSpStrong: string; sgBothSpSolid: string
    sgTempHigh: string; sgTempLow: string; sgWindOut: string; sgWindIn: string
    sgUmpOver: string; sgUmpUnder: string; sgDoubleheader: string
    sgPlatoonDis: string; sgSpRest: string
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
  analysis: {
    // Section titles
    recentForm: 'Recent Form', pitchingMatchup: 'Pitching Matchup', lineupAnalysis: 'Lineup Analysis',
    bullpenInjuries: 'Bullpen & Injuries', environment: 'Ballpark & Weather', signalAdjustments: 'Signal Adjustments',
    winProbability: 'Win Probability', scorePrediction: 'Score Prediction', bettingRec: 'Betting Recommendations',
    // Team / common
    home: 'Home', away: 'Away', advantage: 'Advantage', even: 'Even',
    // Stats sections
    season: 'Season', expected: 'Expected', gameLog: 'Game Log', priorYear: 'Prior Year',
    platoonSplits: 'Platoon Splits', pitchTypes: 'Pitch Mix', teamSummary: 'Team Summary',
    // Recent form
    record: 'L10 Record', streak: 'Streak', runsScored: 'RS/G', runsAllowed: 'RA/G',
    runDiff: 'Run Diff', last5: 'Last 5', seriesPrev: 'Series Prev', win: 'W', loss: 'L',
    // Environment
    parkFactor: 'Park Factor', temperature: 'Temp', wind: 'Wind',
    roofOpen: 'Open', roofClosed: 'Closed', roofRetractable: 'Retractable',
    // Win prob
    crossValidation: 'Cross Validation', confidence: 'Confidence',
    // Score
    predictedScore: 'Predicted Score', range: 'Range', scenarios: 'Scenarios',
    // Betting
    pick: 'Pick', edge: 'Edge', risk: 'Risk', reasons: 'Reasons',
    modelPct: 'Model %', impliedPct: 'Implied %', stars: 'Stars', line: 'Line',
    // Signals
    totalAdj: 'Total Adjustment', runValue: 'Run Value',
    // Bullpen
    bullpenEra: 'Bullpen ERA', injuredList: 'Injured List',
    // PitcherTier
    tierAce: 'Ace', tierStrongAce: 'Strong Ace', tierSolid: 'Solid Starter',
    tierBackEnd: 'Back End', tierBelow: 'Below Average',
    // LineupTier
    ltElite: 'Elite', ltStrong: 'Strong', ltAverage: 'Average',
    ltBelow: 'Below Avg', ltWeak: 'Weak',
    // HeatLevel
    heatOnFire: 'On Fire', heatHot: 'Hot', heatNormal: 'Normal',
    heatCold: 'Cold', heatIceCold: 'Ice Cold',
    // InjuryImpact
    injCritical: 'Critical', injSignificant: 'Significant', injMinor: 'Minor', injNone: 'None',
    // RiskLevel
    riskLow: 'Low', riskMedium: 'Medium', riskHigh: 'High',
    // CrossValidation
    cvConsistent: 'Consistent', cvDivergent: 'Divergent', cvInsufficient: 'Low Sample',
    // Confidence
    confHigh: 'High', confMedium: 'Medium', confLow: 'Low',
    // ScenarioType
    scBlowoutFav: 'Blowout Win', scComfyFav: 'Comfortable Win', scCloseFav: 'Close Win',
    scCloseDog: 'Close Loss', scComfyDog: 'Comfortable Loss', scBlowoutDog: 'Blowout Loss',
    // BetReasonCode
    rcPitcherMismatch: 'Pitcher Mismatch', rcLineupAdvantage: 'Lineup Advantage', rcBullpenEdge: 'Bullpen Edge',
    rcRecentForm: 'Recent Form', rcValueOdds: 'Value Odds', rcInjuryImpact: 'Injury Impact',
    rcRegression: 'Regression Expected', rcPlatoonEdge: 'Platoon Edge', rcBvpAdvantage: 'BvP Advantage',
    rcConsistentModels: 'Consistent Models', rcLowTotalPitching: 'Pitching Dominant', rcHighTotalOffense: 'Offense Heavy',
    // SignalCode
    sgParkFactor: 'Park Factor', sgBullpenIl2: 'Bullpen 2+ IL', sgBullpenIl3: 'Bullpen 3+ IL',
    sgBullpenHeavy: 'Bullpen Heavy Use', sgBothKHigh: 'High K% Both', sgBothLineupHot: 'Both Lineups Hot',
    sgBothLineupCold: 'Both Lineups Cold', sgBothSpStrong: 'Both SP Strong', sgBothSpSolid: 'Both SP Solid+',
    sgTempHigh: 'High Temp', sgTempLow: 'Low Temp', sgWindOut: 'Wind Out', sgWindIn: 'Wind In',
    sgUmpOver: 'Ump Tends Over', sgUmpUnder: 'Ump Tends Under', sgDoubleheader: 'Doubleheader G2',
    sgPlatoonDis: 'Platoon Disadvantage', sgSpRest: 'SP Rest Adjusted',
  },
}
