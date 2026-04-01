import { useState, useEffect } from 'react'
import { usePortfolioStore } from '@/stores/portfolioStore'
import { triggerPortfolioAnalysis, getAnalysisStatus } from '@/services/analysisService'

interface AnalysisModalProps {
  portfolioId: string
  isOpen: boolean
  onClose: () => void
}

// Helper functions for colors
const getSentimentBgColor = (sentiment: string | null | undefined): string => {
  switch (sentiment?.toLowerCase()) {
    case 'bullish':
      return 'bg-green-100 text-green-700'
    case 'bearish':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getRecommendationBgColor = (recommendation: string | null | undefined): string => {
  const rec = recommendation?.toLowerCase()
  switch (rec) {
    case 'buy':
      return 'bg-green-100 text-green-700'
    case 'strong_buy':
      return 'bg-green-200 text-green-800'
    case 'sell':
      return 'bg-red-100 text-red-700'
    case 'strong_sell':
      return 'bg-red-200 text-red-800'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getRiskLevelColor = (riskLevel: string | undefined): string => {
  const level = riskLevel?.toLowerCase()
  switch (level) {
    case 'low':
      return 'bg-green-100 text-green-700'
    case 'moderate':
      return 'bg-yellow-100 text-yellow-700'
    case 'high':
      return 'bg-orange-100 text-orange-700'
    case 'very_high':
      return 'bg-red-100 text-red-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const getSectorConcentrationColor = (concentration: number): string => {
  if (concentration > 40) return 'bg-red-500'
  if (concentration > 25) return 'bg-yellow-500'
  return 'bg-green-500'
}

export const AnalysisModal = ({ portfolioId, isOpen, onClose }: AnalysisModalProps) => {
  const selectedPortfolio = usePortfolioStore((state) => state.selectedPortfolio)
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null)

  // Cleanup polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [pollInterval])

  const startReAnalysis = async () => {
    if (!selectedPortfolio) return
    
    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      // Trigger analysis
      await triggerPortfolioAnalysis(portfolioId)

      // Start polling for completion
      let attempts = 0
      const maxAttempts = 120 // 2 minutes max

      const timer = setInterval(async () => {
        attempts++

        try {
          const status = await getAnalysisStatus(portfolioId)

          if (status.status === 'completed') {
            clearInterval(timer)
            setPollInterval(null)
            
            // Refresh the portfolio to get updated analysis
            // For now, we'll update the selectedPortfolio with the new analysis
            setIsAnalyzing(false)
            
            // Refetch portfolio data - in a real app, you'd call a fetch to get the updated portfolio
            // For now, just mark as completed
            console.log('Analysis completed successfully')
          } else if (status.status === 'failed') {
            clearInterval(timer)
            setPollInterval(null)
            setAnalysisError('Analysis failed. Please try again.')
            setIsAnalyzing(false)
          } else if (attempts >= maxAttempts) {
            clearInterval(timer)
            setPollInterval(null)
            setAnalysisError('Analysis took too long. Please try again.')
            setIsAnalyzing(false)
          }
        } catch (err) {
          // Continue polling even if status check fails temporarily
          if (err instanceof Error) {
            console.debug('Status check failed, continuing poll:', err.message)
          }
        }
      }, 1000)

      setPollInterval(timer)
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Failed to start analysis')
      setIsAnalyzing(false)
    }
  }

  const handleClose = () => {
    if (pollInterval) clearInterval(pollInterval)
    setIsAnalyzing(false)
    setAnalysisError(null)
    onClose()
  }

  if (!isOpen) return null

  const portfolio = selectedPortfolio
  const hasAnalysis = portfolio?.analytics?.lastAnalysis && Object.keys(portfolio.analytics.lastAnalysis).length > 0
  const analysis = portfolio?.analytics?.lastAnalysis
  const isProcessing = isAnalyzing

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-gray-900">Portfolio Analysis</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isProcessing && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing Your Portfolio</h3>
              <p className="text-gray-600">
                Our AI is analyzing your holdings and market trends. This may take a moment...
              </p>
            </div>
          )}

          {analysisError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 font-medium">{analysisError}</p>
            </div>
          )}

          {!isProcessing && hasAnalysis ? (
            <div className="space-y-6">
              {/* Executive Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{portfolio?.name}</h3>
                  {portfolio?.analytics?.lastAnalyzedAt && (
                    <p className="text-sm text-gray-600">
                      Analyzed on {new Date(portfolio.analytics.lastAnalyzedAt).toLocaleString()}
                      {portfolio?.analytics?.processingTime && (
                        <span> • Processing time: {(portfolio.analytics.processingTime / 1000).toFixed(1)}s</span>
                      )}
                    </p>
                  )}
                </div>
                {analysis?.summary && (
                  <div className="bg-white rounded p-4">
                    <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
                  </div>
                )}
              </div>

              {/* Metrics */}
              {analysis?.metrics && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Portfolio Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Total Return</p>
                      <p className={`text-2xl font-bold ${
                        (analysis.metrics.totalReturn ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(analysis.metrics.totalReturn ?? 0) >= 0 ? '+' : ''}{((analysis.metrics.totalReturn) ?? 0).toFixed(2)}%
                      </p>
                    </div>
                    {analysis.metrics.annualizedReturn !== null && analysis.metrics.annualizedReturn !== undefined && (
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Annualized Return</p>
                        <p className={`text-2xl font-bold ${
                          (analysis.metrics.annualizedReturn) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(analysis.metrics.annualizedReturn) >= 0 ? '+' : ''}{((analysis.metrics.annualizedReturn) ?? 0).toFixed(2)}%
                        </p>
                      </div>
                    )}
                    {analysis.metrics.volatility !== null && analysis.metrics.volatility !== undefined && (
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Volatility</p>
                        <p className="text-2xl font-bold text-blue-600">{((analysis.metrics.volatility) ?? 0).toFixed(2)}%</p>
                      </div>
                    )}
                    {analysis.metrics.sharpeRatio !== null && analysis.metrics.sharpeRatio !== undefined && (
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Sharpe Ratio</p>
                        <p className="text-2xl font-bold text-indigo-600">{((analysis.metrics.sharpeRatio) ?? 0).toFixed(2)}</p>
                      </div>
                    )}
                    {analysis.metrics.maxDrawdown !== null && analysis.metrics.maxDrawdown !== undefined && (
                      <div>
                        <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Max Drawdown</p>
                        <p className="text-2xl font-bold text-orange-600">{((analysis.metrics.maxDrawdown) ?? 0).toFixed(2)}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Risk Assessment */}
              {analysis?.riskAssessment && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Risk Assessment</h4>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded font-bold text-white text-sm ${getRiskLevelColor(analysis.riskAssessment.riskLevel)}`}>
                        {(analysis.riskAssessment.riskLevel ?? 'Moderate').toUpperCase()}
                      </span>
                      <span className="text-gray-700">Risk Level</span>
                    </div>
                    
                    {analysis.riskAssessment.diversificationScore !== undefined && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Diversification Score</span>
                            <span className="text-lg font-bold text-blue-600">{analysis.riskAssessment.diversificationScore}/100</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${(analysis.riskAssessment.diversificationScore ?? 0)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sector Concentration */}
                  {analysis.riskAssessment.sectorConcentration && Object.keys(analysis.riskAssessment.sectorConcentration).length > 0 && (
                    <div className="mb-6">
                      <h5 className="text-sm font-semibold text-gray-900 mb-3">Sector Concentration</h5>
                      <div className="space-y-3">
                        {Object.entries(analysis.riskAssessment.sectorConcentration).map(([sector, concentration]) => (
                          <div key={sector}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium text-gray-700">{sector}</span>
                              <span className="text-sm font-bold text-gray-900">{Number(concentration).toFixed(2)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${getSectorConcentrationColor(Number(concentration))}`}
                                style={{ width: `${Math.min(Number(concentration), 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {analysis.riskAssessment.warnings && analysis.riskAssessment.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
                      <h5 className="text-sm font-semibold text-yellow-900 mb-2">Warnings</h5>
                      <ul className="space-y-1">
                        {analysis.riskAssessment.warnings.map((warning, idx) => (
                          <li key={`warning-${idx}-${warning.substring(0, 20)}`} className="text-sm text-yellow-800 flex items-start gap-2">
                            <span className="mt-1">⚠️</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Holdings Analysis */}
              {portfolio?.holdings && portfolio.holdings.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Holdings Analysis</h4>
                  <div className="space-y-4">
                    {portfolio.holdings.map((holding) => (
                      <div key={holding._id || holding.symbol} className="border border-gray-200 rounded p-4 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-gray-900">{holding.symbol}</p>
                            <p className="text-sm text-gray-600">{holding.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Qty: {holding.quantity}</p>
                            <p className="font-semibold text-gray-900">₹{holding.currentValue.toLocaleString()}</p>
                          </div>
                        </div>

                        {holding.analysis && (holding.analysis.sentiment || holding.analysis.recommendation) && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {holding.analysis.sentiment && (
                                <span className={`px-2 py-1 text-xs font-bold rounded ${getSentimentBgColor(holding.analysis.sentiment)}`}>
                                  {holding.analysis.sentiment.toUpperCase()}
                                </span>
                              )}
                              {holding.analysis.recommendation && (
                                <span className={`px-2 py-1 text-xs font-bold rounded ${getRecommendationBgColor(holding.analysis.recommendation)}`}>
                                  {holding.analysis.recommendation.toUpperCase().split('_').join(' ')}
                                </span>
                              )}
                            </div>
                            {holding.analysis.summary && (
                              <p className="text-sm text-gray-600 leading-relaxed">{holding.analysis.summary}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis?.recommendations && analysis.recommendations.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Portfolio Recommendations</h4>
                  <div className="space-y-3">
                    {analysis.recommendations.slice(0, 10).map((rec, idx) => (
                      <div key={`rec-${idx}-${rec.symbol || rec.type}`} className="flex items-start gap-3 p-3 bg-gray-50 rounded border border-gray-100">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{rec.description}</p>
                          {rec.symbol && <p className="text-sm text-gray-600">Symbol: {rec.symbol}</p>}
                        </div>
                        {rec.type && (
                          <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-700 whitespace-nowrap">
                            {rec.type.split('_').join(' ')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No Analysis Available</h3>
              <p className="text-gray-600">
                This portfolio hasn't been analyzed yet. Perform an analysis to see insights.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="btn btn-secondary flex-1"
            disabled={isProcessing}
          >
            Close
          </button>
          <button
            onClick={startReAnalysis}
            className="btn btn-primary flex-1"
            disabled={isProcessing}
          >
            {isProcessing ? 'Analyzing...' : 'Re-Analyze Portfolio'}
          </button>
        </div>
      </div>
    </div>
  )
}
