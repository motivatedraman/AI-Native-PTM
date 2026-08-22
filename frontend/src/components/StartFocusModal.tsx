import React, { useEffect, useState } from 'react';
import { Timer, Zap } from 'lucide-react';
import { Task } from '../types';

const QUICK_DURATIONS = [15, 25, 30, 45, 60, 90, 120];

interface StartFocusModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onStart: (minutes: number) => void;
}

function suggestDuration(task: Task | null): number {
  if (!task?.estimated_minutes) return 25;
  const remaining = task.estimated_minutes - (task.spent_minutes || 0);
  return remaining > 0 ? Math.min(remaining, 120) : task.estimated_minutes;
}

export const StartFocusModal: React.FC<StartFocusModalProps> = ({ task, isOpen, onClose, onStart }) => {
  const [minutes, setMinutes] = useState<number>(25);

  useEffect(() => {
    if (isOpen) setMinutes(suggestDuration(task));
  }, [task, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const isValid = minutes >= 1 && minutes <= 600;
  const hasBreakReminder = minutes > 60;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border))] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[rgb(var(--sx-border))] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Timer size={18} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-stone-100">Start Focus Session</h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-300 text-xs font-medium transition-colors"
          >
            Esc
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs text-stone-400">Focusing on</p>
            <p className="text-sm font-semibold text-stone-100 mt-1 line-clamp-2">{task.title}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-2.5">
              Session length
            </label>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setMinutes(d)}
                  className={`py-2 rounded-lg text-xs font-mono font-medium border transition-colors ${
                    minutes === d
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-[rgb(var(--sx-header))] border-[rgb(var(--sx-border))] text-stone-300 hover:border-amber-600/50'
                  }`}
                >
                  {d >= 60 ? `${d / 60}h` : `${d}m`}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={600}
                value={QUICK_DURATIONS.includes(minutes) ? '' : minutes || ''}
                onChange={(e) => setMinutes(e.target.value ? Number(e.target.value) : 0)}
                placeholder="min"
                className={`py-2 rounded-lg text-xs font-mono font-medium bg-transparent border text-center focus:outline-none transition-colors ${
                  !QUICK_DURATIONS.includes(minutes) && minutes > 0
                    ? 'border-amber-500 text-white'
                    : 'border-dashed border-[rgb(var(--sx-border-3))] text-stone-300 placeholder-stone-600'
                }`}
              />
            </div>
          </div>

          {hasBreakReminder && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-teal-950/40 border border-teal-800/40 text-[11px] text-teal-200">
              <Zap size={13} className="mt-0.5 flex-shrink-0" />
              <span>Sessions over an hour include a reminder to take a 5-minute break at the halfway point.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[rgb(var(--sx-border))] bg-[rgb(var(--sx-header)/0.5)] flex items-center justify-between">
          <span className="text-[11px] font-mono text-stone-500">
            {isValid ? `${minutes} minute${minutes === 1 ? '' : 's'} of deep work` : 'Enter 1–600 minutes'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-stone-400 hover:text-stone-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => isValid && onStart(minutes)}
              disabled={!isValid}
              className="px-5 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Begin Focus
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
