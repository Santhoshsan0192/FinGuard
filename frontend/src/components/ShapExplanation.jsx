import React from 'react';
import { Sparkles, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';

export default function ShapExplanation({ explanation, riskScore, riskLevel, transactionId }) {
  const topFactors = explanation?.topFactors || explanation?.top_factors || [];
  const baseValue = explanation?.baseValue ?? explanation?.base_value ?? 0.0;
  const score = riskScore !== undefined ? riskScore : 0;
  const isHigh = score >= 75 || riskLevel === 'HIGH';

  // Feature name mapper to convert technical ML feature names to human-readable titles
  const getFeatureDisplayName = (rawName) => {
    if (!rawName) return 'Behavioural Indicator';
    const name = rawName.toLowerCase();
    if (name === 'amt_to_baseline_ratio') return 'Transaction Amount Deviation';
    if (name === 'amt_zscore') return 'Spending Z-Score Variance';
    if (name === 'device_anomaly_flag') return 'New / Unrecognized Device';
    if (name === 'velocity_rapid_tx_flag') return 'Rapid Transaction Velocity';
    if (name === 'velocity_hours_since_last_tx') return 'Time Velocity Since Prior Activity';
    if (name === 'is_off_hours') return 'Off-Hours Activity Window';
    if (name === 'card_anomaly_flag') return 'Unregistered Card Issuer';
    if (name === 'TransactionAmt') return 'Transaction Dollar Amount';
    if (name === 'dist1') return 'Geographic Distance Proximity';
    if (name === 'hour_of_day') return 'Hour of Day Execution';
    if (name === 'day_of_week') return 'Day of Week Pattern';
    if (name.startsWith('c') && !name.includes('card')) return 'Identifier Frequency Velocity Count';
    if (name.startsWith('id_')) return 'Identity Verification Signal';
    if (name.startsWith('v_') || name.startsWith('v')) return 'Vesta Behaviour Pattern Signal';
    return rawName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Unavailable State: When transaction explanation is not available, display a clear notice (never fall back silently)
  if (!explanation || topFactors.length === 0) {
    return (
      <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-3 min-h-[260px]">
        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
          <AlertCircle className="w-5 h-5 text-zinc-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">SHAP Feature Attribution Unavailable</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1">
            No TreeSHAP attribution record found for transaction <span className="font-mono text-zinc-200 font-semibold">{transactionId ? `#${transactionId}` : 'N/A'}</span>.
          </p>
        </div>
        <p className="text-[11px] text-zinc-500 font-mono">
          Model explainability attributions are computed during batch scoring pipeline execution.
        </p>
      </div>
    );
  }

  // Find maximum absolute shap value for symmetric zero-centred bar scaling
  const maxAbsShap = Math.max(
    ...topFactors.map(f => Math.abs(f.shapValue ?? f.shap_value ?? 0)),
    0.5
  );

  // Calculate sum of SHAP contributions (raw model log-odds margin)
  const totalShapSum = topFactors.reduce((acc, f) => acc + (f.shapValue ?? f.shap_value ?? 0), 0);
  const rawModelMargin = baseValue + totalShapSum;

  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
              Explainable AI: Risk Driver Attribution
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            TreeSHAP additive attribution decomposes the exact risk impact of each behavioral feature
          </p>
        </div>
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="font-mono text-zinc-400 uppercase tracking-widest text-[10px]">
            Base Log-Odds:
          </span>
          <span className="font-mono font-medium px-2 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-800">
            {baseValue.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Axis Guide & Zero-Centred Legend */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-mono border-b border-zinc-800/80 pb-2">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-medium text-[10px] uppercase tracking-wider">Risk-Reducing (Mitigates Risk)</span>
          </div>

          <div className="flex items-center space-x-1.5 text-zinc-500 text-[10px] uppercase tracking-widest">
            <span>Population Base Expected Log-Odds</span>
          </div>

          <div className="flex items-center space-x-1.5 text-rose-400">
            <span className="font-medium text-[10px] uppercase tracking-wider">Risk-Increasing (Elevates Risk)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Feature Contribution Diverging Rows */}
        <div className="space-y-3 pt-1">
          {topFactors.map((factor, idx) => {
            const rawShap = factor.shapValue ?? factor.shap_value ?? 0;
            const isPositive = rawShap > 0;
            const absShap = Math.abs(rawShap);
            const barWidthPercent = Math.min(100, Math.max(6, (absShap / maxAbsShap) * 100));
            const displayName = getFeatureDisplayName(factor.feature);

            return (
              <div 
                key={idx} 
                className={`p-3 rounded-lg border transition-colors ${
                  isPositive 
                    ? 'bg-rose-500/[0.03] border-rose-500/20 hover:border-rose-500/40' 
                    : 'bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/40'
                }`}
              >
                {/* Feature Info and Impact Value */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-100 text-xs">
                        {displayName}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                        {factor.feature} = {factor.value}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed max-w-[80ch]">
                      {factor.description}
                    </p>
                  </div>

                  {/* Numerical Impact Badge */}
                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center space-x-1 font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
                      isPositive
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      <span>{isPositive ? `+${rawShap.toFixed(3)}` : rawShap.toFixed(3)}</span>
                    </span>
                    <div className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${
                      isPositive ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {isPositive ? 'INCREASES RISK' : 'MITIGATES RISK'}
                    </div>
                  </div>
                </div>

                {/* Zero-Centred Diverging Bar */}
                <div className="relative pt-1">
                  <div className="relative h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/90 flex">
                    {/* Left Track (Negative Values: right-anchored to center) */}
                    <div className="w-1/2 h-full relative flex justify-end">
                      {!isPositive && (
                        <div
                          className="h-full bg-emerald-500 rounded-l-full transition-all duration-300"
                          style={{ width: `${barWidthPercent}%` }}
                          title={`SHAP Contribution: ${rawShap.toFixed(3)} log-odds (Mitigates Risk)`}
                          role="progressbar"
                          aria-valuenow={rawShap}
                        />
                      )}
                    </div>

                    {/* Zero Reference Line */}
                    <div className="w-0.5 h-full bg-zinc-600 z-10 shrink-0" title="Zero Neutral Axis" />

                    {/* Right Track (Positive Values: left-anchored to center) */}
                    <div className="w-1/2 h-full relative flex justify-start">
                      {isPositive && (
                        <div
                          className="h-full bg-rose-500 rounded-r-full transition-all duration-300"
                          style={{ width: `${barWidthPercent}%` }}
                          title={`SHAP Contribution: +${rawShap.toFixed(3)} log-odds (Increases Risk)`}
                          role="progressbar"
                          aria-valuenow={rawShap}
                        />
                      )}
                    </div>
                  </div>

                  {/* Scale Labels */}
                  <div className="flex justify-between text-[9px] font-mono text-zinc-600 mt-1 px-1">
                    <span>-{maxAbsShap.toFixed(1)}</span>
                    <span className="text-zinc-500 font-semibold">0.0</span>
                    <span>+{maxAbsShap.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Prediction Aggregation & Calibration Footer */}
        <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-zinc-400 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-zinc-300">Aggregated Prediction Result:</span>
              <span className="font-mono text-xs text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                Raw Margin: {rawModelMargin >= 0 ? `+${rawModelMargin.toFixed(3)}` : rawModelMargin.toFixed(3)} log-odds
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Additive SHAP contributions yield final calibrated risk via isotonic scaling pipeline.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 block">
                Final Risk Score:
              </span>
              <span className="text-[9px] text-zinc-500 font-mono">
                Calibrated Posterior Probability
              </span>
            </div>
            <span className={`font-mono text-base font-bold px-3 py-1.5 rounded-md border ${
              isHigh 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {score.toFixed(1)} / 100
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
