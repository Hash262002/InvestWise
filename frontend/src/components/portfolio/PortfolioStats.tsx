import { Portfolio } from '@/types/portfolio'
import { formatCurrency, formatPercentage, getReturnColor, getReturnBgColor } from '@/utils/formatters'

interface PortfolioStatsProps {
  portfolio: Portfolio
  metrics: {
    totalInvested: number
    currentValue: number
    totalReturn: number
    returnPercentage: number
  }
}

export const PortfolioStats = ({ portfolio, metrics }: PortfolioStatsProps) => {
  const diversificationScore = portfolio.holdings.length > 0 
    ? Math.min((portfolio.holdings.length / 10) * 100, 100) 
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Invested */}
      <div className="card">
        <p className="text-gray-600 text-sm font-medium mb-1">Amount Invested</p>
        <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.totalInvested)}</p>
        <p className="text-gray-500 text-xs mt-2">{portfolio.holdings.length} holdings</p>
      </div>

      {/* Current Value */}
      <div className="card">
        <p className="text-gray-600 text-sm font-medium mb-1">Current Value</p>
        <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.currentValue)}</p>
        <p className="text-gray-500 text-xs mt-2">Market price</p>
      </div>

      {/* Total Return */}
      <div className={`card ${getReturnBgColor(metrics.totalReturn)}`}>
        <p className="text-gray-600 text-sm font-medium mb-1">Total Return</p>
        <p className={`text-3xl font-bold ${getReturnColor(metrics.totalReturn)}`}>
          {formatCurrency(metrics.totalReturn)}
        </p>
        <p className={`text-xs font-semibold mt-2 ${getReturnColor(metrics.returnPercentage)}`}>
          {formatPercentage(metrics.returnPercentage)}
        </p>
      </div>

      {/* Diversification Score */}
      <div className="card">
        <p className="text-gray-600 text-sm font-medium mb-1">Diversification</p>
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold text-gray-900">{Math.round(diversificationScore)}%</p>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600"
            style={{ width: `${diversificationScore}%` }}
          />
        </div>
      </div>
    </div>
  )
}
