import { useNavigate } from 'react-router-dom'
import { Portfolio } from '@/types/portfolio'
import { formatCurrency, formatPercentage, getReturnColor } from '@/utils/formatters'
import { calculatePortfolioMetrics } from '@/utils/helpers'
import { usePortfolioStore } from '@/stores/portfolioStore'

interface PortfolioCardProps {
  portfolio: Portfolio
}

export const PortfolioCard = ({ portfolio }: PortfolioCardProps) => {
  const navigate = useNavigate()
  const { setSelectedPortfolio } = usePortfolioStore()

  const metrics = calculatePortfolioMetrics(portfolio.holdings)

  const handleClick = () => {
    setSelectedPortfolio(portfolio)
    navigate(`/portfolio/${portfolio.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="card hover:shadow-lg transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
            {portfolio.name}
          </h3>
          <p className="text-sm text-gray-500 capitalize">{portfolio.type}</p>
        </div>
        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
          {portfolio.holdings.length} holdings
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 my-4"></div>

      {/* Metrics */}
      <div className="space-y-3">
        {/* Current Value */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">Current Value</span>
          <span className="text-lg font-bold text-gray-900">
            {formatCurrency(metrics.currentValue)}
          </span>
        </div>

        {/* Returns */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">Total Return</span>
          <div className="text-right">
            <p className={`font-bold ${getReturnColor(metrics.totalReturn)}`}>
              {formatCurrency(metrics.totalReturn)}
            </p>
            <p className={`text-sm ${getReturnColor(metrics.returnPercentage)}`}>
              {formatPercentage(metrics.returnPercentage)}
            </p>
          </div>
        </div>

        {/* Invested Amount */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 text-sm">Amount Invested</span>
          <span className="text-gray-900 font-semibold">
            {formatCurrency(metrics.totalInvested)}
          </span>
        </div>
      </div>

      {/* Description */}
      {portfolio.description && (
        <p className="mt-4 pt-4 border-t border-gray-100 text-gray-600 text-sm line-clamp-2">
          {portfolio.description}
        </p>
      )}

      {/* Action */}
      <button className="mt-6 w-full btn btn-secondary text-sm">
        View Details →
      </button>
    </div>
  )
}
