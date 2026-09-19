import React, { useState, useEffect } from 'react';
import { FeaturesDrawer } from './components/FeaturesDrawer';
import { TopHeader } from './components/TopHeader';
import { DashboardPage } from './pages/DashboardPage';
import { ScenariosPage } from './pages/ScenariosPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DataPage } from './pages/DataPage';
import { SettingsPage } from './pages/SettingsPage';
import { DemoTourModal } from './components/DemoTourModal';
import { CITIES, DEFAULT_OPTIMIZATION_CONFIG } from './data/cityData';
import {
  CityOption,
  OptimizationConfig,
  OptimizationResult,
  ActivityEvent,
  GridPoint,
} from './types';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'scenarios' | 'analytics' | 'data' | 'settings'
  >('dashboard');

  const [selectedCity, setSelectedCity] = useState<CityOption>(CITIES[0]);
  const [config, setConfig] = useState<OptimizationConfig>({
    ...DEFAULT_OPTIMIZATION_CONFIG,
  });

  const [result, setResult] = useState<OptimizationResult>(() =>
    api.getCurrentResult()
  );

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [isDemoTourOpen, setIsDemoTourOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [customPoints, setCustomPoints] = useState<GridPoint[] | undefined>(undefined);

  const [events, setEvents] = useState<ActivityEvent[]>([
    {
      id: 'e1',
      type: 'optimization',
      message: 'Optimization completed successfully • 3 warehouses selected • 24.5 min avg. delivery time',
      timestamp: '10:22 AM',
    },
    {
      id: 'e2',
      type: 'capacity',
      message: 'Scenario "High Demand" simulated (+40% demand • New cost: ₹ 8.4 L)',
      timestamp: '09:15 AM',
    },
    {
      id: 'e3',
      type: 'traffic',
      message: 'Warehouse W7 capacity updated (New capacity: 5,000)',
      timestamp: 'Yesterday',
    },
    {
      id: 'e4',
      type: 'demand',
      message: 'New data uploaded (30 zones • 15 warehouses • BBMP grid)',
      timestamp: 'Yesterday',
    },
  ]);

  // Initial backend health probe & live optimization fetch
  useEffect(() => {
    let isMounted = true;
    async function initBackend() {
      try {
        const status = await api.checkBackendHealth();
        if (status.online && isMounted) {
          const freshResult = await api.optimizeNetwork(config);
          if (isMounted) {
            setResult(freshResult);
            setEvents((prev) => [
              {
                id: `evt-init-${Date.now()}`,
                type: 'system',
                message: 'FastAPI Spatial Optimization Engine active • 800 discrete nodes loaded',
                timestamp: 'Just now',
              },
              ...prev.slice(0, 4),
            ]);
          }
        }
      } catch (err) {
        console.warn('Backend auto-connection error:', err);
      }
    }
    initBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  // Execute optimization
  const handleRunOptimization = async () => {
    setIsOptimizing(true);
    setStepIndex(0);

    try {
      const newResult = await api.optimizeNetwork(config, (step, idx) => {
        setCurrentStep(step);
        setStepIndex(idx);
      });

      setResult(newResult);

      // Append new event
      setEvents((prev) => [
        {
          id: `evt-${Date.now()}`,
          type: 'optimization',
          message: `Optimization completed successfully • ${newResult.selectedWarehouseIds.length} warehouses selected • ${newResult.kpi.avgDeliveryTimeMin} min avg delivery`,
          timestamp: 'Just now',
        },
        ...prev.slice(0, 5),
      ]);
    } catch (err) {
      console.error('Optimization error:', err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleChangeConfig = (newConfig: Partial<OptimizationConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const handleReset = async () => {
    const defaultRes = await api.resetScenario();
    setConfig({ ...DEFAULT_OPTIMIZATION_CONFIG });
    setResult(defaultRes);
    setEvents((prev) => [
      {
        id: `evt-${Date.now()}`,
        type: 'optimization',
        message: 'Network reset to baseline Bengaluru configuration',
        timestamp: 'Just now',
      },
      ...prev,
    ]);
  };

  const handleLoadCustomPoints = async (pts: GridPoint[]) => {
    setCustomPoints(pts);
    setEvents((prev) => [
      {
        id: `evt-${Date.now()}`,
        type: 'demand',
        message: `Uploaded custom dataset containing ${pts.length} coordinate points`,
        timestamp: 'Just now',
      },
      ...prev,
    ]);
    await handleRunOptimization();
  };

  return (
    <div className="min-h-screen bg-[#FAF5E8] text-[#1F1A16] flex flex-col font-sans antialiased selection:bg-amber-300 selection:text-amber-950">
      {/* Full Width Top Header with Panorama Illustration, Branding, and Features Hover Display */}
      <TopHeader
        onOpenDemoTour={() => setIsDemoTourOpen(true)}
        onOpenFeatures={() => setFeaturesOpen(true)}
        userName="Arjun"
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Features Display Drawer (Appears when 4-Square Bento button is tapped) */}
      <FeaturesDrawer
        isOpen={featuresOpen}
        onClose={() => setFeaturesOpen(false)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        pointCount={customPoints ? customPoints.length : selectedCity.totalPoints}
      />

      {/* Body Area: Full-Width Main Content (No permanent left sidebar cluttering corner) */}
      <div className="flex-1 flex min-w-0">
        {/* Main Content Area with generous airy padding */}
        <main className="flex-1 min-w-0 overflow-x-hidden p-4 sm:p-6 lg:p-8 xl:p-10">
          {activeTab === 'dashboard' && (
            <DashboardPage
              city={selectedCity}
              warehouses={result.warehouses}
              zones={result.zones}
              assignments={result.assignments}
              result={result}
              config={config}
              onChangeConfig={handleChangeConfig}
              onRunOptimization={handleRunOptimization}
              isOptimizing={isOptimizing}
              currentStep={currentStep}
              stepIndex={stepIndex}
              events={events}
              customPoints={customPoints}
              onReset={handleReset}
              userName="Arjun"
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'scenarios' && (
            <ScenariosPage
              currentResult={result}
              warehouses={result.warehouses}
              onApplyScenarioResult={(newRes) => setResult(newRes)}
            />
          )}

          {activeTab === 'analytics' && <AnalyticsPage result={result} />}

          {activeTab === 'data' && (
            <DataPage
              onLoadCustomPoints={handleLoadCustomPoints}
              activePointCount={
                customPoints ? customPoints.length : selectedCity.totalPoints
              }
            />
          )}

          {activeTab === 'settings' && <SettingsPage />}
        </main>
      </div>

      {/* Interactive Hackathon Judge Walkthrough Modal */}
      <DemoTourModal
        isOpen={isDemoTourOpen}
        onClose={() => setIsDemoTourOpen(false)}
        onRunOptimization={() => {
          handleRunOptimization();
          setActiveTab('dashboard');
        }}
        onGoToScenarios={() => {
          setActiveTab('scenarios');
        }}
        onGoToAnalytics={() => {
          setActiveTab('analytics');
        }}
      />
    </div>
  );
}

export default App;
