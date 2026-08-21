import React, { useState, useEffect } from 'react';
import { BarChart3, CheckCircle2, AlertCircle, TrendingUp, Loader2, Sparkles } from 'lucide-react';
import { WeeklyReviewResult } from '../types';
import { api } from '../services/api';

export const WeeklyReviewView: React.FC = () => {
  const [review, setReview] = useState<WeeklyReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReview();
  }, []);

  const fetchReview = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getWeeklyReview();
      setReview(data);
    } catch {
      setError('Failed to load weekly review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-full space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[rgb(var(--sx-border)/0.8)] gap-4">
        <div>
          <div className="flex items-center space-x-2 text-sm font-mono font-semibold text-amber-400 uppercase tracking-wider">
            <BarChart3 size={18} />
            <span>Weekly Analytics</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-stone-100 tracking-tight mt-1">
            Weekly Review
          </h1>
          <p className="text-sm text-stone-400 mt-2">
            AI-analyzed patterns, completion metrics, and actionable suggestions.
          </p>
        </div>
        <button
          onClick={fetchReview}
          disabled={loading}
          className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center items-center space-x-2">
          <Loader2 size={24} className="animate-spin text-amber-400" />
          <span className="text-sm text-stone-400">Analyzing your week...</span>
        </div>
      ) : error ? (
        <div className="py-12 text-center text-stone-400">
          <AlertCircle size={32} className="mx-auto mb-3 text-amber-400" />
          <p>{error}</p>
          <button onClick={fetchReview} className="mt-3 text-sm text-amber-400 hover:text-amber-300">Try Again</button>
        </div>
      ) : review ? (
        <div className="space-y-5">
          {/* Summary Card */}
          <div className="p-6 rounded-xl bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border))] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-stone-200">Summary</h2>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-stone-400">Completion Rate</span>
                <span className="text-lg font-bold text-emerald-400">{review.completion_rate}%</span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-[rgb(var(--sx-raised))] rounded-full h-3 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${review.completion_rate}%` }}
              />
            </div>
            <p className="text-sm text-stone-300 leading-relaxed">{review.summary}</p>
          </div>

          {/* Highlights */}
          {review.highlights.length > 0 && (
            <div className="p-5 rounded-xl bg-[rgb(var(--sx-modal))] border border-emerald-500/20 space-y-3">
              <div className="flex items-center space-x-2 text-sm font-semibold text-emerald-300">
                <CheckCircle2 size={16} />
                <span>Highlights</span>
              </div>
              <div className="space-y-2">
                {review.highlights.map((h, i) => (
                  <div key={i} className="flex items-start space-x-2 text-sm text-stone-300">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patterns */}
          {review.patterns.length > 0 && (
            <div className="p-5 rounded-xl bg-[rgb(var(--sx-modal))] border border-amber-500/20 space-y-3">
              <div className="flex items-center space-x-2 text-sm font-semibold text-amber-300">
                <Sparkles size={16} />
                <span>AI-Observed Patterns</span>
              </div>
              <div className="space-y-2">
                {review.patterns.map((p, i) => (
                  <div key={i} className="flex items-start space-x-2 text-sm text-stone-300">
                    <span className="text-amber-400 mt-0.5">↻</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {review.suggestions.length > 0 && (
            <div className="p-5 rounded-xl bg-[rgb(var(--sx-modal))] border border-amber-500/20 space-y-3">
              <div className="flex items-center space-x-2 text-sm font-semibold text-amber-300">
                <TrendingUp size={16} />
                <span>Suggestions for Next Week</span>
              </div>
              <div className="space-y-2">
                {review.suggestions.map((s, i) => (
                  <div key={i} className="flex items-start space-x-2 text-sm text-stone-300">
                    <span className="text-amber-400 mt-0.5">→</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
