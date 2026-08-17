import React, { useState } from 'react';
import { 
  Inbox, 
  Plus, 
  ArrowRight, 
  Circle, 
  Sparkles, 
  Clock, 
  Calendar,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Task, Project } from '../types';
import { api } from '../services/api';

interface InboxViewProps {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onTaskCreated: (task: Task) => void;
  onTaskDeleted: (id: number) => void;
}

export const InboxView: React.FC<InboxViewProps> = ({
  tasks,
  projects,
  onSelectTask,
  onToggleComplete,
  onTaskCreated,
  onTaskDeleted,
}) => {
  const [quickInput, setQuickInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inboxTasks = tasks.filter(t => t.status === 'inbox');

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await api.quickAddTask(quickInput.trim());
      onTaskCreated(created);
      setQuickInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveToPlanned = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = await api.updateTask(task.id, { status: 'planned' });
      onTaskCreated(updated); // triggers parent refresh
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="pb-4 border-b border-[#262a3c]/80">
        <div className="flex items-center space-x-2 text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wider">
          <Inbox size={15} />
          <span>Frictionless Inbox</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">
          Inbox & Raw Capture
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Quickly dump ideas, homework, and tasks without filling out forms. Triage or let AI enrich them when ready.
        </p>
      </div>

      {/* Inline Fast Add Bar */}
      <form onSubmit={handleQuickAdd} className="relative">
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder="Dump any task here (e.g. Study networks before Friday, Buy HDMI cable)..."
          className="w-full bg-[#12141c] border border-[#262a3c] rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-md"
        />
        <button
          type="submit"
          disabled={!quickInput.trim() || isSubmitting}
          className="absolute right-2 top-2 bottom-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
        >
          <span>Dump</span>
          <ArrowRight size={14} />
        </button>
      </form>

      {/* Inbox Task List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold uppercase tracking-wider text-slate-300">
            Unprocessed Items ({inboxTasks.length})
          </span>
          <span>Click item for details & AI enrichment</span>
        </div>

        {inboxTasks.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-[#12141c] border border-[#262a3c]/60 text-slate-500 space-y-2">
            <Inbox size={32} className="mx-auto text-slate-600" />
            <p className="text-sm text-slate-400 font-medium">Inbox Zero</p>
            <p className="text-xs text-slate-500">All captured thoughts and tasks have been organized!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inboxTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#12141c] hover:bg-[#181a24] border border-[#262a3c] transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3 truncate">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(task);
                    }}
                    className="text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    <Circle size={16} />
                  </button>
                  <div>
                    <div className="text-xs font-medium text-slate-200 group-hover:text-white">
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#1e2230] text-slate-400 font-mono">
                    {task.category}
                  </span>
                  {task.estimated_minutes && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      ~{task.estimated_minutes}m
                    </span>
                  )}
                  <button
                    onClick={(e) => handleMoveToPlanned(task, e)}
                    className="px-2.5 py-1 text-[11px] font-medium bg-[#1e2230] hover:bg-indigo-600 hover:text-white text-slate-300 rounded-md transition-colors border border-[#262a3c]"
                  >
                    Plan →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
