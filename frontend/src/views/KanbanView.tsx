import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckSquare, 
  Tag as TagIcon,
  Sparkles,
  Circle,
  CheckCircle2
} from 'lucide-react';
import { Task, TaskStatus, Project } from '../types';
import { api } from '../services/api';

interface KanbanViewProps {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onTaskUpdated: (task: Task) => void;
  onOpenQuickAdd: () => void;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  projects,
  onSelectTask,
  onTaskUpdated,
  onOpenQuickAdd,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'inbox', label: 'Inbox', color: 'border-slate-600' },
    { id: 'planned', label: 'Planned', color: 'border-blue-500' },
    { id: 'doing', label: 'Doing', color: 'border-amber-500' },
    { id: 'done', label: 'Done', color: 'border-emerald-500' },
  ];

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', String(taskId));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskIdStr = e.dataTransfer.getData('text/plain') || String(draggedTaskId);
    const taskId = Number(taskIdStr);
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    // Optimistic UI update
    const updatedLocal = { ...task, status: targetStatus };
    onTaskUpdated(updatedLocal);

    try {
      const updated = await api.updateTask(taskId, { status: targetStatus });
      onTaskUpdated(updated);
    } catch (err) {
      console.error("Failed to move task:", err);
      // rollback
      onTaskUpdated(task);
    } finally {
      setDraggedTaskId(null);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#262a3c]/80 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Execution Kanban
          </h1>
          <p className="text-xs text-slate-400">
            Drag cards between columns to seamlessly shift task state and log timeline progress.
          </p>
        </div>
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Plus size={14} />
          <span>New Card</span>
        </button>
      </div>

      {/* Kanban Board Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[550px] overflow-x-auto pb-4">
        {columns.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex flex-col bg-[#12141c] rounded-xl border border-[#262a3c] overflow-hidden"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-3 border-b border-[#262a3c] bg-[#181a24]/60">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full border-2 ${col.color}`} />
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {col.label}
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-[#1e2230] text-slate-400">
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks List / Drop Zone */}
              <div className="flex-1 p-2 space-y-2.5 overflow-y-auto min-h-[200px]">
                {colTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onSelectTask(task)}
                    className="p-3 bg-[#181a24] hover:bg-[#212433] border border-[#262a3c] rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all group space-y-2"
                  >
                    {/* Card Title */}
                    <div className="text-xs font-medium text-slate-200 group-hover:text-white line-clamp-2">
                      {task.title}
                    </div>

                    {/* Category & Project */}
                    <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e2230] text-slate-400 font-mono">
                        {task.category}
                      </span>
                      {task.project && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/50 text-blue-300 border border-blue-800/40">
                          {task.project.name}
                        </span>
                      )}
                    </div>

                    {/* Subtasks Progress if any */}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center space-x-1">
                            <CheckSquare size={10} />
                            <span>Subtasks</span>
                          </span>
                          <span>{task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}</span>
                        </div>
                        <div className="w-full bg-[#1e2230] rounded-full h-1 overflow-hidden">
                          <div
                            className="bg-indigo-500 h-full rounded-full"
                            style={{
                              width: `${(task.subtasks.filter(s => s.is_completed).length / task.subtasks.length) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Bottom Metadata */}
                    <div className="flex items-center justify-between pt-1 border-t border-[#262a3c]/40 text-[10px] text-slate-400">
                      {task.due_date ? (
                        <span className="flex items-center space-x-1 text-slate-400">
                          <Calendar size={10} />
                          <span>{new Date(task.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </span>
                      ) : <span />}

                      {task.estimated_minutes && (
                        <span className="flex items-center space-x-1 font-mono">
                          <Clock size={10} />
                          <span>~{task.estimated_minutes}m</span>
                        </span>
                      )}
                    </div>

                  </div>
                ))}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
