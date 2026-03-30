// usePortfolio Hook - Portfolio operations
import { useCallback } from 'react'
import { usePortfolioStore } from '@/stores/portfolioStore'
import { useUIStore } from '@/stores/uiStore'
import { portfolioService } from '@/services/portfolioService'
import { Portfolio, PortfolioCreateRequest } from '@/types/portfolio'

export const usePortfolio = () => {
  const { portfolios, selectedPortfolio, loading, setPortfolios, addPortfolio, updatePortfolio, deletePortfolio, setSelectedPortfolio, setLoading } = usePortfolioStore()
  const { addToast } = useUIStore()

  const fetchPortfolios = useCallback(async (page = 1, limit = 10) => {
    setLoading(true)
    try {
      const data = await portfolioService.getAll(page, limit)
      setPortfolios(data.portfolios, data.pagination.total)
    } catch (error: any) {
      addToast({ message: 'Failed to fetch portfolios', type: 'error' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [setPortfolios, setLoading, addToast])

  const fetchPortfolioById = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const data = await portfolioService.getById(id)
      setSelectedPortfolio(data.portfolio)
      return data.portfolio
    } catch (error: any) {
      addToast({ message: 'Failed to fetch portfolio', type: 'error' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [setSelectedPortfolio, setLoading, addToast])

  const createPortfolio = useCallback(async (data: PortfolioCreateRequest) => {
    setLoading(true)
    try {
      const newPortfolio = await portfolioService.create(data)
      addPortfolio(newPortfolio)
      addToast({ message: 'Portfolio created successfully', type: 'success' })
      return newPortfolio
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create portfolio'
      addToast({ message, type: 'error' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [addPortfolio, setLoading, addToast])

  const updatePortfolioData = useCallback(async (id: string, data: Partial<Portfolio>) => {
    setLoading(true)
    try {
      const updated = await portfolioService.update(id, data)
      updatePortfolio(updated)
      addToast({ message: 'Portfolio updated successfully', type: 'success' })
      return updated
    } catch (error: any) {
      addToast({ message: 'Failed to update portfolio', type: 'error' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [updatePortfolio, setLoading, addToast])

  const removePortfolio = useCallback(async (id: string) => {
    setLoading(true)
    try {
      await portfolioService.delete(id)
      deletePortfolio(id)
      addToast({ message: 'Portfolio deleted successfully', type: 'success' })
    } catch (error: any) {
      addToast({ message: 'Failed to delete portfolio', type: 'error' })
      throw error
    } finally {
      setLoading(false)
    }
  }, [deletePortfolio, setLoading, addToast])

  return {
    portfolios,
    selectedPortfolio,
    loading,
    fetchPortfolios,
    fetchPortfolioById,
    createPortfolio,
    updatePortfolio: updatePortfolioData,
    deletePortfolio: removePortfolio,
  }
}
