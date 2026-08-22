import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  CheckSquare,
  Timer,
  Search,
  X
} from 'lucide-react';
import { Task, TaskStatus, Project } from '../types';
import { api } from '../services/api';
import { formatDateNPT } from '../utils/time';

interface KanbanViewProps {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onTaskUpdated: (task: Task) => void;
  onOpenQuickAdd: () => void;
  onStartFocus?: (task: Task) => void;
}

const COLUMN_CAP = 12;
const DONE_WINDOW_DAYS = 7;

function completedTs(task: Task): number {
  if (!task.completed_at) return 0;
  const iso = task.completed_at.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(task.completed_at)
    ? task.completed_at
    : `${task.completed_at}Z`;
  return new Date(iso).getTime();
}

function isRecentDone(task: Task): boolean {
  if (!task.completed_at) return true;
  return Date.now() - completedTs(task) < DONE_WINDOW_DAYS * 86400000;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  tasks,
  projects,
  onSelectTask,
  onTaskUpdated,
  onOpenQuickAdd,
  onStartFocus,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState<number | ''>('');
  const [showAllDone, setShowAllDone] = useState(false);
  const [expandedCols, setExpandedCols] = useState<Set<TaskStatus>>(new Set());

  const columns: { id: TaskStatus; label: string; color: string }[] = [
    { id: 'inbox', label: 'Inbox', color: 'border-stone-600' },
    { id: 'planned', label: 'Planned', color: 'border-teal-500' },
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

  const matchesFilters = (task: Task): boolean => {
    if (projectFilter !== '' && task.project_id !== projectFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      task.title.toLowerCase().includes(q) ||
      task.category?.toLowerCase().includes(q) ||
      (task.project?.name || '').toLowerCase().includes(q)
    );
  };

  const toggleExpanded = (colId: TaskStatus) => {
    setExpandedCols(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[rgb(var(--sx-border)/0.8)] flex-shrink-0">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-stone-100 tracking-tight">
            Execution Kanban
          </h1>
          <p className="text-sm text-stone-400 mt-0.5">
            Drag cards between columns to shift task state and log timeline progress.
          </p>
        </div>
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          <span>New Card</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards…"
            className="w-full pl-8 pr-8 py-2 text-xs rounded-lg bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border))] text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-600"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-stone-500 hover:text-stone-300"
              title="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value === '' ? '' : Number(e.target.value))}
          className="py-2 px-2.5 text-xs rounded-lg bg-[rgb(var(--sx-modal))] border border-[rgb(var(--sx-border))] text-stone-300 focus:outline-none focus:border-amber-600"
        >
          <option value="">All projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Kanban Board Grid - scrollable on mobile */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[550px] overflow-x-auto pb-4">
        {columns.map(col => {
          const allInCol = tasks.filter(t => t.status === col.id && matchesFilters(t));
          const olderDoneHidden = col.id === 'done' && !showAllDone
            ? allInCol.filter(t => !isRecentDone(t)).length
            : 0;
          const colTasks = col.id === 'done' && !showAllDone
            ? allInCol.filter(isRecentDone).sort((a, b) => completedTs(b) - completedTs(a))
            : allInCol;
          const expanded = expandedCols.has(col.id);
          const shownTasks = expanded ? colTasks : colTasks.slice(0, COLUMN_CAP);
          const cappedHidden = colTasks.length - shownTasks.length;
          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex flex-col bg-[rgb(var(--sx-modal))] rounded-xl border border-[rgb(var(--sx-border))] overflow-hidden min-w-[280px] md:min-w-0"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--sx-border))] bg-[rgb(var(--sx-header)/0.6)]">
                <div className="flex items-center space-x-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full border-2 ${col.color}`} />
                  <span className="text-sm font-bold text-stone-200 uppercase tracking-wider">
                    {col.label}
                  </span>
                </div>
                <span className="px-2.5 py-1 text-xs font-mono rounded bg-[rgb(var(--sx-raised))] text-stone-400">
                  {colTasks.length}{olderDoneHidden > 0 ? ` +${olderDoneHidden}` : ''}
                </span>
              </div>

              {/* Tasks List / Drop Zone */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[200px]">
                {shownTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onClick={() => onSelectTask(task)}
                    className="p-4 bg-[rgb(var(--sx-header))] hover:bg-[rgb(var(--sx-chip))] border border-[rgb(var(--sx-border))] rounded-lg shadow-sm cursor-grab active:cursor-grabbing transition-all group space-y-2.5"
                  >
                    {/* Card Title */}
                    <div className="text-sm font-medium text-stone-200 group-hover:text-stone-100 line-clamp-2">
                      {task.title}
                    </div>

                    {/* Category & Project */}
                    <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                      <span className="text-xs px-2 py-0.5 rounded bg-[rgb(var(--sx-raised))] text-stone-400 font-mono">
                        {task.category}
                      </span>
                      {task.project && (
                        <span className="text-xs px-2 py-0.5 rounded bg-teal-950/50 text-teal-300 border border-teal-800/40">
                          {task.project.name}
                        </span>
                      )}
                    </div>

                    {/* Subtasks Progress if any */}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs text-stone-400">
                          <span className="flex items-center space-x-1">
                            <CheckSquare size={12} />
                            <span>Subtasks</span>
                          </span>
                          <span>{task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length}</span>
                        </div>
                        <div className="w-full bg-[rgb(var(--sx-raised))] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-amber-500 h-full rounded-full"
                            style={{
                              width: `${(task.subtasks.filter(s => s.is_completed).length / task.subtasks.length) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Time Progress if logged */}
                    {task.spent_minutes && task.spent_minutes > 0 && task.estimated_minutes && task.status !== 'done' && (
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
                          <span className="flex items-center space-x-1">
                            <Clock size={11} className="text-amber-400" />
                            <span>Logged</span>
                          </span>
                          <span className="text-amber-300 font-semibold">{task.spent_minutes}/{task.estimated_minutes}m ({Math.round((task.spent_minutes / task.estimated_minutes) * 100)}%)</span>
                        </div>
                        <div className="w-full bg-[rgb(var(--sx-raised))] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (task.spent_minutes / task.estimated_minutes) * 100)}%`,
                              background: 'linear-gradient(90deg, rgb(var(--am-600)), var(--brand-deep))'
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Bottom Metadata */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-[rgb(var(--sx-border)/0.4)] text-xs text-stone-400">
                      {task.due_date ? (
                        <span className="flex items-center space-x-1 text-stone-400">
                          <Calendar size={12} />
                          <span>{formatDateNPT(task.due_date, { month: 'short', day: 'numeric' })}</span>
                        </span>
                      ) : <span />}

                      <div className="flex items-center gap-2">
                        {onStartFocus && task.status !== 'done' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartFocus(task);
                            }}
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-600/20 border border-teal-500/30 text-teal-300 hover:bg-teal-600/40 transition-all"
                            title="Start focus timer"
                          >
                            <Timer size={11} />
                            <span className="text-[10px] font-medium">Focus</span>
                          </button>
                        )}
                        {task.estimated_minutes && (!task.spent_minutes || task.spent_minutes === 0 || task.status === 'done') && (
                          <span className="flex items-center space-x-1 font-mono">
                            <Clock size={12} />
                            <span>~{task.estimated_minutes}m</span>
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              {/* Expanders for long columns / old done tasks */}
              {(cappedHidden > 0 || olderDoneHidden > 0 || (expanded && colTasks.length > COLUMN_CAP)) && (
                <div className="px-3 pb-3 space-y-1.5 flex-shrink-0">
                  {cappedHidden > 0 && (
                    <button
                      onClick={() => toggleExpanded(col.id)}
                      className="w-full py-1.5 text-[11px] font-medium text-stone-400 hover:text-stone-100 bg-[rgb(var(--sx-header))] hover:bg-[rgb(var(--sx-chip))] border border-[rgb(var(--sx-border))] rounded-lg transition-colors"
                    >
                      Show {cappedHidden} more…
                    </button>
                  )}
                  {expanded && colTasks.length > COLUMN_CAP && (
                    <button
                      onClick={() => toggleExpanded(col.id)}
                      className="w-full py-1 text-[11px] font-medium text-stone-500 hover:text-stone-300 transition-colors"
                    >
                      Show less
                    </button>
                  )}
                  {olderDoneHidden > 0 && (
                    <button
                      onClick={() => setShowAllDone(true)}
                      className="w-full py-1.5 text-[11px] font-medium text-emerald-400/80 hover:text-emerald-300 bg-emerald-950/20 hover:bg-emerald-950/40 border border-dashed border-emerald-500/30 rounded-lg transition-colors"
                      title={`Completed more than ${DONE_WINDOW_DAYS} days ago`}
                    >
                      Show {olderDoneHidden} older done task{olderDoneHidden === 1 ? '' : 's'}
                    </button>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};
