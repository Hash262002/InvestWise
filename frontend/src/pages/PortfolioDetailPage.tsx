import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { usePortfolio } from '@/hooks/usePortfolio'
import { HoldingsTable } from '@/components/portfolio/HoldingsTable'
import { PortfolioStats } from '@/components/portfolio/PortfolioStats'
import { formatDate, formatCurrency, formatPercentage, getReturnColor } from '@/utils/formatters'
import { calculatePortfolioMetrics } from '@/utils/helpers'

export const PortfolioDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { selectedPortfolio, fetchPortfolioById, loading } = usePortfolio()

  useEffect(() => {
    if (id) {
      fetchPortfolioById(id)
    }
  }, [id, fetchPortfolioById])

  if (loading || !selectedPortfolio) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-1/3" />
          <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </Layout>
    )
  }

  const metrics = calculatePortfolioMetrics(selectedPortfolio.holdings)

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <button
              onClick={() => navigate('/home')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-3 flex items-center gap-1"
            >
              ← Back to Portfolios
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{selectedPortfolio.name}</h1>
            <p className="text-gray-600 mt-2 capitalize">{selectedPortfolio.type}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-gray-900 font-semibold">{selectedPortfolio.createdAt ? formatDate(selectedPortfolio.createdAt) : 'N/A'}</p>
          </div>
        </div>

        {/* Portfolio Stats */}
        <PortfolioStats portfolio={selectedPortfolio} metrics={metrics} />

        {/* Description */}
        {selectedPortfolio.description && (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-600">{selectedPortfolio.description}</p>
          </div>
        )}

        {/* Holdings Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">Holdings</h2>
          <HoldingsTable holdings={selectedPortfolio.holdings} />
        </div>
      </div>
    </Layout>
  )
}
