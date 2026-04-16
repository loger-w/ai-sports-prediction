import type { Translations } from './en'

export const zh: Translations = {
  nav: {
    predictions: '今日預測',
    accuracy: '準確率',
  },
  filter: {
    sport: '運動種類',
    allSports: '全部',
    minStars: '最低星數',
    confidence: '信心度',
    filterButton: '篩選',
    basketball: '籃球',
    baseball: '棒球',
    leagues: '聯盟',
    basketballLeagues: '籃球聯盟',
    baseballLeagues: '棒球聯盟',
  },
  predictions: {
    moneyline: '獨贏',
    spread: '讓分',
    overUnder: '大小分',
    pass: 'PASS',
    vs: 'VS',
    noResults: '沒有符合篩選條件的預測。',
    noData: '預測通常在每天早上更新。',
    resetFilters: '重置篩選',
    retry: '重試',
  },
  accuracy: {
    title: '預測準確率',
    winnerAccuracy: '贏家準確率',
    ouAccuracy: '大小分準確率',
    totalGames: '已結算場次',
    bySport: '各運動種類',
    trend: '準確率趨勢',
    noData: '尚無已結算比賽。比賽結束後再來查看。',
    record: '戰績',
    nba: 'NBA',
    mlb: 'MLB',
    winner: '贏家',
    overUnder: '大小分',
  },
  gameDetail: {
    back: '← 返回預測列表',
    finalScore: '最終比分',
    scheduled: '預定時間',
    aiPick: 'AI 預測',
    explanation: 'AI 分析',
    winProbability: '勝率分析',
    overUnder: '大小分',
    notFound: '找不到比賽資料。',
    viewDetail: '詳情 →',
  },
  analysis: {
    // Section titles
    recentForm: '近況戰績', pitchingMatchup: '先發投手對決', lineupAnalysis: '打線分析',
    bullpenInjuries: '牛棚 & 傷兵', environment: '球場 & 天氣', signalAdjustments: '信號修正',
    winProbability: '勝率分析', scorePrediction: '比分預測', bettingRec: '盤口建議',
    // Team / common
    home: '主場', away: '客場', advantage: '優勢', even: '持平',
    // Stats sections
    season: '本季', expected: '預期', gameLog: '近期出賽', priorYear: '去年',
    platoonSplits: '左右打分割', pitchTypes: '球種分佈', teamSummary: '球隊概覽',
    // Recent form
    record: '近10場', streak: '連勝/敗', runsScored: '場均得分', runsAllowed: '場均失分',
    runDiff: '分差', last5: '近5場', seriesPrev: '系列前一場', win: '勝', loss: '敗',
    // Environment
    parkFactor: '球場因素', temperature: '溫度', wind: '風速',
    roofOpen: '露天', roofClosed: '室內', roofRetractable: '可開合',
    // Win prob
    crossValidation: '交叉驗證', confidence: '信心度',
    // Score
    predictedScore: '預測比分', range: '區間', scenarios: '情境分佈',
    // Betting
    pick: '推薦', edge: '優勢值', risk: '風險', reasons: '理由',
    modelPct: '模型機率', impliedPct: '隱含機率', stars: '星數', line: '盤口',
    // Signals
    totalAdj: '總計調整', runValue: '分數修正',
    // Bullpen
    bullpenEra: '牛棚 ERA', injuredList: '傷兵名單',
    // PitcherTier
    tierAce: '王牌', tierStrongAce: '強力王牌', tierSolid: '穩定先發',
    tierBackEnd: '後段先發', tierBelow: '低於平均',
    // LineupTier
    ltElite: '菁英', ltStrong: '強勢', ltAverage: '中等',
    ltBelow: '低於平均', ltWeak: '薄弱',
    // HeatLevel
    heatOnFire: '極度火熱', heatHot: '火熱', heatNormal: '普通',
    heatCold: '低迷', heatIceCold: '極度低迷',
    // InjuryImpact
    injCritical: '重大', injSignificant: '顯著', injMinor: '輕微', injNone: '無',
    // RiskLevel
    riskLow: '低', riskMedium: '中', riskHigh: '高',
    // CrossValidation
    cvConsistent: '一致', cvDivergent: '分歧', cvInsufficient: '樣本不足',
    // Confidence
    confHigh: '高', confMedium: '中', confLow: '低',
    // ScenarioType
    scBlowoutFav: '大勝', scComfyFav: '穩贏', scCloseFav: '險勝',
    scCloseDog: '險敗', scComfyDog: '明顯落敗', scBlowoutDog: '大敗',
    // BetReasonCode
    rcPitcherMismatch: '投手差距', rcLineupAdvantage: '打線優勢', rcBullpenEdge: '牛棚優勢',
    rcRecentForm: '近期表現', rcValueOdds: '賠率價值', rcInjuryImpact: '傷兵影響',
    rcRegression: '預期回歸', rcPlatoonEdge: '左右打優勢', rcBvpAdvantage: '打者對投手',
    rcConsistentModels: '模型一致', rcLowTotalPitching: '投手主導', rcHighTotalOffense: '打擊主導',
    // SignalCode
    sgParkFactor: '球場因素', sgBullpenIl2: '牛棚2+傷兵', sgBullpenIl3: '牛棚3+傷兵',
    sgBullpenHeavy: '牛棚高負荷', sgBothKHigh: '雙方高K%', sgBothLineupHot: '雙方打線火熱',
    sgBothLineupCold: '雙方打線低迷', sgBothSpStrong: '雙方先發強勢', sgBothSpSolid: '雙方先發穩定+',
    sgTempHigh: '高溫', sgTempLow: '低溫', sgWindOut: '風向外野', sgWindIn: '風向內野',
    sgUmpOver: '主審偏大', sgUmpUnder: '主審偏小', sgDoubleheader: '雙重賽G2',
    sgPlatoonDis: '左右打劣勢', sgSpRest: '先發休息調整',
  },
}
