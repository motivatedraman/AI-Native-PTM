import React, { useState, useEffect } from 'react';
import { X, Loader2, RefreshCw, Zap } from 'lucide-react';
import { AISuggestion } from '../types';
import { api } from '../services/api';

interface AISuggestionsCardProps {
  onSelectTask: (taskId: number) => void;
  onOpenPlanner?: () => void;
}

export const AISuggestionsCard: React.FC<AISuggestionsCardProps> = ({ onSelectTask, onOpenPlanner }) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const data = await api.getAISuggestions();
      setSuggestions(data);
    } catch {
      // Silently fail — suggestions are background enhancement
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleDismiss = (index: number) => {
    setDismissed(prev => new Set([...prev, index]));
  };

  /** A suggestion is actionable if we have a handler for its shape. */
  const hasAction = (s: AISuggestion): boolean =>
    !!getTaskId(s) ||
    s.action?.type === 'review_floating' ||
    s.action?.type === 'plan_day';

  const getTaskId = (s: AISuggestion): number | undefined => {
    if (typeof s.task_id === 'number') return s.task_id;
    const fromAction = s.action?.task_id;
    return typeof fromAction === 'number' ? fromAction : undefined;
  };

  const handleApply = (suggestion: AISuggestion) => {
    const idx = suggestions.indexOf(suggestion);
    const taskId = getTaskId(suggestion);
    if (taskId) {
      // Specific task → always open its edit view (never the planner)
      onSelectTask(taskId);
      handleDismiss(idx);
    } else if (suggestion.action?.type === 'review_floating' || suggestion.action?.type === 'plan_day') {
      // Aggregate overflow (e.g. "N more tasks have no deadline") → planner
      onOpenPlanner?.();
      handleDismiss(idx);
    }
  };

  const visibleSuggestions = suggestions.filter((_, i) => !dismissed.has(i));

  if (loading && visibleSuggestions.length === 0) {
    return (
      <div
        className="p-4 rounded-2xl space-y-2"
        style={{ background: 'rgb(var(--sx-surface))', border: '1px solid rgb(var(--sx-border-2))' }}
      >
        <div className="flex items-center space-x-2 text-sm font-semibold text-stone-300">
          <Zap size={15} style={{ color: 'rgb(var(--am-600))' }} />
          <span>Smart Suggestions</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 size={18} className="animate-spin text-amber-400" />
        </div>
      </div>
    );
  }

  if (visibleSuggestions.length === 0) return null;

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
          <Zap size={15} style={{ color: 'rgb(var(--am-600))' }} />
          <span>Smart Suggestions</span>
        </div>
        <button
          onClick={fetchSuggestions}
          className="p-1 text-stone-400 hover:text-stone-200 transition-colors rounded-lg"
          title="Refresh suggestions"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="space-y-2">
        {visibleSuggestions.slice(0, 4).map((s, i) => (
          <div
            key={i}
            onClick={() => hasAction(s) && handleApply(s)}
            className={`flex items-center justify-between p-3 rounded-xl group transition-all ${hasAction(s) ? 'cursor-pointer hover:border-[rgb(var(--sx-border-3))]' : ''}`}
            style={{ background: 'rgb(var(--sx-card))', border: '1px solid rgb(var(--sx-border-2))' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-stone-100 truncate">{s.title}</p>
              {s.description && (
                <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgb(var(--st-400))' }}>{s.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
              {hasAction(s) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleApply(s);
                  }}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-lg text-white transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgb(var(--am-600)), rgb(var(--am-700)))',
                  }}
                >
                  {getTaskId(s) ? 'Open' : 'View'}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDismiss(suggestions.indexOf(s));
                }}
                className="p-1 text-stone-500 hover:text-stone-300 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
