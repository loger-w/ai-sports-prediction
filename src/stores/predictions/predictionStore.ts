import { create } from 'zustand'

export interface PredictionFilters {
  sport: 'all' | 'nba' | 'mlb'
  dateRange: 'today' | 'tomorrow' | 'week' | string
  confidence: ('high' | 'medium' | 'low')[]
  direction: 'all' | 'home' | 'away'
}

interface PredictionStore extends PredictionFilters {
  setSport: (sport: PredictionFilters['sport']) => void
  setDateRange: (range: PredictionFilters['dateRange']) => void
  toggleConfidence: (level: 'high' | 'medium' | 'low') => void
  setDirection: (dir: PredictionFilters['direction']) => void
  resetFilters: () => void
}

const DEFAULT_FILTERS: PredictionFilters = {
  sport: 'all',
  dateRange: 'today',
  confidence: [],
  direction: 'all',
}

export const usePredictionStore = create<PredictionStore>((set) => ({
  ...DEFAULT_FILTERS,
  setSport: (sport) => set({ sport }),
  setDateRange: (dateRange) => set({ dateRange }),
  toggleConfidence: (level) =>
    set((state) => {
      const has = state.confidence.includes(level)
      return {
        confidence: has
          ? state.confidence.filter((c) => c !== level)
          : [...state.confidence, level],
      }
    }),
  setDirection: (direction) => set({ direction }),
  resetFilters: () => set(DEFAULT_FILTERS),
}))
