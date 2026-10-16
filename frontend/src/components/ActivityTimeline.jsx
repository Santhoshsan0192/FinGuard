import React from 'react';
import { Clock, AlertTriangle, CreditCard, Activity } from 'lucide-react';

export default function ActivityTimeline({ transactions = [], alerts = [], explanations = [] }) {
  // Consolidate activity items
  const activities = [];

  transactions.filter(Boolean).forEach(tx => {
    activities.push({
      id: `tx-${tx.transactionId || tx.id}`,
      type: 'transaction',
      timestamp: new Date(tx.timestamp || tx.transactionTime || new Date()).getTime(),
      title: 'Transaction Processed',
      description: `Amount: $${tx.amount?.toFixed(2)} at ${tx.merchantName || 'Unknown Merchant'}`,
      icon: CreditCard,
      color: 'blue'
    });
  });

  alerts.filter(Boolean).forEach(alert => {
    activities.push({
      id: `al-${alert.alertId}`,
      type: 'alert',
      timestamp: new Date(alert.createdAt || new Date()).getTime(),
      title: 'Risk Alert Generated',
      description: `Risk Score: ${alert.riskScore} (${alert.riskLevel})`,
      icon: AlertTriangle,
      color: alert.riskLevel === 'HIGH' ? 'rose' : alert.riskLevel === 'MEDIUM' ? 'amber' : 'emerald'
    });
  });

  explanations.filter(Boolean).forEach(expl => {
    activities.push({
      id: `ex-${expl.explanationId || expl.id}`,
      type: 'explanation',
      timestamp: new Date(expl.createdAt || new Date()).getTime(),
      title: 'Model Inference Executed',
      description: `SHAP analysis computed with base value ${expl.baseValue?.toFixed(3)}`,
      icon: Activity,
      color: 'indigo'
    });
  });

  // Sort descending by timestamp
  activities.sort((a, b) => b.timestamp - a.timestamp);
  
  // Slice to most recent 10 items
  const recentActivities = activities.slice(0, 10);

  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg overflow-hidden shadow-sm p-5 h-full">
      <div className="flex items-center space-x-2 mb-6">
        <Clock className="w-4 h-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Recent Activity Timeline</h2>
      </div>

      <div className="relative border-l border-zinc-800/80 ml-3 space-y-6 pb-2">
        {recentActivities.length === 0 ? (
          <div className="text-xs text-zinc-500 pl-6">No recent activity found.</div>
        ) : (
          recentActivities.map((item) => {
            const Icon = item.icon;
            let iconBg, iconColor, textColor;
            switch(item.color) {
              case 'rose': iconBg = 'bg-rose-950'; iconColor = 'text-rose-400'; textColor = 'text-rose-300'; break;
              case 'amber': iconBg = 'bg-amber-950'; iconColor = 'text-amber-400'; textColor = 'text-amber-300'; break;
              case 'emerald': iconBg = 'bg-emerald-950'; iconColor = 'text-emerald-400'; textColor = 'text-emerald-300'; break;
              case 'indigo': iconBg = 'bg-indigo-950'; iconColor = 'text-indigo-400'; textColor = 'text-indigo-300'; break;
              case 'blue':
              default: iconBg = 'bg-blue-950'; iconColor = 'text-blue-400'; textColor = 'text-blue-300'; break;
            }

            return (
              <div key={item.id} className="relative pl-6">
                <div className={`absolute -left-3 top-0.5 w-6 h-6 rounded-full border border-zinc-800 flex items-center justify-center ${iconBg}`}>
                  <Icon className={`w-3 h-3 ${iconColor}`} />
                </div>
                <div>
                  <div className="flex justify-between items-start mb-0.5">
                    <span className={`text-xs font-medium ${textColor}`}>{item.title}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">{item.description}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
