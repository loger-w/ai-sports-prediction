// ── GameAnalysis Schema v1.0 ─────────────────────────────────────────────────
// Structured analysis data for prediction detail pages.
// Every field is fixed — no free-form text. All narratives use enum codes.

// ── Enums ────────────────────────────────────────────────────────────────────

export type PitcherTier =
  | 'ACE'
  | 'STRONG_ACE'
  | 'SOLID_STARTER'
  | 'BACK_END'
  | 'BELOW_AVERAGE'

export type LineupTier =
  | 'ELITE'
  | 'STRONG'
  | 'AVERAGE'
  | 'BELOW_AVERAGE'
  | 'WEAK'

export type HeatLevel =
  | 'ON_FIRE'
  | 'HOT'
  | 'NORMAL'
  | 'COLD'
  | 'ICE_COLD'

export type AgePhase =
  | 'GROWTH'
  | 'PRIME'
  | 'VETERAN'
  | 'DECLINING'

export type CrossValidation =
  | 'CONSISTENT'
  | 'DIVERGENT'
  | 'INSUFFICIENT_SAMPLE'

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW'

export type BetDirection = 'HOME' | 'AWAY' | 'OVER' | 'UNDER' | 'PASS'

export type InjuryImpact = 'CRITICAL' | 'SIGNIFICANT' | 'MINOR' | 'NONE'

export type ScenarioType =
  | 'BLOWOUT_FAV'
  | 'COMFORTABLE_FAV'
  | 'CLOSE_FAV'
  | 'CLOSE_DOG'
  | 'COMFORTABLE_DOG'
  | 'BLOWOUT_DOG'

export type BetReasonCode =
  | 'PITCHER_MISMATCH'
  | 'LINEUP_ADVANTAGE'
  | 'BULLPEN_EDGE'
  | 'RECENT_FORM'
  | 'VALUE_ODDS'
  | 'INJURY_IMPACT'
  | 'REGRESSION_EXPECTED'
  | 'PLATOON_EDGE'
  | 'BVP_ADVANTAGE'
  | 'CONSISTENT_MODELS'
  | 'LOW_TOTAL_PITCHING'
  | 'HIGH_TOTAL_OFFENSE'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'

export type PitchType =
  | 'FF' | 'SI' | 'SL' | 'CH' | 'CU'
  | 'FC' | 'KC' | 'FS' | 'SV' | 'ST' | 'KN'

export type SignalCode =
  | 'PARK_FACTOR'
  | 'BULLPEN_IL_2PLUS'
  | 'BULLPEN_IL_3PLUS'
  | 'BULLPEN_HEAVY_USE'
  | 'BOTH_K_PCT_HIGH'
  | 'BOTH_LINEUP_HOT'
  | 'BOTH_LINEUP_COLD'
  | 'BOTH_SP_STRONG'
  | 'BOTH_SP_SOLID_PLUS'
  | 'TEMP_HIGH'
  | 'TEMP_LOW'
  | 'WIND_OUT'
  | 'WIND_IN'
  | 'UMPIRE_OVER'
  | 'UMPIRE_UNDER'
  | 'DOUBLEHEADER_G2'
  | 'PLATOON_DISADVANTAGE'
  | 'SP_REST_ADJUSTED'

// ── Section 1: Match Meta ────────────────────────────────────────────────────

export interface MatchMeta {
  game_pk: number
  date: string               // ISO 8601
  venue: string
  home_team: string          // abbreviation e.g. "NYY"
  away_team: string
  home_sp: string            // starter name
  away_sp: string
  series_game: number | null // e.g. 3 (game 3 of series)
}

// ── Section 2: Recent Form ───────────────────────────────────────────────────

export interface TeamRecentForm {
  record_10: string          // "3-7"
  streak: number             // +2 = 2W, -1 = 1L
  rs_per_game: number
  ra_per_game: number
  run_diff: number
  last_5_results: Array<'W' | 'L'>
}

export interface SeriesPrev {
  home_score: number
  away_score: number
  winner: 'home' | 'away'
}

export interface RecentForm {
  home: TeamRecentForm
  away: TeamRecentForm
  series_prev: SeriesPrev | null
}

// ── Section 3: Pitching Matchup ──────────────────────────────────────────────

export interface PitcherSeasonStats {
  era: number
  fip: number
  xfip: number
  whip: number
  k_pct: number
  bb_pct: number
  k_bb_pct: number
  hr_per_9: number
  gb_pct: number
  ip: number
  gs: number
}

export interface PitcherExpected {
  xera: number | null
  xwoba: number | null
  xba: number | null
}

export interface PitcherStatcast {
  avg_velo: number | null
  max_velo: number | null
  hard_hit_pct: number | null
  barrel_pct: number | null
  whiff_pct: number | null
  csw_pct: number | null
  ev95percent: number | null
  pitch_types: Partial<Record<PitchType, number>>
}

export interface PlatoonSplit {
  avg: string
  obp: string
  slg: string
  k_pct: number
  bb_pct: number
  bf: number
}

