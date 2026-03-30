// Portfolio Types
export interface Holding {
  id?: string
  _id?: string
  symbol: string
  name: string
  sector?: string
  exchange?: string
  quantity: number
  averageCost: number
  currentPrice: number
  currentValue: number
  totalCost: number
  assetType?: string
  isActive?: boolean
  analysis?: {
    sentiment?: string
    recommendation?: string
    analysisText?: string
  }
}

export interface Portfolio {
  id?: string
  _id?: string
  user?: string
  name: string
  description?: string
  type?: 'long-term' | 'short-term' | 'trading' | 'other'
  currency: string
  totalInvested: number
  currentValue: number
  return?: number
  holdings: Holding[]
  isActive?: boolean
  createdAt?: string
  analytics?: {
    analysisStatus?: string
    analysisRequestId?: string
    lastAnalyzedAt?: string
    processingTime?: number
    lastAnalysis?: any
  }
}

export interface PortfolioCreateRequest {
  name: string
  description?: string
  type?: string
  currency?: string
}

export interface PortfolioResponse {
  message: string
  portfolio: Portfolio
}

export interface PortfoliosListResponse {
  portfolios: Portfolio[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface AnalysisResult {
  portfolioId: string
  portfolioName: string
  analysis: {
    summary: string
    metrics: {
      totalReturn: number
      riskLevel: string
      diversificationScore: number
      sectorConcentration: Record<string, number>
    }
    recommendations: Array<{
      type: string
      priority: string
      description: string
    }>
  }
  holdings: Array<Holding & { sentiment: string; recommendation: string }>
  generatedAt: string
  processingTimeMs: number
}

export interface AnalysisStatus {
  status: 'not_started' | 'processing' | 'completed' | 'failed'
  requestId?: string
  lastAnalyzedAt?: string
  processingTime?: number
}
