import React from 'react';
import { ShieldCheck, AlertCircle, AlertTriangle } from 'lucide-react';

export default function RiskDistribution({ distribution, highCount, mediumCount, lowCount, total }) {
  const low = distribution?.LOW ?? lowCount ?? 0;
  const medium = distribution?.MEDIUM ?? mediumCount ?? 0;
  const high = distribution?.HIGH ?? highCount ?? 0;
  const totalCount = total !== undefined && total !== null ? total : (low + medium + high);

  const lowPct = totalCount > 0 ? ((low / totalCount) * 100).toFixed(1) : '0.0';
  const medPct = totalCount > 0 ? ((medium / totalCount) * 100).toFixed(1) : '0.0';
  const highPct = totalCount > 0 ? ((high / totalCount) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-100 tracking-tight">Risk Distribution</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Continuous scoring breakdown</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
          {totalCount.toLocaleString()} Scored
        </span>
      </div>

      {/* Horizontal Multi-Segment Proportional Bar */}
      <div className="my-4">
        <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden flex">
          {low > 0 && (
            <div
              style={{ width: `${lowPct}%` }}
              className="h-full bg-emerald-500/80 transition-all duration-500"
              title={`Low Risk: ${low.toLocaleString()} (${lowPct}%)`}
            />
          )}
          {medium > 0 && (
            <div
              style={{ width: `${medPct}%` }}
              className="h-full bg-amber-500/80 transition-all duration-500"
              title={`Medium Risk: ${medium.toLocaleString()} (${medPct}%)`}
            />
          )}
          {high > 0 && (
            <div
              style={{ width: `${highPct}%` }}
              className="h-full bg-rose-500/80 transition-all duration-500"
              title={`High Risk: ${high.toLocaleString()} (${highPct}%)`}
            />
          )}
          {totalCount === 0 && (
            <div className="h-full w-full bg-zinc-800" title="No scored transactions in batch" />
          )}
        </div>
      </div>

      {/* 3 Metric Detail Cards */}
      <div className="grid grid-cols-3 gap-3 mt-2">
        {/* Low */}
        <div className="flex flex-col">
          <div className="flex items-center space-x-1.5 text-emerald-500 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Low Risk</span>
          </div>
          <div className="text-xl font-semibold text-zinc-100 font-mono">
            {low.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            <span className="text-emerald-500/80 font-medium">{lowPct}%</span> (&lt;40)
          </div>
        </div>

        {/* Medium */}
        <div className="flex flex-col border-l border-zinc-800 pl-3">
          <div className="flex items-center space-x-1.5 text-amber-500 mb-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Medium</span>
          </div>
          <div className="text-xl font-semibold text-zinc-100 font-mono">
            {medium.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            <span className="text-amber-500/80 font-medium">{medPct}%</span> (40-74)
          </div>
        </div>

        {/* High */}
        <div className="flex flex-col border-l border-zinc-800 pl-3">
          <div className="flex items-center space-x-1.5 text-rose-500 mb-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">High Risk</span>
          </div>
          <div className="text-xl font-semibold text-zinc-100 font-mono">
            {high.toLocaleString()}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            <span className="text-rose-500/80 font-medium">{highPct}%</span> (&ge;75)
          </div>
        </div>
      </div>
    </div>
  );
}
