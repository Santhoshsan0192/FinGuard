import React from 'react';
import { ShieldAlert, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import RiskBadge from './RiskBadge';

export default function AlertHistory({ alerts = [] }) {
  const navigate = useNavigate();

  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg overflow-hidden shadow-sm">
      <div className="p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Risk & Alert History</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Historical alerts generated for this customer profile
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900/50 text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4 font-medium">Alert ID</th>
              <th className="py-3 px-4 font-medium">Created</th>
              <th className="py-3 px-4 font-medium">Tx ID</th>
              <th className="py-3 px-4 font-medium">Risk Score</th>
              <th className="py-3 px-4 font-medium">Status</th>
              <th className="py-3 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {alerts.filter(Boolean).length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-zinc-500">
                  No historical alerts found for this customer.
                </td>
              </tr>
            ) : (
              alerts.filter(Boolean).map((alert) => (
                <tr key={alert.alertId} className="hover:bg-zinc-900 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-blue-400 text-[11px]">
                    {alert.alertId}
                  </td>
                  <td className="py-3 px-4 text-zinc-400">
                    <span className="font-mono text-zinc-300">
                      {alert.createdAt ? new Date(alert.createdAt).toLocaleString() : 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-zinc-400 text-[10px]">
                    {alert.transactionId || 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    <RiskBadge level={alert.riskLevel} score={alert.riskScore} size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={alert.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => navigate(`/analyst/customers/${alert.customerId}?alertId=${alert.alertId}`)}
                      className="inline-flex items-center space-x-1 text-[10px] uppercase tracking-widest font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      <span>Investigate</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
