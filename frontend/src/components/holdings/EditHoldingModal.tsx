import { useState, useEffect } from 'react';
import { holdingAPI } from '../../services/api';

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
}

interface EditHoldingModalProps {
  readonly portfolioId: string;
  readonly holding: Holding;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

export default function EditHoldingModal({
  portfolioId,
  holding,
  onClose,
  onSuccess,
}: Readonly<EditHoldingModalProps>) {
  const [quantity, setQuantity] = useState<string>(holding.quantity.toString());
  const [averageCost, setAverageCost] = useState<string>(holding.averageCost.toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCost = parseFloat(quantity || '0') * parseFloat(averageCost || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const qty = parseFloat(quantity);
      const cost = parseFloat(averageCost);

      if (isNaN(qty) || qty <= 0) {
        setError('Quantity must be a positive number');
        setLoading(false);
        return;
      }

      if (isNaN(cost) || cost < 0) {
        setError('Average cost must be a non-negative number');
        setLoading(false);
        return;
      }

      const updateData = {
        quantity: qty,
        averageCost: cost,
      };

      await holdingAPI.updateHolding(portfolioId, holding._id, updateData);
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update holding';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-xl font-bold text-white">Edit {holding.symbol}</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 disabled:opacity-50"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Holding Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
            <input
              type="text"
              disabled
              value={holding.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="input-field"
              disabled={loading}
            />
          </div>

          {/* Average Cost */}
          <div>
            <label htmlFor="averageCost" className="block text-sm font-medium text-gray-700 mb-1">
              Average Cost
            </label>
            <input
              id="averageCost"
              type="number"
              step="0.01"
              min="0"
              value={averageCost}
              onChange={(e) => setAverageCost(e.target.value)}
              className="input-field"
              disabled={loading}
            />
          </div>

          {/* Total Cost Preview */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Cost:</span>
              <span className="text-lg font-semibold text-blue-600">
                ₹{totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
