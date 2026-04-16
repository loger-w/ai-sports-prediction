import type { GameAnalysis } from '@/types/predictions/analysis'
import { RecentFormCard } from './RecentFormCard'
import { PitchingMatchupCard } from './PitchingMatchupCard'
import { LineupCard } from './LineupCard'
import { BullpenCard } from './BullpenCard'
import { EnvironmentCard } from './EnvironmentCard'
import { SignalTable } from './SignalTable'
import { WinProbabilityCard } from './WinProbabilityCard'
import { ScorePredictionCard } from './ScorePredictionCard'
import { BettingCard } from './BettingCard'

interface AnalysisSectionProps {
  analysis: GameAnalysis | null
}

export function AnalysisSection({ analysis }: AnalysisSectionProps) {
  if (!analysis) return null

  return (
    <div className="space-y-4">
      <RecentFormCard data={analysis.recent_form} meta={analysis.meta} />
      <PitchingMatchupCard data={analysis.pitching_matchup} />
      <LineupCard data={analysis.lineup_analysis} />
      <BullpenCard data={analysis.bullpen_and_injuries} />
      <EnvironmentCard data={analysis.environment} />
      <SignalTable data={analysis.signal_adjustments} />
      <WinProbabilityCard data={analysis.win_probability} meta={analysis.meta} />
      <ScorePredictionCard data={analysis.score_prediction} meta={analysis.meta} />
      <BettingCard data={analysis.betting_recommendations} />
    </div>
  )
}
