// ========================================
// Asset Search Component
// ========================================
// Autocomplete search for stocks/MFs
// Mock data for now - will integrate with backend API

import { useState } from 'react';

// Mock data - replace with API call later
const MOCK_ASSETS = [
  { symbol: 'ONGC.NS', name: 'Oil and Natural Gas Corporation', type: 'stock', sector: 'Energy' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd', type: 'stock', sector: 'Banking' },
  { symbol: 'INFY.NS', name: 'Infosys Ltd', type: 'stock', sector: 'IT' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', type: 'stock', sector: 'IT' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', type: 'stock', sector: 'Energy' },
  { symbol: '0P000006F4', name: 'SBI Magnum Balanced Fund', type: 'mutualfund', sector: 'Balanced' },
  { symbol: '0P000001V5', name: 'Axis Bluechip Fund', type: 'mutualfund', sector: 'Equity' },
  { symbol: '120503', name: 'Axis Bluechip Fund - Direct Growth', type: 'mutualfund', sector: 'Diversified' },
];

interface Asset {
  symbol: string;
  name: string;
  type: string;
  sector?: string;
}

interface AssetSearchProps {
  onSelect: (asset: Asset) => void;
  disabled?: boolean;
}

export default function AssetSearch({ onSelect, disabled = false }: Readonly<AssetSearchProps>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim().length > 0) {
      // Filter mock data
      const filtered = MOCK_ASSETS.filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(value.toLowerCase()) ||
          asset.name.toLowerCase().includes(value.toLowerCase())
      );
      setResults(filtered);
      setShowResults(true);
    } else {
      setResults([]);
      setShowResults(false);
    }
  };

  const handleSelectAsset = (asset: Asset) => {
    onSelect(asset);
    setQuery(asset.symbol);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        placeholder="Search by symbol or name..."
        className="input-field"
        disabled={disabled}
        autoComplete="off"
      />

      {/* Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-40 max-h-64 overflow-auto">
          {results.map((asset) => (
            <button
              key={asset.symbol}
              type="button"
              onClick={() => handleSelectAsset(asset)}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition-colors"
            >
              <p className="font-medium text-gray-900">{asset.symbol}</p>
              <p className="text-sm text-gray-600">{asset.name}</p>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showResults && results.length === 0 && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No assets found
        </div>
      )}
    </div>
  );
}
