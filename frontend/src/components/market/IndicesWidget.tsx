import { useMarketData } from '@/hooks/useMarketData'
import { formatPercentage, getReturnColor, getReturnBgColor } from '@/utils/formatters'

export const IndicesWidget = () => {
  const { indices, loading } = useMarketData()

  if (loading) {
    return (
      <div className="col-span-full h-32 bg-gray-200 rounded-lg animate-pulse" />
    )
  }

  return (
    <div className="col-span-full">
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Market Indices</h3>
        
        {indices.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            Market data unavailable
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {indices.map((index) => (
              <div
                key={index.symbol}
                className={`p-4 rounded-lg ${getReturnBgColor(index.change)}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{index.name}</p>
                    <p className="text-xs text-gray-500">{index.symbol}</p>
                  </div>
                  <span className={`text-lg font-bold ${getReturnColor(index.change)}`}>
                    {formatPercentage(index.change)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  {index.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
