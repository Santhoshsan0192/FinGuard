import React from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';

export default function BehaviourDeviation({ baseline, currentTx, currentAlert }) {
  const normAvg = baseline?.baselineAvgAmt ?? baseline?.baseline_avg_amt;
  const currentAmt = currentTx?.amount ?? currentAlert?.amount;

  const hasBaselineAmt = typeof normAvg === 'number' && normAvg > 0;
  const hasCurrentAmt = typeof currentAmt === 'number';

  const amtRatio = (hasBaselineAmt && hasCurrentAmt) ? (currentAmt / normAvg) : null;
  const pctChange = (hasBaselineAmt && hasCurrentAmt) ? ((currentAmt - normAvg) / normAvg) * 100 : null;
  const isAmtDeviated = amtRatio !== null && amtRatio >= 1.8;

  // Real device telemetry from transaction and baseline profile
  const normalDevice = baseline?.primaryDevice || baseline?.primary_device;
  const currentDevice = currentTx?.deviceType || currentTx?.deviceInfo;
  const hasDeviceData = Boolean(normalDevice && currentDevice);
  const isDeviceDeviated = hasDeviceData && (
    normalDevice.toLowerCase() !== currentDevice.toLowerCase() && 
    !currentDevice.toLowerCase().includes(normalDevice.toLowerCase())
  );

  // Real operating hours telemetry
  const normalHours = baseline?.typicalActiveHours || baseline?.typical_active_hours;
  const currentHour = currentTx?.hourOfDay ?? currentTx?.hour_of_day;
  const hasHourData = typeof currentHour === 'number' && Boolean(normalHours);
  const isHoursDeviated = hasHourData && (currentHour < 6 || currentHour > 22);

  const isColdStart = currentAlert?.coldStartFlag === 1 || !baseline || baseline.totalTransactions < 3;

  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-5 h-full flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Behaviour Deviation</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Comparison to historical customer baseline</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">
            Anomaly Detection
          </span>
        </div>

        {isColdStart && (
          <div className="mb-3 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center space-x-2">
            <HelpCircle className="w-4 h-4 shrink-0" />
            <span>Limited historical baseline profile (&lt;3 transactions). Scoring relies on population priors.</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          {/* Metric 1: Transaction Spend Comparison */}
          <div className={`p-3.5 rounded-lg border transition-colors ${
            isAmtDeviated 
              ? 'bg-rose-500/[0.04] border-rose-500/30 text-zinc-200' 
              : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-300'
          }`}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-semibold text-zinc-100 text-xs">Transaction Spend</span>
              {hasBaselineAmt && amtRatio !== null ? (
                isAmtDeviated ? (
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{amtRatio.toFixed(1)}× Normal</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Consistent</span>
                  </span>
                )
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                  No Baseline
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500 block text-[10px] mb-0.5 uppercase tracking-wider">Baseline:</span>
                <span className="text-zinc-300 font-medium">
                  {hasBaselineAmt ? `$${normAvg.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] mb-0.5 uppercase tracking-wider">Current:</span>
                <span className="text-zinc-100 font-semibold">
                  {hasCurrentAmt ? `$${currentAmt.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] mb-0.5 uppercase tracking-wider">Deviation:</span>
                <span className={isAmtDeviated ? 'text-rose-400 font-bold' : 'text-emerald-400 font-medium'}>
                  {pctChange !== null 
                    ? `${pctChange >= 0 ? `+${pctChange.toFixed(0)}%` : `${pctChange.toFixed(0)}%`}` 
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Metric 2: Hardware / Device Profile */}
          <div className={`p-3.5 rounded-lg border transition-colors ${
            isDeviceDeviated 
              ? 'bg-rose-500/[0.04] border-rose-500/30 text-zinc-200' 
              : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-300'
          }`}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-semibold text-zinc-100 text-xs">Hardware Profile</span>
              {hasDeviceData ? (
                isDeviceDeviated ? (
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Unrecognized</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Matched</span>
                  </span>
                )
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Not Recorded
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-zinc-500 block text-[10px] mb-0.5 uppercase tracking-wider">Registered:</span>
                <span className="text-zinc-300 font-medium font-mono">{normalDevice || 'Not set'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] mb-0.5 uppercase tracking-wider">Current:</span>
                <span className="text-zinc-100 font-medium font-mono">{currentDevice || 'Not recorded'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] mb-0.5 uppercase tracking-wider">Status:</span>
                <span className={isDeviceDeviated ? 'text-rose-400 font-bold' : 'text-emerald-400 font-medium'}>
                  {hasDeviceData ? (isDeviceDeviated ? 'New hardware' : 'Known hardware') : 'Telemetry N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Metric 3: Active Operating Hours */}
          <div className={`p-3.5 rounded-lg border transition-colors ${
            isHoursDeviated 
              ? 'bg-amber-500/[0.04] border-amber-500/30 text-zinc-200' 
              : 'bg-zinc-900/50 border-zinc-800/60 text-zinc-300'
          }`}>
            <div className="flex items-center justify-between mb-2.5">
              <span className="font-semibold text-zinc-100 text-xs">Time Window</span>
              {hasHourData ? (
                isHoursDeviated ? (
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Off-Hours</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Normal</span>
                  </span>
                )
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Not Recorded
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500 block text-[10px] mb-0.5 uppercase tracking-wider">Typical:</span>
                <span className="text-zinc-300 font-medium">{normalHours || 'N/A'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] mb-0.5 uppercase tracking-wider">Current:</span>
                <span className="text-zinc-100 font-semibold">
                  {typeof currentHour === 'number' ? `${currentHour.toString().padStart(2, '0')}:00 UTC` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px] mb-0.5 uppercase tracking-wider">Status:</span>
                <span className={isHoursDeviated ? 'text-amber-400 font-bold' : 'text-emerald-400 font-medium'}>
                  {hasHourData ? (isHoursDeviated ? 'Outside normal' : 'Within normal') : 'Telemetry N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-zinc-800/60 text-[10px] text-zinc-500 flex items-center justify-between">
        <span>Baseline update frequency: Batch cycle</span>
        <span className="font-mono">{baseline?.lastUpdated ? `Sync: ${baseline.lastUpdated.substring(0, 10)}` : 'Dynamic sync'}</span>
      </div>
    </div>
  );
}
