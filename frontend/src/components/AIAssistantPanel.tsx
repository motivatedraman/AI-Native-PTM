import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Play } from 'lucide-react';
import { ChatMessage, ChatAction } from '../types';
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
      setTimeout(() => inputRef.current?.focus(), 100);
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

  const handleAction = (action: ChatAction) => {
    if (action.type === 'start_task' && action.task_id) {
      onStartTask(action.task_id);
    }
  };

  const quickPrompts = [
    "What should I do today?",
    "What's overdue?",
    "What did I complete this week?",
    "What university work is due?",
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:w-96 h-[85vh] sm:h-[600px] bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border))] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:slide-in-from-right duration-200">
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
