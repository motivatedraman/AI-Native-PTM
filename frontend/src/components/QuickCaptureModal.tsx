import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Loader2, Calendar, Clock, Tag as TagIcon, X } from 'lucide-react';
import { api } from '../services/api';
import { Task, AIParseResult } from '../types';

interface QuickCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (task: Task) => void;
}

export const QuickCaptureModal: React.FC<QuickCaptureModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<AIParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const parseDebounceRef = useRef<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setText('');
      setPreview(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!text.trim()) {
      setPreview(null);
      setIsParsing(false);
      return;
    }

    if (parseDebounceRef.current) {
      clearTimeout(parseDebounceRef.current);
    }

    setIsParsing(true);
    parseDebounceRef.current = setTimeout(async () => {
      try {
        const result = await api.parseTaskWithAI(text);
        setPreview(result);
      } catch (err) {
        console.error("AI parse error:", err);
      } finally {
        setIsParsing(false);
      }
    }, 250);

    return () => {
      if (parseDebounceRef.current) clearTimeout(parseDebounceRef.current);
    };
  }, [text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const task = await api.quickAddTask(text.trim());
      onTaskCreated(task);
      onClose();
    } catch (err) {
      console.error("Error creating quick task:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#12141c] border border-[#262a3c] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#262a3c]">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
            <Sparkles size={14} className="text-indigo-400" />
            <span>AI Quick Task Capture</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#212433]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Finish DBMS assignment tomorrow for about 2 hours"
              className="w-full bg-[#181a24] border border-[#262a3c] rounded-lg px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              disabled={isSubmitting}
            />
            {isParsing && (
              <div className="absolute right-3 top-3.5 text-slate-400">
                <Loader2 size={16} className="animate-spin text-indigo-400" />
              </div>
            )}
          </div>

          {/* AI Structured Preview Card */}
          {preview && text.trim() && (
            <div className="mt-3 p-3 bg-[#181a24]/90 border border-[#262a3c] rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold text-slate-200">✦ Interpreted Structure:</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {Math.round(preview.confidence * 100)}% confidence
                </span>
              </div>
              <div className="text-sm font-medium text-slate-100">
                {preview.title}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {preview.category && (
                  <span className="px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-700/50">
                    {preview.category}
                  </span>
                )}
                {preview.priority && (
                  <span className={`px-2 py-0.5 rounded border ${
                    preview.priority === 'urgent' ? 'bg-red-900/40 text-red-300 border-red-700/50' :
                    preview.priority === 'high' ? 'bg-amber-900/40 text-amber-300 border-amber-700/50' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {preview.priority.toUpperCase()}
                  </span>
                )}
                {preview.due_date_str && (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-700/40">
                    <Calendar size={11} />
                    <span>{preview.due_date_str}</span>
                  </span>
                )}
                {preview.estimated_minutes && (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-700/40">
                    <Clock size={11} />
                    <span>~{preview.estimated_minutes}m</span>
                  </span>
                )}
                {preview.suggested_project && (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-900/30 text-emerald-300 border border-emerald-700/40">
                    <TagIcon size={11} />
                    <span>{preview.suggested_project}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#262a3c]/60 text-xs">
            <span className="text-slate-400 text-[11px]">
              Press <kbd className="kbd-badge">Enter</kbd> to capture · <kbd className="kbd-badge">Esc</kbd> to cancel
            </span>
            <button
              type="submit"
              disabled={!text.trim() || isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Create Task</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
