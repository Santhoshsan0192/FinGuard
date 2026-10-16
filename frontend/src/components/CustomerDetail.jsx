import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  CreditCard,
  Smartphone,
  Activity,
  ArrowRight,
  Cpu
} from 'lucide-react';
import finguardApi from '../api/finguardApi';

import RiskBadge from './RiskBadge';
import StatusBadge from './StatusBadge';
import BehaviourBaseline from './BehaviourBaseline';
import BehaviourDeviation from './BehaviourDeviation';
import ShapExplanation from './ShapExplanation';
import DecisionPanel from './DecisionPanel';
import TransactionHistory from './TransactionHistory';
import AlertHistory from './AlertHistory';
import ActivityTimeline from './ActivityTimeline';

export default function CustomerDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const alertId = searchParams.get('alertId');
  const navigate = useNavigate();

  const [customerRisk, setCustomerRisk] = useState(null);
  const [explanations, setExplanations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [loading, setLoading] = useState(true);

  // Decision panel state
  const [analystNotes, setAnalystNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [riskRes, explRes, custRes] = await Promise.allSettled([
        finguardApi.getCustomerRisk(id),
        finguardApi.getCustomerExplanations(id),
        finguardApi.getCustomer(id)
      ]);

      const riskData = riskRes.status === 'fulfilled' ? riskRes.value : null;
      const explData = explRes.status === 'fulfilled' ? explRes.value : null;
      const custData = custRes.status === 'fulfilled' ? custRes.value : null;

      setCustomerRisk(riskData || custData); // fallback to custData if riskData fails
      setExplanations(explData ? [explData] : []);
      setTransactions(custData?.recentTransactions || custData?.transactions || []);

      if (alertId) {
        try {
          const alert = await finguardApi.getAlertById(alertId);
          setCurrentAlert(alert);
          setAnalystNotes(alert?.analystNotes || '');
        } catch (e) {
          console.warn('Could not load specific alert', e);
        }
      }
    } catch (err) {
      console.error('Error loading customer detail:', err);
    } finally {
      setLoading(false);
    }
  }, [id, alertId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusUpdate = async (newStatus, notes) => {
    const targetId = currentAlert?.alertId || alertId;
    if (!targetId) return;

    try {
      setSubmitting(true);
      const effectiveNotes = notes !== undefined ? notes : analystNotes;
      const updated = await finguardApi.updateAlertStatus(targetId, newStatus, effectiveNotes);
      setCurrentAlert(updated);
      const statusLabel = newStatus === 'DISMISSED' ? 'FALSE POSITIVE' : newStatus.replace(/_/g, ' ');
      setActionSuccess(`Alert marked as ${statusLabel}`);
      setTimeout(() => setActionSuccess(''), 3500);
    } catch (err) {
      console.error('Error updating alert status:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <div className="text-sm font-medium text-slate-300">
          Loading Customer Behaviour Profile & SHAP Explainability Engine...
        </div>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          Querying MongoDB documents for customer {id}
        </p>
      </div>
    );
  }

  const cust = customerRisk?.customer;
  const baseline = customerRisk?.behaviourProfile || customerRisk?.baseline;
  const latestRisk = customerRisk?.currentRiskScore;
  const activeExpl = customerRisk?.latestExplanation || (explanations.length > 0 ? explanations[0] : null);

  // Resolve current transaction matching alert or latest
  const currentTx = currentAlert?.transactionId 
    ? transactions.find(t => t.transactionId === currentAlert.transactionId) || transactions[0]
    : transactions[0];

  const score = currentAlert?.riskScore ?? latestRisk?.riskScore ?? 0;
  const rawProb = latestRisk?.rawProbability ?? (score / 100);
  const riskLevel = currentAlert?.riskLevel ?? latestRisk?.riskLevel ?? (score >= 75 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW');
  const isHighRisk = riskLevel === 'HIGH';
  const isMedRisk = riskLevel === 'MEDIUM';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between mt-2 mb-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center space-x-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Priority Alerts</span>
        </button>

        {/* Workflow breadcrumb */}
        <div className="hidden md:flex items-center space-x-1.5 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
          <span>Customer Profiling</span>
          <ArrowRight className="w-3 h-3 text-zinc-700" />
          <span>Risk Scoring</span>
          <ArrowRight className="w-3 h-3 text-zinc-700" />
          <span>Explainable SHAP</span>
          <ArrowRight className="w-3 h-3 text-zinc-700" />
          <span className="text-zinc-100 font-semibold">Analyst Decision</span>
        </div>
      </div>

      {/* 1. Customer Investigation Header Bar */}
      <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Customer Metadata Profile */}
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300 shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">
                  {cust?.fullName || `Customer ${id}`}
                </h1>
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-medium">
                  {cust?.customerId || id}
                </span>
                {currentAlert?.alertId && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-zinc-900 text-blue-400 border border-blue-900/50 font-medium">
                    {currentAlert.alertId}
                  </span>
                )}
                <StatusBadge status={currentAlert?.status || 'NEW'} size="sm" />
              </div>

              <p className="text-xs text-zinc-500 mt-1">
                {cust?.email || 'customer@finguard-enterprise.local'} • Customer Account Profile Verified
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-[11px] text-zinc-400 uppercase tracking-widest">
                <div className="flex items-center space-x-1.5">
                  <CreditCard className="w-3 h-3 text-zinc-500" />
                  <span>Card: <span className="font-semibold text-zinc-200 font-mono">{cust?.card4 || 'VISA'} {cust?.card6 || 'debit'}</span></span>
                </div>
                <div className="flex items-center space-x-1.5 border-l border-zinc-800 pl-4">
                  <Smartphone className="w-3 h-3 text-zinc-500" />
                  <span>Device: <span className="font-semibold text-zinc-200">{cust?.primaryDevice || 'Desktop'}</span></span>
                </div>
                <div className="flex items-center space-x-1.5 border-l border-zinc-800 pl-4">
                  <Activity className="w-3 h-3 text-zinc-500" />
                  <span>History: <span className="font-semibold text-zinc-200">{baseline?.totalTransactions ?? transactions.length} tx</span></span>
                </div>
              </div>
            </div>
          </div>

          {/* Calibrated Risk Score Panel */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4 sm:w-80 flex items-center justify-between shrink-0">
            <div>
              <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-1">
                Model Risk Score
              </div>
              <div className={`text-2xl font-semibold font-mono ${
                isHighRisk ? 'text-rose-400' : isMedRisk ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {score.toFixed(1)}<span className="text-sm font-normal text-zinc-600">/100</span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                <span>XGBoost v1.0.0</span>
              </div>
            </div>

            <div className="text-right space-y-2">
              <div>
                <RiskBadge level={riskLevel} score={score} size="lg" />
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                P(Fraud): <span className="font-medium text-zinc-200">{(rawProb * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Fraud Analyst Decision Support Action Panel */}
      <div>
        <DecisionPanel
          alertId={currentAlert?.alertId || alertId}
          currentStatus={currentAlert?.status || 'NEW'}
          analystNotes={analystNotes}
          onNotesChange={setAnalystNotes}
          onStatusUpdate={handleStatusUpdate}
          submitting={submitting}
          actionSuccess={actionSuccess}
        />
      </div>

      {/* 3. Customer Baseline Profile & Behaviour Deviation Comparison (2-Column Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-6">
          <BehaviourBaseline baseline={baseline} customer={cust} />
        </div>
        <div className="lg:col-span-6">
          <BehaviourDeviation 
            baseline={baseline} 
            currentTx={currentTx} 
            currentAlert={currentAlert} 
          />
        </div>
      </div>

      {/* 4. Explainable AI: SHAP Factor Attribution & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7">
          <ShapExplanation
            explanation={activeExpl}
            riskScore={score}
            riskLevel={riskLevel}
          />
        </div>
        <div className="lg:col-span-5">
          <ActivityTimeline 
            transactions={transactions} 
            alerts={customerRisk?.alerts || []} 
            explanations={explanations} 
          />
        </div>
      </div>

      {/* 5. Historical Alerts & Transaction History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="w-full">
          <AlertHistory alerts={customerRisk?.alerts || []} />
        </div>
        <div className="w-full">
          <TransactionHistory transactions={transactions} />
        </div>
      </div>
    </div>
  );
}
