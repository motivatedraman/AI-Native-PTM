import React, { useState } from 'react';
import { X, Calendar, Clock, AlertTriangle, Loader2, CheckCircle2, Coffee } from 'lucide-react';
import { PlannerResult, PlannerItem } from '../types';
import { api } from '../services/api';
import { todayNPT } from '../utils/time';

interface PlanMyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPlan: (taskIds: number[]) => void;
  onStartTask: (taskId: number) => void;
}

export const PlanMyDayModal: React.FC<PlanMyDayModalProps> = ({
  isOpen,
  onClose,
  onApplyPlan,
  onStartTask,
}) => {
  const [plan, setPlan] = useState<PlannerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generatePlan = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.planMyDay();
      setPlan(result);
    } catch (err) {
      setError('Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen && !plan) {
      generatePlan();
    }
  }, [isOpen]);

  const handleApply = () => {
    if (!plan) return;
    const taskIds = plan.items.filter(i => i.task_id && i.type === 'task').map(i => i.task_id!);
    onApplyPlan(taskIds);
    onClose();
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#12141c] border border-[#262a3c] rounded-xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#262a3c]">
          <div className="flex items-center space-x-2">
            <Calendar size={18} className="text-indigo-400" />
            <span className="text-base font-semibold text-slate-100">Plan My Day</span>
            <span className="text-xs text-slate-400 font-mono">{todayNPT()}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#212433]">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 size={32} className="animate-spin text-indigo-400" />
              <p className="text-sm text-slate-400">Analyzing your tasks and building a plan...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3" />
              <p className="text-sm text-slate-400">{error}</p>
              <button
                onClick={generatePlan}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg"
              >
                Try Again
              </button>
            </div>
          ) : plan ? (
            <div className="space-y-4">
              {/* Overflow Warning */}
              {plan.overflow && plan.overflow_message && (
                <div className="p-3 bg-amber-950/40 border border-amber-700/50 rounded-lg text-xs text-amber-200">
                  ⚠ {plan.overflow_message}
                </div>
              )}

              {/* Summary */}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{plan.summary}</span>
                <span className="font-mono">{formatDuration(plan.total_planned_minutes)} planned / {formatDuration(plan.available_minutes)} available</span>
              </div>

              {/* Timeline */}
              <div className="space-y-1 relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[#262a3c]">
                {plan.items.map((item, i) => (
                  <PlanItem key={i} item={item} onStartTask={onStartTask} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {plan && (
          <div className="px-5 py-4 border-t border-[#262a3c] bg-[#181a24] flex items-center justify-between">
            <button
              onClick={generatePlan}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              ↻ Regenerate
            </button>
            <div className="space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 bg-[#212433] rounded-lg"
              >
                Dismiss
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
              >
                Apply Plan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PlanItem: React.FC<{ item: PlannerItem; onStartTask: (id: number) => void }> = ({ item, onStartTask }) => {
  if (item.type === 'break') {
    return (
      <div className="flex items-center space-x-3 py-2">
        <div className="absolute left-[-14px] w-6 h-6 rounded-full bg-[#262a3c] border-2 border-[#3a3f54] flex items-center justify-center">
          <Coffee size={10} className="text-slate-400" />
        </div>
        <span className="text-xs text-slate-500 font-mono w-12">{item.time}</span>
        <span className="text-xs text-slate-400 italic">Break · {item.duration_minutes}m</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 py-2 group">
      <div className="absolute left-[-14px] w-6 h-6 rounded-full bg-indigo-600/30 border-2 border-indigo-500/50 flex items-center justify-center">
        <CheckCircle2 size={10} className="text-indigo-400" />
      </div>
      <span className="text-xs text-slate-300 font-mono w-12 flex-shrink-0">{item.time}</span>
      <div className="flex-1 flex items-center justify-between">
        <div>
          <span className="text-sm text-slate-200">{item.task_title}</span>
          {item.note && <span className="text-xs text-slate-400 ml-2">· {item.note}</span>}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono">~{item.duration_minutes}m</span>
          {item.task_id && (
            <button
              onClick={() => onStartTask(item.task_id!)}
              className="opacity-0 group-hover:opacity-100 px-2 py-0.5 bg-indigo-600/30 text-indigo-300 rounded text-[10px] transition-opacity"
            >
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
