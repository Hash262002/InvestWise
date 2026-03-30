// Portfolio Store - Portfolio data and operations
import { create } from 'zustand'
import { Portfolio, AnalysisStatus } from '@/types/portfolio'

interface PortfolioState {
  portfolios: Portfolio[]
  selectedPortfolio: Portfolio | null
  loading: boolean
  error: string | null
  totalCount: number
  currentPage: number

  setPortfolios: (portfolios: Portfolio[], total: number) => void
  addPortfolio: (portfolio: Portfolio) => void
  updatePortfolio: (portfolio: Portfolio) => void
  deletePortfolio: (id: string) => void
  setSelectedPortfolio: (portfolio: Portfolio | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setCurrentPage: (page: number) => void
  clear: () => void
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  portfolios: [],
  selectedPortfolio: null,
  loading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,

  setPortfolios: (portfolios: Portfolio[], total: number) => {
    set({ portfolios, totalCount: total })
  },

  addPortfolio: (portfolio: Portfolio) => {
    set((state) => ({
      portfolios: [portfolio, ...state.portfolios],
      totalCount: state.totalCount + 1,
    }))
  },

  updatePortfolio: (portfolio: Portfolio) => {
    set((state) => ({
      portfolios: state.portfolios.map((p) => (p._id === portfolio._id ? portfolio : p)),
      selectedPortfolio:
        state.selectedPortfolio?._id === portfolio._id ? portfolio : state.selectedPortfolio,
    }))
  },

  deletePortfolio: (id: string) => {
    set((state) => ({
      portfolios: state.portfolios.filter((p) => p._id !== id),
      selectedPortfolio: state.selectedPortfolio?._id === id ? null : state.selectedPortfolio,
      totalCount: state.totalCount - 1,
    }))
  },

  setSelectedPortfolio: (portfolio: Portfolio | null) => {
    set({ selectedPortfolio: portfolio })
  },

  setLoading: (loading: boolean) => set({ loading }),

  setError: (error: string | null) => set({ error }),

  setCurrentPage: (page: number) => set({ currentPage: page }),

  clear: () => {
    set({
      portfolios: [],
      selectedPortfolio: null,
      loading: false,
      error: null,
      totalCount: 0,
      currentPage: 1,
    })
  },
}))
