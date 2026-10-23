import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Clock
} from 'lucide-react';
import finguardApi from '../api/finguardApi';

import KpiCard from './KpiCard';
import RiskDistribution from './RiskDistribution';
import RiskTrend from './RiskTrend';
import TopRiskDrivers from './TopRiskDrivers';
import BatchInfo from './BatchInfo';
import PriorityAlertsTable from './PriorityAlertsTable';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [trendAggregation, setTrendAggregation] = useState('hour');
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  // Filters, sorting, search, pagination state
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Load batches list
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

  // Fetch dashboard summary for selected batch
  const fetchSummary = async (batchId) => {
    try {
      const sumData = await finguardApi.getDashboardSummary(batchId);
      setSummary(sumData);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    }
  };

  // Fetch real risk trend with aggregation
  const fetchTrend = async (batchId, agg) => {
    try {
      const trendRes = await finguardApi.getRiskTrend(batchId, agg);
      setTrendData(trendRes.dataPoints || []);
    } catch (err) {
      console.error('Error fetching risk trend:', err);
    }
  };

  // Fetch alerts with current filter/sort/pagination/batch
  const fetchAlerts = async (batchId) => {
    try {
      setTableLoading(true);
      const res = await finguardApi.getAlerts({
        batchId: batchId || selectedBatchId,
        riskLevel: selectedFilter === 'ALL' || selectedFilter === 'NEW' ? null : selectedFilter,
        status: selectedFilter === 'NEW' ? 'NEW' : null,
        search: searchQuery,
        sortBy,
        direction: sortDirection,
        page,
        size: 10,
      });
      setAlerts(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchBatches();
      await fetchSummary(selectedBatchId);
      await fetchTrend(selectedBatchId, trendAggregation);
      await fetchAlerts(selectedBatchId);
      setLoading(false);
    };
    init();
  }, []);

  const handleSelectBatch = (batchId) => {
    setSelectedBatchId(batchId);
    setPage(0);
    fetchSummary(batchId);
    fetchTrend(batchId, trendAggregation);
    fetchAlerts(batchId);
  };

  const handleAggregationChange = (newAgg) => {
    setTrendAggregation(newAgg);
    fetchTrend(selectedBatchId, newAgg);
  };

  useEffect(() => {
    if (!loading) {
      fetchAlerts(selectedBatchId);
    }
  }, [selectedFilter, sortBy, sortDirection, page, searchQuery]);

  const handleFilterChange = (newFilter) => {
    setSelectedFilter(newFilter);
    setPage(0);
  };

  const handleSortChange = (newSort, newDir) => {
    setSortBy(newSort);
    setSortDirection(newDir);
    setPage(0);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  // Calculate high-risk percentage
  const totalScored = summary?.totalAlerts || 2200;
  const highRiskCount = summary?.highRiskAlerts || 0;
  const mediumRiskCount = summary?.mediumRiskAlerts || 0;
  const lowRiskCount = summary?.lowRiskAlerts || 0;
  const requiresReviewCount = highRiskCount + mediumRiskCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Dashboard Overview / Header Title */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 tracking-wider uppercase font-mono">
              {summary?.batchInfo?.batchId || selectedBatchId || 'BATCH-2026-0001'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-300 font-medium">
              {summary?.batchInfo?.datasetVersion || 'IEEE-CIS-2200'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-purple-300 font-medium font-mono">
              {summary?.batchInfo?.modelVersion || 'XGBoost-v2.0-temporal'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-emerald-400 font-medium">
              Decision-Support Mode
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Fraud Risk Intelligence Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Explainable AI decision support with calibrated probabilities, causal temporal baselines, and exact TreeSHAP factor attributions.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-right shrink-0">
          <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Avg Risk Score</div>
            <div className="text-xl font-black text-slate-100 font-mono">
              {summary?.averageRiskScore !== undefined ? summary.averageRiskScore.toFixed(1) : '--'}<span className="text-xs font-normal text-slate-500">/100</span>
            </div>
          </div>
          <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Flagged Fraud Rate</div>
            <div className="text-xl font-black text-rose-400 font-mono">
              {summary?.fraudRatePercent !== undefined ? summary.fraudRatePercent.toFixed(1) : '--'}%
            </div>
          </div>
        </div>
      </div>

      {/* 2. Analytical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Scored in Batch"
          value={totalScored.toLocaleString()}
          subtitle="Processed offline via Python batch"
          icon={ShieldCheck}
          trend={summary?.batchInfo?.modelVersion || "XGBoost v2.0"}
          color="indigo"
        />

        <KpiCard
          title="High Risk (Score ≥ 75)"
          value={highRiskCount.toLocaleString()}
          subtitle="Immediate analyst review recommended"
          icon={AlertTriangle}
          trend={`${totalScored > 0 ? ((highRiskCount / totalScored) * 100).toFixed(1) : '0'}% of batch`}
          color="rose"
        />

        <KpiCard
          title="Medium Risk (40–74)"
          value={mediumRiskCount.toLocaleString()}
          subtitle="Secondary behavioural monitoring"
          icon={AlertCircle}
          trend={`${totalScored > 0 ? ((mediumRiskCount / totalScored) * 100).toFixed(1) : '0'}% of batch`}
          color="amber"
        />

        <KpiCard
          title="Requires Human Action"
          value={requiresReviewCount.toLocaleString()}
          subtitle="Awaiting final analyst decision"
          icon={Clock}
          trend="Human in the loop"
          color="blue"
        />
      </div>

      {/* 3. Analytical Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <RiskDistribution 
            highCount={highRiskCount} 
            mediumCount={mediumRiskCount} 
            lowCount={lowRiskCount} 
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

      {/* 4. Top Risk Drivers & Batch Architecture Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TopRiskDrivers drivers={summary?.topRiskDrivers} />
        </div>

        <div className="lg:col-span-2">
          <BatchInfo 
            batchInfo={summary?.batchInfo} 
            totalTransactions={totalScored}
            batches={batches}
            selectedBatchId={selectedBatchId}
            onSelectBatch={handleSelectBatch}
          />
        </div>
      </div>

      {/* 5. Priority Alerts Queue (Core Decision Support Table) */}
      <PriorityAlertsTable
        alerts={alerts}
        loading={tableLoading}
        selectedFilter={selectedFilter}
        onFilterChange={handleFilterChange}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
