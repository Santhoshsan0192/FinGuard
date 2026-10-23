import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  ArrowLeft, 
  Sparkles, 
  Eye, 
  CheckCircle2, 
  Info,
  Server
} from 'lucide-react';
import finguardApi from '../../api/finguardApi';

import KpiCard from '../../components/KpiCard';
import RiskDistribution from '../../components/RiskDistribution';
import TopRiskDrivers from '../../components/TopRiskDrivers';
import ShapExplanation from '../../components/ShapExplanation';

export default function ShadowDashboard() {
  const [summary, setSummary] = useState(null);
  const [shadowStatus, setShadowStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedExplanation, setSelectedExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  const handleSelectAlert = useCallback(async (alertItem) => {
    setSelectedAlert(alertItem);
    try {
      setLoadingExplanation(true);
      const expRes = await finguardApi.shadow.getExplanation(alertItem.transactionId);
      setSelectedExplanation(expRes);
    } catch (err) {
      console.error('Error fetching shadow explanation for tx:', alertItem.transactionId, err);
      setSelectedExplanation(null);
    } finally {
      setLoadingExplanation(false);
    }
  }, []);

  const fetchShadowData = useCallback(async () => {
    try {
      const [sumRes, statusRes, alertsRes] = await Promise.all([
        finguardApi.shadow.getSummary(),
        finguardApi.shadow.getStatus(),
        finguardApi.shadow.getAlerts({ page: 0, size: 10 }),
      ]);
      setSummary(sumRes);
      setShadowStatus(statusRes);
      const alertList = alertsRes?.content || alertsRes || [];
      setAlerts(alertList);

      if (alertList.length > 0) {
        handleSelectAlert(alertList[0]);
      }
    } catch (err) {
      console.error('Error fetching shadow dashboard data:', err);
    }
  }, [handleSelectAlert]);

  useEffect(() => {
    fetchShadowData();
  }, [fetchShadowData]);

  const totalScoredTx = summary?.totalTransactionsScored || 1000;
  const totalAlerts = summary?.totalAlerts || 144;
  const riskDistribution = summary?.riskDistribution || {
    LOW: 856,
    MEDIUM: 105,
    HIGH: 39,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Strict Shadow Isolation Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 sm:p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                Isolated Shadow Mode
              </span>
              <span className="text-xs font-mono text-zinc-400">
                {shadowStatus?.batchId || summary?.batchInfo?.batchId || 'SHADOW-PHASE5-BATCH-0001'}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-amber-200/80 font-mono">
                Zero MongoDB Writes
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              <Server className="w-5 h-5 text-amber-400" />
              FinGuard Behavioural Model Shadow Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-3xl leading-relaxed">
              Evaluating the Kaggle 397-feature behavioural XGBoost model in an isolated, read-only shadow path.
              The production 23-feature model and production database remain 100% active and untouched.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link
              to="/analyst"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Production</span>
            </Link>
          </div>
        </div>

        {/* Safety & Calibration Metadata Tags */}
        <div className="mt-4 pt-3 border-t border-amber-500/20 flex flex-wrap gap-2 text-[11px] font-mono">
          <span className="px-2 py-0.5 rounded bg-zinc-900/80 text-zinc-300 border border-zinc-800">
            Model: <strong className="text-amber-300 font-normal">XGBoost-v3.0-behavioural-397</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-900/80 text-zinc-300 border border-zinc-800">
            Features: <strong className="text-zinc-200 font-normal">397 total (392 base + 5 behavioural)</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-900/80 text-rose-300 border border-rose-900/40">
            Calibration: <strong className="text-rose-200 font-normal">NONE_RAW_MIRROR (is_calibrated=false)</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-900/80 text-emerald-300 border border-emerald-900/40">
            Writes: <strong className="text-emerald-200 font-normal">Disabled (Read-Only Preview)</strong>
          </span>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Scored in Batch"
          value={totalScoredTx.toLocaleString()}
          subtitle="Validation partition batch"
          icon={ShieldCheck}
          trend={`${totalAlerts} flagged alerts (14.4%)`}
          color="indigo"
        />

        <KpiCard
          title="Flagged Alerts (Med + High)"
          value={totalAlerts.toLocaleString()}
          subtitle="Risk score ≥ 40.0"
          icon={Clock}
          trend={`${summary?.highRiskAlerts || 39} High Risk (${summary?.fraudRatePercent || 27.1}% of alerts)`}
          color="amber"
        />

        <KpiCard
          title="High Risk Alerts (≥ 75.0)"
          value={(summary?.highRiskAlerts || 39).toLocaleString()}
          subtitle="Priority analyst escalation"
          icon={AlertTriangle}
          trend="3.9% of scored transactions"
          color="rose"
        />

        <KpiCard
          title="Safe Low Risk (< 40.0)"
          value={(summary?.lowRiskAlerts || 856).toLocaleString()}
          subtitle="Non-alerted transactions"
          icon={CheckCircle2}
          trend="85.6% auto-cleared"
          color="emerald"
        />
      </div>

      {/* Risk Distribution and Top SHAP Risk Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RiskDistribution 
            distribution={riskDistribution}
            total={totalScoredTx} 
          />
        </div>

        <div className="lg:col-span-2">
          <TopRiskDrivers drivers={summary?.topRiskDrivers} />
        </div>
      </div>

      {/* Interactive Shadow Alert & TreeSHAP Attribution Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
        
        {/* Shadow Alerts Queue List */}
        <div className="lg:col-span-5 bg-[#0d121f] border border-zinc-800/80 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Shadow Alerts Queue
              </h2>
              <p className="text-[11px] text-zinc-400">
                Sample flagged transactions from Phase 5 evaluation batch
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
              {alerts.length} Displayed
            </span>
          </div>

          <div className="space-y-2">
            {alerts.map((alt) => {
              const isSelected = selectedAlert?.alertId === alt.alertId;
              const isHigh = alt.riskLevel === 'HIGH';
              return (
                <div
                  key={alt.alertId}
                  onClick={() => handleSelectAlert(alt)}
                  className={`p-3 rounded-lg border transition cursor-pointer text-left ${
                    isSelected
                      ? 'bg-zinc-800/80 border-indigo-500/80 ring-1 ring-indigo-500/30'
                      : 'bg-zinc-900/50 hover:bg-zinc-800/50 border-zinc-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-zinc-200">
                      Tx #{alt.transactionId}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        isHigh
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {alt.riskLevel} • {alt.riskScore}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-200">
                      ${alt.amount?.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                      {alt.primaryRiskDriver || 'Behavioural Anomaly'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="truncate max-w-[190px] font-mono">
                      {alt.customerId}
                    </span>
                    <span className="flex items-center gap-1 text-indigo-400 font-medium">
                      <Eye className="w-3 h-3" /> Inspect SHAP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TreeSHAP Explanation Attribution Detail */}
        <div className="lg:col-span-7 space-y-4">
          {loadingExplanation ? (
            <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-3 min-h-[350px]">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" />
              <p className="text-xs text-zinc-400 font-mono">
                Loading TreeSHAP attributions for shadow transaction #{selectedAlert?.transactionId}...
              </p>
            </div>
          ) : selectedAlert && selectedExplanation ? (
            <div className="space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-400 flex items-center justify-between">
                <div>
                  Viewing transaction <strong className="text-zinc-100 font-mono">#{selectedAlert.transactionId}</strong>:
                  {' '}${selectedAlert.amount?.toFixed(2)} USD • Model Risk Score:{' '}
                  <span className="font-mono font-bold text-amber-300">{selectedAlert.riskScore}/100</span>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  SHAP Base: {selectedExplanation.baseValue}
                </div>
              </div>

              <ShapExplanation
                explanation={selectedExplanation}
                riskScore={selectedAlert.riskScore}
                riskLevel={selectedAlert.riskLevel}
                transactionId={selectedAlert.transactionId}
              />
            </div>
          ) : (
            <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-12 flex flex-col items-center justify-center text-center space-y-3 min-h-[350px]">
              <Info className="w-8 h-8 text-zinc-500" />
              <h3 className="text-sm font-semibold text-zinc-200">Select a Shadow Alert</h3>
              <p className="text-xs text-zinc-400 max-w-sm">
                Click any shadow alert on the left to inspect its complete 397-feature TreeSHAP additive decomposition and positive/negative risk drivers.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
