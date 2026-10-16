import React from 'react';
import { Clock, HelpCircle, ShieldAlert, CheckCircle } from 'lucide-react';

export default function StatusBadge({ status, size = 'sm' }) {
  const normStatus = (status || 'NEW').toUpperCase();

  const config = {
    NEW: {
      bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: Clock,
      label: 'NEW',
    },
    UNDER_REVIEW: {
      bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      icon: HelpCircle,
      label: 'UNDER REVIEW',
    },
    CONFIRMED_FRAUD: {
      bg: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
      icon: ShieldAlert,
      label: 'CONFIRMED FRAUD',
    },
    DISMISSED: {
      bg: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
      icon: CheckCircle,
      label: 'FALSE POSITIVE',
    },
  }[normStatus] || {
    bg: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    icon: Clock,
    label: normStatus.replace(/_/g, ' '),
  };

  const Icon = config.icon;
  const sizeClasses = size === 'lg' 
    ? 'px-3 py-1 text-xs font-bold gap-1.5' 
    : 'px-2 py-0.5 text-[11px] font-semibold gap-1';

  return (
    <span className={`inline-flex items-center rounded-md border tracking-wide uppercase font-mono ${config.bg} ${sizeClasses}`}>
      <Icon className={size === 'lg' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      <span>{config.label}</span>
    </span>
  );
}
