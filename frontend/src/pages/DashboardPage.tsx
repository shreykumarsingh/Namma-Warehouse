import React from 'react';
import { LogisticsMap } from '../components/LogisticsMap';
import { OptimizationPanel } from '../components/OptimizationPanel';
import { NetworkOperationsPanel } from '../components/NetworkOperationsPanel';
import { DashboardCharts } from '../components/DashboardCharts';
import { WarehouseResultsGrid } from '../components/WarehouseResultsGrid';
import {
  CityOption,
  Warehouse,
  DemandZone,
  RouteAssignment,
  OptimizationConfig,
  OptimizationResult,
  GridPoint,
} from '../types';
import { formatRupeesRaw } from '../utils/formatters';

interface DashboardPageProps {
  city: CityOption;
  warehouses: Warehouse[];
  zones: DemandZone[];
  assignments: RouteAssignment[];
  result: OptimizationResult;
  config: OptimizationConfig;
  onChangeConfig: (newConfig: Partial<OptimizationConfig>) => void;
  onRunOptimization: () => void;
  isOptimizing: boolean;
  currentStep: string;
  stepIndex: number;
  customPoints?: GridPoint[];
  onReset: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  city,
  warehouses,
  zones,
  assignments,
  result,
  config,
  onChangeConfig,
  onRunOptimization,
  isOptimizing,
  currentStep,
  stepIndex,
  customPoints,
  onReset,
}) => {
  const selectedCount = result.selectedWarehouseIds.length;
  const avgTime = result.kpi.avgDeliveryTimeMin;
  const slaPct = result.kpi.slaCompliancePercent;
  const monthlyRent = result.costs?.monthly_rent || result.warehouses.filter(w => w.isSelected).reduce((s, w) => s + (w.monthlyRent || 0), 0);
  const totalEmployees = result.kpi.totalEmployees || result.costs?.total_employees || 0;

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-5">

      {/* Summary Strip — one-line overview of current optimization result */}
      {selectedCount > 0 && result.status !== 'infeasible' && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600">
          <span>
            <span className="font-semibold text-gray-900">{selectedCount}</span> warehouse{selectedCount !== 1 ? 's' : ''} selected
          </span>
          <span className="text-gray-300">|</span>
          <span>
            Avg delivery: <span className="font-semibold text-gray-900">{avgTime.toFixed(1)} min</span>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            10-min SLA: <span className={`font-semibold ${slaPct >= 80 ? 'text-emerald-700' : slaPct >= 40 ? 'text-amber-700' : 'text-red-600'}`}>{slaPct.toFixed(1)}%</span>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            Monthly rent: <span className="font-semibold text-gray-900">{formatRupeesRaw(monthlyRent)}</span>
          </span>
          {totalEmployees > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span>
                Workforce: <span className="font-semibold text-gray-900">{totalEmployees.toLocaleString('en-IN')} drivers</span>
              </span>
            </>
          )}
          {result.executionTimeMs > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-gray-400">
                Solved in {result.executionTimeMs}ms
              </span>
            </>
          )}
        </div>
      )}

      {/* Core 3-Column Layout: Controls | Map | Operations */}
      <div className="flex flex-col xl:flex-row gap-3 items-stretch w-full">
        {/* Left: Optimization Parameters */}
        <div className="w-full xl:w-[310px] xl:shrink-0 flex flex-col">
          <OptimizationPanel
            config={config}
            onChangeConfig={onChangeConfig}
            onRunOptimization={onRunOptimization}
            isOptimizing={isOptimizing}
            currentStep={currentStep}
            stepIndex={stepIndex}
            lastResult={result}
            onReset={onReset}
          />
        </div>

        {/* Center: Logistics Map */}
        <div className="flex-1 min-w-0 w-full flex flex-col">
          <LogisticsMap
            city={city}
            warehouses={warehouses}
            zones={zones}
            assignments={assignments}
            customPoints={customPoints}
            nodeAssignments={result.nodeAssignments}
            nodeSpokes={result.nodeSpokes}
          />
        </div>

        {/* Right: Network & Workforce Operations */}
        <div className="w-full xl:w-[340px] xl:shrink-0 flex flex-col">
          <NetworkOperationsPanel
            config={config}
            result={result}
          />
        </div>
      </div>

      {/* Analytics Charts — cost curve and utilization (real data only) */}
      <DashboardCharts
        analytics={result.analytics}
        selectedCount={selectedCount}
      />

      {/* Warehouse Results — detailed cards for each selected warehouse */}
      <WarehouseResultsGrid warehouses={warehouses} />
    </div>
  );
};
