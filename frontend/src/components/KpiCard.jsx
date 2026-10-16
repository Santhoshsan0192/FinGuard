import React from 'react';

export default function KpiCard({ title, value, subtext, percentage, icon: Icon, tone = 'neutral', badgeText }) {
  // Anti-slop: Remove excessive background gradients and glows.
  // Use a solid base with subtle borders. 
  // Keep semantic colors for the icon/value only.
  
  const toneClasses = {
    neutral: {
      border: 'border-slate-800',
      iconBg: 'bg-slate-800 text-slate-300',
      valueColor: 'text-slate-100',
    },
    red: {
      border: 'border-slate-800',
      iconBg: 'bg-rose-500/10 text-rose-400',
      valueColor: 'text-slate-100', // Keep numbers neutral, icon shows semantic intent
    },
    amber: {
      border: 'border-slate-800',
      iconBg: 'bg-amber-500/10 text-amber-400',
      valueColor: 'text-slate-100',
    },
    purple: {
      border: 'border-slate-800',
      iconBg: 'bg-indigo-500/10 text-indigo-400',
      valueColor: 'text-slate-100',
    },
    green: {
      border: 'border-slate-800',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
      valueColor: 'text-slate-100',
    },
    blue: {
      border: 'border-slate-800',
      iconBg: 'bg-blue-500/10 text-blue-400',
      valueColor: 'text-slate-100',
    }
  }[tone] || {
    border: 'border-slate-800',
    iconBg: 'bg-slate-800 text-slate-400',
    valueColor: 'text-slate-100',
  };

  return (
    <div className={`bg-[#0d121f] border ${toneClasses.border} rounded-lg p-5 flex flex-col justify-between h-full relative overflow-hidden group`}>
      {/* Subtle top highlight instead of massive gradient */}
      <div className={`absolute top-0 left-0 w-full h-[1px] opacity-20 ${toneClasses.iconBg.split(' ')[0].replace('/10', '/50')}`} />
      
      <div className="flex items-start justify-between gap-2 mb-4">
        <span className="text-xs font-medium text-slate-400 tracking-wide">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {badgeText && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {badgeText}
            </span>
          )}
          {Icon && (
            <div className={`p-1.5 rounded-md ${toneClasses.iconBg}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex items-baseline gap-2">
          <div className={`text-3xl font-semibold tracking-tight ${toneClasses.valueColor} font-mono`}>
            {value !== undefined && value !== null ? value.toLocaleString() : '--'}
          </div>
          {percentage !== undefined && percentage !== null && (
            <span className="text-xs font-medium text-slate-500">
              {percentage}% of batch
            </span>
          )}
        </div>
        {subtext && (
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
