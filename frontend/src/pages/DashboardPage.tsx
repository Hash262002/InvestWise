// ========================================
// Dashboard Page
// ========================================
// Main dashboard showing:
// - User's portfolios
// - Quick stats
// - Create new portfolio
// - Portfolio summary

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/authStore';
import { portfolioAPI } from '../services/api';
import CreatePortfolioModal from '../components/portfolio/CreatePortfolioModal';
import PortfolioCard from '../components/portfolio/PortfolioCard';
import MarketSummary from '../components/MarketSummary';

interface Portfolio {
  id: string;
  name: string;
  description?: string;
  type: string;
  totalInvested: number;
  currentValue: number;
  user: string;
  createdAt: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch portfolios on mount
  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await portfolioAPI.getPortfolios();
      console.log('[DashboardPage] API response:', response);
      console.log('[DashboardPage] Portfolios:', response.data);
      setPortfolios(response.data || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load portfolios';
      setError(errorMessage);
      console.error('Error fetching portfolios:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePortfolioCreated = () => {
    setShowCreateModal(false);
    fetchPortfolios();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Calculate totals
  const totalInvested = portfolios.reduce((sum, p) => sum + p.totalInvested, 0);
  const totalValue = portfolios.reduce((sum, p) => sum + p.currentValue, 0);
  const totalGainLoss = totalValue - totalInvested;
  const gainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container-max py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.firstName}!</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-max py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Total Invested */}
          <div className="card">
            <p className="text-gray-600 text-sm font-medium">Total Invested</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">
              ₹{totalInvested.toLocaleString('en-IN')}
            </h3>
          </div>

          {/* Current Value */}
          <div className="card">
            <p className="text-gray-600 text-sm font-medium">Current Value</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-2">
              ₹{totalValue.toLocaleString('en-IN')}
            </h3>
          </div>

          {/* Total Gain/Loss */}
          <div className="card">
            <p className="text-gray-600 text-sm font-medium">Total Gain/Loss</p>
            <h3 className={`text-2xl font-bold mt-2 ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalGainLoss >= 0 ? '+' : ''}₹{Math.abs(totalGainLoss).toLocaleString('en-IN')}
            </h3>
            <p className={`text-sm mt-1 ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalGainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Market Summary & Portfolios Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolios Section - 2 columns */}
          <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your Portfolios</h2>
              <p className="text-gray-600 mt-1">{portfolios.length} portfolio{portfolios.length === 1 ? '' : 's'}</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              + New Portfolio
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-6">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="spinner" />
            </div>
          )}

          {/* Portfolios Grid */}
          {!loading && portfolios.length === 0 ? (
            <div className="card text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-600 font-medium">No portfolios yet</p>
              <p className="text-gray-500 text-sm mb-4">Create your first portfolio to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary mx-auto"
              >
                Create Portfolio
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolios.map((portfolio) => (
                <PortfolioCard
                  key={portfolio.id}
                  portfolio={portfolio}
                  onSelect={() => navigate(`/portfolio/${portfolio.id}`)}
                />
              ))}
            </div>
          )}
        </div>

          {/* Market Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="card">
              <MarketSummary 
                region="IN"
                autoRefresh={true}
                refreshInterval={5 * 60 * 1000}
                limit={5}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Create Portfolio Modal */}
      {showCreateModal && (
        <CreatePortfolioModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePortfolioCreated}
        />
      )}
    </div>
  );
}
