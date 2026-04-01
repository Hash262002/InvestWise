import { Portfolio } from '@/types/portfolio'
import { PortfolioCard } from './PortfolioCard'
import { usePortfolioStore } from '@/stores/portfolioStore'
import { useUIStore } from '@/stores/uiStore'

interface PortfolioListProps {
  isLoading?: boolean
}

export const PortfolioList = ({ isLoading = false }: PortfolioListProps) => {
  const { portfolios } = usePortfolioStore()
  const { toggleCreatePortfolioModal } = useUIStore()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (portfolios.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 space-y-3">
          <p className="text-lg font-medium">No portfolios yet</p>
          <p className="text-sm">Create your first portfolio to get started</p>
          <button onClick={() => toggleCreatePortfolioModal()} className="btn btn-primary mt-4">
            Create Portfolio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {portfolios.map((portfolio) => (
        <PortfolioCard key={portfolio.id} portfolio={portfolio} />
      ))}
    </div>
  )
}
