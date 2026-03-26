import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import { authStore } from '../stores/authStore';
import { API_URL } from '../services/api';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  timestamp: number;
}

interface PriceDisplayProps {
  symbol: string;
  quantity?: number;
  averageCost?: number;
  showChart?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * PriceDisplay Component
 * Shows live price data for a stock symbol with change indicators
 * Supports auto-refresh polling
 */
const PriceDisplay: React.FC<PriceDisplayProps> = ({
  symbol,
  quantity,
  averageCost,
  showChart = false,
  autoRefresh = true,
  refreshInterval = 5 * 60 * 1000, // 5 minutes default
}) => {
  const token = authStore((state) => state.accessToken);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Calculate P&L if we have cost and quantity
  const calculatePL = () => {
    if (!priceData || !quantity || !averageCost) return null;
    
    const currentValue = priceData.price * quantity;
    const investedValue = averageCost * quantity;
    const pl = currentValue - investedValue;
    const plPercent = (pl / investedValue) * 100;
    
    return {
      pl,
      plPercent,
      currentValue,
      investedValue
    };
  };

  // Fetch price data from API
  const fetchPrice = async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/market/quote/${symbol}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch price: ${response.statusText}`);
      }

      const json = await response.json();
      
      if (json.success) {
        setPriceData(json.data);
        setLastUpdated(new Date());
      } else {
        setError(json.message || 'Failed to fetch price data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Price fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPrice();
  }, [symbol, token]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, symbol, token]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900">Error Loading Price</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchPrice}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!priceData) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-8 bg-gray-200 rounded w-32"></div>
        <div className="h-6 bg-gray-200 rounded w-24"></div>
      </div>
    );
  }

  const isPositive = priceData.change >= 0;
  const pl = calculatePL();

  return (
    <div className="space-y-4">
      {/* Current Price Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">{symbol}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-gray-900">
                ₹{priceData.price.toFixed(2)}
              </span>
              <span className="text-sm text-gray-500">{priceData.currency}</span>
            </div>
          </div>
          
          {/* Change Indicator */}
          <div className={`text-right ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <div className="flex items-center justify-end gap-1">
              {isPositive ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
              <div>
                <p className="font-semibold">
                  {isPositive ? '+' : ''}{priceData.change.toFixed(2)}
                </p>
                <p className="text-sm">
                  {isPositive ? '+' : ''}{priceData.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Info */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200">
          <RefreshCw className="h-4 w-4 text-gray-400" />
          <p className="text-xs text-gray-500">
            {lastUpdated 
              ? `Updated ${lastUpdated.toLocaleTimeString()}`
              : 'Loading...'}
          </p>
          {autoRefresh && (
            <p className="text-xs text-gray-400 ml-auto">
              Auto-refresh every {Math.round(refreshInterval / 60000)} min
            </p>
          )}
        </div>
      </div>

      {/* Quantity & Cost Section */}
      {quantity && averageCost && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-blue-600 font-medium">Quantity</p>
              <p className="text-lg font-semibold text-blue-900">{quantity}</p>
            </div>
            <div>
              <p className="text-xs text-blue-600 font-medium">Avg Cost</p>
              <p className="text-lg font-semibold text-blue-900">
                ₹{averageCost.toFixed(2)}
              </p>
            </div>
          </div>

          {pl && (
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Invested</p>
                  <p className="text-lg font-semibold text-blue-900">
                    ₹{pl.investedValue.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 font-medium">Current Value</p>
                  <p className="text-lg font-semibold text-blue-900">
                    ₹{pl.currentValue.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* P&L Indicator */}
              <div className={`mt-4 p-3 rounded-md ${
                pl.pl >= 0 
                  ? 'bg-green-100 border border-green-300' 
                  : 'bg-red-100 border border-red-300'
              }`}>
                <p className={`text-sm font-medium ${
                  pl.pl >= 0 ? 'text-green-800' : 'text-red-800'
                }`}>
                  Profit & Loss
                </p>
                <p className={`text-2xl font-bold ${
                  pl.pl >= 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  {pl.pl >= 0 ? '+' : ''}₹{pl.pl.toFixed(2)}
                  <span className="text-sm ml-2">
                    ({pl.pl >= 0 ? '+' : ''}{pl.plPercent.toFixed(2)}%)
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <button
        onClick={fetchPrice}
        disabled={loading}
        className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Refresh Price
      </button>
    </div>
  );
};

export default PriceDisplay;
