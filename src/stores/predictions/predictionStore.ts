import { create } from 'zustand'
import { localToday } from '@/lib/timezone'

export interface PredictionFilters {
  sport: 'all' | 'nba' | 'mlb'
  dateRange: string            // always YYYY-MM-DD
  minStars: number             // 1–5, where 1 = no filter (show all)
}

interface PredictionStore extends PredictionFilters {
  setSport: (sport: PredictionFilters['sport']) => void
  setDateRange: (range: string) => void
  setMinStars: (stars: number) => void
  resetFilters: () => void
}

function getDefaultFilters(): PredictionFilters {
  return {
    sport: 'all',
    dateRange: localToday(),
    minStars: 1,
  }
}

export const usePredictionStore = create<PredictionStore>((set) => ({
  ...getDefaultFilters(),
  setSport: (sport) => set({ sport }),
  setDateRange: (dateRange) => set({ dateRange }),
  setMinStars: (minStars) => set({ minStars }),
  resetFilters: () => set(getDefaultFilters()),
}))
