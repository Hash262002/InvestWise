// ========================================
// Sector Allocation Chart
// ========================================
// Pie-style horizontal bar chart showing sector weights

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface SectorChartProps {
  sectorWeights: Record<string, number>;
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#6366F1', // indigo
  '#14B8A6', // teal
];

export default function SectorChart({ sectorWeights }: Readonly<SectorChartProps>) {
  const data = Object.entries(sectorWeights)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Sector Allocation</h3>
      <div className="flex items-center gap-8">
        {/* Pie Chart */}
        <div className="w-64 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_entry, index) => (
                  <Cell key={_entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `${Number(value).toFixed(1)}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend bars */}
        <div className="flex-1 space-y-3">
          {data.map((sector, index) => (
            <div key={sector.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-gray-700">{sector.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{sector.value.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${sector.value}%`,
                    backgroundColor: COLORS[index % COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
