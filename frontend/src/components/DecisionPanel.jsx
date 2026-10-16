import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldAlert, 
  HelpCircle, 
  CheckCircle2, 
  Send, 
  ArrowRight,
  FileEdit,
  AlertTriangle,
  X,
  History,
  User,
  AlertOctagon,
  Sparkles
} from 'lucide-react';
import StatusBadge from './StatusBadge';

// Curated, realistic investigation rationale chips for quick analyst selection
const RATIONALE_PRESETS = {
  CONFIRMED_FRAUD: [
    'Device anomaly & IP mismatch',
    'Rapid transaction velocity burst',
    'Amount exceeds baseline profile 5x+',
    'Confirmed fraudulent card pattern / cluster',
  ],
  FALSE_POSITIVE: [
    'Customer verified via telephone callback',
    'Legitimate vacation / travel spending pattern',
    'Known seasonal spending surge',
    'Authorized business expense receipt validated',
  ],
  ESCALATED: [
    'Suspicious identity collision across accounts',
    'Potential account takeover ring',
    'Exceeds single-analyst liability threshold',
    'Complex behavioral structuring anomaly',
  ],
  UNDER_REVIEW: [
    'Awaiting cardholder callback verification',
    'Pending merchant charge inquiry',
    'Investigating newly registered mobile device',
    'Reviewing cross-border geographic velocity',
  ],
};

const NEXT_STEP_GUIDANCE = {
  NEW: 'Alert awaiting initial analyst review, behavioral comparison, and triage.',
  UNDER_REVIEW: 'Investigation in progress. Next step: Contact cardholder to verify recent device activity.',
  CONFIRMED_FRAUD: 'Transaction confirmed as fraudulent. Next step: Card frozen; automated chargeback dispute initiated.',
  FALSE_POSITIVE: 'Alert resolved as benign. Next step: Customer baseline profile updated with approved transaction pattern.',
  ESCALATED: 'Case escalated to Senior Risk Intelligence. Next step: Awaiting Tier 2 supervisor sign-off.',
};

