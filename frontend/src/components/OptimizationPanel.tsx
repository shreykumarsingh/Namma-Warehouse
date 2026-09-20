import React from 'react';
import {
  RotateCcw,
  Play,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { OptimizationConfig, OptimizationResult } from '../types';
import { formatRupeesRaw, formatNumber } from '../utils/formatters';

interface OptimizationPanelProps {
  config: OptimizationConfig;
  onChangeConfig: (newConfig: Partial<OptimizationConfig>) => void;
  onRunOptimization: () => void;
  isOptimizing: boolean;
  currentStep: string;
  stepIndex: number;
  lastResult?: OptimizationResult | null;
  onReset: () => void;
}

export const OptimizationPanel: React.FC<OptimizationPanelProps> = React.memo(({
  config,
  onChangeConfig,
  onRunOptimization,
  isOptimizing,
  stepIndex,
  lastResult,
  onReset,
}) => {
  const stepsList = [
    'Connecting to spatial solver...',
    'Evaluating 800 candidate nodes...',
    'Enforcing dispersion & budget constraints...',
    'Computing routes & fuel expenditure...',
    'Finalizing facility placements...',
  ];

  // Parameter derivations
  const numHubs = config.maxWarehouses ?? 3;
  const budgetLakhs =
    config.budgetMonthlyLakhs !== undefined
      ? Number(config.budgetMonthlyLakhs.toFixed(1))
      : config.budgetMonthly
      ? Number((config.budgetMonthly / 100000).toFixed(1))
      : 0;
  const propertySize = config.propertySizeSqft ?? 2500;
  const petrolCost = Number((config.petrolCostPerKm ?? 2.0).toFixed(1));
  const batchSize =
    config.batchSize && config.batchSize >= 1
      ? config.batchSize
      : 23;
  const minDispersion = Number((config.minDispersionKm ?? 6.5).toFixed(1));
  const evFleetPct = config.evFleetPct ?? (config.evShare ?? 0);

  // Auto-dispersion recommendation
  const handleHubChange = (val: number) => {
    const p = Math.max(1, Math.min(100, Math.round(val)));
    let recDisp = 0.8;
    if (p <= 4) recDisp = 6.5;
    else if (p <= 8) recDisp = 4.5;
    else if (p <= 15) recDisp = 3.0;
    else if (p <= 30) recDisp = 2.0;
    else if (p <= 60) recDisp = 1.2;

    onChangeConfig({
      maxWarehouses: p,
      minDispersionKm: recDisp,
    });
  };

  const slaPct = lastResult?.kpi?.slaCompliancePercent ?? 0;
  const avgTime = lastResult?.kpi?.avgDeliveryTimeMin ?? 0;
  const monthlyRent =
    lastResult?.costs?.monthly_rent ||
    (lastResult?.warehouses
      ? lastResult.warehouses.reduce((s, w) => s + (w.monthlyRent || 0), 0)
      : 0);
  const totalEmployees =
    lastResult?.kpi?.totalEmployees ||
    (lastResult?.warehouses
      ? Math.round(lastResult.warehouses.reduce((s, w) => s + (w.demandServed || 0), 0) / batchSize)
      : 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col justify-between w-full h-full xl:h-[740px] text-xs select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 shrink-0">
        <h2 className="font-semibold text-sm text-gray-900">
          Optimization Parameters
        </h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50 transition-colors cursor-pointer"
          title="Reset parameters to baseline"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Form Controls */}
      <div className="space-y-3 flex-1 flex flex-col justify-between py-0.5">
        {/* 1. Number of Warehouses */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Number of Warehouses
            </label>
            <span className="font-semibold text-violet-600 font-mono text-sm bg-violet-50 px-2 py-0.5 rounded">
              {numHubs}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={numHubs}
            onChange={(e) => handleHubChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>1</span>
            <span>100</span>
          </div>
        </div>

        {/* 2. Monthly Budget */}
        <InputField
          label="Monthly Budget (₹ Lakhs)"
          sublabel="0 = unlimited"
          type="number"
          min={0}
          step={1}
          value={budgetLakhs}
          onChange={(val) => {
            const v = parseFloat(val) || 0;
            onChangeConfig({
              budgetMonthlyLakhs: v,
              budgetMonthly: v > 0 ? v * 100000 : 0,
            });
          }}
        />

        {/* 3. Property Size */}
        <InputField
          label="Property Size (sq.ft)"
          type="number"
          min={500}
          max={20000}
          step={100}
          value={propertySize}
          onChange={(val) => onChangeConfig({ propertySizeSqft: parseInt(val) || 2500 })}
        />

        {/* 4. Petrol Cost */}
        <InputField
          label="Petrol Cost (₹/km)"
          type="number"
          min={0.5}
          max={10}
          step={0.5}
          value={petrolCost}
          onChange={(val) => onChangeConfig({ petrolCostPerKm: parseFloat(val) || 2.0 })}
        />

        {/* 5. Deliveries per Driver */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              Deliveries per Driver / Day
            </label>
            <span className="font-semibold text-violet-600 font-mono text-sm bg-violet-50 px-2 py-0.5 rounded">
              {batchSize}
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={30}
            value={batchSize}
            onChange={(e) => onChangeConfig({ batchSize: parseInt(e.target.value) || 23 })}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>15</span>
            <span>30</span>
          </div>
        </div>

        {/* 6. Min Hub Separation */}
        <InputField
          label="Min Hub Separation (km)"
          type="number"
          min={0}
          max={20}
          step={0.5}
          value={minDispersion}
          onChange={(val) => onChangeConfig({ minDispersionKm: parseFloat(val) || 0.8 })}
        />

        {/* 7. EV Fleet % */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">
              EV Fleet Share
            </label>
            <span className="font-semibold text-emerald-600 font-mono text-sm">
              {evFleetPct}%
            </span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <button
              type="button"
              onClick={() => onChangeConfig({ evFleetPct: 0, evShare: 0 })}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                evFleetPct === 0
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              100% Petrol
            </button>
            <button
              type="button"
              onClick={() => onChangeConfig({ evFleetPct: 100, evShare: 100 })}
              className={`flex-1 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                evFleetPct === 100
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-gray-50 text-emerald-700 border-gray-200 hover:bg-emerald-50'
              }`}
            >
              100% EV
            </button>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={evFleetPct}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              onChangeConfig({ evFleetPct: val, evShare: val });
            }}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
          />
        </div>
      </div>

      {/* Action Section */}
      <div className="pt-3 space-y-2 shrink-0">
        {isOptimizing ? (
          <div className="p-3 bg-violet-50 rounded-lg border border-violet-200 text-xs space-y-1.5 text-violet-800">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping" />
                Optimizing...
              </span>
              <span className="font-mono">
                {Math.min(100, Math.round(((stepIndex + 1) / stepsList.length) * 100))}%
              </span>
            </div>
            <div className="w-full bg-violet-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-600 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, ((stepIndex + 1) / stepsList.length) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-violet-600 truncate">{stepsList[stepIndex]}</p>
          </div>
        ) : (
          <button
            type="button"
            id="btn-optimize-left"
            onClick={onRunOptimization}
            className="w-full py-2.5 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" fill="currentColor" />
            <span>Run Optimization</span>
          </button>
        )}

        {/* Status */}
        {lastResult?.status === 'infeasible' ? (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span>Infeasible: {lastResult.infeasibleReason || 'Constraint violation'}</span>
            </div>
            <p className="text-[11px] text-red-600 leading-tight">
              {lastResult.infeasibleMessage}
            </p>
            {lastResult.suggestedBudget !== undefined && (
              <div className="pt-1 text-[11px] font-medium border-t border-red-200 flex justify-between">
                <span>Suggested budget:</span>
                <span className="font-mono">₹{(lastResult.suggestedBudget / 100000).toFixed(1)} L/mo</span>
              </div>
            )}
          </div>
        ) : lastResult && !isOptimizing ? (
          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-0.5">
            <div className="text-emerald-700 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{lastResult.selectedWarehouseIds.length} hubs placed</span>
            </div>
            <div className="text-gray-600">
              SLA: <strong className={slaPct >= 80 ? 'text-emerald-700' : 'text-gray-900'}>{slaPct.toFixed(1)}%</strong> · Avg: {avgTime.toFixed(1)} min
            </div>
            <div className="text-gray-500">
              Rent: {formatRupeesRaw(monthlyRent)}/mo · {formatNumber(totalEmployees)} drivers
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-400 text-center">
            Adjust parameters and run optimization.
          </div>
        )}
      </div>
    </div>
  );
});

/** Reusable input field */
function InputField({
  label,
  sublabel,
  type,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  type: string;
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (val: string) => void;
}) {
  return (
    <div>
      <label className="block mb-1.5 text-[11px] font-medium text-gray-500 uppercase tracking-wide">
        {label}
        {sublabel && <span className="normal-case tracking-normal font-normal text-gray-400 ml-1">({sublabel})</span>}
      </label>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md text-gray-900 font-medium focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
      />
    </div>
  );
}
