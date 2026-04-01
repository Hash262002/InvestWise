import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useUIStore } from '@/stores/uiStore'
import { HoldingsTable } from '@/components/portfolio/HoldingsTable'
import { PortfolioStats } from '@/components/portfolio/PortfolioStats'
import { CreatePortfolioModal } from '@/components/modal/CreatePortfolioModal'
import { ImportCSVModal } from '@/components/modal/ImportCSVModal'
import { AnalysisModal } from '@/components/modal/AnalysisModal'
import { formatDate, formatCurrency, formatPercentage, getReturnColor } from '@/utils/formatters'
import { calculatePortfolioMetrics } from '@/utils/helpers'

export const PortfolioDetailPage = () => {
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false)
  const { id } = useParams<{ id: string }>()
  const toggleAddHoldingModal = useUIStore((state) => state.toggleAddHoldingModal)
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
          <div className="flex flex-col gap-3 items-end">
            <div className="text-right">
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="text-gray-900 font-semibold">{selectedPortfolio.createdAt ? formatDate(selectedPortfolio.createdAt) : 'N/A'}</p>
            </div>
            <button
              onClick={() => setIsAnalysisModalOpen(true)}
              className="btn btn-primary text-sm"
            >
              📊 Analyse Portfolio
            </button>
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
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Holdings</h2>
            <button
              onClick={() => toggleAddHoldingModal()}
              className="btn btn-primary text-sm"
            >
              + Import Holdings
            </button>
      {id && <AnalysisModal portfolioId={id} isOpen={isAnalysisModalOpen} onClose={() => setIsAnalysisModalOpen(false)} />}
          </div>
          <HoldingsTable holdings={selectedPortfolio.holdings} />
        </div>
      </div>

      {/* Modals */}
      <CreatePortfolioModal />
      {id && <ImportCSVModal portfolioId={id} onSuccess={() => fetchPortfolioById(id)} />}
    </Layout>
  )
}
