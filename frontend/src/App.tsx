import React, { useState, useEffect } from 'react';
import { TopHeader } from './components/TopHeader';
import { DashboardPage } from './pages/DashboardPage';
import { CITIES, DEFAULT_OPTIMIZATION_CONFIG } from './data/cityData';
import {
  CityOption,
  OptimizationConfig,
  OptimizationResult,
  GridPoint,
} from './types';
import { api } from './services/api';

export function App() {
  const [selectedCity] = useState<CityOption>(CITIES[0]);
  const [config, setConfig] = useState<OptimizationConfig>({
    ...DEFAULT_OPTIMIZATION_CONFIG,
  });

  const [result, setResult] = useState<OptimizationResult>(() =>
    api.getCurrentResult()
  );

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [customPoints, setCustomPoints] = useState<GridPoint[] | undefined>(undefined);

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
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-gray-900 flex flex-col font-sans antialiased">
      <TopHeader onRunOptimization={handleRunOptimization} />

      <main className="flex-1 min-w-0 overflow-x-hidden">
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
          customPoints={customPoints}
          onReset={handleReset}
        />
      </main>
    </div>
  );
}

export default App;
