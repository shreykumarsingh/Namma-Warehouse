import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Sliders,
  RotateCcw,
  IndianRupee,
  Maximize,
  Fuel,
  Package,
  Compass,
  Building2,
  Layers,
} from 'lucide-react';
import {
  OptimizationConfig,
  OptimizationPriority,
  TrafficLevel,
  OptimizationResult,
} from '../types';

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

export const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  config,
  onChangeConfig,
  onRunOptimization,
  isOptimizing,
  stepIndex,
  lastResult,
  onReset,
}) => {
  const [activeTab, setActiveTab] = useState<'parameters' | 'advanced' | 'scenarios'>('parameters');

  const stepsList = [
    'Submitting 5 parameters to Discrete Spatial Solver...',
    'Querying BBMP municipal road network & 800 candidate nodes...',
    'Enforcing D_min spatial dispersion & budget constraints...',
    'Computing 3-delivery milk-run routes & fuel burn...',
    'Generating optimal hub locations...',
  ];

  // Derive current 5 parameter values with fallbacks
  const budgetLakhs =
    config.budgetMonthlyLakhs !== undefined
      ? config.budgetMonthlyLakhs
      : config.budgetMonthly
      ? Number((config.budgetMonthly / 100000).toFixed(1))
      : 15.0;

  const propertySize = config.propertySizeSqft ?? 2500;
  const petrolCost = config.petrolCostPerKm ?? 2.0;
  const batchSize = config.batchSize ?? 3;
  const minDispersion = config.minDispersionKm ?? 6.5;
  const numHubs = config.maxWarehouses ?? 3;

  return (
    <div className="bg-white rounded-2xl border border-[#E8E0CE] shadow-xs flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-[#E8E0CE] flex items-center justify-between shrink-0 bg-[#FAF5E8]/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#9E471A] text-white flex items-center justify-center shadow-xs">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#1F1A16] font-serif">
              Facility Optimization Controls
            </h3>
            <p className="text-[11px] text-[#7A7168]">
              5-Parameter Discrete Spatial Solver
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs text-[#7A7168] hover:text-[#1F1A16] px-2.5 py-1.5 rounded-lg hover:bg-white border border-transparent hover:border-[#E8E0CE] transition-all cursor-pointer"
            title="Reset parameters to baseline"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E8E0CE] bg-[#FAF5E8]/40 p-2 gap-1.5 text-xs">
        <button
          onClick={() => setActiveTab('parameters')}
          className={`flex-1 py-2 px-3 font-bold text-center rounded-xl transition-all capitalize text-xs cursor-pointer ${
            activeTab === 'parameters'
              ? 'bg-[#FDE89C] text-[#3D270C] shadow-2xs border border-amber-300'
              : 'text-[#7A7168] hover:text-[#1F1A16] hover:bg-white/70'
          }`}
        >
          5 Core Parameters
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`flex-1 py-2 px-3 font-bold text-center rounded-xl transition-all capitalize text-xs cursor-pointer ${
            activeTab === 'advanced'
              ? 'bg-[#FDE89C] text-[#3D270C] shadow-2xs border border-amber-300'
              : 'text-[#7A7168] hover:text-[#1F1A16] hover:bg-white/70'
          }`}
        >
          Network Constraints
        </button>
        <button
          onClick={() => setActiveTab('scenarios')}
          className={`flex-1 py-2 px-3 font-bold text-center rounded-xl transition-all capitalize text-xs cursor-pointer ${
            activeTab === 'scenarios'
              ? 'bg-[#FDE89C] text-[#3D270C] shadow-2xs border border-amber-300'
              : 'text-[#7A7168] hover:text-[#1F1A16] hover:bg-white/70'
          }`}
        >
          What-If Stress Test
        </button>
      </div>

      {/* Form Content */}
      <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
        {activeTab === 'parameters' && (
          <div className="space-y-4.5">
            {/* PARAMETER 1: Monthly Budget in Lakhs */}
            <div className="p-3 bg-[#FAF5E8]/50 rounded-xl border border-[#E8DFC9] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1F1A16] flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5 text-[#9E471A]" />
                  <span>1. Monthly Budget (in ₹ Lakhs)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="3"
                    max="100"
                    step="0.5"
                    value={budgetLakhs}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      onChangeConfig({
                        budgetMonthlyLakhs: val,
                        budgetMonthly: val * 100000,
                      });
                    }}
                    className="w-16 px-2 py-0.5 text-right font-mono font-bold text-xs bg-white border border-[#E8E0CE] rounded-md text-[#9E471A]"
                  />
                  <span className="text-[11px] font-bold text-[#7A7168]">L / mo</span>
                </div>
              </div>
              <input
                type="range"
                min="3"
                max="50"
                step="0.5"
                value={budgetLakhs}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onChangeConfig({
                    budgetMonthlyLakhs: val,
                    budgetMonthly: val * 100000,
                  });
                }}
                className="w-full accent-[#9E471A] cursor-pointer h-2 bg-[#E8DEC7] rounded-lg"
              />
              <div className="flex items-center justify-between text-[10px] text-[#A8A29E]">
                <span>₹ 3 L</span>
                <span>₹ 15 L (Baseline)</span>
                <span>₹ 30 L</span>
                <span>₹ 50 L</span>
              </div>
            </div>

            {/* PARAMETER 2: Property Size in sq.ft */}
            <div className="p-3 bg-[#FAF5E8]/50 rounded-xl border border-[#E8DFC9] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1F1A16] flex items-center gap-1.5">
                  <Maximize className="w-3.5 h-3.5 text-[#9E471A]" />
                  <span>2. Property Size (sq.ft)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="500"
                    max="15000"
                    step="250"
                    value={propertySize}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1000;
                      onChangeConfig({ propertySizeSqft: val });
                    }}
                    className="w-20 px-2 py-0.5 text-right font-mono font-bold text-xs bg-white border border-[#E8E0CE] rounded-md text-[#9E471A]"
                  />
                  <span className="text-[11px] font-bold text-[#7A7168]">sq.ft</span>
                </div>
              </div>
              <input
                type="range"
                min="500"
                max="10000"
                step="250"
                value={propertySize}
                onChange={(e) => onChangeConfig({ propertySizeSqft: parseFloat(e.target.value) })}
                className="w-full accent-[#9E471A] cursor-pointer h-2 bg-[#E8DEC7] rounded-lg"
              />
              <div className="flex items-center justify-between text-[10px] text-[#A8A29E]">
                <span>500 sq.ft</span>
                <span>2,500 sq.ft (Standard)</span>
                <span>5,000 sq.ft</span>
                <span>10,000 sq.ft</span>
              </div>
            </div>

            {/* PARAMETER 3: Petrol Cost per km */}
            <div className="p-3 bg-[#FAF5E8]/50 rounded-xl border border-[#E8DFC9] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1F1A16] flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-[#9E471A]" />
                  <span>3. Petrol Cost (₹ / km)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0.5"
                    max="10"
                    step="0.1"
                    value={petrolCost}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1.0;
                      onChangeConfig({ petrolCostPerKm: val });
                    }}
                    className="w-16 px-2 py-0.5 text-right font-mono font-bold text-xs bg-white border border-[#E8E0CE] rounded-md text-[#9E471A]"
                  />
                  <span className="text-[11px] font-bold text-[#7A7168]">₹ / km</span>
                </div>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.1"
                value={petrolCost}
                onChange={(e) => onChangeConfig({ petrolCostPerKm: parseFloat(e.target.value) })}
                className="w-full accent-[#9E471A] cursor-pointer h-2 bg-[#E8DEC7] rounded-lg"
              />
              <div className="flex items-center justify-between text-[10px] text-[#A8A29E]">
                <span>₹ 0.5/km (EV)</span>
                <span>₹ 2.0/km (Standard 2W)</span>
                <span>₹ 5.0/km (Van)</span>
                <span>₹ 8.0/km</span>
              </div>
            </div>

            {/* PARAMETER 4: Deliveries per Trip */}
            <div className="p-3 bg-[#FAF5E8]/50 rounded-xl border border-[#E8DFC9] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1F1A16] flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#9E471A]" />
                  <span>4. Deliveries per Trip (Batch Size)</span>
                </label>
                <span className="font-mono font-bold text-xs bg-white border border-[#E8E0CE] px-2.5 py-0.5 rounded-md text-[#9E471A]">
                  {batchSize} drops / trip
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={batchSize}
                onChange={(e) => onChangeConfig({ batchSize: parseInt(e.target.value, 10) })}
                className="w-full accent-[#9E471A] cursor-pointer h-2 bg-[#E8DEC7] rounded-lg"
              />
              <div className="grid grid-cols-5 gap-1 pt-1">
                {[1, 2, 3, 5, 8].map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => onChangeConfig({ batchSize: b })}
                    className={`py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                      batchSize === b
                        ? 'bg-[#9E471A] text-white border-[#9E471A] shadow-2xs'
                        : 'bg-white text-[#5C5248] border-[#E8E0CE] hover:bg-[#FAF5E8]'
                    }`}
                  >
                    {b} {b === 1 ? 'drop' : 'drops'}
                  </button>
                ))}
              </div>
            </div>

            {/* PARAMETER 5: Minimum Hub Separation (km) */}
            <div className="p-3 bg-[#FAF5E8]/50 rounded-xl border border-[#E8DFC9] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1F1A16] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#9E471A]" />
                  <span>5. Minimum Hub Separation (km)</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    step="0.5"
                    value={minDispersion}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 2.0;
                      onChangeConfig({ minDispersionKm: val });
                    }}
                    className="w-16 px-2 py-0.5 text-right font-mono font-bold text-xs bg-white border border-[#E8E0CE] rounded-md text-[#9E471A]"
                  />
                  <span className="text-[11px] font-bold text-[#7A7168]">km</span>
                </div>
              </div>
              <input
                type="range"
                min="1.0"
                max="15.0"
                step="0.5"
                value={minDispersion}
                onChange={(e) => onChangeConfig({ minDispersionKm: parseFloat(e.target.value) })}
                className="w-full accent-[#9E471A] cursor-pointer h-2 bg-[#E8DEC7] rounded-lg"
              />
              <div className="flex items-center justify-between text-[10px] text-[#A8A29E]">
                <span>1.0 km (Dense)</span>
                <span>6.5 km (Optimal Dispersion)</span>
                <span>12.0 km</span>
                <span>15.0 km</span>
              </div>
              <p className="text-[10.5px] text-[#7A7168] leading-tight pt-0.5">
                Enforces spatial dispersion ($D_{'{min}'}$) so warehouses do not clump in the same neighborhood.
              </p>
            </div>

            {/* Hub Count (p) */}
            <div className="p-3 bg-white rounded-xl border border-[#E8DFC9] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#1F1A16] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#9E471A]" />
                  <span>Number of Hubs to Place (p)</span>
                </label>
                <span className="font-mono font-bold text-xs text-[#9E471A] bg-[#FAF5E8] px-2 py-0.5 rounded border border-[#E8DFC9]">
                  {numHubs} Hubs
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onChangeConfig({ maxWarehouses: p })}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      numHubs === p
                        ? 'bg-[#9E471A] text-white border-[#9E471A] shadow-xs'
                        : 'bg-[#FAF5E8]/60 text-[#5C5248] border-[#E8E0CE] hover:bg-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <div className="p-3 bg-[#FAF5E8] rounded-xl border border-[#E8DFC9] space-y-2">
              <span className="font-bold text-[#1F1A16] block">Mappls Spatial Road Network</span>
              <p className="text-[#5C5248] leading-relaxed text-[11px]">
                Calculates actual road distances with 1.4x circuity factor and dynamic urban corridor traffic delays across 800 discrete BBMP nodes.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#5C5248] block">
                Target Max Delivery SLA
              </label>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#1F1A16] font-mono">
                  {config.maxDeliveryTime} minutes
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="50"
                step="5"
                value={config.maxDeliveryTime}
                onChange={(e) => onChangeConfig({ maxDeliveryTime: Number(e.target.value) })}
                className="w-full accent-[#9E471A] cursor-pointer h-2 bg-[#E8DEC7] rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#5C5248] block">
                Congestion Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as TrafficLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => onChangeConfig({ trafficLevel: lvl })}
                    className={`py-2 text-center rounded-xl border capitalize text-xs font-bold transition-all cursor-pointer ${
                      config.trafficLevel === lvl
                        ? 'bg-[#FDE89C] text-[#3D270C] border-amber-400 shadow-2xs'
                        : 'border-[#E8E0CE] bg-[#FAF5E8]/60 text-[#7A7168] hover:bg-[#FAF5E8]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="space-y-3">
            <button
              onClick={() => {
                onChangeConfig({
                  budgetMonthlyLakhs: 20.0,
                  petrolCostPerKm: 2.5,
                  minDispersionKm: 8.0,
                  maxWarehouses: 4,
                });
              }}
              className="w-full p-3.5 bg-[#FAF5E8] hover:bg-[#FAF3E3] border border-[#E8E0CE] rounded-xl text-left transition-colors cursor-pointer"
            >
              <div className="font-bold text-[#1F1A16] flex justify-between text-xs">
                <span>Diwali Festival Expansion</span>
                <span className="text-amber-900 text-[11px] bg-[#FDE89C] px-2 py-0.5 rounded font-bold">Preset</span>
              </div>
              <p className="text-[11px] text-[#7A7168] mt-1">
                Budget ₹20L • 4 Hubs • 8.0km Separation
              </p>
            </button>

            <button
              onClick={() => {
                onChangeConfig({
                  budgetMonthlyLakhs: 10.0,
                  propertySizeSqft: 2000,
                  batchSize: 4,
                  minDispersionKm: 5.0,
                  maxWarehouses: 2,
                });
              }}
              className="w-full p-3.5 bg-[#FAF5E8] hover:bg-[#FAF3E3] border border-[#E8E0CE] rounded-xl text-left transition-colors cursor-pointer"
            >
              <div className="font-bold text-[#1F1A16] flex justify-between text-xs">
                <span>Lean Quick-Commerce Hubs</span>
                <span className="text-emerald-900 text-[11px] bg-emerald-100 px-2 py-0.5 rounded font-bold">Lean</span>
              </div>
              <p className="text-[11px] text-[#7A7168] mt-1">
                Budget ₹10L • 2 Hubs • 2,000 sq.ft • 4 drops/trip
              </p>
            </button>
          </div>
        )}
      </div>

      {/* Button: Generate Hub Locations */}
      <div className="p-4 sm:p-5 border-t border-[#E8E0CE] bg-[#FAF5E8]/70 shrink-0 space-y-2.5">
        {isOptimizing ? (
          <div className="p-3 bg-white rounded-xl border border-amber-300 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-900">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                OPTIMIZING FACILITY LOCATIONS...
              </span>
              <span className="font-mono text-xs">
                {Math.min(100, Math.round(((stepIndex + 1) / stepsList.length) * 100))}%
              </span>
            </div>
            <div className="w-full bg-[#E8DEC7] h-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#9E471A] transition-all duration-300"
                style={{ width: `${Math.min(100, ((stepIndex + 1) / stepsList.length) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-[#7A7168] truncate">{stepsList[stepIndex]}</p>
          </div>
        ) : (
          <button
            id="run-optimization-btn"
            onClick={onRunOptimization}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-[#9E471A] via-[#8F3E15] to-[#7B3410] hover:from-[#8A3B12] hover:to-[#6F2E0D] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Generate Hub Locations</span>
          </button>
        )}

        {lastResult && !isOptimizing && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate font-medium">{lastResult.summaryMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
