// ========================================
// Portfolio Summary Component
// ========================================
// Displays portfolio stats cards

interface PortfolioSummaryProps {
  totalInvested: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
  currency: string;
}

export default function PortfolioSummary({
  totalInvested,
  currentValue,
  gainLoss,
  gainLossPercent,
  currency,
}: Readonly<PortfolioSummaryProps>) {
  return (
    <div className="grid grid-cols-4 gap-6">
      {/* Total Invested */}
      <div className="card">
        <p className="text-gray-600 text-sm font-medium">Total Invested</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-2">
          {currency} {totalInvested.toLocaleString('en-IN')}
        </h3>
      </div>

      {/* Current Value */}
      <div className="card">
        <p className="text-gray-600 text-sm font-medium">Current Value</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-2">
          {currency} {currentValue.toLocaleString('en-IN')}
        </h3>
      </div>

      {/* Gain/Loss Amount */}
      <div className="card">
        <p className="text-gray-600 text-sm font-medium">Gain/Loss (Amount)</p>
        <h3 className={`text-2xl font-bold mt-2 ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {gainLoss >= 0 ? '+' : ''}{currency} {Math.abs(gainLoss).toLocaleString('en-IN')}
        </h3>
      </div>

      {/* Gain/Loss Percentage */}
      <div className="card">
        <p className="text-gray-600 text-sm font-medium">Gain/Loss (%)</p>
        <h3 className={`text-2xl font-bold mt-2 ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(2)}%
        </h3>
      </div>
    </div>
  );
}
