// Portfolio Service
import apiClient from './api'
import { Portfolio, PortfolioCreateRequest, PortfoliosListResponse } from '@/types/portfolio'

export const portfolioService = {
  getAll: async (page = 1, limit = 10, sort = '-createdAt') => {
    const response = await apiClient.get<PortfoliosListResponse>(
      `/portfolios?page=${page}&limit=${limit}&sort=${sort}`
    )
    return response.data
  },

  getById: async (id: string): Promise<{ portfolio: Portfolio }> => {
    const response = await apiClient.get(`/portfolios/${id}`)
    return response.data
  },

  create: async (data: PortfolioCreateRequest) => {
    const response = await apiClient.post('/portfolios', data)
    return response.data.portfolio
  },

  update: async (id: string, data: Partial<Portfolio>) => {
    const response = await apiClient.put(`/portfolios/${id}`, data)
    return response.data.portfolio
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/portfolios/${id}`)
    return response.data
  },

  addHolding: async (id: string, holding: any) => {
    const response = await apiClient.post(`/portfolios/${id}/holdings`, holding)
    return response.data
  },

  removeHolding: async (id: string, holdingId: string) => {
    const response = await apiClient.delete(`/portfolios/${id}/holdings/${holdingId}`)
    return response.data
  },

  parseCSV: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post('/portfolios/parse-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  importHoldings: async (id: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/portfolios/${id}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  triggerAnalysis: async (id: string) => {
    const response = await apiClient.post(`/analysis/${id}`)
    return response.data
  },

  getAnalysisStatus: async (id: string) => {
    const response = await apiClient.get(`/analysis/${id}/status`)
    return response.data
  },

  getAnalysisResults: async (id: string) => {
    const response = await apiClient.get(`/analysis/${id}/results`)
    return response.data
  },
}
