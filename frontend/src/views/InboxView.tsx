import React, { useState } from 'react';
import { 
  Inbox, 
  ArrowRight, 
  Circle, 
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
  projects: _projects,
  onSelectTask,
  onToggleComplete,
  onTaskCreated,
  onTaskDeleted: _onTaskDeleted,
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
    <div className="max-w-full space-y-5 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="pb-4 border-b border-[rgb(var(--sx-border)/0.8)]">
        <div className="flex items-center space-x-2 text-sm font-mono font-semibold text-amber-400 uppercase tracking-wider">
          <Inbox size={17} />
          <span>Frictionless Inbox</span>
        </div>
        <h1 className="text-3xl lg:text-4xl font-bold text-stone-100 tracking-tight mt-1">
          Inbox & Raw Capture
        </h1>
        <p className="text-sm text-stone-400 mt-2">
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
          className="w-full bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border))] rounded-xl px-5 py-4 text-base text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-md"
        />
        <button
          type="submit"
          disabled={!quickInput.trim() || isSubmitting}
          className="absolute right-2 top-2 bottom-2 px-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium flex items-center space-x-1.5 transition-colors"
        >
          <span>Dump</span>
          <ArrowRight size={16} />
        </button>
      </form>

      {/* Inbox Task List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-stone-400">
          <span className="font-semibold uppercase tracking-wider text-stone-300">
            Unprocessed Items ({inboxTasks.length})
          </span>
          <span className="hidden sm:inline">Click item for details & AI enrichment</span>
        </div>

        {inboxTasks.length === 0 ? (
          <div className="p-14 text-center rounded-xl bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border)/0.6)] text-stone-500 space-y-2">
            <Inbox size={36} className="mx-auto text-stone-600" />
            <p className="text-base text-stone-400 font-medium">Inbox Zero</p>
            <p className="text-sm text-stone-500">All captured thoughts and tasks have been organized!</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {inboxTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="flex items-center justify-between p-4 rounded-xl bg-[rgb(var(--sx-modal))] hover:bg-[rgb(var(--sx-header))] border border-[rgb(var(--sx-border))] transition-all cursor-pointer group"
              >
                <div className="flex items-center space-x-3 truncate">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(task);
                    }}
                    className="text-stone-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                  >
                    <Circle size={20} />
                  </button>
                  <div>
                    <div className="text-sm font-medium text-stone-200 group-hover:text-stone-100">
                      {task.title}
                    </div>
                    {task.description && (
                      <p className="text-xs text-stone-400 truncate max-w-md mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded bg-[rgb(var(--sx-raised))] text-stone-400 font-mono">
                    {task.category}
                  </span>
                  {task.estimated_minutes && (
                    <span className="text-xs text-stone-400 font-mono hidden sm:inline">
                      ~{task.estimated_minutes}m
                    </span>
                  )}
                  <button
                    onClick={(e) => handleMoveToPlanned(task, e)}
                    className="px-3 py-1.5 text-xs font-medium bg-[rgb(var(--sx-raised))] hover:bg-amber-600 hover:text-white text-stone-300 rounded-md transition-colors border border-[rgb(var(--sx-border))]"
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
