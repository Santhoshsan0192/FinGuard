import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  ChevronRight,
  ChevronDown, 
  ArrowUpDown, 
  AlertCircle,
  X,
  Filter,
  Layers
} from 'lucide-react';
import RiskBadge from './RiskBadge';
import StatusBadge from './StatusBadge';
import AlertDetails from './AlertDetails';

export default function PriorityAlertsTable({
  alerts = [],
  loading = false,
  selectedFilter,
  onFilterChange,
  selectedRiskLevel = 'ALL',
  onRiskLevelChange,
  selectedBatch = '',
  batches = [],
  onBatchChange,
  stats = null,
  searchQuery,
  onSearchChange,
  sortBy,
  sortDirection,
  onSortChange,
  page,
  totalPages,
  totalElements,
  pageSize = 20,
  onPageChange,
  onAlertUpdated
}) {
  const [expandedRowId, setExpandedRowId] = useState(null);

  // Calculate slice indicators
  const startIdx = totalElements > 0 ? page * pageSize + 1 : 0;
  const endIdx = totalElements > 0 ? Math.min((page + 1) * pageSize, totalElements) : 0;

  // Real count calculations from backend statistics
  const activeCount = stats?.statusCounts ? (stats.statusCounts.NEW || 0) + (stats.statusCounts.UNDER_REVIEW || 0) : null;
  const underReviewCount = stats?.statusCounts ? (stats.statusCounts.UNDER_REVIEW || 0) : null;
  const fraudCount = stats?.statusCounts ? (stats.statusCounts.CONFIRMED_FRAUD || 0) : null;
  const fpCount = stats?.statusCounts ? (stats.statusCounts.FALSE_POSITIVE || 0) : null;
  const escalatedCount = stats?.statusCounts ? (stats.statusCounts.ESCALATED || 0) : null;
  const allCount = stats?.totalAlerts != null ? stats.totalAlerts : null;

  // Driver badge styling
  const getDriverBadge = (driver) => {
    if (!driver) return null;
    const d = driver.toLowerCase();
    let colorClass = 'bg-zinc-900 text-zinc-300 border-zinc-800';
    if (d.includes('amount')) colorClass = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    else if (d.includes('device')) colorClass = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    else if (d.includes('velocity')) colorClass = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    else if (d.includes('time') || d.includes('hour')) colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    else if (d.includes('location') || d.includes('dist')) colorClass = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    else if (d.includes('frequency') || d.includes('spike')) colorClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border font-mono ${colorClass}`}>
        {driver}
      </span>
    );
  };

  // Generate pagination numbers array
  const renderPaginationButtons = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(0, page - 2);
    let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(0, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <button
          key={i}
          onClick={() => onPageChange(i)}
          className={`px-3 py-1 text-xs rounded-md font-mono transition ${
            page === i
              ? 'bg-zinc-700 text-white font-bold'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
          }`}
        >
          {i + 1}
        </button>
      );
    }
    return pages;
  };

  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg overflow-hidden shadow-sm">
      {/* Table Header Controls */}
      <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                Fraud Analyst Priority Alerts Queue
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                Decision Support
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              Ranked by calibrated risk probability to minimize false positive investigation fatigue
            </p>
          </div>

          {/* Batch Selector */}
          {batches && batches.length > 0 && (
            <div className="flex items-center space-x-2 self-start sm:self-auto bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px] text-zinc-400 font-medium">Batch:</span>
              <select
                value={selectedBatch}
                onChange={(e) => onBatchChange && onBatchChange(e.target.value)}
                className="bg-transparent text-zinc-200 text-xs font-mono focus:outline-none cursor-pointer"
                aria-label="Filter by Batch"
              >
                {batches.map((b, idx) => (
                  <option key={b.batchId} value={b.batchId} className="bg-zinc-900 text-zinc-200">
                    {b.batchId} {idx === 0 ? '(Latest)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filter Controls, Risk Level, Search & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Status Filter Tabs with Real API Count Badges */}
          <div className="flex flex-wrap items-center bg-zinc-900 border border-zinc-800 rounded-md p-0.5 text-[11px]">
            <button
              onClick={() => onFilterChange('ACTIVE')}
              className={`px-2.5 py-1 rounded transition font-medium inline-flex items-center gap-1.5 ${
                selectedFilter === 'ACTIVE' ? 'bg-amber-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Active Alerts</span>
              {activeCount !== null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  selectedFilter === 'ACTIVE' ? 'bg-amber-700/90 text-amber-100' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {activeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onFilterChange('UNDER_REVIEW')}
              className={`px-2.5 py-1 rounded transition font-medium inline-flex items-center gap-1.5 ${
                selectedFilter === 'UNDER_REVIEW' ? 'bg-blue-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Under Review</span>
              {underReviewCount !== null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  selectedFilter === 'UNDER_REVIEW' ? 'bg-blue-700/90 text-blue-100' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {underReviewCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onFilterChange('CONFIRMED_FRAUD')}
              className={`px-2.5 py-1 rounded transition font-medium inline-flex items-center gap-1.5 ${
                selectedFilter === 'CONFIRMED_FRAUD' ? 'bg-rose-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Confirmed Fraud</span>
              {fraudCount !== null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  selectedFilter === 'CONFIRMED_FRAUD' ? 'bg-rose-700/90 text-rose-100' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {fraudCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onFilterChange('FALSE_POSITIVE')}
              className={`px-2.5 py-1 rounded transition font-medium inline-flex items-center gap-1.5 ${
                selectedFilter === 'FALSE_POSITIVE' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>False Positives</span>
              {fpCount !== null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  selectedFilter === 'FALSE_POSITIVE' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {fpCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onFilterChange('ESCALATED')}
              className={`px-2.5 py-1 rounded transition font-medium inline-flex items-center gap-1.5 ${
                selectedFilter === 'ESCALATED' ? 'bg-purple-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>Escalated</span>
              {escalatedCount !== null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  selectedFilter === 'ESCALATED' ? 'bg-purple-700/90 text-purple-100' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {escalatedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onFilterChange('ALL')}
              className={`px-2.5 py-1 rounded transition font-medium inline-flex items-center gap-1.5 ${
                selectedFilter === 'ALL' ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>All Cases</span>
              {allCount !== null && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  selectedFilter === 'ALL' ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {allCount}
                </span>
              )}
            </button>
          </div>

          {/* Search, Risk Level Dropdown, and Sorting */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input with Clear Button */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search Alert, Customer, or ID..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-md pl-8 pr-7 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 w-52 sm:w-56"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-200 p-0.5"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Risk Level Filter Dropdown */}
            <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs">
              <Filter className="w-3 h-3 text-zinc-400" />
              <select
                value={selectedRiskLevel}
                onChange={(e) => onRiskLevelChange && onRiskLevelChange(e.target.value)}
                className="bg-transparent text-zinc-300 text-xs focus:outline-none cursor-pointer"
                aria-label="Filter by Risk Tier"
              >
                <option value="ALL" className="bg-zinc-900 text-zinc-200">
                  All Risk Tiers{stats?.totalAlerts != null ? ` (${stats.totalAlerts})` : ''}
                </option>
                <option value="HIGH" className="bg-zinc-900 text-zinc-200">
                  High Risk (≥75){stats?.highRiskCount != null ? ` (${stats.highRiskCount})` : ''}
                </option>
                <option value="MEDIUM" className="bg-zinc-900 text-zinc-200">
                  Medium Risk (40-74){stats?.mediumRiskCount != null ? ` (${stats.mediumRiskCount})` : ''}
                </option>
                <option value="LOW" className="bg-zinc-900 text-zinc-200">
                  Low Risk (&lt;40){stats?.lowRiskCount != null ? ` (${stats.lowRiskCount})` : ''}
                </option>
              </select>
            </div>

            {/* Sorting Dropdown */}
            <div className="flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs">
              <ArrowUpDown className="w-3 h-3 text-zinc-400" />
              <select
                value={`${sortBy}-${sortDirection}`}
                onChange={(e) => {
                  const [newSort, newDir] = e.target.value.split('-');
                  onSortChange(newSort, newDir);
                }}
                className="bg-transparent text-zinc-300 text-xs focus:outline-none cursor-pointer"
                aria-label="Sort Alerts"
              >
                <option value="risk_score-desc" className="bg-zinc-900 text-zinc-200">Highest Risk</option>
                <option value="risk_score-asc" className="bg-zinc-900 text-zinc-200">Lowest Risk</option>
                <option value="amount-desc" className="bg-zinc-900 text-zinc-200">Highest Amount</option>
                <option value="created_at-desc" className="bg-zinc-900 text-zinc-200">Newest First</option>
                <option value="created_at-asc" className="bg-zinc-900 text-zinc-200">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900/60 text-[10px] uppercase tracking-widest text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4 font-medium">Alert ID</th>
              <th className="py-3 px-4 font-medium">Batch</th>
              <th className="py-3 px-4 font-medium">Customer</th>
              <th className="py-3 px-4 font-medium text-right">Amount</th>
              <th className="py-3 px-4 font-medium">Calibrated Risk</th>
              <th className="py-3 px-4 font-medium">Primary Risk Driver</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {loading ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-zinc-500">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading prioritized alerts from MongoDB queue...</span>
                  </div>
                </td>
              </tr>
            ) : alerts.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-12 text-center text-zinc-500">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-zinc-600" />
                  <span>No alerts found matching current filter/search criteria.</span>
                </td>
              </tr>
            ) : (
              alerts.map((alert) => {
                const score = alert.riskScore ?? 0;
                const isHigh = score >= 75 || alert.riskLevel === 'HIGH';
                const isMed = (score >= 40 && score < 75) || alert.riskLevel === 'MEDIUM';
                const isExpanded = expandedRowId === alert.alertId;

                return (
                  <React.Fragment key={alert.id || alert.alertId}>
                    <tr
                      onClick={() => setExpandedRowId(isExpanded ? null : alert.alertId)}
                      className={`cursor-pointer transition-colors group ${
                        isHigh 
                          ? 'border-l-4 border-l-rose-500 hover:bg-rose-500/[0.04]' 
                          : isMed 
                          ? 'border-l-4 border-l-amber-500/80 hover:bg-amber-500/[0.03]' 
                          : 'border-l-4 border-l-emerald-500/60 hover:bg-zinc-900/60'
                      } ${isExpanded ? 'bg-zinc-900/70' : ''}`}
                    >
                      {/* 1. Alert ID */}
                      <td className="py-3 px-4 font-mono font-medium text-blue-400">
                        {alert.alertId}
                      </td>

                      {/* 2. Batch */}
                      <td className="py-3 px-4 font-mono text-[10px] text-zinc-500">
                        {alert.batchId || 'BATCH-2026-0001'}
                      </td>

                      {/* 3. Customer (Clickable Profile Link) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <Link
                            to={`/analyst/customers/${encodeURIComponent(alert.customerId)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-medium text-zinc-100 hover:text-blue-400 transition hover:underline"
                            title="View Customer Profile"
                          >
                            {alert.customerName || `Customer ${alert.customerId}`}
                          </Link>
                          {alert.coldStartFlag === 1 && (
                            <span 
                              className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-medium" 
                              title="Customer has limited historical profile"
                            >
                              Cold Start
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">{alert.customerId}</div>
                      </td>

                      {/* 4. Amount (Right-aligned, tabular-nums currency) */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-zinc-100 tabular-nums">
                        ${typeof alert.amount === 'number' 
                          ? alert.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                          : '0.00'}
                      </td>

                      {/* 5. Calibrated Risk (Unified Score + Level Badge + Meter) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className={`font-mono font-bold text-xs tracking-tight ${
                            isHigh ? 'text-rose-400' : isMed ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {score.toFixed(1)}
                          </span>
                          <RiskBadge level={alert.riskLevel} score={score} size="xs" />
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-16 bg-zinc-950 rounded-full h-1 overflow-hidden border border-zinc-800">
                            <div
                              className={`h-full rounded-full ${
                                isHigh ? 'bg-rose-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                            />
                          </div>
                          <span 
                            className="text-[9px] text-zinc-500 font-mono cursor-help" 
                            title="Calibrated posterior probability from XGBoost isotonic scaling (High ≥75, Med 40-74, Low <40)"
                          >
                            calibrated
                          </span>
                        </div>
                      </td>

                      {/* 6. Primary Risk Driver */}
                      <td className="py-3 px-4">
                        {getDriverBadge(alert.primaryRiskDriver || 'Behavioural Anomaly')}
                      </td>

                      {/* 7. Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={alert.status} size="sm" />
                      </td>

                      {/* 8. Action */}
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center space-x-1 text-[11px] text-zinc-400 group-hover:text-zinc-200 font-medium">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-zinc-300" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan="8" className="p-0 border-b border-zinc-800 bg-[#0a0f18]/60 shadow-inner">
                          <AlertDetails 
                            alert={alert} 
                            onStatusUpdate={(updated) => {
                              if (onAlertUpdated) onAlertUpdated(updated);
                            }} 
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Footer */}
      <div className="p-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
        <div>
          Showing <span className="font-medium text-zinc-200">{startIdx}</span> to{' '}
          <span className="font-medium text-zinc-200">{endIdx}</span> of{' '}
          <span className="font-medium text-zinc-200">{totalElements.toLocaleString()}</span> alerts
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            className="px-2.5 py-1 text-[11px] rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Prev
          </button>

          {renderPaginationButtons()}

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
            className="px-2.5 py-1 text-[11px] rounded bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
