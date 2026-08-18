import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  AlertCircle,
  TrendingUp,
  Plus,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CalendarClock
} from 'lucide-react';
import { Task, Project } from '../types';
import { currentHourNPT, formatDateNPT, todayNPT, offsetDateNPT, dateStrNPT, formatDateLabel } from '../utils/time';
import { WhatNowWidget } from '../components/WhatNowWidget';
import { AISuggestionsCard } from '../components/AISuggestionsCard';

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
  const [selectedDate, setSelectedDate] = useState(todayNPT());
  const [showPlanDay, setShowPlanDay] = useState(false);

  const getGreeting = () => {
    const hour = currentHourNPT();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Filter tasks by selected date
  const dateFilteredTasks = tasks.filter(t => {
    const taskDate = dateStrNPT(t.due_date);
    return taskDate === selectedDate;
  });

  const todayTasks = dateFilteredTasks.filter(t => t.status !== 'done' || t.completed_at);
  const doneTasks = dateFilteredTasks.filter(t => t.status === 'done');
  const importantTasks = dateFilteredTasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'done');
  
  const totalMinutes = dateFilteredTasks
    .filter(t => t.status !== 'done')
    .reduce((acc, t) => acc + (t.estimated_minutes || 30), 0);

  const hoursPlanned = Math.floor(totalMinutes / 60);
  const minsPlanned = totalMinutes % 60;

  const completionRate = dateFilteredTasks.length > 0 ? Math.round((doneTasks.length / dateFilteredTasks.length) * 100) : 0;

  // Quick date navigation presets
  const datePresets = [
    { label: 'Yesterday', date: offsetDateNPT(-1) },
    { label: 'Today', date: todayNPT() },
    { label: 'Tomorrow', date: offsetDateNPT(1) },
  ];

  // Navigate dates
  const goToPrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const prev = new Date(y, m - 1, d - 1);
    setSelectedDate(prev.toLocaleDateString('sv-SE'));
  };
  const goToNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + 1);
    setSelectedDate(next.toLocaleDateString('sv-SE'));
  };

  return (
    <div className="max-w-full space-y-5 animate-in fade-in duration-200">
      
      {/* Header Greeting & Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-4 border-b border-[#262a3c]/80 gap-4">
        <div>
          <span className="text-sm font-mono font-semibold text-indigo-400 uppercase tracking-wider">
            {formatDateLabel(selectedDate)} Dashboard
          </span>
          <h1 className="text-3xl lg:text-4xl font-bold text-slate-100 tracking-tight mt-1">
            {selectedDate === todayNPT() ? getGreeting() : formatDateLabel(selectedDate)}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-400 mt-2">
            <span className="text-indigo-300 font-medium">{importantTasks.length} important</span>
            <span>·</span>
            <span>{dateFilteredTasks.filter(t => t.status !== 'done').length} remaining</span>
            <span>·</span>
            <span className="flex items-center space-x-1">
              <Clock size={14} />
              <span>~{hoursPlanned}h {minsPlanned}m planned</span>
            </span>
          </div>
        </div>

        {/* Quick Add & Plan Day CTAs */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-all shadow-sm"
          >
            <Plus size={17} />
            <span>Quick Capture</span>
            <kbd className="kbd-badge text-[10px] bg-indigo-700/60 text-indigo-200 border-indigo-500/40">N</kbd>
          </button>
          <button
            onClick={() => setShowPlanDay(true)}
            className="flex items-center space-x-2 px-4 py-2.5 bg-[#212433] hover:bg-[#2c3044] text-slate-200 border border-[#262a3c] rounded-lg text-sm font-medium transition-all"
          >
            <CalendarClock size={17} className="text-indigo-400" />
            <span>Plan My Day</span>
            <kbd className="kbd-badge text-[10px]">P</kbd>
          </button>
        </div>
      </div>

      {/* V2: What Should I Do Now + AI Suggestions */}
      {selectedDate === todayNPT() && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WhatNowWidget onStartTask={(id) => {
            const task = tasks.find(t => t.id === id);
            if (task) onSelectTask(task);
          }} />
          <AISuggestionsCard onSelectTask={(id) => {
            const task = tasks.find(t => t.id === id);
            if (task) onSelectTask(task);
          }} />
        </div>
      )}

      {/* Date Toggle Bar */}
      <div className="flex items-center space-x-2">
        <button
          onClick={goToPrevDay}
          className="p-2 rounded-lg hover:bg-[#212433] text-slate-400 hover:text-slate-200 transition-colors border border-[#262a3c]"
          title="Previous day"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex items-center space-x-1 p-1 rounded-xl bg-[#12141c] border border-[#262a3c]">
          {datePresets.map(preset => (
            <button
              key={preset.date}
              onClick={() => setSelectedDate(preset.date)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedDate === preset.date
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#212433]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          onClick={goToNextDay}
          className="p-2 rounded-lg hover:bg-[#212433] text-slate-400 hover:text-slate-200 transition-colors border border-[#262a3c]"
          title="Next day"
        >
          <ChevronRight size={18} />
        </button>

        <span className="text-sm text-slate-500 font-mono ml-2 hidden sm:block">
          {selectedDate}
        </span>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-[#12141c] border border-[#262a3c] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Day's Workload</span>
            <Clock size={16} className="text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100">
            {dateFilteredTasks.filter(t => t.status !== 'done').length} <span className="text-sm font-normal text-slate-400">tasks</span>
          </div>
          <p className="text-xs text-slate-400 font-mono">~{hoursPlanned}h {minsPlanned}m estimated</p>
        </div>

        <div className="p-5 rounded-xl bg-[#12141c] border border-[#262a3c] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>Execution Progress</span>
            <TrendingUp size={16} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100">
            {doneTasks.length} / {dateFilteredTasks.length} <span className="text-sm font-normal text-slate-400">done</span>
          </div>
          <div className="w-full bg-[#1e2230] rounded-full h-2 mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300" 
              style={{ width: `${completionRate}%` }} 
            />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#12141c] border border-[#262a3c] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-sm">
            <span>High Priority Focus</span>
            <AlertCircle size={16} className="text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100">
            {importantTasks.length} <span className="text-sm font-normal text-slate-400">items</span>
          </div>
          <p className="text-xs text-slate-400">Requires attention {formatDateLabel(selectedDate).toLowerCase()}</p>
        </div>
      </div>

      {/* Important Tasks Widget */}
      {importantTasks.length > 0 && (
        <div className="p-5 rounded-xl bg-[#12141c] border border-amber-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-amber-300">
              <AlertCircle size={16} />
              <span className="uppercase tracking-wider">High Priority & Deadlines</span>
            </div>
            <span className="text-xs text-slate-400">{importantTasks.length} tasks</span>
          </div>

          <div className="space-y-2">
            {importantTasks.map(task => (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className="flex items-center justify-between p-4 rounded-lg bg-[#181a24] hover:bg-[#212433] border border-[#262a3c] transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3 truncate">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(task);
                    }}
                    className="text-slate-500 hover:text-emerald-400 transition-colors"
                  >
                    <Circle size={20} />
                  </button>
                  <span className="text-sm font-medium text-slate-200 truncate group-hover:text-white">
                    {task.title}
                  </span>
                  {task.project && (
                    <span className="text-xs px-2.5 py-1 rounded bg-blue-900/30 text-blue-300 border border-blue-800/40 hidden sm:inline">
                      {task.project.name}
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-sm text-slate-400 flex-shrink-0">
                  {task.due_date && (
                    <span className="flex items-center space-x-1 text-xs text-amber-300/90">
                      <Calendar size={13} />
                      <span>{formatDateNPT(task.due_date, { month: 'short', day: 'numeric' })}</span>
                    </span>
                  )}
                  {task.estimated_minutes && (
                    <span className="text-xs text-slate-400">~{task.estimated_minutes}m</span>
                  )}
                  <span className="text-xs uppercase font-mono px-2 py-1 rounded bg-red-950/60 text-red-300 border border-red-800/50">
                    {task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Tasks Message */}
      {dateFilteredTasks.length === 0 && (
        <div className="p-10 rounded-xl bg-[#12141c] border border-[#262a3c] text-center">
          <Calendar size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-base text-slate-400">No tasks scheduled for {formatDateLabel(selectedDate).toLowerCase()}</p>
          <button
            onClick={onOpenQuickAdd}
            className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Quick Capture a task
          </button>
        </div>
      )}

      {/* Main Day Tasks List */}
      {dateFilteredTasks.length > 0 && (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-200 uppercase tracking-wider">
            All {formatDateLabel(selectedDate)} Tasks
          </h2>
          <span className="text-sm text-slate-400">{dateFilteredTasks.length} total</span>
        </div>

        <div className="space-y-2">
          {dateFilteredTasks.map(task => {
            const isDone = task.status === 'done';
            return (
              <div
                key={task.id}
                onClick={() => onSelectTask(task)}
                className={`flex items-center justify-between p-4 rounded-lg bg-[#12141c] hover:bg-[#181a24] border border-[#262a3c] transition-all cursor-pointer group ${
                  isDone ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center space-x-3 truncate">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(task);
                    }}
                    className="text-slate-500 hover:text-emerald-400 transition-colors flex-shrink-0"
                  >
                    {isDone ? (
                      <CheckCircle2 size={20} className="text-emerald-400" />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>
                  <span className={`text-sm font-medium truncate ${
                    isDone ? 'line-through text-slate-500' : 'text-slate-200 group-hover:text-white'
                  }`}>
                    {task.title}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-[#1e2230] text-slate-400 font-mono hidden sm:inline">
                    {task.category}
                  </span>
                </div>

                <div className="flex items-center space-x-3 text-sm text-slate-400 flex-shrink-0">
                  {task.subtasks?.length > 0 && (
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length} subtasks
                    </span>
                  )}
                  {task.estimated_minutes && (
                    <span className="text-xs text-slate-400">~{task.estimated_minutes}m</span>
                  )}
                  <span className={`text-xs uppercase font-mono px-2 py-1 rounded border ${
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
      )}

    </div>
  );
};
