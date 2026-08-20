import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Loader2, Calendar, Clock, Tag as TagIcon, X, Zap, Cpu } from 'lucide-react';
import { api } from '../services/api';
import { Task, AIParseResult } from '../types';
import { parseTaskLocally } from '../utils/taskHeuristics';

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
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [useAiDeepParse, setUseAiDeepParse] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setText('');
      setPreview(null);
      setUseAiDeepParse(false);
    }
  }, [isOpen]);

  // Real-time zero-API heuristic preview on typing
  useEffect(() => {
    if (!text.trim()) {
      setPreview(null);
      return;
    }

    if (!useAiDeepParse) {
      // Instant client-side heuristic (0 API calls!)
      const localResult = parseTaskLocally(text);
      setPreview(localResult);
    }
  }, [text, useAiDeepParse]);

  // Optional manual AI deep parse on user request
  const handleTriggerAiDeepParse = async () => {
    if (!text.trim() || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const result = await api.parseTaskWithAI(text, true);
      setPreview(result);
      setUseAiDeepParse(true);
    } catch (err) {
      console.error("AI deep parse error:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-md p-4">
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: '#141416',
          border: '1px solid #2e2e33',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6), 0 0 40px rgba(139, 92, 246, 0.1)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid #2e2e33' }}
        >
          <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-200">
            <div
              className="w-5 h-5 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}
            >
              ✦
            </div>
            <span>Quick Task Capture</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-[#252528] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (useAiDeepParse) setUseAiDeepParse(false);
              }}
              placeholder="e.g. Finish DBMS homework tomorrow at 5pm ~2h !urgent #Homework"
              className="w-full rounded-xl px-4 py-3.5 text-sm text-white placeholder-zinc-500 outline-none transition-all"
              style={{
                background: '#1c1c1f',
                border: '1px solid #2e2e33',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#8b5cf6';
                e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.15)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#2e2e33';
                e.target.style.boxShadow = '';
              }}
              disabled={isSubmitting}
            />
          </div>

          {/* Structured Preview Card */}
          {preview && text.trim() && (
            <div
              className="p-4 rounded-xl text-xs space-y-2.5 transition-all"
              style={{
                background: '#1c1c1f',
                border: '1px solid #2e2e33',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-zinc-400 font-medium">
                  <Zap size={13} style={{ color: '#8b5cf6' }} />
                  <span>Interpreted Details:</span>
                </div>
                <div className="flex items-center space-x-2">
                  {!useAiDeepParse && (
                    <button
                      type="button"
                      onClick={handleTriggerAiDeepParse}
                      disabled={isAiLoading}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                      style={{
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: '#a78bfa',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                      }}
                    >
                      {isAiLoading ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <Sparkles size={11} />
                      )}
                      <span>Deep AI Parse</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-sm font-semibold text-white">
                {preview.title}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {preview.category && (
                  <span
                    className="px-2 py-0.5 rounded-lg text-xs"
                    style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)' }}
                  >
                    {preview.category}
                  </span>
                )}
                {preview.priority && (
                  <span
                    className="px-2 py-0.5 rounded-lg text-xs uppercase font-mono font-medium"
                    style={{
                      background: preview.priority === 'urgent' ? 'rgba(244, 63, 94, 0.15)' : preview.priority === 'high' ? 'rgba(245, 158, 11, 0.15)' : '#252528',
                      color: preview.priority === 'urgent' ? '#fb7185' : preview.priority === 'high' ? '#fbbf24' : '#a1a1aa',
                      border: `1px solid ${preview.priority === 'urgent' ? 'rgba(244, 63, 94, 0.3)' : preview.priority === 'high' ? 'rgba(245, 158, 11, 0.3)' : '#3a3a40'}`,
                    }}
                  >
                    {preview.priority}
                  </span>
                )}
                {preview.due_date_str && (
                  <span
                    className="flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs"
                    style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.25)' }}
                  >
                    <Calendar size={11} />
                    <span>{preview.due_date_str}</span>
                  </span>
                )}
                {preview.estimated_minutes && (
                  <span
                    className="flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs font-mono"
                    style={{ background: 'rgba(6, 182, 212, 0.12)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.25)' }}
                  >
                    <Clock size={11} />
                    <span>~{preview.estimated_minutes}m</span>
                  </span>
                )}
                {preview.suggested_project && (
                  <span
                    className="flex items-center space-x-1 px-2 py-0.5 rounded-lg text-xs"
                    style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)' }}
                  >
                    <TagIcon size={11} />
                    <span>{preview.suggested_project}</span>
                  </span>
                )}
                {preview.suggested_tags?.map(t => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-lg text-xs"
                    style={{ background: '#252528', color: '#a1a1aa', border: '1px solid #3a3a40' }}
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div
            className="flex items-center justify-between pt-3 text-xs"
            style={{ borderTop: '1px solid #2e2e33' }}
          >
            <span className="text-zinc-500 text-[11px]">
              Press <kbd className="kbd-badge">Enter</kbd> to save · <kbd className="kbd-badge">Esc</kbd> to dismiss
            </span>
            <button
              type="submit"
              disabled={!text.trim() || isSubmitting}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl font-semibold text-white transition-all shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                opacity: !text.trim() || isSubmitting ? 0.5 : 1,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Capturing...</span>
                </>
              ) : (
                <>
                  <span>Capture Task</span>
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
