// ========================================
// Portfolio Detail Page
// ========================================
// Shows:
// - Portfolio summary and stats
// - Holdings list
// - Add/edit/delete holdings
// - Analyze button (triggers AI analysis)

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { portfolioAPI, analysisAPI } from '../services/api';
import PortfolioSummary from '../components/portfolio/PortfolioSummary';
import HoldingsList from '../components/holdings/HoldingsList';
import AddHoldingModal from '../components/holdings/AddHoldingModal';
import ImportPortfolioModal from '../components/imports/ImportPortfolioModal';
import AnalysisResults from '../components/analysis/AnalysisResults';

interface Holding {
  _id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  sector?: string;
  riskScore?: number;
  riskLevel?: string;
}

interface Portfolio {
  id: string;
  name: string;
  description?: string;
  type: string;
  totalInvested: number;
  currentValue: number;
  gainLoss?: number;
  currency: string;
  analysis?: any;
  holdings?: Holding[];
}

export default function PortfolioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showImportCsv, setShowImportCsv] = useState(false);

  // Analysis state
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch portfolio on mount
  useEffect(() => {
    console.log('[PortfolioPage] useParams extracted id:', id);
    if (!id) {
      console.error('[PortfolioPage] No ID found in URL params, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }
    fetchPortfolio();
  }, [id, navigate]);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await portfolioAPI.getPortfolio(id!);
      setPortfolio(response.data);
      setHoldings(response.data.holdings || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load portfolio';
      setError(errorMessage);
      console.error('Error fetching portfolio:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHoldingAdded = () => {
    setShowAddHolding(false);
    fetchPortfolio();
  };

  const handleHoldingDeleted = () => {
    fetchPortfolio();
  };

  // ── Analysis helpers ──

  const fetchAnalysis = useCallback(async () => {
    if (!id) return;
    try {
      const res = await analysisAPI.getAnalysis(id);
      if (res.data?.hasAnalysis) {
        setAnalysisData(res.data.analysis);
      }
    } catch {
      // Silently ignore — analysis may not exist yet
    }
  }, [id]);

  // Fetch existing analysis on mount
  useEffect(() => {
    if (id) fetchAnalysis();
  }, [id, fetchAnalysis]);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleAnalyze = async () => {
    if (!id || holdings.length === 0) return;
    try {
      setIsAnalyzing(true);
      setShowAnalysis(true);
      await analysisAPI.requestAnalysis(id, 'full');

      // Poll for results every 5 seconds (max 60 s)
      let elapsed = 0;
      pollRef.current = setInterval(async () => {
        elapsed += 5;
        try {
          const res = await analysisAPI.getAnalysis(id);
          if (res.data?.hasAnalysis) {
            const a = res.data.analysis;
            // Check if this is a fresh result (lastAnalyzedAt within last 2 min)
            const last = a.lastAnalyzedAt ? new Date(a.lastAnalyzedAt).getTime() : 0;
            if (Date.now() - last < 120_000) {
              setAnalysisData(a);
              setIsAnalyzing(false);
              if (pollRef.current) clearInterval(pollRef.current);
            }
          }
        } catch { /* keep polling */ }
        if (elapsed >= 60) {
          setIsAnalyzing(false);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 5000);
    } catch (err: any) {
      console.error('Analysis request failed:', err);
      setIsAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="card max-w-md">
          <div className="text-center">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-bold text-gray-900">{error || 'Portfolio not found'}</h3>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-primary mt-4"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const gainLoss = portfolio.currentValue - portfolio.totalInvested;
  const gainLossPercent = portfolio.totalInvested > 0 ? (gainLoss / portfolio.totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container-max py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{portfolio.name}</h1>
                {portfolio.description && (
                  <p className="text-gray-600 mt-1">{portfolio.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || holdings.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                {'\u0020'}<span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>🔍 Analyze Portfolio</>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-max py-8">
        {/* Portfolio Summary */}
        <PortfolioSummary
          totalInvested={portfolio.totalInvested}
          currentValue={portfolio.currentValue}
          gainLoss={gainLoss}
          gainLossPercent={gainLossPercent}
          currency={portfolio.currency}
        />

        {/* Analysis Results */}
        {showAnalysis || analysisData ? (
          <div className="mt-8">
            {analysisData ? (
              <AnalysisResults
                analysis={analysisData}
                currency={portfolio.currency}
                onReAnalyze={handleAnalyze}
                isAnalyzing={isAnalyzing}
              />
            ) : (
              <div className="card text-center py-12">
                <div className="spinner mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Running AI analysis...</p>
                <p className="text-gray-400 text-sm mt-1">This may take up to a minute</p>
              </div>
            )}
          </div>
        ) : null}

        {/* Holdings Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Holdings</h2>
              <p className="text-gray-600 mt-1">{holdings.length} holding{holdings.length === 1 ? '' : 's'}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportCsv(true)}
                className="btn-secondary"
              >
                📥 Import CSV
              </button>
              <button
                onClick={() => setShowAddHolding(true)}
                className="btn-primary"
              >
                + Add Holding
              </button>
            </div>
          </div>

          {holdings.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-600 font-medium">No holdings yet</p>
              <p className="text-gray-500 text-sm mb-4">Add your first investment to this portfolio</p>
              <button
                onClick={() => setShowAddHolding(true)}
                className="btn-primary mx-auto"
              >
                Add Holding
              </button>
            </div>
          ) : (
            <HoldingsList
              portfolioId={portfolio.id}
              holdings={holdings}
              onHoldingDeleted={handleHoldingDeleted}
            />
          )}
        </div>
      </main>

      {/* Add Holding Modal */}
      {showAddHolding && (
        <AddHoldingModal
          portfolioId={portfolio.id}
          onClose={() => setShowAddHolding(false)}
          onSuccess={handleHoldingAdded}
        />
      )}

      {/* Import CSV Modal */}
      {showImportCsv && (
        <ImportPortfolioModal
          portfolioId={portfolio.id}
          onClose={() => setShowImportCsv(false)}
          onSuccess={handleHoldingAdded}
        />
      )}
    </div>
  );
}
