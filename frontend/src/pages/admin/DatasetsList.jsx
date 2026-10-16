import React, { useState, useEffect } from 'react';
import { FileText, Beaker, RefreshCw, AlertCircle } from 'lucide-react';
import finguardApi from '../../api/finguardApi';

const DatabaseZap = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M13 2v4l-2 2"></path>
  </svg>
);

export default function DatasetsList() {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchModelMetrics = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await finguardApi.getLatestModel();
      setModel(data);
    } catch (err) {
      console.error('Failed to load model metrics:', err);
      setError('Unable to load live model metrics from backend API. Displaying default baseline.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      try {
        const data = await finguardApi.getLatestModel();
        if (isMounted) setModel(data);
      } catch (err) {
        console.error('Failed to load model metrics:', err);
        if (isMounted) setError('Unable to load live model metrics from backend API. Displaying default baseline.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadInitial();
    return () => { isMounted = false; };
  }, []);

  // Format helper
  const fmt = (val, digits = 4) => (val !== undefined && val !== null ? Number(val).toFixed(digits) : '--');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-indigo-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Datasets & Experiments</h1>
              <p className="text-xs text-slate-400">
                Research validation, active model performance, and benchmark dataset metrics.
              </p>
            </div>
          </div>
          <button
            onClick={fetchModelMetrics}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 font-medium transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <div className="my-4 flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={fetchModelMetrics} className="underline hover:text-amber-300 ml-2">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="border border-slate-800 rounded-lg p-5 bg-slate-900/50 animate-pulse space-y-4">
              <div className="h-5 bg-slate-800 rounded w-1/3"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-800/60 rounded"></div>
                <div className="h-4 bg-slate-800/60 rounded"></div>
                <div className="h-4 bg-slate-800/60 rounded"></div>
              </div>
            </div>
            <div className="border border-slate-800 rounded-lg p-5 bg-slate-900/50 animate-pulse space-y-4">
              <div className="h-5 bg-slate-800 rounded w-1/3"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-800/60 rounded"></div>
                <div className="h-4 bg-slate-800/60 rounded"></div>
                <div className="h-4 bg-slate-800/60 rounded"></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Dataset Info */}
            <div className="border border-slate-800 rounded-lg p-5 bg-slate-900/50">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                <DatabaseZap className="w-4 h-4 mr-2 text-blue-400" />
                Evaluation Dataset
              </h2>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-500">Source</span>
                  <span className="font-medium">{model?.datasetVersion || 'IEEE-CIS-2200'} Benchmark</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-500">Total Transactions</span>
                  <span className="font-mono">{model?.totalTransactions?.toLocaleString() || '2,200'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-500">Evaluation Split</span>
                  <span className="font-medium capitalize">{model?.evaluationMode ? `${model.evaluationMode} (75/25)` : 'Strict Temporal (75/25)'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-500">Held-Out Test Set</span>
                  <span className="font-mono text-indigo-300">{model?.testCount ? `${model.testCount} transactions` : '550 transactions'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-500">Training Date</span>
                  <span className="font-mono text-xs text-slate-400">
                    {model?.trainingDate ? new Date(model.trainingDate).toLocaleString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Model Performance */}
            <div className="border border-slate-800 rounded-lg p-5 bg-slate-900/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <Beaker className="w-4 h-4 mr-2 text-purple-400" />
                  Active Model Performance
                </h2>
                <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {model?.modelVersion || 'XGBoost-v2.0'}
                </span>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-500">Algorithm</span>
                  <span className="font-medium">{model?.algorithm || 'XGBoost Classifier'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-500">Precision</span>
                  <span className="font-mono text-emerald-400 font-semibold">{fmt(model?.precision)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-500">Recall</span>
                  <span className="font-mono text-emerald-400 font-semibold">{fmt(model?.recall)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-500">F1 Score</span>
                  <span className="font-mono text-emerald-400 font-semibold">{fmt(model?.f1Score)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/50 pb-2">
                  <span className="text-slate-500">PR-AUC / ROC-AUC</span>
                  <span className="font-mono text-emerald-400">
                    {fmt(model?.prAuc)} / {fmt(model?.rocAuc)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
