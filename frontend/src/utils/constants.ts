// Constants
export const PORTFOLIO_TYPES = [
  { value: 'long-term', label: 'Long-term Investment' },
  { value: 'short-term', label: 'Short-term Trading' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'growth', label: 'Growth' },
  { value: 'other', label: 'Other' },
]

export const CURRENCIES = [
  { value: 'INR', label: '₹ Indian Rupee' },
  { value: 'USD', label: '$ US Dollar' },
  { value: 'EUR', label: '€ Euro' },
  { value: 'GBP', label: '£ British Pound' },
]

export const SENTIMENT_COLORS = {
  bullish: 'text-green-600',
  neutral: 'text-gray-600',
  bearish: 'text-red-600',
}

export const SENTIMENT_BG_COLORS = {
  bullish: 'bg-green-50',
  neutral: 'bg-gray-50',
  bearish: 'bg-red-50',
}

export const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']

export const ASSET_TYPES = [
  { value: 'equity', label: 'Equity (Stocks)' },
  { value: 'mutual-fund', label: 'Mutual Funds' },
  { value: 'etf', label: 'ETFs' },
  { value: 'bond', label: 'Bonds' },
  { value: 'commodity', label: 'Commodities' },
  { value: 'crypto', label: 'Cryptocurrency' },
]

export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
}

export const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '30000')