export default function DecisionPanel({
  alertId,
  customerName,
  customerId,
  amount,
  currentStatus = 'NEW',
  analystNotes = '',
  onNotesChange,
  onStatusUpdate,
  submitting = false,
  actionSuccess = '',
  actionError = '',
  auditHistory = [],
  loadingHistory = false,
}) {
  const normStatus = (currentStatus || 'NEW').toUpperCase();
  const [confirmState, setConfirmState] = useState(null); // 'CONFIRMED_FRAUD', 'FALSE_POSITIVE', 'ESCALATED', 'UNDER_REVIEW'
  const [confirmNotes, setConfirmNotes] = useState('');
  const [localNotes, setLocalNotes] = useState(analystNotes || '');
  const textareaRef = useRef(null);

  // Sync external analystNotes when they change
  useEffect(() => {
    setLocalNotes(analystNotes || '');
  }, [analystNotes]);

  // Autofocus modal textarea when confirmation modal opens
  useEffect(() => {
    if (confirmState && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [confirmState]);

  const handleStatusClick = (status) => {
    if (submitting) return;
    setConfirmState(status);
    setConfirmNotes(localNotes || '');
  };

  const handlePresetClick = (preset) => {
    if (!confirmNotes.trim()) {
      setConfirmNotes(preset);
    } else if (!confirmNotes.includes(preset)) {
      setConfirmNotes(`${confirmNotes.trim()}; ${preset}`);
    }
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleConfirm = () => {
    if (submitting || !confirmNotes.trim()) return;
    onStatusUpdate(confirmState, confirmNotes.trim());
    setConfirmState(null);
    setConfirmNotes('');
  };

  const handleCancel = () => {
    if (submitting) return;
    setConfirmState(null);
    setConfirmNotes('');
  };

  const handleDirectNoteSave = () => {
    if (submitting || !localNotes?.trim()) return;
    onStatusUpdate(normStatus, localNotes.trim());
  };

  const targetPresets = confirmState ? (RATIONALE_PRESETS[confirmState] || []) : [];

  return (
    <div className="bg-[#0d121f] border border-zinc-800/80 rounded-lg p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FileEdit className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Fraud Analyst Decision Support Panel</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Execute triage decision, record investigator rationale, and review audit history for Alert: <span className="font-mono text-zinc-300 font-medium">{alertId || 'ALT_QUEUE'}</span>
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <StatusBadge status={normStatus} size="lg" />
        </div>
      </div>

      {/* Next Step Guidance Banner */}
      <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-start space-x-3">
        <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-semibold text-zinc-300 block uppercase tracking-wider text-[10px]">Workflow Status & Next Step</span>
          <span className="text-zinc-400 leading-relaxed">
            {NEXT_STEP_GUIDANCE[normStatus] || NEXT_STEP_GUIDANCE.NEW}
          </span>
        </div>
      </div>

      {/* Decision Action Buttons */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 block">
          Triage Actions (Select Resolution)
        </label>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 1. Confirm Fraud */}
          <button
            onClick={() => handleStatusClick('CONFIRMED_FRAUD')}
            disabled={submitting}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-[11px] font-semibold transition-all border cursor-pointer uppercase tracking-wider ${
              normStatus === 'CONFIRMED_FRAUD'
                ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-2 ring-rose-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-600 hover:text-white hover:border-rose-500'
            } disabled:opacity-50`}
            title="Mark alert as confirmed fraudulent transaction"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Confirm Fraud</span>
          </button>

          {/* 2. Under Review */}
          <button
            onClick={() => handleStatusClick('UNDER_REVIEW')}
            disabled={submitting}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-[11px] font-semibold transition-all border cursor-pointer uppercase tracking-wider ${
              normStatus === 'UNDER_REVIEW'
                ? 'bg-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-600 hover:text-white hover:border-amber-500'
            } disabled:opacity-50`}
            title="Place alert under active ongoing analyst review"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Under Review</span>
          </button>

          {/* 3. False Positive */}
          <button
            onClick={() => handleStatusClick('FALSE_POSITIVE')}
            disabled={submitting}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-[11px] font-semibold transition-all border cursor-pointer uppercase tracking-wider ${
              normStatus === 'FALSE_POSITIVE' || normStatus === 'DISMISSED'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600 hover:text-white hover:border-emerald-500'
            } disabled:opacity-50`}
            title="Dismiss alert as verified legitimate transaction"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>False Positive</span>
          </button>

          {/* 4. Escalate */}
          <button
            onClick={() => handleStatusClick('ESCALATED')}
            disabled={submitting}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-md text-[11px] font-semibold transition-all border cursor-pointer uppercase tracking-wider ${
              normStatus === 'ESCALATED'
                ? 'bg-purple-600 text-white border-purple-500 shadow-md ring-2 ring-purple-500/20'
                : 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-600 hover:text-white hover:border-purple-500'
            } disabled:opacity-50`}
            title="Escalate case to Senior Risk Intelligence supervisor"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Escalate</span>
          </button>
        </div>
      </div>

      {/* Success and Error Feedback Banners */}
      {actionSuccess && (
        <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-medium">✓ {actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">Error: {actionError}</span>
        </div>
      )}

      {/* Single Unified Notes & Rationale Section */}
      <div className="space-y-2 pt-1 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium uppercase tracking-widest text-zinc-500 block">
            Investigator Notes & Audit Rationale
          </label>
          <span className="text-[10px] text-zinc-500 font-mono">Appends to audit history</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add investigation rationale or case notes..."
            value={localNotes}
            onChange={(e) => {
              setLocalNotes(e.target.value);
              if (onNotesChange) onNotesChange(e.target.value);
            }}
            disabled={submitting}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <button
            onClick={handleDirectNoteSave}
            disabled={submitting || !localNotes?.trim()}
            className="px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-[11px] font-semibold text-zinc-200 transition-colors flex items-center space-x-1.5 shrink-0 border border-zinc-700 uppercase tracking-wider cursor-pointer"
            title="Save note to alert without changing triage status"
          >
            <Send className="w-3 h-3" />
            <span>Save Note</span>
          </button>
        </div>
      </div>

      {/* Audit History Timeline */}
      <div className="pt-4 border-t border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">
              Investigation Audit Trail ({auditHistory.length})
            </h3>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">Immutable Log</span>
        </div>

        {loadingHistory ? (
          <div className="p-4 text-center text-xs text-zinc-500 animate-pulse bg-zinc-900/30 rounded border border-zinc-800/50">
            Loading investigation audit history...
          </div>
        ) : auditHistory.length === 0 ? (
          <div className="p-4 rounded-md bg-zinc-900/40 border border-zinc-800/80 text-xs text-zinc-500 text-center">
            No previous status transitions or audit notes recorded for this alert.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {auditHistory.map((item, idx) => (
              <div 
                key={item.id || idx} 
                className="p-3 rounded-md bg-zinc-900/60 border border-zinc-800/80 text-xs space-y-1.5 hover:border-zinc-700/80 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center space-x-1.5 font-mono">
                    <span className="text-zinc-400 font-medium">{item.previousStatus || 'NEW'}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                    <StatusBadge status={item.newStatus} size="sm" />
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] text-zinc-500 font-mono">
                    <span className="inline-flex items-center space-x-1 text-zinc-400">
                      <User className="w-3 h-3 text-zinc-500" />
                      <span>{item.analystUsername || 'system'}</span>
                    </span>
                    <span>•</span>
                    <span>{item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Just now'}</span>
                  </div>
                </div>
                {item.analystNotes && (
                  <p className="text-[11px] text-zinc-300 bg-zinc-950/70 p-2 rounded border border-zinc-800/70 font-mono leading-relaxed">
                    "{item.analystNotes}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consequential Action Confirmation Modal */}
      {confirmState && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancel();
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleConfirm();
          }}
        >
          <div className="bg-[#0d121f] border border-zinc-700/90 rounded-xl p-5 sm:p-6 w-full max-w-lg shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="flex items-center space-x-2 font-semibold text-zinc-100 text-sm" id="modal-title">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Confirm Status Change</span>
              </span>
              <button 
                onClick={handleCancel} 
                disabled={submitting}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target and Context Identification */}
            <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Target Decision:</span>
                <StatusBadge status={confirmState} size="sm" />
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-zinc-500">Alert Identifier:</span>
                <span className="text-zinc-200 font-medium">{alertId || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Customer:</span>
                <span className="text-zinc-200 font-medium">{customerName || 'Customer'} <span className="font-mono text-zinc-400">({customerId || 'N/A'})</span></span>
              </div>
              {amount !== undefined && (
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-zinc-500">Transaction Amount:</span>
                  <span className="text-zinc-200 font-semibold">${Number(amount).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Optional Quick-Rationale Chips */}
            {targetPresets.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block">
                  Quick-Rationale Presets (Click to insert):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {targetPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handlePresetClick(preset)}
                      disabled={submitting}
                      className="text-[10px] bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/80 rounded-full px-2.5 py-1 transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mandatory Investigation Rationale Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 block">
                  Mandatory Investigation Rationale:
                </label>
                <span className="text-[10px] text-zinc-500 font-mono">Press Ctrl+Enter to submit</span>
              </div>
              <textarea
                ref={textareaRef}
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                placeholder="Enter your mandatory investigation rationale..."
                disabled={submitting}
                className="w-full bg-[#070b14] border border-zinc-700 rounded-md px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 min-h-[80px] font-mono leading-relaxed"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
              <button 
                type="button"
                onClick={handleCancel} 
                disabled={submitting}
                className="px-3.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 uppercase tracking-wider transition rounded"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleConfirm}
                disabled={submitting || !confirmNotes.trim()}
                className="px-4 py-2 rounded text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors uppercase tracking-widest flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                {submitting && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Confirm & Save</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
