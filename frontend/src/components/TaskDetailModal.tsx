import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar, 
  Sparkles, 
  Plus, 
  FolderKanban, 
  Tag as TagIcon,
  CheckSquare,
  History,
  Loader2
} from 'lucide-react';
import { Task, Project, Tag, Subtask } from '../types';
import { api } from '../services/api';
import { formatTimeNPT, formatDateNPT } from '../utils/time';
import { DecomposeBanner } from './DecomposeBanner';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: (updated: Task) => void;
  onTaskDeleted: (id: number) => void;
  projects: Project[];
  tags: Tag[];
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  projects,
  tags,
}) => {
  if (!isOpen || !task) return null;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [category, setCategory] = useState(task.category);
  const [projectId, setProjectId] = useState<number | undefined>(task.project_id || undefined);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(task.estimated_minutes || undefined);
  const [spentMinutes, setSpentMinutes] = useState<number>(task.spent_minutes || 0);
  const [dueDate, setDueDate] = useState<string>(task.due_date ? task.due_date.slice(0, 16) : '');
  
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isSuggestingSubtasks, setIsSuggestingSubtasks] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setStatus(task.status);
    setPriority(task.priority);
    setCategory(task.category);
    setProjectId(task.project_id || undefined);
    setEstimatedMinutes(task.estimated_minutes || undefined);
    setSpentMinutes(task.spent_minutes || 0);
    setDueDate(task.due_date ? task.due_date.slice(0, 16) : '');
    setAiSuggestions(null);
  }, [task]);

  const handleLogTime = async (additionalMins: number) => {
    try {
      const updated = await api.logTaskTime(task.id, additionalMins);
      setSpentMinutes(updated.spent_minutes || 0);
      onTaskUpdated(updated);
    } catch (err) {
      console.error("Failed to log time:", err);
    }
  };

  const handleSave = async () => {
    try {
      const updated = await api.updateTask(task.id, {
        title,
        description,
        status,
        priority,
        category,
        project_id: projectId || null,
        estimated_minutes: estimatedMinutes || null,
        spent_minutes: spentMinutes,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });
      onTaskUpdated(updated);
    } catch (err) {
      console.error("Failed to update task:", err);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete task "${task.title}"?`)) {
      try {
        await api.deleteTask(task.id);
        onTaskDeleted(task.id);
        onClose();
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;

    try {
      const newSub = await api.addSubtask(task.id, newSubtaskTitle.trim());
      const updated = {
        ...task,
        subtasks: [...task.subtasks, newSub],
      };
      onTaskUpdated(updated);
      setNewSubtaskTitle('');
    } catch (err) {
      console.error("Failed to add subtask:", err);
    }
  };

  const handleToggleSubtask = async (subtask: Subtask) => {
    try {
      const updatedSub = await api.updateSubtask(task.id, subtask.id, {
        is_completed: !subtask.is_completed,
      });
      const updated = {
        ...task,
        subtasks: task.subtasks.map(s => s.id === subtask.id ? updatedSub : s),
      };
      onTaskUpdated(updated);
    } catch (err) {
      console.error("Failed to toggle subtask:", err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    try {
      await api.deleteSubtask(task.id, subtaskId);
      const updated = {
        ...task,
        subtasks: task.subtasks.filter(s => s.id !== subtaskId),
      };
      onTaskUpdated(updated);
    } catch (err) {
      console.error("Failed to delete subtask:", err);
    }
  };

  const handleEnrichWithAI = async () => {
    setIsEnriching(true);
    try {
      const enrichData = await api.enrichTaskWithAI(task.id);
      setAiSuggestions(enrichData);
    } catch (err) {
      console.error("AI enrichment failed:", err);
    } finally {
      setIsEnriching(false);
    }
  };

  const applyAISuggestions = async () => {
    if (!aiSuggestions) return;
    if (aiSuggestions.category) setCategory(aiSuggestions.category);
    if (aiSuggestions.priority) setPriority(aiSuggestions.priority);
    if (aiSuggestions.estimated_minutes) setEstimatedMinutes(aiSuggestions.estimated_minutes);
    
    // Add suggested subtasks
    if (aiSuggestions.subtasks && aiSuggestions.subtasks.length > 0) {
      for (const stTitle of aiSuggestions.subtasks) {
        try {
          await api.addSubtask(task.id, stTitle);
        } catch (e) {}
      }
    }

    try {
      const updated = await api.updateTask(task.id, {
        category: aiSuggestions.category || category,
        priority: aiSuggestions.priority || priority,
        estimated_minutes: aiSuggestions.estimated_minutes || estimatedMinutes,
      });
      onTaskUpdated(updated);
      setAiSuggestions(null);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#12141c] border border-[#262a3c] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262a3c]">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const nextStatus = status === 'done' ? 'planned' : 'done';
                setStatus(nextStatus);
                api.updateTask(task.id, { status: nextStatus }).then(onTaskUpdated);
              }}
              className="text-slate-400 hover:text-emerald-400 transition-colors"
            >
              {status === 'done' ? (
                <CheckCircle2 size={20} className="text-emerald-400" />
              ) : (
                <Circle size={20} />
              )}
            </button>
            <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[#181a24] border border-[#262a3c] text-slate-300">
              {category}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleEnrichWithAI}
              disabled={isEnriching}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
              title="Get AI Suggestions"
            >
              {isEnriching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              <span>AI Enrich</span>
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/40 transition-colors"
              title="Delete task"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#212433] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* AI Suggestion Banner if enriched */}
          {aiSuggestions && (
            <div className="p-3.5 bg-indigo-950/40 border border-indigo-700/50 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between text-indigo-200 font-semibold">
                <span className="flex items-center space-x-1.5">
                  <Sparkles size={14} className="text-indigo-400" />
                  <span>AI Suggestions</span>
                </span>
                <div className="space-x-2">
                  <button
                    onClick={applyAISuggestions}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                  >
                    Apply All
                  </button>
                  <button
                    onClick={() => setAiSuggestions(null)}
                    className="px-2 py-1 text-slate-400 hover:text-slate-200"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <div className="text-slate-300 text-[11px] space-y-1">
                <p>• Category: <strong>{aiSuggestions.category}</strong> · Priority: <strong>{aiSuggestions.priority}</strong> · Duration: <strong>~{aiSuggestions.estimated_minutes}m</strong></p>
                {aiSuggestions.subtasks?.length > 0 && (
                  <p>• Subtasks: {aiSuggestions.subtasks.join(', ')}</p>
                )}
              </div>
            </div>
          )}

          {/* Title Input */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSave}
              placeholder="Task title..."
              className="w-full text-lg font-semibold bg-transparent text-slate-100 focus:outline-none border-b border-transparent focus:border-indigo-500 pb-1"
            />
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Status */}
            <div className="p-2.5 rounded-lg bg-[#181a24] border border-[#262a3c]">
              <label className="text-slate-400 block mb-1 font-medium">Status</label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as any);
                  api.updateTask(task.id, { status: e.target.value as any }).then(onTaskUpdated);
                }}
                className="w-full bg-[#12141c] border border-[#262a3c] rounded p-1.5 text-slate-200 focus:outline-none"
              >
                <option value="inbox">Inbox</option>
                <option value="planned">Planned</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
            </div>

            {/* Priority */}
            <div className="p-2.5 rounded-lg bg-[#181a24] border border-[#262a3c]">
              <label className="text-slate-400 block mb-1 font-medium">Priority</label>
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as any);
                  api.updateTask(task.id, { priority: e.target.value as any }).then(onTaskUpdated);
                }}
                className="w-full bg-[#12141c] border border-[#262a3c] rounded p-1.5 text-slate-200 focus:outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Category */}
            <div className="p-2.5 rounded-lg bg-[#181a24] border border-[#262a3c]">
              <label className="text-slate-400 block mb-1 font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  api.updateTask(task.id, { category: e.target.value }).then(onTaskUpdated);
                }}
                className="w-full bg-[#12141c] border border-[#262a3c] rounded p-1.5 text-slate-200 focus:outline-none"
              >
                <option value="Personal">Personal</option>
                <option value="University">University</option>
                <option value="Work">Work</option>
                <option value="Project">Project</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Project */}
            <div className="p-2.5 rounded-lg bg-[#181a24] border border-[#262a3c]">
              <label className="text-slate-400 block mb-1 font-medium">Project</label>
              <select
                value={projectId || ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setProjectId(val);
                  api.updateTask(task.id, { project_id: val || null }).then(onTaskUpdated);
                }}
                className="w-full bg-[#12141c] border border-[#262a3c] rounded p-1.5 text-slate-200 focus:outline-none"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates and Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-[#181a24] border border-[#262a3c] flex items-center space-x-2">
              <Calendar size={15} className="text-slate-400" />
              <div className="flex-1">
                <label className="text-slate-400 block text-[10px] uppercase">Due Date</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setDueDate(e.target.value)}
                  onBlur={handleSave}
                  className="w-full bg-transparent text-slate-200 focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#181a24] border border-[#262a3c] flex items-center space-x-2">
              <Clock size={15} className="text-slate-400" />
              <div className="flex-1">
                <label className="text-slate-400 block text-[10px] uppercase">Estimated Duration (mins)</label>
                <input
                  type="number"
                  value={estimatedMinutes || ''}
                  onChange={(e) => setEstimatedMinutes(e.target.value ? Number(e.target.value) : undefined)}
                  onBlur={handleSave}
                  placeholder="e.g. 60"
                  className="w-full bg-transparent text-slate-200 focus:outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Time Tracking & Partial Progress */}
          <div className="p-3.5 rounded-xl space-y-3 bg-[#181a24] border border-[#262a3c]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock size={14} className="text-violet-400" />
                <span className="text-xs font-semibold text-zinc-200">Time Logged & Progress</span>
              </div>
              <span className="text-xs font-mono font-medium text-violet-300">
                {spentMinutes}m / {estimatedMinutes || 0}m {estimatedMinutes ? `(${Math.min(100, Math.round((spentMinutes / estimatedMinutes) * 100))}%)` : ''}
              </span>
            </div>

            {/* Visual Progress Bar */}
            {estimatedMinutes && estimatedMinutes > 0 ? (
              <div className="w-full bg-[#12141c] rounded-full h-2 overflow-hidden border border-[#262a3c]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(100, (spentMinutes / estimatedMinutes) * 100)}%`,
                    background: spentMinutes >= estimatedMinutes
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #8b5cf6, #ec4899)',
                  }}
                />
              </div>
            ) : null}

            {/* Quick Log Buttons */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">Log time spent:</span>
              <div className="flex items-center space-x-1.5">
                {[15, 30, 60, 120].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleLogTime(mins)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-300 bg-[#212433] hover:bg-violet-600 hover:text-white border border-[#3a3f54] transition-colors"
                  >
                    +{mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">Description & Notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleSave}
              rows={3}
              placeholder="Add details, notes, or execution steps..."
              className="w-full bg-[#181a24] border border-[#262a3c] rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* V2: AI Decompose Banner */}
          <DecomposeBanner
            taskId={task.id}
            taskTitle={task.title}
            existingSubtaskCount={task.subtasks.length}
            onSubtasksAdded={() => {
              // Refresh the task to get updated subtasks
              api.getTasks().then(() => {
                api.getTasks({ search: task.title }).then(tasks => {
                  const updated = tasks.find(t => t.id === task.id);
                  if (updated) onTaskUpdated(updated);
                });
              });
            }}
          />

          {/* Subtasks Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400 flex items-center space-x-1.5">
                <CheckSquare size={14} />
                <span>Subtasks ({task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length})</span>
              </label>
            </div>

            <div className="space-y-1.5">
              {task.subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#181a24] border border-[#262a3c]/70 text-xs group"
                >
                  <button
                    onClick={() => handleToggleSubtask(st)}
                    className="flex items-center space-x-2.5 flex-1 text-left"
                  >
                    {st.is_completed ? (
                      <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Circle size={15} className="text-slate-500 flex-shrink-0" />
                    )}
                    <span className={st.is_completed ? 'line-through text-slate-500' : 'text-slate-200'}>
                      {st.title}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}

              {/* Add subtask input */}
              <form onSubmit={handleAddSubtask} className="flex items-center space-x-2 mt-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Add a subtask and press Enter..."
                  className="flex-1 bg-[#181a24] border border-[#262a3c] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newSubtaskTitle.trim()}
                  className="p-2 bg-[#212433] hover:bg-[#2c3044] text-slate-200 rounded-lg text-xs disabled:opacity-50"
                >
                  <Plus size={14} />
                </button>
              </form>
            </div>
          </div>

          {/* Activity Logs History */}
          {task.activities && task.activities.length > 0 && (
            <div className="pt-4 border-t border-[#262a3c]">
              <label className="text-xs font-semibold text-slate-400 flex items-center space-x-1.5 mb-2">
                <History size={14} />
                <span>Audit History</span>
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-2 text-[11px]">
                {task.activities.map((act) => (
                  <div key={act.id} className="flex items-center justify-between text-slate-400 py-1 border-b border-[#262a3c]/40">
                    <span>{act.description}</span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {formatTimeNPT(act.created_at, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#262a3c] bg-[#181a24]/50 flex items-center justify-between text-xs text-slate-400">
          <span>Created: {formatDateNPT(task.created_at)}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
