import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, Calendar } from 'lucide-react';
import { authStore } from '../stores/authStore';
import { API_URL } from '../services/api';

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartData {
  symbol: string;
  candles: Candle[];
}

interface PriceChartProps {
  symbol: string;
  range?: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y';
  interval?: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo';
  height?: number;
}

const PriceChart: React.FC<PriceChartProps> = ({
  symbol,
  range = '1mo',
  interval = '1d',
  height = 400,
}) => {
  const token = authStore((state) => state.accessToken);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState(range);
  const [showVolume, setShowVolume] = useState(false);

  const fetchChart = async (timeRange: string) => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/market/chart/${symbol}?range=${timeRange}&interval=1d`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch chart: ${response.statusText}`);
      }

      const json = await response.json();

      if (json.success) {
        // Format data for Recharts
        const formatted = json.data.candles.map((candle: Candle) => ({
          timestamp: new Date(candle.timestamp).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric'
          }),
          date: new Date(candle.timestamp),
          close: candle.close,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          volume: candle.volume
        }));

        setChartData({
          symbol: json.data.symbol,
          candles: formatted
        });
      } else {
        setError(json.message || 'Failed to fetch chart data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Chart fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChart(selectedRange);
  }, [symbol, token, selectedRange]);

  const rangeOptions: Array<{ value: typeof selectedRange; label: string }> = [
    { value: '1d', label: '1D' },
    { value: '5d', label: '5D' },
    { value: '1mo', label: '1M' },
    { value: '3mo', label: '3M' },
    { value: '6mo', label: '6M' },
    { value: '1y', label: '1Y' },
    { value: '5y', label: '5Y' },
  ];

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-red-900">Error Loading Chart</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !chartData) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6"
        style={{ height }}>
        <div className="animate-pulse h-full bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{symbol}</h3>
          <p className="text-sm text-gray-500">
            {chartData.candles.length} data points
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Range Selector */}
          <div className="flex gap-1">
            {rangeOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelectedRange(value)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  selectedRange === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Volume Toggle */}
          <button
            onClick={() => setShowVolume(!showVolume)}
            title="Toggle Volume"
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              showVolume
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Vol
          </button>
        </div>
      </div>

      {/* Price Chart */}
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData.candles}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              domain={['dataMin - 10', 'dataMax + 10']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value) => value != null ? `₹${Number(value).toFixed(2)}` : ''}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#3b82f6"
              dot={false}
              strokeWidth={2}
              name="Close Price"
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Volume Chart */}
      {showVolume && (
        <div className="w-full" style={{ height: 150 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.candles}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value) => value != null ? `${(Number(value) / 1000000).toFixed(1)}M` : ''}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Bar
                dataKey="volume"
                fill="#a78bfa"
                name="Volume"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
        {(() => {
          const closes = chartData.candles.map(c => c.close);
          const high = Math.max(...closes);
          const low = Math.min(...closes);
          const first = closes[0];
          const last = closes[closes.length - 1];
          const change = ((last - first) / first) * 100;

          return (
            <>
              <div>
                <p className="text-xs text-gray-500 font-medium">High</p>
                <p className="text-lg font-semibold text-gray-900">
                  ₹{high.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Low</p>
                <p className="text-lg font-semibold text-gray-900">
                  ₹{low.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Change</p>
                <p className={`text-lg font-semibold ${
                  change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Avg Volume</p>
                <p className="text-lg font-semibold text-gray-900">
                  {(chartData.candles.reduce((sum, c) => sum + c.volume, 0) / chartData.candles.length / 1000000).toFixed(1)}M
                </p>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default PriceChart;
