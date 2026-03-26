// ========================================
// Holding Analysis Table
// ========================================
// Displays per-holding AI analysis results

import { useState, Fragment } from 'react';

interface HoldingAnalysis {
  symbol: string;
  name: string;
  sector: string;
  quantity: number;
  averageCost: number;
  currentPrice: number;
  currentValue: number;
  totalCost: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  portfolioWeightPct: number;
  concentrationRisk: boolean;
  riskLevel: string;
  recommendation: string;
  recommendationReason: string;
}

interface HoldingAnalysisTableProps {
  holdings: HoldingAnalysis[];
  currency?: string;
}

const RISK_BADGE: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const ACTION_BADGE: Record<string, string> = {
  hold: 'bg-gray-100 text-gray-700',
  add: 'bg-blue-100 text-blue-700',
  reduce: 'bg-orange-100 text-orange-700',
  review: 'bg-red-100 text-red-700',
};

export default function HoldingAnalysisTable({
  holdings,
  currency = 'INR',
}: Readonly<HoldingAnalysisTableProps>) {
  const [sortField, setSortField] = useState<keyof HoldingAnalysis>('portfolioWeightPct');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const sorted = [...holdings].sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortAsc ? av - bv : bv - av;
    }
    return 0;
  });

  const handleSort = (field: keyof HoldingAnalysis) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortIcon = (field: keyof HoldingAnalysis) => {
    if (sortField !== field) return '';
    return sortAsc ? ' ↑' : ' ↓';
  };

  const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">Per-Holding Analysis</h3>
        <p className="text-sm text-gray-500 mt-1">Click a row to see details</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Holding</th>
              <th
                className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer select-none"
                onClick={() => handleSort('currentValue')}
              >
                Value{sortIcon('currentValue')}
              </th>
              <th
                className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer select-none"
                onClick={() => handleSort('unrealizedPnl')}
              >
                P&amp;L{sortIcon('unrealizedPnl')}
              </th>
              <th
                className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer select-none"
                onClick={() => handleSort('unrealizedPnlPct')}
              >
                P&amp;L %{sortIcon('unrealizedPnlPct')}
              </th>
              <th
                className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer select-none"
                onClick={() => handleSort('portfolioWeightPct')}
              >
                Weight{sortIcon('portfolioWeightPct')}
              </th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Risk</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((h) => (
              <Fragment key={h.symbol}>
                <tr
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setExpandedRow(expandedRow === h.symbol ? null : h.symbol)}
                >
                  {/* Holding info */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{h.symbol}</p>
                        <p className="text-xs text-gray-500">{h.sector}</p>
                      </div>
                      {h.concentrationRisk && (
                        <span className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded font-medium">
                          ⚠️
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Value */}
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {currency} {fmt(h.currentValue)}
                  </td>

                  {/* P&L */}
                  <td className={`px-4 py-3 text-right font-medium ${h.unrealizedPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {h.unrealizedPnl >= 0 ? '+' : ''}{currency} {fmt(Math.abs(h.unrealizedPnl))}
                  </td>

                  {/* P&L % */}
                  <td className={`px-4 py-3 text-right font-medium ${h.unrealizedPnlPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {h.unrealizedPnlPct >= 0 ? '+' : ''}{h.unrealizedPnlPct.toFixed(2)}%
                  </td>

                  {/* Weight */}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full bg-blue-500"
                          style={{ width: `${Math.min(h.portfolioWeightPct, 100)}%` }}
                        />
                      </div>
                      <span className="font-medium text-gray-900 w-12 text-right">
                        {h.portfolioWeightPct.toFixed(1)}%
                      </span>
                    </div>
                  </td>

                  {/* Risk */}
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${RISK_BADGE[h.riskLevel] || RISK_BADGE.medium}`}>
                      {h.riskLevel}
                    </span>
                  </td>

                  {/* Recommendation */}
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${ACTION_BADGE[h.recommendation] || ACTION_BADGE.hold}`}>
                      {h.recommendation}
                    </span>
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expandedRow === h.symbol && (
                  <tr className="bg-blue-50">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Name</p>
                          <p className="font-medium text-gray-900">{h.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Qty × Avg Cost</p>
                          <p className="font-medium text-gray-900">
                            {h.quantity} × {currency} {h.averageCost.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Current Price</p>
                          <p className="font-medium text-gray-900">
                            {currency} {h.currentPrice.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Total Cost</p>
                          <p className="font-medium text-gray-900">
                            {currency} {fmt(h.totalCost)}
                          </p>
                        </div>
                      </div>
                      {h.recommendationReason && (
                        <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">AI Recommendation: </span>
                            {h.recommendationReason}
                          </p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


