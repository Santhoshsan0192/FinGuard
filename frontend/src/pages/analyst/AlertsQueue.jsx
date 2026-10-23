import React, { useState, useEffect, useCallback } from 'react';
import finguardApi from '../../api/finguardApi';
import PriorityAlertsTable from '../../components/PriorityAlertsTable';

export default function AlertsQueue() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [stats, setStats] = useState(null);

  // Filters, sorting, search, pagination state
  const [selectedFilter, setSelectedFilter] = useState('ACTIVE');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('risk_score');
  const [sortDirection, setSortDirection] = useState('desc');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  // Fetch batches list on mount
  useEffect(() => {
    finguardApi.getBatches()
      .then((b) => {
        setBatches(b || []);
      })
      .catch((err) => console.error('Error fetching batches:', err));
  }, []);

  // Fetch alert queue statistics reflecting real backend counts
  const fetchStats = useCallback(async (batchId) => {
    try {
      const data = await finguardApi.getAlertStats(batchId || null);
      setStats(data);
    } catch (err) {
      console.error('Error fetching alert stats:', err);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await finguardApi.getAlerts({
        batchId: selectedBatch || null,
        riskLevel: selectedRiskLevel === 'ALL' ? null : selectedRiskLevel,
        status: selectedFilter === 'ALL' ? null : selectedFilter,
        search: searchQuery,
        sortBy,
        direction: sortDirection,
        page,
        size: 10,
      });
      setAlerts(res.content || []);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
      if (res.batchId && !selectedBatch) {
        setSelectedBatch(res.batchId);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, selectedRiskLevel, selectedFilter, searchQuery, sortBy, sortDirection, page]);

  useEffect(() => {
    fetchStats(selectedBatch);
  }, [selectedBatch, fetchStats]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleFilterChange = (newFilter) => {
    setSelectedFilter(newFilter);
    setPage(0);
  };

  const handleRiskLevelChange = (newLevel) => {
    setSelectedRiskLevel(newLevel);
    setPage(0);
  };

  const handleBatchChange = (newBatch) => {
    setSelectedBatch(newBatch);
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

  const handleAlertUpdated = () => {
    fetchAlerts();
    fetchStats(selectedBatch);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 mt-2">
        <div>
          <h1 className="text-3xl font-semibold text-zinc-100 tracking-tight">Priority Alerts Queue</h1>
          <p className="text-sm text-zinc-500">
            Review, investigate, and triage high and medium risk transactions.
          </p>
        </div>
      </div>

      <PriorityAlertsTable
        alerts={alerts}
        loading={loading}
        selectedFilter={selectedFilter}
        onFilterChange={handleFilterChange}
        selectedRiskLevel={selectedRiskLevel}
        onRiskLevelChange={handleRiskLevelChange}
        selectedBatch={selectedBatch}
        batches={batches}
        onBatchChange={handleBatchChange}
        stats={stats}
        searchQuery={searchQuery}
        onSearchChange={(q) => { setSearchQuery(q); setPage(0); }}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        page={page}
        pageSize={10}
        totalPages={totalPages}
        totalElements={totalElements}
        onPageChange={handlePageChange}
        onAlertUpdated={handleAlertUpdated}
      />
    </div>
  );
}
