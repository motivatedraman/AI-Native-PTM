import React, { useState, useEffect } from 'react';
import { X, Clock, AlertTriangle, Loader2, CheckCircle2, Coffee, Plus, Trash2, Sunrise, Sun, Moon, Layers } from 'lucide-react';
import { PlannerResult, PlannerItem, TimeChunk } from '../types';
import { api } from '../services/api';
import { todayNPT } from '../utils/time';

interface PlanMyDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPlan: (taskIds: number[]) => void;
  onStartTask: (taskId: number) => void;
}

const PRESETS = [
  { label: 'Full Day Free', icon: Sunrise, chunks: [{ start: '06:00', end: '22:00' }] },
  { label: '🚫 Busy in Morning (Free 13:00–22:00)', icon: Sun, chunks: [{ start: '13:00', end: '22:00' }] },
  { label: '🚫 Busy in Afternoon (Free Morn+Eve)', icon: Layers, chunks: [{ start: '06:00', end: '12:00' }, { start: '18:00', end: '22:00' }] },
  { label: 'Morning Only', icon: Sunrise, chunks: [{ start: '06:00', end: '12:00' }] },
  { label: 'Evening Only', icon: Moon, chunks: [{ start: '18:00', end: '22:00' }] },
];

export const PlanMyDayModal: React.FC<PlanMyDayModalProps> = ({
  isOpen,
  onClose,
  onApplyPlan,
  onStartTask,
}) => {
  const [chunks, setChunks] = useState<TimeChunk[]>([
    { start: '06:00', end: '22:00' }
  ]);
  const [showChunkEditor, setShowChunkEditor] = useState(false);
  const [plan, setPlan] = useState<PlannerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate total duration across chunks in minutes
  const totalChunkMinutes = chunks.reduce((acc, c) => {
    try {
      const [sh, sm] = c.start.split(':').map(Number);
      const [eh, em] = c.end.split(':').map(Number);
      const dur = (eh * 60 + em) - (sh * 60 + sm);
      return dur > 0 ? acc + dur : acc;
    } catch {
      return acc;
    }
  }, 0);

  const formatMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const generatePlan = async (customChunks?: TimeChunk[]) => {
    setLoading(true);
    setError('');
    const chunksToUse = customChunks || chunks;
    try {
      const result = await api.planMyDay(chunksToUse);
      setPlan(result);
    } catch {
      setError('Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const adjustChunksToCurrentTime = (rawChunks: TimeChunk[]): TimeChunk[] => {
    const now = new Date();
    const currMins = now.getHours() * 60 + now.getMinutes();
    const adjusted: TimeChunk[] = [];
    for (const c of rawChunks) {
      try {
        const [sh, sm] = c.start.split(':').map(Number);
        const [eh, em] = c.end.split(':').map(Number);
        const cEndMins = eh * 60 + em;
        if (cEndMins <= currMins) continue; // Already in the past
        const effectiveStartMins = Math.max(sh * 60 + sm, currMins);
        const effH = Math.floor(effectiveStartMins / 60);
        const effM = effectiveStartMins % 60;
        adjusted.push({
          start: `${String(effH).padStart(2, '0')}:${String(effM).padStart(2, '0')}`,
          end: c.end
        });
      } catch {
        adjusted.push(c);
      }
    }
    return adjusted.length > 0 ? adjusted : [{ start: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, end: '22:00' }];
  };

  useEffect(() => {
    if (isOpen) {
      api.getSettings().then(s => {
        let initialChunks: TimeChunk[] = [];
        if (s.daily_chunks && s.daily_chunks.length > 0) {
          initialChunks = s.daily_chunks;
        } else if (s.available_start_hour && s.available_end_hour) {
          initialChunks = [{
            start: `${String(s.available_start_hour).padStart(2, '0')}:00`,
            end: `${String(s.available_end_hour).padStart(2, '0')}:00`
          }];
        }
        const adjusted = adjustChunksToCurrentTime(initialChunks.length > 0 ? initialChunks : chunks);
        setChunks(adjusted);
        generatePlan(adjusted);
      }).catch(() => {
        const adjusted = adjustChunksToCurrentTime(chunks);
        setChunks(adjusted);
        generatePlan(adjusted);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleApply = () => {
    if (!plan) return;
    const taskIds = plan.items.filter(i => i.task_id && i.type === 'task').map(i => i.task_id!);
    onApplyPlan(taskIds);
    onClose();
  };

  const handleAddChunk = () => {
    setChunks([...chunks, { start: '14:00', end: '17:00' }]);
  };

  const handleRemoveChunk = (index: number) => {
    if (chunks.length <= 1) return;
    setChunks(chunks.filter((_, i) => i !== index));
  };

  const handleUpdateChunk = (index: number, field: 'start' | 'end', val: string) => {
    const updated = [...chunks];
    updated[index] = { ...updated[index], [field]: val };
    setChunks(updated);
  };

  const applyPreset = (presetChunks: TimeChunk[]) => {
    const adjusted = adjustChunksToCurrentTime(presetChunks);
    setChunks(adjusted);
    generatePlan(adjusted);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 view-enter">
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{ background: 'rgb(var(--sx-surface))', border: '1px solid rgb(var(--sx-border-2))' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgb(var(--sx-border-2))' }}
        >
          <div className="flex items-center space-x-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm"
              style={{ background: 'linear-gradient(135deg, rgb(var(--am-600)), var(--brand-deep))' }}
            >
              ✦
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-stone-100">Daily Execution Planner</span>
                <span className="text-[11px] text-stone-400 font-mono">{todayNPT()}</span>
              </div>
              <p className="text-[11px] text-stone-500">
                Fitted to your available time chunks ({formatMins(totalChunkMinutes)} free today)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-[rgb(var(--sx-hover))] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dynamic Availability Selector */}
        <div
          className="px-6 py-3.5 space-y-2.5 bg-[rgb(var(--sx-card)/0.7)]"
          style={{ borderBottom: '1px solid rgb(var(--sx-border-2))' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-300 flex items-center space-x-1.5">
              <Clock size={13} className="text-amber-400" />
              <span>Available Time Today:</span>
            </span>
            <button
              type="button"
              onClick={() => setShowChunkEditor(!showChunkEditor)}
              className="text-[11px] font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              {showChunkEditor ? 'Hide Slots' : 'Edit Custom Slots ▾'}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.chunks)}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                  style={{
                    background: 'rgb(var(--sx-hover))',
                    border: '1px solid rgb(var(--sx-border-3))',
                    color: 'rgb(var(--st-300))',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgb(var(--am-600))')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgb(var(--sx-border-3))')}
                >
                  <Icon size={12} className="text-amber-400" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Chunks Editor */}
          {showChunkEditor && (
            <div className="p-3 rounded-xl bg-[rgb(var(--sx-surface))] border border-[rgb(var(--sx-border-2))] space-y-2 view-enter">
              <div className="flex items-center justify-between text-[11px] text-stone-400 font-medium">
                <span>Configure your free intervals:</span>
                <button
                  type="button"
                  onClick={handleAddChunk}
                  className="flex items-center space-x-1 text-amber-400 hover:text-amber-300"
                >
                  <Plus size={12} />
                  <span>Add Interval</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {chunks.map((chunk, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="text-[11px] text-stone-500 font-mono w-4">{idx + 1}.</span>
                    <input
                      type="time"
                      value={chunk.start}
                      onChange={(e) => handleUpdateChunk(idx, 'start', e.target.value)}
                      className="bg-[rgb(var(--sx-card))] border border-[rgb(var(--sx-border-2))] text-stone-200 text-xs rounded px-2 py-1 outline-none font-mono"
                    />
                    <span className="text-stone-500 text-xs">to</span>
                    <input
                      type="time"
                      value={chunk.end}
                      onChange={(e) => handleUpdateChunk(idx, 'end', e.target.value)}
                      className="bg-[rgb(var(--sx-card))] border border-[rgb(var(--sx-border-2))] text-stone-200 text-xs rounded px-2 py-1 outline-none font-mono"
                    />
                    {chunks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChunk(idx)}
                        className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => generatePlan(chunks)}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Apply & Re-Plan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 size={32} className="animate-spin text-amber-400" />
              <p className="text-sm text-stone-400">Scheduling tasks into your active intervals...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3" />
              <p className="text-sm text-stone-400">{error}</p>
              <button
                onClick={() => generatePlan()}
                className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-xl transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : plan ? (
            <div className="space-y-4">
              {/* Overflow Warning */}
              {plan.overflow && plan.overflow_message && (
                <div className="p-3.5 rounded-xl text-xs text-amber-200 bg-amber-950/40 border border-amber-800/40">
                  ⚠ {plan.overflow_message}
                </div>
              )}

              {/* Summary */}
              <div className="flex items-center justify-between text-xs text-stone-400 pb-1">
                <span>{plan.summary}</span>
                <span className="font-mono text-stone-300 font-medium">
                  {formatMins(plan.total_planned_minutes)} planned / {formatMins(plan.available_minutes)} available
                </span>
              </div>

              {/* Timeline */}
              <div className="space-y-2 relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-[rgb(var(--sx-border-2))]">
                {plan.items.map((item, i) => (
                  <PlanItem key={i} item={item} onStartTask={onStartTask} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        {plan && (
          <div
            className="px-6 py-4 bg-[rgb(var(--sx-surface))] flex items-center justify-between"
            style={{ borderTop: '1px solid rgb(var(--sx-border-2))' }}
          >
            <button
              onClick={() => generatePlan()}
              disabled={loading}
              className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center space-x-1"
            >
              <span>↻ Re-plan</span>
            </button>
            <div className="space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs text-stone-300 hover:text-white bg-[rgb(var(--sx-hover))] rounded-xl transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-lg transition-all"
                style={{ background: 'linear-gradient(135deg, rgb(var(--am-600)), var(--brand-deep))' }}
              >
                Apply Schedule
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
      <div className="flex items-center space-x-3 py-1.5">
        <div className="absolute left-[-14px] w-6 h-6 rounded-full bg-[rgb(var(--sx-card))] border-2 border-[rgb(var(--sx-border-2))] flex items-center justify-center">
          <Coffee size={10} className="text-stone-400" />
        </div>
        <span className="text-xs text-stone-500 font-mono w-12">{item.time}</span>
        <span className="text-xs text-stone-400 italic">Break · {item.duration_minutes}m</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3 py-2 group">
      <div className="absolute left-[-14px] w-6 h-6 rounded-full bg-amber-600/30 border-2 border-amber-500/50 flex items-center justify-center">
        <CheckCircle2 size={10} className="text-amber-400" />
      </div>
      <span className="text-xs text-stone-300 font-mono w-12 flex-shrink-0">{item.time}</span>
      <div
        className="flex-1 flex items-center justify-between p-2.5 rounded-xl transition-colors"
        style={{ background: 'rgb(var(--sx-card))', border: '1px solid rgb(var(--sx-border-2))' }}
      >
        <div>
          <span className="text-sm font-medium text-stone-200">{item.task_title}</span>
          {item.note && (
            <p className="text-[11px] text-stone-400 mt-0.5">
              {item.note}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2.5">
          <span className="text-xs text-stone-400 font-mono">~{item.duration_minutes}m</span>
          {item.task_id && (
            <button
              onClick={() => onStartTask(item.task_id!)}
              className="opacity-0 group-hover:opacity-100 px-2.5 py-1 bg-amber-600/25 hover:bg-amber-600/40 text-amber-300 rounded-lg text-xs font-medium transition-all"
            >
              Start
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
