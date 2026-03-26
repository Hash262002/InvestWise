// ========================================
// Analysis Results Panel
// ========================================
// Shows AI analysis: scores, summary, recommendations,
// sector chart, and per-holding analysis table

import SectorChart from './SectorChart';
import HoldingAnalysisTable from './HoldingAnalysisTable';

interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalReturnPct: number;
  holdingsCount: number;
}

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

interface Recommendation {
  type: string;
  message: string;
  priority: string;
}

interface AnalysisData {
  riskScore?: number;
  riskLevel?: string;
  diversificationScore?: number;
  summary?: string;
  sectorAllocation?: Record<string, number>;
  portfolioMetrics?: PortfolioMetrics;
  recommendations?: Recommendation[];
  lastAnalyzedAt?: string;
  holdingAnalyses?: HoldingAnalysis[];
}

interface AnalysisResultsProps {
  analysis: AnalysisData;
  currency?: string;
  onReAnalyze?: () => void;
  isAnalyzing?: boolean;
}

const RISK_COLOR: Record<string, string> = {
  low: 'text-green-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
};

const RING_COLOR: Record<string, string> = {
  low: 'border-green-500',
  medium: 'border-yellow-500',
  high: 'border-red-500',
};

function ScoreRing({ score, label, maxScore = 100 }: Readonly<{ score: number; label: string; maxScore?: number }>) {
  const pct = Math.round((score / maxScore) * 100);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  let color = '#10B981'; // green
  if (pct > 66) color = '#EF4444'; // red
  else if (pct > 33) color = '#F59E0B'; // amber

  // For diversification, invert the color logic (higher = better)
  if (label.toLowerCase().includes('diversification')) {
    if (pct > 66) color = '#10B981';
    else if (pct > 33) color = '#F59E0B';
    else color = '#EF4444';
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90">
          <circle cx="48" cy="48" r="36" fill="none" stroke="#E5E7EB" strokeWidth="8" />
          <circle
            cx="48"
            cy="48"
            r="36"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{score}</span>
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-2 font-medium">{label}</p>
    </div>
  );
}

export default function AnalysisResults({
  analysis,
  currency = 'INR',
  onReAnalyze,
  isAnalyzing = false,
}: Readonly<AnalysisResultsProps>) {
  const metrics = analysis.portfolioMetrics;
  const riskLevel = analysis.riskLevel || 'medium';
  const lastAnalyzed = analysis.lastAnalyzedAt
    ? new Date(analysis.lastAnalyzedAt).toLocaleString('en-IN')
    : null;

  return (
    <div className="space-y-6 fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Portfolio Analysis</h2>
          {lastAnalyzed && (
            <p className="text-sm text-gray-500 mt-1">Last analyzed: {lastAnalyzed}</p>
          )}
        </div>
        {onReAnalyze && (
          <button
            onClick={onReAnalyze}
            disabled={isAnalyzing}
            className="btn-secondary flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>{'\u0020'}<span className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>🔄 Re-Analyze</>
            )}
          </button>
        )}
      </div>

      {/* Score cards row */}
      <div className="grid grid-cols-4 gap-6">
        {/* Risk Score */}
        <div className="card flex flex-col items-center py-6">
          <ScoreRing score={analysis.riskScore ?? 0} label="Risk Score" />
          <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${RISK_COLOR[riskLevel]}`}>
            {riskLevel} risk
          </span>
        </div>

        {/* Diversification Score */}
        <div className="card flex flex-col items-center py-6">
          <ScoreRing score={analysis.diversificationScore ?? 0} label="Diversification" />
        </div>

        {/* Total Return */}
        {metrics && (
          <>
            <div className="card">
              <p className="text-gray-600 text-sm font-medium">Portfolio P&amp;L</p>
              <h3 className={`text-2xl font-bold mt-2 ${(metrics.totalPnl ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(metrics.totalPnl ?? 0) >= 0 ? '+' : ''}{currency} {Math.abs(metrics.totalPnl ?? 0).toLocaleString('en-IN')}
              </h3>
              <p className={`text-sm mt-1 ${(metrics.totalReturnPct ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {(metrics.totalReturnPct ?? 0) >= 0 ? '+' : ''}{(metrics.totalReturnPct ?? 0).toFixed(2)}%
              </p>
            </div>

            <div className="card">
              <p className="text-gray-600 text-sm font-medium">Portfolio Value</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">
                {currency} {(metrics.totalValue ?? 0).toLocaleString('en-IN')}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{metrics.holdingsCount ?? 0} holdings</p>
            </div>
          </>
        )}
      </div>

      {/* Summary */}
      {analysis.summary && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Summary</h3>
          <p className="text-gray-700 leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Recommendations</h3>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, i) => {
              const msg = typeof rec === 'string' ? rec : rec.message;
              const priority = typeof rec === 'string' ? 'medium' : rec.priority;
              let dotColor = 'bg-yellow-500';
              if (priority === 'high') dotColor = 'bg-red-500';
              else if (priority === 'low') dotColor = 'bg-green-500';
              return (
                <li key={`rec-${msg.slice(0, 20)}`} className="flex items-start gap-3">
                  <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                  <span className="text-gray-700">{msg}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Sector Chart */}
      {analysis.sectorAllocation && Object.keys(analysis.sectorAllocation).length > 0 && (
        <SectorChart sectorWeights={analysis.sectorAllocation} />
      )}

      {/* Per-holding analysis table */}
      {analysis.holdingAnalyses && analysis.holdingAnalyses.length > 0 && (
        <HoldingAnalysisTable holdings={analysis.holdingAnalyses} currency={currency} />
      )}
    </div>
  );
}