export interface PitcherGameLog {
  date: string
  opponent: string
  ip: number
  era: number | null
  k: number
  bb: number
  h: number
  er: number
  pitches: number
  strikes: number
}

export interface PitcherProfile {
  name: string
  mlbam_id: number
  age: number
  pitch_hand: 'R' | 'L'
  tier: PitcherTier
  age_phase: AgePhase
  season: PitcherSeasonStats
  expected: PitcherExpected
  statcast: PitcherStatcast
  platoon_splits: {
    vs_left: PlatoonSplit
    vs_right: PlatoonSplit
  }
  game_log: PitcherGameLog[]
  prior_year: PitcherSeasonStats | null
}

export interface PitchingMatchup {
  home_sp: PitcherProfile
  away_sp: PitcherProfile
  advantage: 'home' | 'away' | 'even'
}

// ── Section 4: Lineup Analysis ───────────────────────────────────────────────

export interface HitterPlatoon {
  avg: string
  obp: string
  slg: string
  ops: string
  pa: number
}

export interface HitterLast7 {
  avg: string
  obp: string
  slg: string
  ops: string
  babip: string
  pa: number
}

export interface HitterBvP {
  pa: number
  avg: string
  hr: number
  so: number
  bb: number
  sample_sufficient: boolean
}

export interface HitterProfile {
  name: string
  mlbam_id: number
  position: string
  ops: number
  xwoba: number | null
  babip: number
  k_pct: number
  bb_pct: number
  xba: number | null
  xslg: number | null
  ev95pct: number | null
  barrel_pct: number | null
  platoon: {
    vs_lhp: HitterPlatoon
    vs_rhp: HitterPlatoon
  }
  last_7: HitterLast7
  bvp: HitterBvP | null
}

export interface TeamLineupSummary {
  team: string               // abbreviation
  tier: LineupTier
  recent_heat: HeatLevel
  avg_ops: number
  avg_xwoba: number | null
  avg_babip: number
  avg_k_pct: number
  avg_bb_pct: number
  chain: {
    obp_top3: number | null
    slg_mid: number | null
  }
  lineup: HitterProfile[]
}

export interface LineupAnalysis {
  home: TeamLineupSummary
  away: TeamLineupSummary
  advantage: 'home' | 'away' | 'even'
}

// ── Section 5: Bullpen & Injuries ────────────────────────────────────────────

export interface InjuredPlayer {
  name: string
  status: string             // "Injured 10-Day", "Injured 15-Day", "Injured 60-Day"
  position: string
  impact: InjuryImpact
}

export interface TeamBullpenAndInjuries {
  team: string
  bullpen_era: number | null
  il_pitchers: InjuredPlayer[]
  il_position_players: InjuredPlayer[]
  injury_impact_summary: InjuryImpact
}

export interface BullpenAndInjuries {
  home: TeamBullpenAndInjuries
  away: TeamBullpenAndInjuries
}

// ── Section 6: Environment ───────────────────────────────────────────────────

export interface Environment {
  venue: string
  park_factor: number
  temperature_f: number | null
  wind_mph: number | null
  wind_direction: string | null
  roof: 'open' | 'closed' | 'retractable' | null
}

// ── Section 7: Signal Adjustments ────────────────────────────────────────────

export interface SignalAdjustment {
  code: SignalCode
  run_value: number
}

export interface SignalAdjustments {
  signals: SignalAdjustment[]
  total_run_adjustment: number
}

// ── Section 8: Win Probability ───────────────────────────────────────────────

export interface WinProbability {
  xgboost_home_pct: number
  log5_home_pct: number
  pythag_home_pct: number
  cross_validation: CrossValidation
  confidence: Confidence
}

// ── Section 9: Score Prediction ──────────────────────────────────────────────

export interface ScenarioProbability {
  type: ScenarioType
  pct: number                // 0-100, all 6 sum to 100
  example_score: string      // e.g. "8-3"
}

export interface ScorePrediction {
  home_score: number
  away_score: number
  total: number
  home_range: [number, number]  // [low, high]
  away_range: [number, number]
  scenarios: ScenarioProbability[]
}

// ── Section 10: Betting Recommendations ──────────────────────────────────────

export interface MarketRecommendation {
  direction: BetDirection
  stars: number              // 0-5
  line: number | null
  model_pct: number
  implied_pct: number
  edge: number
  reasons: BetReasonCode[]   // 1-3 reason codes
  risk: RiskLevel
}

export interface BettingRecommendations {
  moneyline: MarketRecommendation
  run_line: MarketRecommendation
  over_under: MarketRecommendation
}

// ── Top-level Schema ─────────────────────────────────────────────────────────

export interface GameAnalysis {
  schema_version: '1.0'
  generated_at: string       // ISO 8601

  meta: MatchMeta
  recent_form: RecentForm
  pitching_matchup: PitchingMatchup
  lineup_analysis: LineupAnalysis
  bullpen_and_injuries: BullpenAndInjuries
  environment: Environment
  signal_adjustments: SignalAdjustments
  win_probability: WinProbability
  score_prediction: ScorePrediction
  betting_recommendations: BettingRecommendations
}
