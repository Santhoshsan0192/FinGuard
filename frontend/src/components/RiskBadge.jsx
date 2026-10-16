import React from 'react';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function RiskBadge({ level, score, showIcon = true, size = 'sm' }) {
  const normLevel = (level || (score >= 75 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW')).toUpperCase();

  const config = {
    HIGH: {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-400',
      icon: AlertTriangle,
      label: 'HIGH',
    },
    MEDIUM: {
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      dot: 'bg-amber-400',
      icon: AlertCircle,
      label: 'MEDIUM',
    },
    LOW: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400',
      icon: CheckCircle2,
      label: 'LOW',
    },
  }[normLevel] || {
    bg: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    dot: 'bg-zinc-400',
    icon: AlertCircle,
    label: normLevel,
  };

  const Icon = config.icon;
  const sizeClasses = size === 'lg' 
    ? 'px-3 py-1 text-xs font-bold gap-1.5' 
    : size === 'xs'
    ? 'px-1.5 py-0.5 text-[9px] font-bold gap-1 tracking-wider'
    : 'px-2 py-0.5 text-[11px] font-semibold gap-1';

  return (
    <span className={`inline-flex items-center rounded-full border tracking-wide uppercase ${config.bg} ${sizeClasses}`}>
      {showIcon && <Icon className={size === 'lg' ? 'w-3.5 h-3.5' : size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
      <span>{config.label}</span>
    </span>
  );
}
