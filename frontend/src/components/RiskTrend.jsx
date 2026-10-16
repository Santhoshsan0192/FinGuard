import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Clock, Calendar, Layers } from 'lucide-react';

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const p = payload[0].payload;
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs shadow-xl space-y-2">
        <div className="font-semibold text-zinc-100">{p.timeLabel}</div>
        <div className="flex justify-between gap-6 text-zinc-400">
          <span>Volume:</span>
          <span className="font-mono font-medium text-zinc-200">{p.count || p.totalCount || 0} tx</span>
        </div>
        {p.highRiskCount !== undefined && (
          <div className="flex justify-between gap-6 text-zinc-400">
            <span>High Risk:</span>
            <span className="font-mono font-medium text-rose-400">{p.highRiskCount}</span>
          </div>
        )}
        {p.avgRiskScore !== undefined && (
          <div className="flex justify-between gap-6 text-zinc-400">
            <span>Avg Score:</span>
            <span className="font-mono font-medium text-zinc-300">{p.avgRiskScore}/100</span>
          </div>
        )}
      </div>
    );
  }
  return null;
}

export default function RiskTrend({ trendData, aggregation = 'hour', onAggregationChange }) {
  const data = trendData && trendData.length > 0 ? trendData : [];

  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-5 flex flex-col justify-between h-full">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-medium text-zinc-100 tracking-tight">Real Risk Trend</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Aggregated volume and anomaly patterns
          </p>
        </div>

        {/* Aggregation Mode Selector */}
        <div className="flex items-center p-1 rounded-md border border-zinc-800 bg-zinc-900/50 text-[11px] self-start sm:self-auto">
          <button
            onClick={() => onAggregationChange && onAggregationChange('hour')}
            className={`px-2.5 py-1.5 rounded-[4px] font-medium flex items-center space-x-1.5 cursor-pointer transition-colors ${
              aggregation === 'hour' ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Hourly</span>
          </button>
          <button
            onClick={() => onAggregationChange && onAggregationChange('day')}
            className={`px-2.5 py-1.5 rounded-[4px] font-medium flex items-center space-x-1.5 cursor-pointer transition-colors ${
              aggregation === 'day' ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily</span>
          </button>
          <button
            onClick={() => onAggregationChange && onAggregationChange('batch')}
            className={`px-2.5 py-1.5 rounded-[4px] font-medium flex items-center space-x-1.5 cursor-pointer transition-colors ${
              aggregation === 'batch' ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batches</span>
          </button>
        </div>
      </div>

      <div className="h-48 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="timeLabel" 
              stroke="#52525b" 
              fontSize={10} 
              tickLine={false} 
              dy={8}
            />
            <YAxis 
              stroke="#52525b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              dx={-8}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="count" 
              stroke="#3b82f6" 
              strokeWidth={1.5}
              fillOpacity={1} 
              fill="url(#riskGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-4 border-t border-zinc-800/80 pt-3 font-mono">
        <span>Aggregation: <strong className="text-zinc-400 uppercase">{aggregation}</strong></span>
        <span>Points: {data.length}</span>
      </div>
    </div>
  );
}
