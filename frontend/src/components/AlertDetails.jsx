import React, { useState, useEffect } from 'react';
import finguardApi from '../api/finguardApi';
import ShapExplanation from './ShapExplanation';
import DecisionPanel from './DecisionPanel';
import BehaviourDeviation from './BehaviourDeviation';

export default function AlertDetails({ alert, onStatusUpdate }) {
  const [customerRisk, setCustomerRisk] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [auditHistory, setAuditHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analystNotes, setAnalystNotes] = useState(alert.analystNotes || '');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [currentAlert, setCurrentAlert] = useState(alert);

  const alertIdentifier = alert.alertId || alert.id;

  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setLoadingHistory(true);
        const [riskRes, explRes, custRes, txRes, histRes] = await Promise.allSettled([
          finguardApi.getCustomerRisk(alert.customerId),
          alert.transactionId 
            ? finguardApi.getTransactionExplanation(alert.transactionId) 
            : Promise.reject(new Error('No transactionId')),
          finguardApi.getCustomer(alert.customerId),
          alert.transactionId
            ? finguardApi.getTransactionById(alert.transactionId)
            : Promise.resolve(null),
          finguardApi.getAlertHistory(alertIdentifier),
        ]);

        if (!isMounted) return;

        const riskData = riskRes.status === 'fulfilled' ? riskRes.value : null;
        const explData = explRes.status === 'fulfilled' ? explRes.value : null;
        const custData = custRes.status === 'fulfilled' ? custRes.value : null;
        const txData = txRes.status === 'fulfilled' ? txRes.value : null;
        const histData = histRes.status === 'fulfilled' ? histRes.value : [];

        setCustomerRisk(riskData || custData);
        // Do NOT silently fall back to customer's latest explanation when missing
        setExplanation(explData);
        setTransaction(txData);
        setAuditHistory(histData || []);
      } catch (err) {
        console.error('Error fetching details:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setLoadingHistory(false);
        }
      }
    };
    fetchDetails();
    return () => { isMounted = false; };
  }, [alert.customerId, alert.transactionId, alertIdentifier]);

  const handleStatusUpdate = async (newStatus, notes) => {
    try {
      setSubmitting(true);
      setActionError('');
      const effectiveNotes = notes !== undefined ? notes : analystNotes;
      const updated = await finguardApi.updateAlertStatus(alertIdentifier, newStatus, effectiveNotes);
      setCurrentAlert(updated);
      setAnalystNotes(updated.analystNotes || effectiveNotes || '');

      // Refresh real audit history immediately from API
      try {
        const freshHistory = await finguardApi.getAlertHistory(alertIdentifier);
        setAuditHistory(freshHistory || []);
      } catch (histErr) {
        console.warn('Could not refresh audit history:', histErr);
      }

      const statusLabel = newStatus === 'DISMISSED' ? 'FALSE POSITIVE' : newStatus.replace(/_/g, ' ');
      setActionSuccess(`Alert marked as ${statusLabel}`);
      setTimeout(() => setActionSuccess(''), 4000);

      if (onStatusUpdate) {
        onStatusUpdate(updated);
      }
    } catch (err) {
      console.error('Error updating alert status:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to update alert status';
      setActionError(errMsg);
      setTimeout(() => setActionError(''), 6000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center bg-[#0d121f]/50 border-t border-zinc-800">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <div className="text-xs text-zinc-400">Loading comprehensive investigation details...</div>
      </div>
    );
  }

  const baseline = customerRisk?.behaviourProfile || customerRisk?.baseline;
  const latestRisk = customerRisk?.currentRiskScore;
  
  // Real transaction entity data with fallback to alert-level values
  const currentTx = transaction || {
    amount: alert.amount,
    deviceType: currentAlert?.deviceType || alert.deviceType,
    deviceInfo: currentAlert?.deviceInfo || alert.deviceInfo,
    hourOfDay: currentAlert?.hourOfDay || alert.hourOfDay,
  };

  const score = currentAlert?.riskScore ?? latestRisk?.riskScore ?? 0;
  const riskLevel = currentAlert?.riskLevel ?? latestRisk?.riskLevel ?? (score >= 75 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW');

  return (
    <div className="bg-[#0a0f18] p-5 lg:p-6 border-t border-zinc-800">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Account Compromise Signals */}
        <div className="lg:col-span-5 space-y-4">
          <BehaviourDeviation 
            baseline={baseline} 
            currentTx={currentTx} 
            currentAlert={currentAlert} 
          />
        </div>

        {/* Right Column: Risk Score Drivers (SHAP) */}
        <div className="lg:col-span-7">
          <ShapExplanation
            explanation={explanation}
            riskScore={score}
            riskLevel={riskLevel}
            transactionId={alert.transactionId}
          />
        </div>
      </div>

      {/* Quick Action Buttons (Decision Panel & Audit History Trail) */}
      <div className="mt-6 pt-6 border-t border-zinc-800/80">
        <DecisionPanel
          alertId={alertIdentifier}
          customerName={currentAlert?.customerName || alert.customerName}
          customerId={currentAlert?.customerId || alert.customerId}
          amount={currentTx?.amount ?? currentAlert?.amount ?? alert.amount}
          currentStatus={currentAlert?.status || 'NEW'}
          analystNotes={analystNotes}
          onNotesChange={setAnalystNotes}
          onStatusUpdate={handleStatusUpdate}
          submitting={submitting}
          actionSuccess={actionSuccess}
          actionError={actionError}
          auditHistory={auditHistory}
          loadingHistory={loadingHistory}
        />
      </div>
    </div>
  );
}
