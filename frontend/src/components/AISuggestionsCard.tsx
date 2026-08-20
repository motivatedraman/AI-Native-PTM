import React, { useState, useEffect } from 'react';
import { Sparkles, X, Loader2, RefreshCw, Zap } from 'lucide-react';
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

  const handleApply = (suggestion: AISuggestion) => {
    if (suggestion.task_id) {
      onSelectTask(suggestion.task_id);
    }
    handleDismiss(suggestions.indexOf(suggestion));
  };

  const visibleSuggestions = suggestions.filter((_, i) => !dismissed.has(i));

  if (loading && visibleSuggestions.length === 0) {
    return (
      <div
        className="p-4 rounded-2xl space-y-2"
        style={{ background: '#141416', border: '1px solid #2e2e33' }}
      >
        <div className="flex items-center space-x-2 text-sm font-semibold text-zinc-300">
          <Zap size={15} style={{ color: '#8b5cf6' }} />
          <span>Smart Suggestions</span>
        </div>
        <div className="flex items-center justify-center py-4">
          <Loader2 size={18} className="animate-spin text-violet-400" />
        </div>
      </div>
    );
  }

  if (visibleSuggestions.length === 0) return null;

  return (
    <div
      className="p-4 rounded-2xl space-y-3"
      style={{
        background: '#141416',
        border: '1px solid rgba(139, 92, 246, 0.2)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm font-semibold text-violet-300">
          <Zap size={15} style={{ color: '#8b5cf6' }} />
          <span>Smart Suggestions</span>
        </div>
        <button
          onClick={fetchSuggestions}
          className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors rounded-lg"
          title="Refresh suggestions"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="space-y-2">
        {visibleSuggestions.slice(0, 4).map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-xl group transition-all"
            style={{ background: '#1c1c1f', border: '1px solid #2e2e33' }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{s.title}</p>
              {s.description && (
                <p className="text-[11px] mt-0.5 truncate" style={{ color: '#a1a1aa' }}>{s.description}</p>
              )}
            </div>
            <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
              <button
                onClick={() => handleApply(s)}
                className="px-2.5 py-1 text-[10px] font-medium rounded-lg text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                }}
              >
                View
              </button>
              <button
                onClick={() => handleDismiss(i)}
                className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
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
