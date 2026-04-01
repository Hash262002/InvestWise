import apiClient from './api'

export interface AnalysisStatus {
  status: 'not_started' | 'processing' | 'completed' | 'failed'
  requestId: string
  lastAnalyzedAt: Date
  processingTime: number
}

export interface HoldingAnalysis {
  symbol: string
  name: string
  quantity: number
  currentValue: number
  analysis: {
    sentiment: 'bullish' | 'bearish' | 'neutral' | null
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' | null
    summary: string
    analyzedAt: Date
  }
}

export interface PortfolioAnalysisResult {
  portfolioId: string
  portfolioName: string
  overallSentiment: 'bullish' | 'bearish' | 'neutral'
  overallRecommendation: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell'
  summary: string
  metrics: {
    totalReturn: number
    annualizedReturn: number
    volatility: number
    sharpeRatio: number
    maxDrawdown: number
  }
  holdings: HoldingAnalysis[]
  analyzedAt: Date
}

/**
 * Trigger portfolio analysis
 */
export const triggerPortfolioAnalysis = async (portfolioId: string): Promise<any> => {
  const response = await apiClient.post(`/analysis/${portfolioId}`)
  return response.data
}

/**
 * Get analysis status
 */
export const getAnalysisStatus = async (portfolioId: string): Promise<AnalysisStatus> => {
  const response = await apiClient.get(`/analysis/${portfolioId}/status`)
  return response.data
}

/**
 * Get analysis results
 */
export const getAnalysisResults = async (portfolioId: string): Promise<PortfolioAnalysisResult> => {
  const response = await apiClient.get(`/analysis/${portfolioId}/results`)
  return response.data
}
