// ========================================
// Holding Row Component
// ========================================
// Single row in holdings table

import { useState } from 'react';
import { holdingAPI } from '../../services/api';
import EditHoldingModal from './EditHoldingModal';
import HoldingPriceCell from './HoldingPriceCell';

interface Holding {
  _id: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: number;
  assetType?: string;
  exchange?: string;
  sector?: string;
  totalCost?: number;
  currentValue?: number;
  riskScore?: number;
  riskLevel?: string;
}

interface HoldingRowProps {
  portfolioId: string;
  holding: Holding;
  onDeleted: () => void;
}

export default function HoldingRow({ portfolioId, holding, onDeleted }: Readonly<HoldingRowProps>) {
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleDelete = async () => {
    if (!globalThis.confirm(`Are you sure you want to delete ${holding.symbol}?`)) {
      return;
    }

    setLoading(true);
    try {
      await holdingAPI.deleteHolding(portfolioId, holding._id);
      onDeleted();
    } catch (err) {
      console.error('Error deleting holding:', err);
      alert('Failed to delete holding');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-6 py-4">
          <span className="font-semibold text-gray-900">{holding.symbol}</span>
        </td>
        <td className="px-6 py-4">
          <span className="text-gray-600">{holding.name}</span>
        </td>
        <td className="px-6 py-4 text-right">
          <span className="text-gray-900">{holding.quantity}</span>
        </td>
        <td className="px-6 py-4 text-right">
          <span className="text-gray-900">₹{holding.averageCost.toFixed(2)}</span>
        </td>
        <td className="px-6 py-4 text-right">
          <HoldingPriceCell 
            symbol={holding.symbol}
            quantity={holding.quantity}
            averageCost={holding.averageCost}
          />
        </td>
        <td className="px-6 py-4">
          <span className="text-gray-600 text-sm">{holding.sector || '-'}</span>
        </td>
        <td className="px-6 py-4 text-center">
          {holding.riskLevel ? (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(holding.riskLevel)}`}>
              {holding.riskLevel}
            </span>
          ) : (
            <span className="text-gray-400 text-sm">-</span>
          )}
        </td>
        <td className="px-6 py-4 text-center">
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setShowEditModal(true)}
              disabled={loading}
              className="text-blue-600 hover:text-blue-700 disabled:opacity-50"
              title="Edit holding"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="text-red-600 hover:text-red-700 disabled:opacity-50"
              title="Delete holding"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </td>
      </tr>

      {/* Edit Holding Modal */}
      {showEditModal && (
        <EditHoldingModal
          portfolioId={portfolioId}
          holding={holding}
          onClose={() => setShowEditModal(false)}
          onSuccess={onDeleted}
        />
      )}
    </>
  );
}
