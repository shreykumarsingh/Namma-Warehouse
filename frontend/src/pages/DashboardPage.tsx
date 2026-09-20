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

export interface ActivityItem {
  id: string;
  type: 'optimization' | 'capacity' | 'traffic' | 'demand';
  msg: string;
  time: string;
}

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
  activities?: ActivityItem[];
}

const AF_COLORS = {
  optimization: '#047857',
  capacity: '#9E471A',
  traffic: '#D97706',
  demand: '#4338CA',
};

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
  activities = [
    { id: '1', type: 'optimization', msg: 'Optimization completed • 3 warehouses selected • 24.5 min avg delivery', time: 'Just now' },
    { id: '2', type: 'capacity', msg: 'Scenario "High Demand" simulated (+40% demand • Dynamic throughput adjusted)', time: '10m ago' },
    { id: '3', type: 'traffic', msg: 'Outer Ring Road traffic impedance calibrated with TomTom benchmarks', time: '1h ago' },
    { id: '4', type: 'demand', msg: 'BBMP 800 discrete candidate nodes loaded and normalized', time: '2h ago' },
  ],
}) => {
  const selectedCount = result.selectedWarehouseIds.length;
  const avgTime = result.kpi.avgDeliveryTimeMin || 24.5;
  const slaPct = result.kpi.slaCompliancePercent || 94.2;
  const totalCostLakhs = result.kpi.totalCostLakhs || 7.2;
  const co2Pct = Math.round(result.kpi.baseline?.co2EmissionsTons
    ? Math.max(5, ((result.kpi.baseline.co2EmissionsTons - result.kpi.co2EmissionsTons) / result.kpi.baseline.co2EmissionsTons) * 100)
    : 31);

  return (
    <div className="space-y-6">
      {/* ── KPI Grid (from User Design) ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Avg Delivery Time</div>
          <div className="kpi-value">
            {avgTime.toFixed(1)}
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#9E471A' }}> min</span>
          </div>
          <span className="kpi-badge kpi-green">↓ 18% vs baseline</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">SLA Compliance</div>
          <div className="kpi-value">
            {slaPct.toFixed(1)}
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#9E471A' }}>%</span>
          </div>
          <span className="kpi-badge kpi-green">↑ 12% improvement</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Active Hubs</div>
          <div className="kpi-value">{selectedCount || 3}</div>
          <span className="kpi-badge kpi-orange">Bengaluru Network</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Total Logistics Cost</div>
          <div className="kpi-value">
            ₹{totalCostLakhs.toFixed(1)}
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#9E471A' }}> L</span>
          </div>
          <span className="kpi-badge kpi-green">↓ ₹1.8L saved</span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">CO₂ Reduction</div>
          <div className="kpi-value">
            {co2Pct}
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#047857' }}>%</span>
          </div>
          <span className="kpi-badge" style={{ background: 'rgba(4,120,87,.1)', color: '#047857' }}>
            Greener Routes
          </span>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Demand Zones</div>
          <div className="kpi-value">800</div>
          <span className="kpi-badge kpi-blue">BBMP Grid Nodes</span>
        </div>
      </div>

      {/* ── Core 3-Column Optimizer Workspace: Controls | Live Map | Operations ── */}
      <div className="flex flex-col xl:flex-row gap-4 items-stretch w-full">
        {/* Left: Optimization Controls */}
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

        {/* Center: Interactive Leaflet Map */}
        <div className="flex-1 min-w-0 w-full flex flex-col">
          <div className="map-area h-full min-h-[520px]">
            <div className="map-title">
              <span>Bengaluru Hub Network — Spatial Simulation</span>
              <span className="text-[11px] font-normal text-[#9E471A] bg-[#FFF8EE] px-2.5 py-1 rounded-full border border-[#E9CDB0]">
                800 BBMP coordinate nodes loaded
              </span>
            </div>
            <div className="flex-1 min-h-[460px] w-full relative rounded-xl overflow-hidden border border-[#E8DFC9]">
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
          </div>
        </div>

        {/* Right: Network Operations & Workforce */}
        <div className="w-full xl:w-[340px] xl:shrink-0 flex flex-col">
          <NetworkOperationsPanel
            config={config}
            result={result}
          />
        </div>
      </div>

      {/* ── Analytics Charts: Cost U-Curve, Utilization, Breakdown ── */}
      <DashboardCharts
        analytics={result.analytics}
        selectedCount={selectedCount}
      />

      {/* ── Detailed Warehouse Results Grid ── */}
      <WarehouseResultsGrid warehouses={warehouses} />

      {/* ── Activity Feed (from User Design) ── */}
      <div className="activity-feed">
        <div className="af-title">Activity Feed</div>
        <div>
          {activities.map((act) => (
            <div key={act.id} className="af-item">
              <span
                className="af-dot"
                style={{ background: AF_COLORS[act.type] || '#7A7168' }}
              />
              <span className="af-msg">{act.msg}</span>
              <span className="af-time">{act.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
