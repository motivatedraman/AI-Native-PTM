import React, { useState } from 'react';
import { Sparkles, Play, Clock, Loader2, AlertTriangle } from 'lucide-react';
import { WhatNowResult } from '../types';
import { api } from '../services/api';

interface WhatNowWidgetProps {
  onStartTask: (taskId: number) => void;
}

export const WhatNowWidget: React.FC<WhatNowWidgetProps> = ({ onStartTask }) => {
  const [result, setResult] = useState<WhatNowResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchRecommendation = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await api.whatShouldIDo();
      setResult(data);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-[#12141c] border border-indigo-500/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm font-semibold text-indigo-300">
          <Sparkles size={15} />
          <span>What Should I Do Now?</span>
        </div>
        <button
          onClick={fetchRecommendation}
          disabled={loading}
          className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-md text-xs border border-indigo-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : 'Ask AI'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-slate-400">Could not get recommendation. Try again.</p>
      )}

      {!loading && !error && !result && (
        <p className="text-xs text-slate-400">Click "Ask AI" to get a personalized recommendation based on your current tasks.</p>
      )}

      {result && (
        <div className="space-y-3">
          <p className="text-sm text-slate-300 leading-relaxed">{result.message}</p>
          {result.recommendations.length > 0 && (
            <div className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-[#181a24] rounded-lg border border-[#262a3c] group"
                >
                  <div className="flex items-center space-x-3 truncate">
                    <span className="text-xs font-mono text-slate-400 w-4">{i + 1}.</span>
                    <div>
                      <span className="text-sm text-slate-200 font-medium">{rec.task_title}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">{rec.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 font-mono">~{rec.duration_minutes}m</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      rec.urgency === 'critical' ? 'bg-red-950/50 text-red-300' :
                      rec.urgency === 'high' ? 'bg-amber-950/50 text-amber-300' :
                      'bg-[#1e2230] text-slate-400'
                    }`}>
                      {rec.urgency.toUpperCase()}
                    </span>
                    {rec.task_id && (
                      <button
                        onClick={() => onStartTask(rec.task_id!)}
                        className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 px-2 py-1 bg-indigo-600/30 text-indigo-300 rounded text-[10px] transition-opacity"
                      >
                        <Play size={10} />
                        <span>Start</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center space-x-1 text-[11px] text-slate-500">
            <Clock size={11} />
            <span>Available: ~{Math.floor(result.available_minutes / 60)}h {result.available_minutes % 60}m</span>
          </div>
        </div>
      )}
    </div>
  );
};
