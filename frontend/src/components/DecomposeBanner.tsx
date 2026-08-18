import React, { useState } from 'react';
import { Sparkles, Plus, CheckCircle2, X, Loader2, Eye } from 'lucide-react';
import { DecomposeResult, DecomposeSubtask } from '../types';
import { api } from '../services/api';

interface DecomposeBannerProps {
  taskId: number;
  taskTitle: string;
  existingSubtaskCount: number;
  onSubtasksAdded: () => void;
}

export const DecomposeBanner: React.FC<DecomposeBannerProps> = ({
  taskId,
  taskTitle,
  existingSubtaskCount,
  onSubtasksAdded,
}) => {
  const [result, setResult] = useState<DecomposeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [showReview, setShowReview] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleDecompose = async () => {
    setLoading(true);
    try {
      const data = await api.decomposeTask(taskId);
      setResult(data);
      setSelected(new Set(data.subtasks.map((_, i) => i)));
    } catch (err) {
      console.error('Decomposition failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const handleAddAll = async () => {
    if (!result) return;
    setApplying(true);
    try {
      const toAdd = result.subtasks.filter((_, i) => selected.has(i));
      for (const st of toAdd) {
        await api.addSubtask(taskId, st.title);
      }
      onSubtasksAdded();
      setResult(null);
    } catch (err) {
      console.error('Failed to add subtasks:', err);
    } finally {
      setApplying(false);
    }
  };

  const handleDismiss = () => {
    setResult(null);
    setShowReview(false);
  };

  // Don't show if task already has subtasks (V1 already handles that)
  // But still show the "Break Down" button if user wants to add more

  return (
    <div className="space-y-2">
      {!result && (
        <button
          onClick={handleDecompose}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-medium border border-indigo-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Sparkles size={13} />
          )}
          <span>✦ Break Down</span>
        </button>
      )}

      {result && (
        <div className="p-3 bg-indigo-950/30 border border-indigo-700/40 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-200">
              <Sparkles size={14} className="text-indigo-400" />
              <span>✦ AI suggests {result.subtasks.length} subtasks</span>
            </div>
            <button onClick={handleDismiss} className="p-1 text-slate-400 hover:text-slate-200">
              <X size={14} />
            </button>
          </div>

          {result.reasoning && (
            <p className="text-[11px] text-slate-400 italic">{result.reasoning}</p>
          )}

          {!showReview ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleAddAll}
                disabled={applying}
                className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
              >
                {applying ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                <span>Add All ({result.subtasks.length})</span>
              </button>
              <button
                onClick={() => setShowReview(true)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-[#212433] hover:bg-[#2c3044] text-slate-200 rounded-lg text-xs border border-[#262a3c]"
              >
                <Eye size={12} />
                <span>Review</span>
              </button>
              <button onClick={handleDismiss} className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200">
                Dismiss
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {result.subtasks.map((st, i) => (
                <label
                  key={i}
                  className="flex items-center space-x-2 p-2 bg-[#181a24] rounded-lg border border-[#262a3c] cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(i)}
                    onChange={() => toggleSelect(i)}
                    className="rounded border-slate-500 bg-[#12141c] text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-slate-200 flex-1">{st.title}</span>
                  {st.estimated_minutes && (
                    <span className="text-[10px] text-slate-400 font-mono">~{st.estimated_minutes}m</span>
                  )}
                </label>
              ))}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={handleAddAll}
                  disabled={applying || selected.size === 0}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {applying ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  <span>Add Selected ({selected.size})</span>
                </button>
                <button onClick={handleDismiss} className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
