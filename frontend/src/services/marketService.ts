// Market Service
import apiClient from './api'
import { MarketIndices, StockQuote, SearchResponse } from '@/types/market'

export const marketService = {
  getIndices: async (): Promise<MarketIndices> => {
    const response = await apiClient.get('/market/indices')
    return response.data
  },

  getQuote: async (symbol: string): Promise<StockQuote> => {
    const response = await apiClient.get(`/market/quote/${symbol}`)
    return response.data
  },

  search: async (query: string): Promise<SearchResponse> => {
    const response = await apiClient.get(`/market/search?q=${query}`)
    return response.data
  },
}
