// ========================================
// Holdings List Component
// ========================================
// Displays table of holdings in a portfolio

import HoldingRow from './HoldingRow';

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

interface HoldingsListProps {
  portfolioId: string;
  holdings: Holding[];
  onHoldingDeleted: () => void;
}

export default function HoldingsList({ portfolioId, holdings, onHoldingDeleted }: Readonly<HoldingsListProps>) {
  return (
    <div className="card p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Symbol</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Quantity</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Avg Cost</th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Current Price & P&L</th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Sector</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Risk</th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <HoldingRow
                key={holding._id}
                portfolioId={portfolioId}
                holding={holding}
                onDeleted={onHoldingDeleted}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
