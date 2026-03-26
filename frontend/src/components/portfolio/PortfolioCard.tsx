// ========================================
// Portfolio Card Component
// ========================================
// Card showing portfolio summary
// - Portfolio name and type
// - Total value and gain/loss
// - Click to navigate to details

interface PortfolioCardProps {
  portfolio: {
    id: string;
    name: string;
    type: string;
    totalInvested: number;
    currentValue: number;
  };
  onSelect: () => void;
}

export default function PortfolioCard({ portfolio, onSelect }: Readonly<PortfolioCardProps>) {
  const gainLoss = portfolio.currentValue - portfolio.totalInvested;
  const gainLossPercent = portfolio.totalInvested > 0 ? (gainLoss / portfolio.totalInvested) * 100 : 0;

  return (
    <button
      onClick={onSelect}
      className="card-hover w-full text-left"
      type="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onSelect();
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{portfolio.name}</h3>
          <p className="text-sm text-gray-600 mt-1 capitalize">{portfolio.type}</p>
        </div>
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Invested</span>
          <span className="font-medium text-gray-900">
            ₹{portfolio.totalInvested.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current Value</span>
          <span className="font-medium text-gray-900">
            ₹{portfolio.currentValue.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <span className="text-sm text-gray-600">Gain/Loss</span>
          <div className="text-right">
            <p className={`font-bold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {gainLoss >= 0 ? '+' : ''}₹{Math.abs(gainLoss).toLocaleString('en-IN')}
            </p>
            <p className={`text-sm ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
