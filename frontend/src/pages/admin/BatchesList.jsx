import React, { useState, useEffect } from 'react';
import { DatabaseZap } from 'lucide-react';
import finguardApi from '../../api/finguardApi';

export default function BatchesList() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBatches = async () => {
      setLoading(true);
      try {
        const bList = await finguardApi.getBatches();
        setBatches(bList || []);
      } catch (e) {
        console.error('Error fetching batches:', e);
      }
      setLoading(false);
    };
    fetchBatches();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center space-x-3 mb-2">
          <DatabaseZap className="w-6 h-6 text-indigo-400" />
          <h1 className="text-xl font-bold text-white">Batch Management</h1>
        </div>
        <p className="text-sm text-slate-400 mb-6">
          View execution history for the offline Python ML scoring pipeline.
        </p>

        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Batch ID</th>
                <th className="px-4 py-3">Execution Time</th>
                <th className="px-4 py-3">Transactions Scored</th>
                <th className="px-4 py-3">Model Version</th>
                <th className="px-4 py-3">Dataset</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-slate-900/50">
              {batches.map((batch) => (
                <tr key={batch.batchId} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-indigo-300 font-medium">{batch.batchId}</td>
                  <td className="px-4 py-3">
                    {(batch.completedAt || batch.startedAt || batch.lastRun)
                      ? new Date(batch.completedAt || batch.startedAt || batch.lastRun).toLocaleString()
                      : 'N/A'}
                  </td>
                  <td className="px-4 py-3">{(batch.transactionCount ?? batch.totalTransactions ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-purple-300 text-xs">{batch.modelVersion || batch.modelMetadata?.modelVersion || 'N/A'}</td>
                  <td className="px-4 py-3 text-xs">{batch.datasetVersion || batch.modelMetadata?.dataset || 'IEEE-CIS-2200'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {batch.status || 'COMPLETED'}
                    </span>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                    No batches executed yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
