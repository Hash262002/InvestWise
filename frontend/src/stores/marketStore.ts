// Market Store - Market data and indices
import { create } from 'zustand'
import { MarketIndex } from '@/types/market'

interface MarketState {
  indices: MarketIndex[]
  loading: boolean
  lastUpdated: number | null

  setIndices: (indices: MarketIndex[]) => void
  setLoading: (loading: boolean) => void
  setLastUpdated: (timestamp: number) => void
}

export const useMarketStore = create<MarketState>((set) => ({
  indices: [],
  loading: false,
  lastUpdated: null,

  setIndices: (indices: MarketIndex[]) => {
    set({ indices, lastUpdated: Date.now() })
  },

  setLoading: (loading: boolean) => set({ loading }),

  setLastUpdated: (timestamp: number) => set({ lastUpdated: timestamp }),
}))
