// useMarketData Hook - Market data operations
import { useCallback, useEffect } from 'react'
import { useMarketStore } from '@/stores/marketStore'
import { useUIStore } from '@/stores/uiStore'
import { marketService } from '@/services/marketService'

export const useMarketData = () => {
  const { indices, loading, setIndices, setLoading } = useMarketStore()
  const { addToast } = useUIStore()

  const fetchIndices = useCallback(async () => {
    setLoading(true)
    try {
      const data = await marketService.getIndices()
      setIndices(data.indices)
    } catch (error: any) {
      console.error('Failed to fetch indices:', error)
      // Don't show toast for market data errors (can be temporary)
    } finally {
      setLoading(false)
    }
  }, [setIndices, setLoading])

  const fetchQuote = useCallback(async (symbol: string) => {
    try {
      return await marketService.getQuote(symbol)
    } catch (error: any) {
      addToast({ message: `Failed to fetch quote for ${symbol}`, type: 'error' })
      throw error
    }
  }, [addToast])

  const searchSymbols = useCallback(async (query: string) => {
    try {
      return await marketService.search(query)
    } catch (error: any) {
      addToast({ message: 'Search failed', type: 'error' })
      throw error
    }
  }, [addToast])

  // Auto-fetch indices on mount and set up polling
  useEffect(() => {
    const POLL_INTERVAL = parseInt(import.meta.env.VITE_MARKET_POLL_INTERVAL || '10000')
    
    fetchIndices()
    const interval = setInterval(fetchIndices, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchIndices])

  return {
    indices,
    loading,
    fetchIndices,
    fetchQuote,
    searchSymbols,
  }
}
