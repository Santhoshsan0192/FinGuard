import React from 'react';
import { History, Info } from 'lucide-react';

export default function TransactionHistory({ transactions = [] }) {
  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg overflow-hidden shadow-sm">
      <div className="p-5 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Customer Transaction History</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Historical transaction records scored during pipeline execution for longitudinal audit
          </p>
        </div>

        {/* Academic / Benchmark Evaluation Disclaimer Badge */}
        <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-widest font-medium">
          <Info className="w-3.5 h-3.5 text-zinc-500" />
          <span>Evaluation Metric Label</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-zinc-900/50 text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4 font-medium">Transaction ID</th>
              <th className="py-3 px-4 font-medium">Amount</th>
              <th className="py-3 px-4 font-medium">Time / Day</th>
              <th className="py-3 px-4 font-medium">Device Signature</th>
              <th className="py-3 px-4 font-medium">Product CD</th>
              <th className="py-3 px-4 font-medium text-right">Ground Truth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-zinc-500">
                  No historical transaction records found for this customer.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isFraudLabel = tx.isFraudGroundTruth === 1;

                return (
                  <tr key={tx.id || tx.transactionId} className="hover:bg-zinc-900 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-blue-400 text-[11px]">
                      {tx.transactionId}
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-200 font-mono">
                      ${tx.amount?.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      <span className="font-mono text-zinc-300">{tx.hourOfDay?.toString()?.padStart(2, '0') ?? '00'}:00</span> (Day {tx.dayOfWeek ?? '1'})
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-zinc-200 font-medium">{tx.deviceType || 'Desktop'}</span>
                      <span className="text-[10px] text-zinc-500 block font-mono mt-0.5">{tx.deviceInfo || 'Chrome/Windows'}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-400">
                      {tx.productCd || 'W'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-medium font-mono uppercase tracking-widest border ${
                        isFraudLabel
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {isFraudLabel ? 'FRAUD (1)' : 'LEGIT (0)'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
