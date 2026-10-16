import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Cpu, 
  ShieldCheck, 
  Server
} from 'lucide-react';
import KpiCard from '../../components/KpiCard';
import finguardApi from '../../api/finguardApi';

export default function AdminDashboard() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      try {
        const bList = await finguardApi.getBatches();
        setBatches(bList || []);
      } catch (e) {
        console.error('Error fetching admin data:', e);
      }
      setLoading(false);
    };
    fetchAdminData();
  }, []);

  const latestBatch = batches.length > 0 ? batches[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col gap-2 mb-8 mt-4">
        <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-100 tracking-tight">System Administration</h1>
        <p className="text-base text-zinc-500 max-w-[65ch] leading-relaxed">
          Monitor FinGuard platform health, ML pipeline execution, and role-based access control.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="System API Health"
          value="Online"
          subtitle="Spring Boot REST API"
          icon={Server}
          trend="100% Uptime"
          color="emerald"
        />
        <KpiCard
          title="Database Status"
          value="Connected"
          subtitle="MongoDB finguard"
          icon={Database}
          trend="Latency < 10ms"
          color="blue"
        />
        <KpiCard
          title="ML Pipeline"
          value="Ready"
          subtitle="Python Batch Scorer"
          icon={Cpu}
          trend={latestBatch?.modelMetadata?.modelVersion || "XGBoost-v2.0"}
          color="purple"
        />
        <KpiCard
          title="Active Administrators"
          value="1"
          subtitle="System Role: ROLE_ADMIN"
          icon={ShieldCheck}
          trend="Active"
          color="rose"
        />
      </div>

      <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-5 shadow-sm mt-6">
        <div className="flex items-center space-x-2 mb-6">
          <Activity className="w-5 h-5 text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-100 tracking-tight">
            Recent Batch Executions
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-900/50 text-[10px] uppercase text-zinc-500 tracking-widest border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3 font-medium">Batch ID</th>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Transactions</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {batches.slice(0, 5).map((batch) => (
                <tr key={batch.batchId} className="hover:bg-zinc-900 transition-colors">
                  <td className="px-4 py-3 font-mono text-[11px] text-blue-400 font-medium">{batch.batchId}</td>
                  <td className="px-4 py-3 text-xs">
                    {(batch.completedAt || batch.startedAt || batch.lastRun)
                      ? new Date(batch.completedAt || batch.startedAt || batch.lastRun).toLocaleString()
                      : 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-xs">{(batch.transactionCount ?? batch.totalTransactions ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs">
                    {(batch.processingTimeSeconds ?? batch.executionDurationSec)
                      ? `${batch.processingTimeSeconds ?? batch.executionDurationSec}s`
                      : '--'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {batch.status || 'COMPLETED'}
                    </span>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-xs text-zinc-500">
                    No recent batches found.
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
