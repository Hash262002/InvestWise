import { Holding } from '@/types/portfolio'
import { formatCurrency, formatPercentage, getReturnColor, getReturnBgColor } from '@/utils/formatters'

interface HoldingsTableProps {
  holdings: Holding[]
}

export const HoldingsTable = ({ holdings }: HoldingsTableProps) => {
  if (holdings.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">No holdings in this portfolio</p>
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Symbol</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Quantity</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Avg. Cost</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Current Price</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Total Cost</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Current Value</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">Return</th>
            <th className="text-left py-4 px-6 text-sm font-semibold text-gray-900">%</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding) => {
            const returnAmount = holding.currentValue - holding.totalCost
            const returnPercent = (returnAmount / holding.totalCost) * 100

            return (
              <tr
                key={holding.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${getReturnBgColor(
                  returnPercent
                )}`}
              >
                <td className="py-4 px-6">
                  <div>
                    <p className="font-semibold text-gray-900">{holding.symbol}</p>
                    <p className="text-xs text-gray-500 capitalize">{holding.assetType}</p>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-gray-900 font-medium">{holding.quantity}</td>
                <td className="py-4 px-6 text-sm text-gray-900">
                  {formatCurrency(holding.averageCost)}
                </td>
                <td className="py-4 px-6 text-sm text-gray-900">
                  {formatCurrency(holding.currentPrice)}
                </td>
                <td className="py-4 px-6 text-sm text-gray-900">{formatCurrency(holding.totalCost)}</td>
                <td className="py-4 px-6 text-sm font-semibold text-gray-900">
                  {formatCurrency(holding.currentValue)}
                </td>
                <td className={`py-4 px-6 text-sm font-semibold ${getReturnColor(returnAmount)}`}>
                  {formatCurrency(returnAmount)}
                </td>
                <td className={`py-4 px-6 text-sm font-semibold ${getReturnColor(returnPercent)}`}>
                  {formatPercentage(returnPercent)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
