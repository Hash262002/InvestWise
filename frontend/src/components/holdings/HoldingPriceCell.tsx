import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { authStore } from '../../stores/authStore';
import { API_URL } from '../../services/api';

interface HoldingPriceProps {
  symbol: string;
  quantity: number;
  averageCost: number;
}

/**
 * Simple price display for a holding in the table
 * Shows current price, change %, and P&L
 */
export default function HoldingPriceCell({ symbol, quantity, averageCost }: HoldingPriceProps) {
  const accessToken = authStore((state) => state.accessToken);
  const [price, setPrice] = useState<number | null>(null);
  const [changePercent, setChangePercent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrice();
    // Refresh every 5 minutes
    const interval = setInterval(fetchPrice, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [symbol, accessToken]);

  const fetchPrice = async () => {
    if (!accessToken) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/market/quote/${symbol}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch price');
      }

      const json = await response.json();
      if (json.success && json.data) {
        setPrice(json.data.price);
        setChangePercent(json.data.changePercent);
        setError(null);
      } else {
        setError(json.message || 'Failed to fetch price');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <span className="text-gray-400 text-sm">Loading...</span>;
  }

  if (error && !error.includes('fallback')) {
    return (
      <div className="text-xs">
        <span className="text-red-600 block">Error</span>
        <span className="text-gray-400">Avg: ₹{averageCost?.toFixed(2) || 'N/A'}</span>
      </div>
    );
  }

  // If we have no price or it's 0 (fallback), show unavailable
  if (price === undefined || price === null || price === 0) {
    return (
      <div className="text-xs">
        <span className="text-yellow-600 block">Unavailable</span>
        <span className="text-gray-400">Avg: ₹{averageCost?.toFixed(2) || 'N/A'}</span>
      </div>
    );
  }

  const currentValue = price * quantity;
  const investedValue = averageCost * quantity;
  const pl = currentValue - investedValue;
  const plPercent = investedValue > 0 ? (pl / investedValue) * 100 : 0;
  const isPositive = pl >= 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-900">₹{(price ?? 0).toFixed(2)}</span>
        <div className={`flex items-center gap-0.5 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {(changePercent ?? 0).toFixed(2)}%
        </div>
      </div>
      <div className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}₹{pl.toFixed(0)} ({isPositive ? '+' : ''}{plPercent.toFixed(1)}%)
      </div>
    </div>
  );
}
