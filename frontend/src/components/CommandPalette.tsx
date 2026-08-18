import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Calendar, Inbox, Kanban, GraduationCap, FolderKanban, Clock, Plus, 
  CheckCircle2, ChevronRight, X, Sparkles, BarChart3, MessageSquare, Target
} from 'lucide-react';
import { ActiveView, Task } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveView: (view: ActiveView) => void;
  onOpenQuickAdd: () => void;
  onOpenPlanDay: () => void;
  onOpenAIAssistant: () => void;
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  setActiveView,
  onOpenQuickAdd,
  onOpenPlanDay,
  onOpenAIAssistant,
  tasks,
  onSelectTask,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTasks = query.trim()
    ? tasks.filter(t => 
        t.title.toLowerCase().includes(query.toLowerCase()) || 
        t.category.toLowerCase().includes(query.toLowerCase()) ||
        t.project?.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const actions = [
    { label: 'Capture New Task', icon: Plus, shortcut: 'N', action: () => { onClose(); onOpenQuickAdd(); } },
    { label: 'Plan My Day', icon: Calendar, shortcut: 'P', action: () => { onClose(); onOpenPlanDay(); } },
    { label: 'What Should I Do Now?', icon: Target, shortcut: null, action: () => { setActiveView('today'); onClose(); } },
    { label: 'AI Assistant', icon: MessageSquare, shortcut: 'A', action: () => { onClose(); onOpenAIAssistant(); } },
    { label: 'Weekly Review', icon: BarChart3, shortcut: null, action: () => { setActiveView('weeklyreview'); onClose(); } },
    { label: 'Go to Today Dashboard', icon: Calendar, shortcut: 'T', action: () => { setActiveView('today'); onClose(); } },
    { label: 'Go to Inbox', icon: Inbox, shortcut: null, action: () => { setActiveView('inbox'); onClose(); } },
    { label: 'Go to Kanban Board', icon: Kanban, shortcut: 'K', action: () => { setActiveView('kanban'); onClose(); } },
    { label: 'Go to University Hub', icon: GraduationCap, shortcut: null, action: () => { setActiveView('university'); onClose(); } },
    { label: 'Go to Projects', icon: FolderKanban, shortcut: null, action: () => { setActiveView('projects'); onClose(); } },
    { label: 'Go to Daily Log', icon: Clock, shortcut: 'D', action: () => { setActiveView('dailylog'); onClose(); } },
  ].filter(a => !query || a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#12141c] border border-[#262a3c] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-[#262a3c]">
          <Search size={18} className="text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search tasks..."
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 space-y-3">
          {/* Matched Tasks */}
          {filteredTasks.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Tasks
              </div>
              <div className="space-y-1">
                {filteredTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { onSelectTask(t); onClose(); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left hover:bg-[#212433] text-slate-200 group transition-colors"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <CheckCircle2 size={14} className={t.status === 'done' ? 'text-emerald-400' : 'text-slate-400'} />
                      <span className="truncate">{t.title}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{t.category}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation & Commands */}
          <div>
            <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Actions & Views
            </div>
            <div className="space-y-1">
              {actions.map((act, i) => {
                const Icon = act.icon;
                return (
                  <button
                    key={i}
                    onClick={act.action}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left hover:bg-[#212433] text-slate-200 group transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Icon size={15} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                      <span>{act.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {act.shortcut && (
                        <kbd className="kbd-badge text-[10px]">{act.shortcut}</kbd>
                      )}
                      <ChevronRight size={13} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-4 py-2 border-t border-[#262a3c]/60 text-[10px] text-slate-400 flex items-center justify-between">
          <span>N = New · P = Plan · A = AI · T = Today · K = Kanban · D = Log</span>
          <span><kbd className="kbd-badge">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};
