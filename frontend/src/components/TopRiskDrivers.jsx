import React from 'react';
import { Sparkles } from 'lucide-react';

export default function TopRiskDrivers({ drivers }) {
  const driverList = drivers && drivers.length > 0 ? drivers : [];

  // Find maximum importance for proportional bar scaling
  const maxImportance = Math.max(...driverList.map(d => d.importance || 1), 1);

  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-5 flex flex-col justify-between h-full">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-medium text-zinc-100 tracking-tight">Top Risk Drivers</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">Influential behavioural features</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
          SHAP Aggregations
        </span>
      </div>

      <div className="space-y-4 my-2">
        {driverList.length === 0 ? (
          <div className="text-center py-6 text-xs text-zinc-600">
            No risk drivers aggregated yet.
          </div>
        ) : (
          driverList.map((driver, idx) => {
            const importance = driver.importance || 0;
            const barWidth = Math.min(100, Math.max(12, (importance / maxImportance) * 100));

            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex flex-col text-xs mb-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-200">{driver.description || driver.feature || 'Unknown Feature'}</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-rose-400 border border-zinc-700">
                        +{importance.toFixed(2)} SHAP
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 mt-0.5">{driver.feature}</span>
                </div>

                {/* Contribution visual bar */}
                <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800/50">
                  <div
                    className="h-full bg-zinc-500 rounded-full transition-all duration-500"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-4 border-t border-zinc-800/80 pt-3 font-mono">
        <span>Attribution: TreeSHAP</span>
        <span className="text-zinc-500">+ Log-Odds</span>
      </div>
    </div>
  );
}
