import React from 'react';
import { DollarSign, Clock, Smartphone, CreditCard } from 'lucide-react';

export default function BehaviourBaseline({ baseline, customer }) {
  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-sm font-medium text-zinc-100 tracking-tight">Customer Behaviour Baseline</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Historical normal pattern across prior transactions</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
          Historical Norm
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mt-auto">
        {/* Average Spending */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="flex items-center space-x-1.5 font-medium uppercase tracking-widest text-[10px]">
              <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
              <span>Average Spend</span>
            </span>
            <span className="font-semibold text-zinc-100 font-mono text-sm">
              ${baseline?.baselineAvgAmt?.toFixed(2) ?? '--'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 font-mono">
            Std Dev: ${baseline?.baselineStdAmt?.toFixed(2) ?? '--'}
          </div>
        </div>

        {/* Operating Active Hours */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="flex items-center space-x-1.5 font-medium uppercase tracking-widest text-[10px]">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Active Hours</span>
            </span>
            <span className="font-medium text-zinc-200 font-mono">
              {baseline?.typicalActiveHours || '08:00 – 21:00'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500">
            10th to 90th percentile
          </div>
        </div>

        {/* Primary Registered Device */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="flex items-center space-x-1.5 font-medium uppercase tracking-widest text-[10px]">
              <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
              <span>Primary Device</span>
            </span>
            <span className="font-medium text-zinc-200">
              {baseline?.primaryDevice || customer?.primaryDevice || 'Desktop'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Primary verified hardware
          </div>
        </div>

        {/* Primary Card Issuer */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="flex items-center space-x-1.5 font-medium uppercase tracking-widest text-[10px]">
              <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
              <span>Card Issuer</span>
            </span>
            <span className="font-medium text-zinc-200 uppercase font-mono">
              {baseline?.primaryCard || customer?.card4 || 'VISA'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500">
            {customer?.card6 || 'debit'} network
          </div>
        </div>
      </div>
    </div>
  );
}
