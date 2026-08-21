import React, { useState } from 'react';
import { Sparkles, Play, Clock, Loader2 } from 'lucide-react';
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
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="p-4 rounded-2xl space-y-3"
      style={{
        background: 'rgb(var(--sx-surface))',
        border: '1px solid rgba(171, 118, 49, 0.2)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm font-semibold text-amber-300">
          <Sparkles size={15} style={{ color: 'rgb(var(--am-600))' }} />
          <span>What Should I Do Now?</span>
        </div>
        <button
          onClick={fetchRecommendation}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-sm disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, rgb(var(--am-600)), var(--brand-deep))',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles size={12} />
              <span>Ask AI (Deep Focus)</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <p className="text-xs" style={{ color: 'var(--rose)' }}>Could not get recommendation. Try again.</p>
      )}

      {!loading && !error && !result && (
        <p className="text-xs" style={{ color: 'rgb(var(--st-500))' }}>
          Click "Ask AI" for an intelligent prioritization analysis across your deadlines, focus times, and energy blocks.
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-stone-200">{result.message}</p>
          {result.recommendations.length > 0 && (
            <div className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl group transition-all"
                  style={{ background: 'rgb(var(--sx-card))', border: '1px solid rgb(var(--sx-border-2))' }}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <span className="text-xs font-mono w-4" style={{ color: 'rgb(var(--st-500))' }}>{i + 1}.</span>
                    <div>
                      <span className="text-sm font-medium text-stone-100">{rec.task_title}</span>
                      <p className="text-[11px] mt-0.5" style={{ color: 'rgb(var(--st-400))' }}>{rec.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs font-mono" style={{ color: 'rgb(var(--st-500))' }}>~{rec.duration_minutes}m</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-md font-mono uppercase font-medium"
                      style={{
                        background: rec.urgency === 'critical' ? 'rgba(244, 63, 94, 0.15)' : rec.urgency === 'high' ? 'rgba(207, 164, 95, 0.15)' : 'rgb(var(--sx-hover))',
                        color: rec.urgency === 'critical' ? 'var(--rose)' : rec.urgency === 'high' ? 'var(--gold)' : 'rgb(var(--st-400))',
                        border: `1px solid ${rec.urgency === 'critical' ? 'rgba(244, 63, 94, 0.3)' : rec.urgency === 'high' ? 'rgba(207, 164, 95, 0.3)' : 'rgb(var(--sx-border-3))'}`,
                      }}
                    >
                      {rec.urgency}
                    </span>
                    {rec.task_id && (
                      <button
                        onClick={() => onStartTask(rec.task_id!)}
                        className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 px-2 py-1 rounded-lg text-[10px] text-white font-medium transition-opacity"
                        style={{ background: 'linear-gradient(135deg, var(--success), var(--cyan))' }}
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
          <div className="flex items-center space-x-1 text-[11px]" style={{ color: 'rgb(var(--st-500))' }}>
            <Clock size={11} />
            <span>Available slot: ~{Math.floor(result.available_minutes / 60)}h {result.available_minutes % 60}m</span>
          </div>
        </div>
      )}
    </div>
  );
};
