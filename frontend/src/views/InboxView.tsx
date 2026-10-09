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

  return (
    <div className="max-w-3xl space-y-5">
      
      {/* Header */}
      <div className="flex items-end justify-between pb-4 border-b border-[rgb(var(--sx-border-2))]">
        <h1 className="text-xl font-semibold text-stone-100">Inbox</h1>
        <span className="text-sm" style={{ color: 'rgb(var(--st-500))' }}>{inboxTasks.length} untriaged</span>
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

                {/* At most two items, and only when they say something */}
                <div className="flex items-center gap-2 flex-shrink-0 text-xs" style={{ color: 'rgb(var(--st-600))' }}>
                  {task.estimated_minutes && (
                    <span className="font-mono hidden sm:inline">~{task.estimated_minutes}m</span>
                  )}
                  <span className="font-mono">{task.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
