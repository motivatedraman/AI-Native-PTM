import React from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Sparkles, 
  Calendar, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Plus
} from 'lucide-react';
import { Task, Project } from '../types';
import { currentHourNPT, formatDateNPT } from '../utils/time';

interface TodayViewProps {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onOpenQuickAdd: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  projects,
  onSelectTask,
  onToggleComplete,
  onOpenQuickAdd,
}) => {
  const getGreeting = () => {
    const hour = currentHourNPT();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const todayTasks = tasks.filter(t => t.status !== 'done' || t.completed_at);
  const doneTasks = tasks.filter(t => t.status === 'done');
  const importantTasks = tasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'done');
  
  const totalMinutes = tasks
    .filter(t => t.status !== 'done')
    .reduce((acc, t) => acc + (t.estimated_minutes || 30), 0);

  const hoursPlanned = Math.floor(totalMinutes / 60);
  const minsPlanned = totalMinutes % 60;

  const completionRate = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header Greeting & Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-4 border-b border-[#262a3c]/80 gap-4">
        <div>
          <span className="text-xs font-mono font-semibold text-indigo-400 uppercase tracking-wider">
            Today Dashboard
          </span>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-0.5">
            {getGreeting()}
          </h1>
          <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
            <span className="text-indigo-300 font-medium">{importantTasks.length} important</span>
            <span>·</span>
            <span>{tasks.filter(t => t.status !== 'done').length} remaining</span>
            <span>·</span>
            <span className="flex items-center space-x-1">
              <Clock size={12} />
              <span>~{hoursPlanned}h {minsPlanned}m planned</span>
            </span>
          </div>
        </div>

        {/* Quick Add CTA */}
        <button
          onClick={onOpenQuickAdd}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all shadow-sm"
        >
          <Plus size={15} />
          <span>Quick Capture</span>
          <kbd className="kbd-badge text-[9px] bg-indigo-700/60 text-indigo-200 border-indigo-500/40">N</kbd>
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-[#12141c] border border-[#262a3c] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Today's Workload</span>
            <Clock size={14} className="text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {tasks.filter(t => t.status !== 'done').length} <span className="text-xs font-normal text-slate-400">tasks</span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono">~{hoursPlanned}h {minsPlanned}m estimated</p>
        </div>

        <div className="p-4 rounded-xl bg-[#12141c] border border-[#262a3c] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Execution Progress</span>
            <TrendingUp size={14} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {doneTasks.length} / {tasks.length} <span className="text-xs font-normal text-slate-400">done</span>
          </div>
          <div className="w-full bg-[#1e2230] rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
              style={{ width: `${completionRate}%` }} 
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#12141c] border border-[#262a3c] space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>High Priority Focus</span>
            <AlertCircle size={14} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">
            {importantTasks.length} <span className="text-xs font-normal text-slate-400">items</span>
          </div>
          <p className="text-[11px] text-slate-400">Requires attention today</p>
        </div>
      </div>

      {/* Important Tasks Widget */}
      {importantTasks.length > 0 && (
        <div className="p-4 rounded-xl bg-[#12141c] border border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-amber-300">
              <AlertCircle size={14} />
              <span className="uppercase tracking-wider">High Priority & Deadlines</span>
            </div>
            <span className="text-[11px] text-slate-400">{importantTasks.length} tasks</span>
          </div>

          <div className="space-y-2">
            {importantTasks.map(task => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="flex items-center justify-between p-3 rounded-lg bg-[#181a24] hover:bg-[#212433] border border-[#262a3c] transition-colors cursor-pointer group"
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
                  <span className="text-xs font-medium text-slate-200 truncate group-hover:text-white">
                    {task.title}
                  </span>
                  {task.project && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800/40">
                      {task.project.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400 flex-shrink-0">
                  {task.due_date && (
                    <span className="flex items-center space-x-1 text-[11px] text-amber-300/90">
                      <Calendar size={11} />
                      <span>{formatDateNPT(task.due_date, { month: 'short', day: 'numeric' })}</span>
                    </span>
                  )}
                  {task.estimated_minutes && (
                    <span className="text-[11px] text-slate-400">~{task.estimated_minutes}m</span>
                  )}
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-red-950/60 text-red-300 border border-red-800/50">
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Today Tasks List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">
            All Today Tasks
          </h2>
          <span className="text-xs text-slate-400">{tasks.length} total</span>
        </div>

        <div className="space-y-1.5">
          {tasks.map(task => {
            const isDone = task.status === 'done';
            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`flex items-center justify-between p-3 rounded-lg bg-[#12141c] hover:bg-[#181a24] border border-[#262a3c] transition-all cursor-pointer group ${
                  isDone ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(task);
                    }}
                    className="text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    {isDone ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <Circle size={16} />
                    )}
                  </button>
                  <span className={`text-xs font-medium truncate ${
                    isDone ? 'line-through text-slate-500' : 'text-slate-200 group-hover:text-white'
                  }`}>
                    {task.title}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e2230] text-slate-400 font-mono">
                    {task.category}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400 flex-shrink-0">
                  {task.subtasks?.length > 0 && (
                    <span className="text-[10px] text-slate-400">
                      {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length} subtasks
                    </span>
                  )}
                  {task.estimated_minutes && (
                    <span className="text-[11px] text-slate-400">~{task.estimated_minutes}m</span>
                  )}
                  <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded border ${
                    task.priority === 'urgent' ? 'bg-red-950/40 text-red-300 border-red-800/40' :
                    task.priority === 'high' ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' :
                    'bg-[#1e2230] text-slate-400 border-slate-700'
                  }`}>
                    {task.status.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
