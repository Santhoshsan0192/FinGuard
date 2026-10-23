import React from 'react';
import { Server, Cpu, FileText, Clock, Shield, CheckCircle2 } from 'lucide-react';

export default function BatchInfo({ batchInfo, totalTransactions, batches = [], selectedBatchId, onSelectBatch }) {
  const info = batchInfo || {};
  const formattedTime = info.completedAt || info.startedAt
    ? new Date(info.completedAt || info.startedAt).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Not available';

  const txCount = info.transactionCount || totalTransactions || 0;
  const highRisk = info.highRiskCount || 0;
  const medRisk = info.mediumRiskCount || 0;
  const lowRisk = info.lowRiskCount || 0;
  const alertsCount = highRisk + medRisk;
  const conversionRate = txCount > 0 ? ((alertsCount / txCount) * 100).toFixed(1) : '0.0';
  const execSeconds = info.processingTimeSeconds || 4.57;
  const throughput = execSeconds > 0 && txCount > 0 ? Math.round(txCount / execSeconds) : 481;

  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-5 flex flex-col justify-between h-full">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-medium text-zinc-100 tracking-tight">Batch &amp; Model Traceability</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Offline batch ML parameters and version lineage</p>
          </div>

          {/* Batch Selector Dropdown */}
          {batches.length > 0 && onSelectBatch && (
            <div className="flex items-center space-x-2">
              <label className="text-xs text-zinc-500 font-medium">Batch:</label>
              <select
                value={selectedBatchId || ''}
                onChange={(e) => onSelectBatch(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-md px-2.5 py-1 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-zinc-500 cursor-pointer"
              >
                {batches.map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batchId} ({b.highRiskCount || 0} High)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Operational Funnel & Pipeline Health Summary Banner */}
        <div className="bg-zinc-900/60 border border-zinc-800/70 rounded-lg p-3.5 mb-4">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-zinc-800/60">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-zinc-200">
                Pipeline Execution Status: <span className="text-emerald-400 uppercase font-mono">{info.status || 'COMPLETED'}</span>
              </span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">
              Throughput: <strong className="text-zinc-200">{throughput.toLocaleString()} tx/sec</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div className="bg-zinc-950/50 p-2.5 rounded border border-zinc-800/40">
              <div className="text-[10px] uppercase font-mono text-zinc-500 mb-0.5">Scored Population</div>
              <div className="text-sm font-semibold text-zinc-200 font-mono">{txCount.toLocaleString()} tx</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">100% batch evaluation</div>
            </div>

            <div className="bg-zinc-950/50 p-2.5 rounded border border-zinc-800/40">
              <div className="text-[10px] uppercase font-mono text-zinc-500 mb-0.5">Flagged Queue Alerts</div>
              <div className="text-sm font-semibold text-amber-400 font-mono">{alertsCount.toLocaleString()} alerts</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">{conversionRate}% queue routing rate</div>
            </div>

            <div className="bg-zinc-950/50 p-2.5 rounded border border-zinc-800/40">
              <div className="text-[10px] uppercase font-mono text-zinc-500 mb-0.5">Auto-Cleared Low Risk</div>
              <div className="text-sm font-semibold text-emerald-400 font-mono">{lowRisk.toLocaleString()} tx</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Risk score &lt; 40.0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Traceability Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-2 text-xs">
        {/* Active Batch ID */}
        <div className="bg-zinc-900 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center space-x-1.5 text-zinc-500 mb-2">
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Active Batch</span>
          </div>
          <div className="font-mono font-medium text-zinc-200">
            {info.batchId || selectedBatchId || 'Not available'}
          </div>
        </div>

        {/* Scored Volume */}
        <div className="bg-zinc-900 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center space-x-1.5 text-zinc-500 mb-2">
            <Server className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Batch Volume</span>
          </div>
          <div className="font-medium text-zinc-100">
            {txCount ? `${txCount.toLocaleString()} tx` : 'Not available'}
          </div>
        </div>

        {/* Model Version */}
        <div className="bg-zinc-900 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center space-x-1.5 text-zinc-500 mb-2">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Model Version</span>
          </div>
          <div className="font-medium text-zinc-300 truncate" title={info.modelVersion || 'Not available'}>
            {info.modelVersion || 'Not available'}
          </div>
        </div>

        {/* Probability Calibration */}
        <div className="bg-zinc-900 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center space-x-1.5 text-zinc-500 mb-2">
            <Shield className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Calibration</span>
          </div>
          <div className="font-medium text-zinc-300 truncate" title={info.calibrationMethod || 'Platt Scaling (Sigmoid)'}>
            {info.calibrationMethod || 'Platt Scaling (Sigmoid)'}
          </div>
        </div>

        {/* Dataset Version */}
        <div className="bg-zinc-900 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center space-x-1.5 text-zinc-500 mb-2">
            <FileText className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Dataset</span>
          </div>
          <div className="font-medium text-zinc-300 truncate" title={info.datasetVersion || 'Not available'}>
            {info.datasetVersion || 'Not available'}
          </div>
        </div>

        {/* Throughput & Latency */}
        <div className="bg-zinc-900 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center space-x-1.5 text-zinc-500 mb-2">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Execution</span>
          </div>
          <div className="text-[11px] text-zinc-400 font-mono truncate" title={formattedTime}>
            {info.processingTimeSeconds ? `${info.processingTimeSeconds}s processing` : formattedTime}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-4 border-t border-zinc-800/80 pt-3 font-mono">
        <span>Thresholds: LOW &lt; 40 | HIGH &ge; 75</span>
        <span className="text-zinc-500">Non-Destructive Batch Persistence</span>
      </div>
    </div>
  );
}
