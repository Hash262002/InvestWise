import { useEffect } from 'react'
import { Layout } from '@/components/layout/Layout'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useMarketData } from '@/hooks/useMarketData'
import { PortfolioList } from '@/components/portfolio/PortfolioList'
import { IndicesWidget } from '@/components/market/IndicesWidget'
import { CreatePortfolioModal } from '@/components/modal/CreatePortfolioModal'

export const HomePage = () => {
  const { fetchPortfolios, loading } = usePortfolio()
  const { indices } = useMarketData()

  useEffect(() => {
    fetchPortfolios()
  }, [fetchPortfolios])

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Manage your investment portfolios and track market trends</p>
        </div>

        {/* Market Indices */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <IndicesWidget />
        </div>

        {/* Portfolios Section */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Portfolios</h2>
          <PortfolioList isLoading={loading} />
        </div>
      </div>

      {/* Modals */}
      <CreatePortfolioModal />
    </Layout>
  )
}
