import React from 'react';

interface TopHeaderProps {
  onRunOptimization?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = () => {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8 py-3 max-w-[1800px] mx-auto flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
            NW
          </div>
          <div>
            <h1 className="font-semibold text-base text-gray-900 tracking-tight leading-none">
              Namma Warehouse
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Bangalore Warehouse Location Optimizer
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

