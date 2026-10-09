import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Play, Target, RefreshCw } from 'lucide-react';
import { ChatMessage, ChatAction, WhatNowResult, AISuggestion } from '../types';
import { api } from '../services/api';

interface AIAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTask: (taskId: number) => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  isOpen,
  onClose,
  onStartTask,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // The Today page's two AI widgets now live here, behind A. Fetched on
  // demand rather than on mount, so opening Today never waits on the API.
  const [whatNow, setWhatNow] = useState<WhatNowResult | null>(null);
  const [whatNowBusy, setWhatNowBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [suggestionsBusy, setSuggestionsBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hi! I'm your task assistant. I can see your tasks, projects, and deadlines. Ask me anything about your workload.\n\nTry: \"What should I focus on today?\" or \"What's overdue?\"",
        actions: []
      }]);
    }
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await api.chatWithAI(userMsg.content);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.answer,
        actions: result.actions || [],
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I couldn't process that right now. Please try again.",
        actions: []
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWhatNow = async () => {
    setWhatNowBusy(true);
    try {
      setWhatNow(await api.whatShouldIDo());
    } catch {
      setWhatNow(null);
    } finally {
      setWhatNowBusy(false);
    }
  };

  const loadSuggestions = async () => {
    setSuggestionsBusy(true);
    try {
      setSuggestions(await api.getAISuggestions());
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsBusy(false);
    }
  };

  const handleAction = (action: ChatAction) => {
    if (action.type === 'start_task' && action.task_id) {
      onStartTask(action.task_id);
    }
  };

  const quickPrompts = [
    "What should I do today?",
    "What's overdue?",
    "What did I complete this week?",
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:w-96 h-[85vh] sm:h-[600px] bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border))] rounded-t-2xl sm:rounded-2xl shadow-modal flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--sx-border))] bg-[rgb(var(--sx-header))]">
          <div className="flex items-center space-x-2">
            <Sparkles size={16} className="text-amber-400" />
            <span className="text-sm font-semibold text-stone-200">AI Assistant</span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-[rgb(var(--sx-chip))]">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-amber-600 text-white'
                  : 'bg-[rgb(var(--sx-raised))] text-stone-200 border border-[rgb(var(--sx-border))]'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {msg.actions.map((action, j) => (
                      <button
                        key={j}
                        onClick={() => handleAction(action)}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 rounded-md text-xs border border-amber-500/30 transition-colors"
                      >
                        <Play size={10} />
                        <span>{action.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[rgb(var(--sx-raised))] border border-[rgb(var(--sx-border))] rounded-xl px-4 py-3 flex items-center space-x-2">
                <Loader2 size={14} className="animate-spin text-amber-400" />
                <span className="text-xs text-stone-400">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* What Should I Do Now — was a large card on Today */}
        <div className="px-4 pb-3">
          <button
            onClick={loadWhatNow}
            disabled={whatNowBusy}
            className="flex items-center gap-2 text-xs font-medium transition-colors disabled:opacity-50"
            style={{ color: 'rgb(var(--am-400))' }}
          >
            {whatNowBusy ? <Loader2 size={12} className="animate-spin" /> : <Target size={12} />}
            <span>{whatNow ? 'Refresh recommendation' : 'What should I do now?'}</span>
          </button>

          {whatNow && (
            <div className="mt-2 p-3 rounded-lg text-xs leading-relaxed" style={{ background: 'rgb(var(--sx-raised))' }}>
              <p style={{ color: 'rgb(var(--st-300))' }}>{whatNow.message}</p>
              {whatNow.recommendations.map((rec, i) => (
                <div key={i} className="mt-2 flex items-start gap-2">
                  <span className="font-mono flex-shrink-0" style={{ color: 'rgb(var(--st-600))' }}>{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium truncate" style={{ color: 'rgb(var(--st-200))' }}>
                        {rec.task_title}
                      </span>
                      <span className="font-mono flex-shrink-0" style={{ color: 'rgb(var(--st-600))' }}>
                        ~{rec.duration_minutes}m
                      </span>
                    </div>
                    <p className="mt-0.5" style={{ color: 'rgb(var(--st-500))' }}>{rec.reason}</p>
                  </div>
                  {rec.task_id && (
                    <button
                      onClick={() => onStartTask(rec.task_id!)}
                      className="flex-shrink-0 p-1 transition-opacity hover:opacity-100"
                      style={{ color: 'rgb(var(--am-400))' }}
                      title="Start this task"
                    >
                      <Play size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI suggestions — was a card on Today */}
        <div className="px-4 pb-3">
          <button
            onClick={loadSuggestions}
            disabled={suggestionsBusy}
            className="flex items-center gap-2 text-xs font-medium transition-colors disabled:opacity-50"
            style={{ color: 'rgb(var(--am-400))' }}
          >
            {suggestionsBusy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            <span>{suggestions.length ? 'Refresh suggestions' : 'Load suggestions'}</span>
          </button>

          {suggestions.length > 0 && (
            <ul className="mt-2 space-y-1">
              {suggestions.slice(0, 4).map((sg, i) => (
                <li key={i} className="leading-relaxed" style={{ color: 'rgb(var(--st-400))' }}>
                  <span style={{ color: 'rgb(var(--st-600))' }}>{sg.type}</span>{' '}
                  {sg.title}
                  {sg.description && (
                    <span style={{ color: 'rgb(var(--st-600))' }}> — {sg.description}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => { setInput(p); }}
                className="px-3 py-1.5 bg-[rgb(var(--sx-raised))] hover:bg-[rgb(var(--sx-border))] text-stone-400 hover:text-stone-200 rounded-lg text-xs border border-[rgb(var(--sx-border))] transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-[rgb(var(--sx-border))] bg-[rgb(var(--sx-header))]">
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your tasks..."
              className="flex-1 bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border))] rounded-lg px-3 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
