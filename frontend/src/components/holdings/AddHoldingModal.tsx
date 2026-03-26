// ========================================
// Add Holding Modal
// ========================================
// Form to add a new holding to portfolio

import { useState } from 'react';
import { holdingAPI } from '../../services/api';
import AssetSearch from './AssetSearch';

interface AddHoldingModalProps {
  portfolioId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddHoldingModal({ portfolioId, onClose, onSuccess }: Readonly<AddHoldingModalProps>) {
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [formData, setFormData] = useState({
    quantity: '',
    averageCost: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedAsset) {
      setError('Please select an asset');
      setLoading(false);
      return;
    }

    if (!formData.quantity || !formData.averageCost) {
      setError('Quantity and average cost are required');
      setLoading(false);
      return;
    }

    try {
      await holdingAPI.addHolding(portfolioId, {
        symbol: selectedAsset.symbol,
        name: selectedAsset.name,
        assetType: selectedAsset.type || 'stock',
        sector: selectedAsset.sector,
        quantity: Number.parseFloat(formData.quantity),
        averageCost: Number.parseFloat(formData.averageCost),
      });
      onSuccess();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to add holding';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Add Holding</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Asset Search */}
          <div>
            <label htmlFor="assetSelect" className="block text-sm font-medium text-gray-700 mb-1">
              Search Asset *
            </label>
            <AssetSearch
              onSelect={setSelectedAsset}
              disabled={loading}
            />
            {selectedAsset && (
              <div className="mt-2 p-3 bg-blue-50 rounded flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{selectedAsset.symbol}</p>
                  <p className="text-sm text-gray-600">{selectedAsset.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="text-blue-600 hover:text-blue-700"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity *
            </label>
            <input
              id="quantity"
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              placeholder="100"
              step="0.01"
              className="input-field"
              disabled={loading}
            />
          </div>

          {/* Average Cost */}
          <div>
            <label htmlFor="averageCost" className="block text-sm font-medium text-gray-700 mb-1">
              Average Cost (₹) *
            </label>
            <input
              id="averageCost"
              type="number"
              name="averageCost"
              value={formData.averageCost}
              onChange={handleChange}
              placeholder="1000"
              step="0.01"
              className="input-field"
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Holding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
