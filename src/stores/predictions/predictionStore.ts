// src/stores/predictions/predictionStore.ts
import { create } from 'zustand'
import { localToday } from '@/lib/timezone'
import type { Market } from '@/types/predictions/recommendation'

export type Sport = 'all' | 'nba' | 'mlb'
export type SortBy = 'time' | 'stars'

export interface PredictionFilters {
  sport: Sport
  dateRange: string                 // YYYY-MM-DD
  markets: Set<Market>              // multi-select; empty = "no markets selected"
  minStars: number                  // 1..5; 1 = no filter
  sortBy: SortBy
}

interface PredictionStore extends PredictionFilters {
  setSport: (s: Sport) => void
  setDateRange: (d: string) => void
  toggleMarket: (m: Market) => void
  setMarkets: (m: Set<Market>) => void
  setMinStars: (n: number) => void
  setSortBy: (s: SortBy) => void
  resetFilters: () => void
}

const ALL_MARKETS: Market[] = ['ml', 'spread', 'ou']

function defaults(): PredictionFilters {
  return {
    sport: 'all',
    dateRange: localToday(),
    markets: new Set<Market>(ALL_MARKETS),
    minStars: 1,
    sortBy: 'stars',
  }
}

function clampStars(n: number): number {
  if (n < 1) return 1
  if (n > 5) return 5
  return Math.floor(n)
}

export const usePredictionStore = create<PredictionStore>((set) => ({
  ...defaults(),
  setSport: (sport) => set({ sport }),
  setDateRange: (dateRange) => set({ dateRange }),
  toggleMarket: (m) =>
    set((state) => {
      const next = new Set(state.markets)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return { markets: next }
    }),
  setMarkets: (markets) => set({ markets }),
  setMinStars: (n) => set({ minStars: clampStars(n) }),
  setSortBy: (sortBy) => set({ sortBy }),
  resetFilters: () => set(defaults()),
}))
