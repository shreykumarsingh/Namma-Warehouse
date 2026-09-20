import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { OptimizationResult } from '../types';
import { formatINR } from '../utils/formatters';

interface DashboardChartsProps {
  analytics: OptimizationResult['analytics'];
  selectedCount: number;
}

// Subdued professional palette for bar charts
const BAR_COLORS = [
  '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95', '#8B5CF6',
  '#A78BFA', '#C4B5FD', '#DDD6FE', '#7C3AED', '#6D28D9',
];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  analytics,
  selectedCount = 3,
}) => {
  const { costVsWarehouses, warehouseUtilization } = analytics;

  const hasTradeoffData = costVsWarehouses && costVsWarehouses.length > 0;
  const hasUtilizationData = warehouseUtilization && warehouseUtilization.length > 0;

  if (!hasTradeoffData && !hasUtilizationData) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-semibold text-lg text-gray-900">
          Optimization Analytics
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Cost trade-off analysis and warehouse capacity distribution from the current optimization run.
        </p>
      </div>

      <div className={`grid grid-cols-1 ${hasTradeoffData && hasUtilizationData ? 'md:grid-cols-2' : ''} gap-4`}>
        {/* Cost vs Number of Warehouses (U-curve from /api/tradeoff) */}
        {hasTradeoffData && (
          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-sm text-gray-900">
                  Cost vs. Warehouse Count
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Total annual cost at different warehouse counts
                </p>
              </div>
              <span className="text-[11px] font-medium bg-violet-50 text-violet-700 px-2 py-0.5 rounded border border-violet-200">
                Optimal: {selectedCount}
              </span>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={costVsWarehouses}
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis
                    dataKey="count"
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickFormatter={(v) => `${v}`}
                    label={{ value: 'Warehouses', position: 'insideBottom', offset: -2, fontSize: 10, fill: '#9CA3AF' }}
                  />
                  <YAxis
                    width={60}
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickFormatter={(val) => formatINR(val)}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatINR(val), 'Annual Cost']}
                    labelFormatter={(lbl) => `${lbl} Warehouses`}
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      borderColor: '#E5E7EB',
                      fontSize: '12px',
                      fontWeight: 500,
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="#7C3AED"
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const isOptimal = payload.isOptimal;
                      return (
                        <circle
                          key={`dot-${payload.count}`}
                          cx={cx}
                          cy={cy}
                          r={isOptimal ? 6 : 4}
                          fill={isOptimal ? '#7C3AED' : '#fff'}
                          stroke="#7C3AED"
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 6, fill: '#7C3AED' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Warehouse Utilization (real data from analytics.warehouseUtilization) */}
        {hasUtilizationData && (
          <div className="bg-white p-5 rounded-lg border border-gray-200">
            <div className="mb-4">
              <h3 className="font-semibold text-sm text-gray-900">
                Warehouse Utilization
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Capacity utilization of each selected warehouse
              </p>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={warehouseUtilization}
                  margin={{ top: 5, right: 10, left: -15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    interval={0}
                    angle={warehouseUtilization.length > 8 ? -45 : 0}
                    textAnchor={warehouseUtilization.length > 8 ? 'end' : 'middle'}
                    height={warehouseUtilization.length > 8 ? 60 : 30}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7280' }}
                    tickFormatter={(val) => `${val}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    formatter={(val: number, _name: string, props: any) => {
                      const d = props.payload;
                      const pct = d?.capacity > 0 ? Math.min(100, (d.demand / d.capacity) * 100).toFixed(1) : val.toFixed(1);
                      return [
                        `${pct}%  (${d?.demand?.toLocaleString('en-IN') || '—'} / ${d?.capacity?.toLocaleString('en-IN') || '—'} orders)`,
                        'Utilization',
                      ];
                    }}
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      borderColor: '#E5E7EB',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Bar dataKey="utilization" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {warehouseUtilization.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                        opacity={0.85}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
