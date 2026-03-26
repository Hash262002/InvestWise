import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import { authStore } from '../stores/authStore';
import { API_URL } from '../services/api';

interface MarketIndex {
  symbol: string;
  shortName: string;
  longName: string;
  price: number;
  change: number;
  changePercent: number;
  marketState: string;
  timestamp: number;
}

interface MarketSummaryProps {
  region?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
  limit?: number;
}

/**
 * MarketSummary Component
 * Displays market indices like SENSEX, NIFTY, and global indices
 * Shows market sentiment with color coding
 */
const MarketSummary: React.FC<MarketSummaryProps> = ({
  region = 'IN',
  autoRefresh = true,
  refreshInterval = 5 * 60 * 1000, // 5 minutes
  limit = 5 // Show top 5 indices by default
}) => {
  const accessToken = authStore((state) => state.accessToken);
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSummary = async () => {
    if (!accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/market/summary?region=${region}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch market summary: ${response.statusText}`);
      }

      const json = await response.json();

      if (json.success) {
        // Handle empty data (rate limited)
        if (!json.data || json.data.length === 0) {
          setError(json.message || 'Market data temporarily unavailable');
          setIndices([]);
          setLoading(false);
          return;
        }
        
        // Sort by change percent and limit
        const sorted = json.data
          .sort((a: MarketIndex, b: MarketIndex) => 
            Math.abs(b.changePercent) - Math.abs(a.changePercent)
          )
          .slice(0, limit);
        
        setIndices(sorted);
        setLastUpdated(new Date());
      } else {
        setError(json.message || 'Failed to fetch market summary');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Market summary fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [region, accessToken]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchSummary, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, region, accessToken]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900">Error Loading Market Data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchSummary}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading && indices.length === 0) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Market Summary</h2>
        <button
          onClick={fetchSummary}
          disabled={loading}
          title="Refresh market data"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-5 w-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Indices List */}
      <div className="space-y-2">
        {indices.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No market data available</p>
        ) : (
          indices.map((index) => {
            const isPositive = index.change >= 0;
            
            return (
              <div
                key={index.symbol}
                className={`rounded-lg border p-4 transition-all ${
                  isPositive
                    ? 'bg-green-50 border-green-200 hover:border-green-300'
                    : 'bg-red-50 border-red-200 hover:border-red-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Index Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">
                        {index.shortName}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded ${
                        isPositive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {isPositive ? 'Up' : 'Down'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {index.longName}
                    </p>
                  </div>

                  {/* Price & Change */}
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      {typeof index.price === 'number' 
                        ? index.price.toLocaleString('en-IN', { 
                            maximumFractionDigits: 2 
                          })
                        : 'N/A'
                      }
                    </p>
                    <p className={`text-sm font-semibold ${
                      isPositive ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {isPositive ? '+' : ''}{index.change.toFixed(2)}
                      <span className="ml-1">
                        ({isPositive ? '+' : ''}{index.changePercent.toFixed(2)}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Last Updated */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
        <div className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          <span>
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString()}`
              : 'Not updated yet'
            }
          </span>
        </div>
        {autoRefresh && (
          <span>Auto-refresh every {Math.round(refreshInterval / 60000)} min</span>
        )}
      </div>

      {/* Market Status Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700 font-medium">
          💡 Tip: Indices are updated with ~15 min delay on free tier
        </p>
      </div>
    </div>
  );
};

export default MarketSummary;
