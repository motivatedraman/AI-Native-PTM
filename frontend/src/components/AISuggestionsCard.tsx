import React, { useState, useEffect } from 'react';
import { Sparkles, X, ExternalLink, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { AISuggestion } from '../types';
import { api } from '../services/api';

interface AISuggestionsCardProps {
  onSelectTask: (taskId: number) => void;
}

export const AISuggestionsCard: React.FC<AISuggestionsCardProps> = ({ onSelectTask }) => {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const data = await api.getAISuggestions();
      setSuggestions(data);
    } catch (err) {
      // Silently fail — AI suggestions are enhancement, not core
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

  const handleApply = (suggestion: AISuggestion) => {
    if (suggestion.task_id) {
      onSelectTask(suggestion.task_id);
    }
    handleDismiss(suggestions.indexOf(suggestion));
  };

  const visibleSuggestions = suggestions.filter((_, i) => !dismissed.has(i));

  if (loading && visibleSuggestions.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-[#12141c] border border-[#262a3c] space-y-2">
        <div className="flex items-center space-x-2 text-sm font-semibold text-slate-300">
          <Sparkles size={15} className="text-indigo-400" />
          <span>AI Suggestions</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 size={18} className="animate-spin text-indigo-400" />
        </div>
      </div>
    );
  }

  if (visibleSuggestions.length === 0) return null;

  return (
    <div className="p-4 rounded-xl bg-[#12141c] border border-indigo-500/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm font-semibold text-indigo-300">
          <Sparkles size={15} />
          <span>AI Suggestions</span>
        </div>
        <button
          onClick={fetchSuggestions}
          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          title="Refresh suggestions"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="space-y-2">
        {visibleSuggestions.slice(0, 4).map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 bg-[#181a24] rounded-lg border border-[#262a3c] group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{s.title}</p>
              {s.description && (
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">{s.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
              <button
                onClick={() => handleApply(s)}
                className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded text-[10px] font-medium transition-colors"
              >
                View
              </button>
              <button
                onClick={() => handleDismiss(i)}
                className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
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
