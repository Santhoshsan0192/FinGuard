import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Clock
} from 'lucide-react';
import finguardApi from '../../api/finguardApi';

import KpiCard from '../../components/KpiCard';
import RiskDistribution from '../../components/RiskDistribution';
import RiskTrend from '../../components/RiskTrend';
import TopRiskDrivers from '../../components/TopRiskDrivers';
import BatchInfo from '../../components/BatchInfo';

export default function AnalystDashboard() {
  const [summary, setSummary] = useState(null);
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [trendAggregation, setTrendAggregation] = useState('hour');

  const fetchBatches = async () => {
    try {
      const bList = await finguardApi.getBatches();
      setBatches(bList || []);
      if (bList && bList.length > 0 && !selectedBatchId) {
        setSelectedBatchId(bList[0].batchId);
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
    }
  };

  const fetchSummary = async (batchId) => {
    try {
      const sumData = await finguardApi.getDashboardSummary(batchId);
      setSummary(sumData);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    }
  };

  const fetchTrend = async (batchId, agg) => {
    try {
      const trendRes = await finguardApi.getRiskTrend(batchId, agg);
      setTrendData(trendRes.dataPoints || []);
    } catch (err) {
      console.error('Error fetching risk trend:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      await fetchBatches();
      await fetchSummary(selectedBatchId);
      await fetchTrend(selectedBatchId, trendAggregation);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectBatch = (batchId) => {
    setSelectedBatchId(batchId);
    fetchSummary(batchId);
    fetchTrend(batchId, trendAggregation);
  };

  const handleAggregationChange = (newAgg) => {
    setTrendAggregation(newAgg);
    fetchTrend(selectedBatchId, newAgg);
  };

  const totalScoredTx = summary?.totalTransactionsScored || summary?.batchInfo?.transactionCount || 2200;
  const totalAlerts = summary?.totalAlerts || 0;

  const riskDistribution = summary?.riskDistribution || {
    LOW: summary?.batchInfo?.lowRiskCount ?? 0,
    MEDIUM: summary?.batchInfo?.mediumRiskCount ?? 0,
    HIGH: summary?.batchInfo?.highRiskCount ?? 0
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col gap-6 mb-8 mt-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs font-mono text-zinc-400">
              {summary?.batchInfo?.batchId || selectedBatchId || 'No active batch'}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400">
              {summary?.batchInfo?.datasetVersion || 'Unknown Dataset'}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400">
              {summary?.batchInfo?.modelVersion || 'Unknown Model'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-100 tracking-tight">
            Fraud Analyst Overview
          </h1>
          <p className="text-base text-zinc-500 max-w-[65ch] leading-relaxed">
            Monitor scored batches, risk distributions, and operational KPIs across the latest evaluation window.
          </p>
        </div>

        <div className="flex items-center gap-6 border-t border-zinc-800 pt-6">
          <div>
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-1">Avg Risk Score</div>
            <div className="text-2xl font-semibold text-zinc-100 font-mono">
              {summary?.averageRiskScore !== undefined ? summary.averageRiskScore.toFixed(1) : '--'}<span className="text-sm font-normal text-zinc-500">/100</span>
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Mean of {totalScoredTx.toLocaleString()} scored transactions</div>
          </div>
          <div className="w-px h-10 bg-zinc-800 mx-1"></div>
          <div>
            <div className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-1">Flagged Fraud Rate</div>
            <div className="text-2xl font-semibold text-rose-400 font-mono">
              {summary?.fraudRatePercent !== undefined ? summary.fraudRatePercent.toFixed(1) : '--'}%
            </div>
            <div className="text-[10px] text-zinc-500 mt-0.5">High-risk share of flagged alerts</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Scored in Batch"
          value={totalScoredTx.toLocaleString()}
          subtitle="Processed offline via Python batch"
          icon={ShieldCheck}
          trend={`${totalAlerts} flagged alerts`}
          color="indigo"
        />

        <KpiCard
          title="Active Alerts"
          value={(summary?.activeAlerts || 0).toLocaleString()}
          subtitle="Awaiting analyst review"
          icon={Clock}
          trend={`${totalAlerts > 0 ? (((summary?.activeAlerts || 0) / totalAlerts) * 100).toFixed(1) : '0'}% of alert queue`}
          color="amber"
        />

        <KpiCard
          title="Confirmed Fraud"
          value={(summary?.confirmedFraudAlerts || 0).toLocaleString()}
          subtitle="Fraud cases confirmed by analysts"
          icon={AlertTriangle}
          trend={`${totalAlerts > 0 ? (((summary?.confirmedFraudAlerts || 0) / totalAlerts) * 100).toFixed(1) : '0'}% of alert queue`}
          color="rose"
        />

        <KpiCard
          title="False Positives"
          value={(summary?.falsePositiveAlerts || 0).toLocaleString()}
          subtitle="Dismissed safe transactions"
          icon={AlertCircle}
          trend={`${totalAlerts > 0 ? (((summary?.falsePositiveAlerts || 0) / totalAlerts) * 100).toFixed(1) : '0'}% of alert queue`}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RiskDistribution 
            distribution={riskDistribution}
            total={totalScoredTx} 
          />
        </div>

        <div className="lg:col-span-2">
          <RiskTrend 
            trendData={trendData}
            aggregation={trendAggregation}
            onAggregationChange={handleAggregationChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TopRiskDrivers drivers={summary?.topRiskDrivers} />
        </div>

        <div className="lg:col-span-2">
          <BatchInfo 
            batchInfo={summary?.batchInfo} 
            totalTransactions={totalScoredTx}
            batches={batches}
            selectedBatchId={selectedBatchId}
            onSelectBatch={handleSelectBatch}
          />
        </div>
      </div>
    </div>
  );
}
