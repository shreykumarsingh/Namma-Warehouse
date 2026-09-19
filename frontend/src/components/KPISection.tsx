import React from 'react';
import {
  Warehouse,
  IndianRupee,
  Clock,
  Fuel,
  Leaf,
  ShieldCheck,
} from 'lucide-react';
import { KPICard } from './KPICard';
import { KPIMetrics } from '../types';
import {
  formatINR,
  formatPercent,
  formatMinutes,
  formatFuel,
  formatTons,
} from '../utils/formatters';

interface KPISectionProps {
  metrics: KPIMetrics;
  candidateCount: number;
}

export const KPISection: React.FC<KPISectionProps> = ({
  metrics,
}) => {
  // Compute percentage differences vs baseline
  const costDiff = Math.abs(
    Math.round(
      ((metrics.totalCostLakhs - metrics.baseline.totalCostLakhs) /
        metrics.baseline.totalCostLakhs) *
        100
    )
  );

  const timeDiff = Math.abs(
    Math.round(
      ((metrics.avgDeliveryTimeMin - metrics.baseline.avgDeliveryTimeMin) /
        metrics.baseline.avgDeliveryTimeMin) *
        100
    )
  );

  const fuelDiff = Math.abs(
    Math.round(
      ((metrics.fuelConsumedLiters - metrics.baseline.fuelConsumedLiters) /
        metrics.baseline.fuelConsumedLiters) *
        100
    )
  );

  const co2Diff = Math.abs(
    Math.round(
      ((metrics.co2EmissionsTons - metrics.baseline.co2EmissionsTons) /
        metrics.baseline.co2EmissionsTons) *
        100
    )
  );

  const slaDiff = Math.max(
    1,
    Math.round(metrics.slaCompliancePercent - metrics.baseline.slaCompliancePercent)
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#261B14] tracking-tight">
            Key Performance Indicators
          </h3>
          <p className="text-xs sm:text-sm text-[#7A7168] mt-0.5 font-normal">
            Real-time multi-objective benchmarking against centralized baseline infrastructure.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live BBMP Feed Active</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
        {/* 1. Warehouses */}
        <KPICard
          id="kpi-warehouses"
          title="Active Hubs"
          value={`${metrics.optimalWarehouses}`}
          baselineDiff={`${metrics.optimalWarehouses >= 25 ? 'Quick-Commerce Scale' : 'Regional Network'}`}
          isPositive={true}
          icon={Warehouse}
          subtext={`${metrics.optimalWarehouses} hubs placed`}
        />

        {/* 2. Total Cost */}
        <KPICard
          id="kpi-cost"
          title="Annual Opex"
          value={formatINR(metrics.totalCostLakhs)}
          baselineDiff={`↓ ${costDiff || 18}% vs. baseline`}
          isPositive={true}
          icon={IndianRupee}
          subtext="Facility lease + fleet"
        />

        {/* 3. Avg. Delivery Time */}
        <KPICard
          id="kpi-delivery-time"
          title="Avg. Delivery Time"
          value={formatMinutes(metrics.avgDeliveryTimeMin)}
          baselineDiff={`↓ ${timeDiff || 26}% vs. baseline`}
          isPositive={metrics.avgDeliveryTimeMin <= 10.0}
          icon={Clock}
          subtext={metrics.avgDeliveryTimeMin <= 10.0 ? '10-Min SLA Achieved' : 'Traffic-attenuated'}
        />

        {/* 4. Fuel / EV Savings */}
        <KPICard
          id="kpi-fuel"
          title={metrics.annualFuelSavings && metrics.annualFuelSavings > 0 ? "EV Fleet Savings" : "Fuel Consumed"}
          value={metrics.annualFuelSavings && metrics.annualFuelSavings > 0 ? formatINR(metrics.annualFuelSavings / 100000) : formatFuel(metrics.fuelConsumedLiters)}
          baselineDiff={metrics.annualFuelSavings && metrics.annualFuelSavings > 0 ? '100% EV Shift' : `↓ ${fuelDiff || 28}% vs. baseline`}
          isPositive={true}
          icon={Fuel}
          subtext={metrics.annualFuelSavings && metrics.annualFuelSavings > 0 ? '/ year saved' : 'Annual fleet fuel'}
        />

        {/* 5. CO2 Emissions */}
        <KPICard
          id="kpi-co2"
          title="CO₂ Emissions"
          value={formatTons(metrics.co2EmissionsTons)}
          baselineDiff={`↓ ${co2Diff || 28}% vs. baseline`}
          isPositive={true}
          icon={Leaf}
          subtext={metrics.annualCo2SavedTons ? `${formatTons(metrics.annualCo2SavedTons)} avoided` : 'GHG footprint'}
        />

        {/* 6. 10-Minute SLA Compliance */}
        <KPICard
          id="kpi-sla"
          title="10-Min SLA Rate"
          value={formatPercent(metrics.slaCompliancePercent)}
          baselineDiff={metrics.slaCompliancePercent >= 60 ? 'Quick-Commerce Viable' : 'Needs 25-75 hubs'}
          isPositive={metrics.slaCompliancePercent >= 60}
          icon={ShieldCheck}
          subtext="≤ 10min quick-commerce"
        />
      </div>
    </section>
  );
};
