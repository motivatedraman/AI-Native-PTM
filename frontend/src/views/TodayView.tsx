import React, { useState, useRef } from 'react';
import { 
  Calendar, 
  Clock, 
  TrendingUp,
  Plus,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  Zap,
  Timer,
} from 'lucide-react';
import { Task, Project } from '../types';
import { currentHourNPT, formatDateNPT, todayNPT, offsetDateNPT, dateStrNPT, formatDateLabel } from '../utils/time';
import { WhatNowWidget } from '../components/WhatNowWidget';
import { AISuggestionsCard } from '../components/AISuggestionsCard';
import { AnimatedCheck, TaskCompletionBurst, StreakBadge } from '../components/TaskCompletionBurst';
import { useStreak } from '../utils/useStreak';

interface TodayViewProps {
  tasks: Task[];
  projects: Project[];
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onOpenQuickAdd: () => void;
  onOpenPlanDay?: () => void;
  onStartFocus?: (task: Task) => void;
}

// Circular progress ring component
const ProgressRing: React.FC<{ percent: number; size?: number; strokeWidth?: number }> = ({
  percent,
  size = 64,
  strokeWidth = 5,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgb(var(--sx-hover))"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#progressGrad)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.5))',
        }}
      />
      <defs>
        <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'var(--success)' }} />
          <stop offset="100%" style={{ stopColor: 'var(--cyan)' }} />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  projects: _projects,
  onSelectTask,
  onToggleComplete,
  onOpenQuickAdd,
  onOpenPlanDay,
  onStartFocus,
}) => {
  const [selectedDate, setSelectedDate] = useState(todayNPT());
  const [burstTrigger, setBurstTrigger] = useState(false);
  const [celebratingTaskIds, setCelebratingTaskIds] = useState<Set<number>>(new Set());
  const streak = useStreak(tasks);
  const burstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getGreeting = () => {
    const hour = currentHourNPT();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleToggleComplete = (task: Task) => {
    if (task.status !== 'done') {
      // Trigger burst & celebrate
      setBurstTrigger(false);
      requestAnimationFrame(() => setBurstTrigger(true));
      setCelebratingTaskIds(prev => new Set(prev).add(task.id));
      if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
      burstTimeoutRef.current = setTimeout(() => {
        setCelebratingTaskIds(prev => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      }, 800);
    }
    onToggleComplete(task);
  };

  // Filter tasks by selected date
  const dateFilteredTasks = tasks.filter(t => {
    const taskDate = dateStrNPT(t.due_date);
    return taskDate === selectedDate;
  });

  const doneTasks = dateFilteredTasks.filter(t => t.status === 'done');
  const importantTasks = dateFilteredTasks.filter(t => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'done');
  
  const totalMinutes = dateFilteredTasks
    .filter(t => t.status !== 'done')
    .reduce((acc, t) => acc + (t.estimated_minutes || 30), 0);

  const hoursPlanned = Math.floor(totalMinutes / 60);
  const minsPlanned = totalMinutes % 60;

  const completionRate = dateFilteredTasks.length > 0 ? Math.round((doneTasks.length / dateFilteredTasks.length) * 100) : 0;

  const datePresets = [
    { label: 'Yesterday', date: offsetDateNPT(-1) },
    { label: 'Today', date: todayNPT() },
    { label: 'Tomorrow', date: offsetDateNPT(1) },
  ];

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

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return { bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.35)', text: 'var(--rose)' };
      case 'high': return { bg: 'rgba(207, 164, 95, 0.12)', border: 'rgba(207, 164, 95, 0.35)', text: 'var(--gold)' };
      default: return { bg: 'rgba(82, 82, 91, 0.2)', border: 'rgb(var(--sx-border-3))', text: 'rgb(var(--st-500))' };
    }
  };

  return (
    <div className="max-w-full space-y-5 view-enter">
      {/* Confetti burst on task complete */}
      <TaskCompletionBurst
        trigger={burstTrigger}
        onComplete={() => setBurstTrigger(false)}
      />

      {/* Header Greeting & Summary */}
      <div
        className="flex flex-col md:flex-row md:items-end justify-between pb-5 gap-4"
        style={{ borderBottom: '1px solid rgb(var(--sx-border-2))' }}
      >
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-mono font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--am-600))' }}>
              {formatDateLabel(selectedDate)} Dashboard
            </span>
            {selectedDate === todayNPT() && streak > 0 && (
              <StreakBadge streak={streak} compact />
            )}
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-stone-100 tracking-tight mt-1">
            {selectedDate === todayNPT() ? getGreeting() : formatDateLabel(selectedDate)}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mt-2" style={{ color: 'rgb(var(--st-500))' }}>
            <span style={{ color: 'rgb(var(--am-400))' }} className="font-medium flex items-center space-x-1">
              <Zap size={13} />
              <span>{importantTasks.length} important</span>
            </span>
            <span>·</span>
            <span>{dateFilteredTasks.filter(t => t.status !== 'done').length} remaining</span>
            <span>·</span>
            <span className="flex items-center space-x-1">
              <Clock size={13} />
              <span>~{hoursPlanned}h {minsPlanned}m planned</span>
            </span>
          </div>
        </div>

        {/* Quick Add & Plan Day CTAs */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center space-x-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold transition-all shadow-lg"
            style={{
              background: 'linear-gradient(135deg, rgb(var(--am-600)), rgb(var(--am-700)))',
              boxShadow: '0 4px 15px rgba(171, 118, 49, 0.35)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 25px rgba(171, 118, 49, 0.55)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(171, 118, 49, 0.35)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <Plus size={17} />
            <span>Quick Capture</span>
            <kbd className="kbd-badge text-[10px] bg-amber-700/60 text-amber-200 border-amber-500/40">N</kbd>
          </button>
          <button
            onClick={onOpenPlanDay}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgb(var(--sx-card))',
              border: '1px solid rgb(var(--sx-border-2))',
              color: 'rgb(var(--st-300))',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-3))';
              (e.currentTarget as HTMLElement).style.background = 'rgb(var(--sx-hover))';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-2))';
              (e.currentTarget as HTMLElement).style.background = 'rgb(var(--sx-card))';
            }}
          >
            <CalendarClock size={17} style={{ color: 'rgb(var(--am-600))' }} />
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
          <AISuggestionsCard
            onSelectTask={(id) => {
              const task = tasks.find(t => t.id === id);
              if (task) onSelectTask(task);
            }}
            onOpenPlanner={onOpenPlanDay}
          />
        </div>
      )}

      {/* Date Toggle Bar */}
      <div className="flex items-center space-x-2">
        <button
          onClick={goToPrevDay}
          className="p-2 rounded-xl transition-all"
          style={{ background: 'rgb(var(--sx-card))', border: '1px solid rgb(var(--sx-border-2))', color: 'rgb(var(--st-500))' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-300))'; (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-3))'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-500))'; (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-2))'; }}
          title="Previous day"
        >
          <ChevronLeft size={18} />
        </button>

        <div
          className="flex items-center space-x-1 p-1 rounded-xl"
          style={{ background: 'rgb(var(--sx-surface))', border: '1px solid rgb(var(--sx-border-2))' }}
        >
          {datePresets.map(preset => (
            <button
              key={preset.date}
              onClick={() => setSelectedDate(preset.date)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={
                selectedDate === preset.date
                  ? {
                      background: 'linear-gradient(135deg, rgb(var(--am-600)), rgb(var(--am-700)))',
                      color: '#fff',
                      boxShadow: '0 2px 10px rgba(171, 118, 49, 0.4)',
                    }
                  : { color: 'rgb(var(--st-500))' }
              }
              onMouseEnter={e => { if (selectedDate !== preset.date) { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-300))'; (e.currentTarget as HTMLElement).style.background = 'rgb(var(--sx-hover))'; } }}
              onMouseLeave={e => { if (selectedDate !== preset.date) { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-500))'; (e.currentTarget as HTMLElement).style.background = ''; } }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          onClick={goToNextDay}
          className="p-2 rounded-xl transition-all"
          style={{ background: 'rgb(var(--sx-card))', border: '1px solid rgb(var(--sx-border-2))', color: 'rgb(var(--st-500))' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-300))'; (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-3))'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-500))'; (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-2))'; }}
          title="Next day"
        >
          <ChevronRight size={18} />
        </button>

        <span className="text-sm font-mono ml-2 hidden sm:block" style={{ color: 'rgb(var(--st-600))' }}>
          {selectedDate}
        </span>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Workload card */}
        <div
          className="p-5 rounded-2xl card-hover space-y-2"
          style={{ background: 'rgb(var(--sx-surface))', border: '1px solid rgb(var(--sx-border-2))' }}
        >
          <div className="flex items-center justify-between" style={{ color: 'rgb(var(--st-500))' }}>
            <span className="text-sm">Day's Workload</span>
            <Clock size={16} style={{ color: 'rgb(var(--am-600))' }} />
          </div>
          <div className="text-3xl font-bold text-stone-100">
            {dateFilteredTasks.filter(t => t.status !== 'done').length} <span className="text-sm font-normal" style={{ color: 'rgb(var(--st-500))' }}>tasks</span>
          </div>
          <p className="text-xs font-mono" style={{ color: 'rgb(var(--st-500))' }}>~{hoursPlanned}h {minsPlanned}m estimated</p>
        </div>

        {/* Progress card with ring */}
        <div
          className="p-5 rounded-2xl card-hover"
          style={{ background: 'rgb(var(--sx-surface))', border: '1px solid rgb(var(--sx-border-2))' }}
        >
          <div className="flex items-center justify-between mb-2" style={{ color: 'rgb(var(--st-500))' }}>
            <span className="text-sm">Execution Progress</span>
            <TrendingUp size={16} style={{ color: 'var(--success)' }} />
          </div>
          <div className="flex items-center space-x-4">
            <ProgressRing percent={completionRate} size={60} strokeWidth={5} />
            <div>
              <div className="text-2xl font-bold text-stone-100">{completionRate}%</div>
              <div className="text-xs" style={{ color: 'rgb(var(--st-500))' }}>{doneTasks.length} / {dateFilteredTasks.length} done</div>
            </div>
          </div>
        </div>

        {/* Streak / High Priority card */}
        <div
          className="p-5 rounded-2xl card-hover space-y-2"
          style={{
            background: streak > 0 ? 'linear-gradient(135deg, rgba(201, 106, 38, 0.08), rgba(239, 68, 68, 0.06))' : 'rgb(var(--sx-surface))',
            border: streak > 0 ? '1px solid rgba(201, 106, 38, 0.25)' : '1px solid rgb(var(--sx-border-2))',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: 'rgb(var(--st-500))' }}>
              {streak > 0 ? 'Streak & Focus' : 'High Priority Focus'}
            </span>
            {streak > 0 ? (
              <span className="text-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(201, 106, 38, 0.7))' }}>🔥</span>
            ) : (
              <Zap size={16} style={{ color: 'rgb(var(--am-400))' }} />
            )}
          </div>
          {streak > 0 ? (
            <div>
              <div className="text-3xl font-bold text-gradient-streak">{streak}</div>
              <p className="text-xs" style={{ color: 'var(--gold-deep)' }}>day streak · {importantTasks.length} urgent items</p>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-stone-100">
                {importantTasks.length} <span className="text-sm font-normal" style={{ color: 'rgb(var(--st-500))' }}>items</span>
              </div>
              <p className="text-xs" style={{ color: 'rgb(var(--st-500))' }}>Requires attention {formatDateLabel(selectedDate).toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Important Tasks Widget */}
      {importantTasks.length > 0 && (
        <div
          className="p-5 rounded-2xl space-y-3"
          style={{ background: 'rgb(var(--sx-surface))', border: '1px solid rgba(207, 164, 95, 0.25)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold" style={{ color: 'var(--gold)' }}>
              <Zap size={15} />
              <span className="uppercase tracking-wider">High Priority & Deadlines</span>
            </div>
            <span className="text-xs" style={{ color: 'rgb(var(--st-500))' }}>{importantTasks.length} tasks</span>
          </div>

          <div className="space-y-2">
            {importantTasks.map(task => {
              const pc = priorityColor(task.priority);
              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="flex items-center justify-between p-4 rounded-xl cursor-pointer group card-hover"
                  style={{ background: 'rgb(var(--sx-card))', border: '1px solid rgb(var(--sx-border-2))' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-3))'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-2))'; }}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div onClick={e => e.stopPropagation()}>
                      <AnimatedCheck
                        isDone={task.status === 'done'}
                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                      />
                    </div>
                    <span className="text-sm font-medium text-stone-100 truncate">
                      {task.title}
                    </span>
                    {task.project && (
                      <span
                        className="text-xs px-2.5 py-1 rounded-lg hidden sm:inline"
                        style={{ background: 'rgba(171, 118, 49, 0.15)', color: 'rgb(var(--am-400))', border: '1px solid rgba(171, 118, 49, 0.25)' }}
                      >
                        {task.project.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-sm flex-shrink-0">
                    {onStartFocus && task.status !== 'done' && (
                      <button
                        onClick={e => { e.stopPropagation(); onStartFocus(task); }}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all"
                        style={{ background: 'rgba(20, 184, 166, 0.12)', color: '#5eead4', border: '1px solid rgba(20, 184, 166, 0.3)' }}
                        title="Start focus timer"
                      >
                        <Timer size={11} />
                        Focus
                      </button>
                    )}
                    {task.due_date && (
                      <span className="flex items-center space-x-1 text-xs" style={{ color: 'var(--gold)' }}>
                        <Calendar size={12} />
                        <span>{formatDateNPT(task.due_date, { month: 'short', day: 'numeric' })}</span>
                      </span>
                    )}
                    {task.spent_minutes && task.spent_minutes > 0 && task.estimated_minutes && task.status !== 'done' ? (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(171, 118, 49, 0.15)', color: 'rgb(var(--am-400))', border: '1px solid rgba(171, 118, 49, 0.3)' }}>
                        <span>{task.spent_minutes}/{task.estimated_minutes}m</span>
                        <span className="text-amber-300 font-semibold">({Math.round((task.spent_minutes / task.estimated_minutes) * 100)}%)</span>
                      </span>
                    ) : task.estimated_minutes ? (
                      <span className="text-xs" style={{ color: 'rgb(var(--st-500))' }}>~{task.estimated_minutes}m</span>
                    ) : null}
                    <span
                      className="text-xs uppercase font-mono px-2 py-1 rounded-lg"
                      style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Tasks Message */}
      {dateFilteredTasks.length === 0 && (
        <div
          className="p-12 rounded-2xl text-center"
          style={{ background: 'rgb(var(--sx-surface))', border: '1px solid rgb(var(--sx-border-2))' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(171, 118, 49, 0.1)', border: '1px solid rgba(171, 118, 49, 0.2)' }}
          >
            <Calendar size={28} style={{ color: 'rgb(var(--am-600))' }} />
          </div>
          <p className="text-base" style={{ color: 'rgb(var(--st-500))' }}>No tasks scheduled for {formatDateLabel(selectedDate).toLowerCase()}</p>
          <button
            onClick={onOpenQuickAdd}
            className="mt-4 text-sm font-medium transition-colors"
            style={{ color: 'rgb(var(--am-600))' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--am-400))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--am-600))'; }}
          >
            + Quick Capture a task
          </button>
        </div>
      )}

      {/* Main Day Tasks List */}
      {dateFilteredTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold uppercase tracking-wider" style={{ color: 'rgb(var(--st-300))' }}>
              All {formatDateLabel(selectedDate)} Tasks
            </h2>
            <span className="text-sm" style={{ color: 'rgb(var(--st-500))' }}>{dateFilteredTasks.length} total</span>
          </div>

          <div className="space-y-1.5">
            {dateFilteredTasks.map(task => {
              const isDone = task.status === 'done';
              const isCelebrating = celebratingTaskIds.has(task.id);
              const pc = priorityColor(task.priority);
              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className={`flex items-center justify-between p-4 rounded-xl cursor-pointer group transition-all duration-200 ${isCelebrating ? 'celebrate' : ''}`}
                  style={{
                    background: isDone ? 'rgb(var(--sx-bg))' : 'rgb(var(--sx-surface))',
                    border: `1px solid ${isDone ? 'rgb(var(--sx-card))' : 'rgb(var(--sx-border-2))'}`,
                    opacity: isDone ? 0.55 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!isDone) {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-3))';
                      (e.currentTarget as HTMLElement).style.background = 'rgb(var(--sx-card))';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isDone) {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgb(var(--sx-border-2))';
                      (e.currentTarget as HTMLElement).style.background = 'rgb(var(--sx-surface))';
                    }
                  }}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div onClick={e => e.stopPropagation()}>
                      <AnimatedCheck
                        isDone={isDone}
                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium truncate ${isDone ? 'line-through' : 'text-stone-100'}`}
                      style={{ color: isDone ? 'rgb(var(--st-600))' : undefined }}
                    >
                      {task.title}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-md font-mono hidden sm:inline"
                      style={{ background: 'rgb(var(--sx-hover))', color: 'rgb(var(--st-500))' }}
                    >
                      {task.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-sm flex-shrink-0">
                    {onStartFocus && !isDone && (
                      <button
                        onClick={e => { e.stopPropagation(); onStartFocus(task); }}
                        className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all"
                        style={{ background: 'rgba(20, 184, 166, 0.12)', color: '#5eead4', border: '1px solid rgba(20, 184, 166, 0.3)' }}
                        title="Start focus timer"
                      >
                        <Timer size={11} />
                        Focus
                      </button>
                    )}
                    {task.subtasks?.length > 0 && (
                      <span className="text-xs hidden sm:inline" style={{ color: 'rgb(var(--st-500))' }}>
                        {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length} subtasks
                      </span>
                    )}
                    {task.spent_minutes && task.spent_minutes > 0 && task.estimated_minutes && !isDone ? (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(171, 118, 49, 0.15)', color: 'rgb(var(--am-400))', border: '1px solid rgba(171, 118, 49, 0.3)' }}>
                        <span>{task.spent_minutes}/{task.estimated_minutes}m</span>
                        <span className="text-amber-300 font-semibold">({Math.round((task.spent_minutes / task.estimated_minutes) * 100)}%)</span>
                      </span>
                    ) : task.estimated_minutes ? (
                      <span className="text-xs" style={{ color: 'rgb(var(--st-500))' }}>~{task.estimated_minutes}m</span>
                    ) : null}
                    <span
                      className="text-xs uppercase font-mono px-2 py-1 rounded-lg"
                      style={{ background: pc.bg, color: pc.text, border: `1px solid ${pc.border}` }}
                    >
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

