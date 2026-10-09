import React, { useState, useEffect } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
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
    <div className="max-w-3xl space-y-5">
      {/* Header — no Refresh button; the review fetches on mount */}
      <div className="pb-4 border-b border-[rgb(var(--sx-border-2))]">
        <h1 className="text-xl font-semibold text-stone-100">Weekly Review</h1>
        {review && (
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--st-500))' }}>
            {review.completion_rate}% complete
          </p>
        )}
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
        <div className="space-y-6">
          <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--st-300))' }}>
            {review.summary}
          </p>

          {/* One list. Three stacked cards of AI bullets said the same
              thing in three different accent colours. */}
          <div className="space-y-4">
            {review.highlights.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--st-600))' }}>
                  Highlights
                </h2>
                <ul className="space-y-1.5">
                  {review.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2 text-sm" style={{ color: 'rgb(var(--st-300))' }}>
                      <span style={{ color: 'rgb(var(--st-600))' }}>—</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {review.patterns.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--st-600))' }}>
                  Patterns
                </h2>
                <ul className="space-y-1.5">
                  {review.patterns.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm" style={{ color: 'rgb(var(--st-300))' }}>
                      <span style={{ color: 'rgb(var(--st-600))' }}>—</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {review.suggestions.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--st-600))' }}>
                  Next week
                </h2>
                <ul className="space-y-1.5">
                  {review.suggestions.map((sg, i) => (
                    <li key={i} className="flex gap-2 text-sm" style={{ color: 'rgb(var(--st-300))' }}>
                      <span style={{ color: 'rgb(var(--st-600))' }}>—</span>
                      <span>{sg}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
