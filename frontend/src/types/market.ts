// Market Data Types
export interface MarketIndex {
  symbol: string
  name: string
  value: number
  change: number
  changePercent: number
  timestamp?: string
}

export interface MarketIndices {
  indices: MarketIndex[]
}

export interface StockQuote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  volume: number
  timestamp: string
}

export interface SearchResult {
  symbol: string
  name: string
  type: string
  exchange: string
}

export interface SearchResponse {
  results: SearchResult[]
  count: number
}
