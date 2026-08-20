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
        stroke="#252528"
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
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  projects,
  onSelectTask,
  onToggleComplete,
  onOpenQuickAdd,
  onOpenPlanDay,
}) => {
  const [selectedDate, setSelectedDate] = useState(todayNPT());
  const [showPlanDay, setShowPlanDay] = useState(false);
  const [burstTrigger, setBurstTrigger] = useState(false);
  const [lastCompletedTask, setLastCompletedTask] = useState<string | null>(null);
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
      setLastCompletedTask(task.title);
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

  const todayTasks = dateFilteredTasks.filter(t => t.status !== 'done' || t.completed_at);
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
      case 'urgent': return { bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.35)', text: '#fb7185' };
      case 'high': return { bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)', text: '#fbbf24' };
      default: return { bg: 'rgba(82, 82, 91, 0.2)', border: '#3a3a40', text: '#71717a' };
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
        style={{ borderBottom: '1px solid #2e2e33' }}
      >
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-mono font-semibold uppercase tracking-wider" style={{ color: '#8b5cf6' }}>
              {formatDateLabel(selectedDate)} Dashboard
            </span>
            {selectedDate === todayNPT() && streak > 0 && (
              <StreakBadge streak={streak} compact />
            )}
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight mt-1">
            {selectedDate === todayNPT() ? getGreeting() : formatDateLabel(selectedDate)}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mt-2" style={{ color: '#71717a' }}>
            <span style={{ color: '#a78bfa' }} className="font-medium flex items-center space-x-1">
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
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.35)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 25px rgba(139, 92, 246, 0.55)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 15px rgba(139, 92, 246, 0.35)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }}
          >
            <Plus size={17} />
            <span>Quick Capture</span>
            <kbd className="kbd-badge text-[10px] bg-violet-700/60 text-violet-200 border-violet-500/40">N</kbd>
          </button>
          <button
            onClick={onOpenPlanDay || (() => setShowPlanDay(true))}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: '#1c1c1f',
              border: '1px solid #2e2e33',
              color: '#d4d4d8',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#3a3a40';
              (e.currentTarget as HTMLElement).style.background = '#252528';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = '#2e2e33';
              (e.currentTarget as HTMLElement).style.background = '#1c1c1f';
            }}
          >
            <CalendarClock size={17} style={{ color: '#8b5cf6' }} />
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
          className="p-2 rounded-xl transition-all"
          style={{ background: '#1c1c1f', border: '1px solid #2e2e33', color: '#71717a' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#d4d4d8'; (e.currentTarget as HTMLElement).style.borderColor = '#3a3a40'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717a'; (e.currentTarget as HTMLElement).style.borderColor = '#2e2e33'; }}
          title="Previous day"
        >
          <ChevronLeft size={18} />
        </button>

        <div
          className="flex items-center space-x-1 p-1 rounded-xl"
          style={{ background: '#141416', border: '1px solid #2e2e33' }}
        >
          {datePresets.map(preset => (
            <button
              key={preset.date}
              onClick={() => setSelectedDate(preset.date)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
              style={
                selectedDate === preset.date
                  ? {
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      color: '#fff',
                      boxShadow: '0 2px 10px rgba(139, 92, 246, 0.4)',
                    }
                  : { color: '#71717a' }
              }
              onMouseEnter={e => { if (selectedDate !== preset.date) { (e.currentTarget as HTMLElement).style.color = '#d4d4d8'; (e.currentTarget as HTMLElement).style.background = '#252528'; } }}
              onMouseLeave={e => { if (selectedDate !== preset.date) { (e.currentTarget as HTMLElement).style.color = '#71717a'; (e.currentTarget as HTMLElement).style.background = ''; } }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          onClick={goToNextDay}
          className="p-2 rounded-xl transition-all"
          style={{ background: '#1c1c1f', border: '1px solid #2e2e33', color: '#71717a' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#d4d4d8'; (e.currentTarget as HTMLElement).style.borderColor = '#3a3a40'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#71717a'; (e.currentTarget as HTMLElement).style.borderColor = '#2e2e33'; }}
          title="Next day"
        >
          <ChevronRight size={18} />
        </button>

        <span className="text-sm font-mono ml-2 hidden sm:block" style={{ color: '#52525b' }}>
          {selectedDate}
        </span>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Workload card */}
        <div
          className="p-5 rounded-2xl card-hover space-y-2"
          style={{ background: '#141416', border: '1px solid #2e2e33' }}
        >
          <div className="flex items-center justify-between" style={{ color: '#71717a' }}>
            <span className="text-sm">Day's Workload</span>
            <Clock size={16} style={{ color: '#8b5cf6' }} />
          </div>
          <div className="text-3xl font-bold text-white">
            {dateFilteredTasks.filter(t => t.status !== 'done').length} <span className="text-sm font-normal" style={{ color: '#71717a' }}>tasks</span>
          </div>
          <p className="text-xs font-mono" style={{ color: '#71717a' }}>~{hoursPlanned}h {minsPlanned}m estimated</p>
        </div>

        {/* Progress card with ring */}
        <div
          className="p-5 rounded-2xl card-hover"
          style={{ background: '#141416', border: '1px solid #2e2e33' }}
        >
          <div className="flex items-center justify-between mb-2" style={{ color: '#71717a' }}>
            <span className="text-sm">Execution Progress</span>
            <TrendingUp size={16} style={{ color: '#10b981' }} />
          </div>
          <div className="flex items-center space-x-4">
            <ProgressRing percent={completionRate} size={60} strokeWidth={5} />
            <div>
              <div className="text-2xl font-bold text-white">{completionRate}%</div>
              <div className="text-xs" style={{ color: '#71717a' }}>{doneTasks.length} / {dateFilteredTasks.length} done</div>
            </div>
          </div>
        </div>

        {/* Streak / High Priority card */}
        <div
          className="p-5 rounded-2xl card-hover space-y-2"
          style={{
            background: streak > 0 ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.08), rgba(239, 68, 68, 0.06))' : '#141416',
            border: streak > 0 ? '1px solid rgba(249, 115, 22, 0.25)' : '1px solid #2e2e33',
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#71717a' }}>
              {streak > 0 ? 'Streak & Focus' : 'High Priority Focus'}
            </span>
            {streak > 0 ? (
              <span className="text-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.7))' }}>🔥</span>
            ) : (
              <Zap size={16} style={{ color: '#f59e0b' }} />
            )}
          </div>
          {streak > 0 ? (
            <div>
              <div className="text-3xl font-bold text-gradient-streak">{streak}</div>
              <p className="text-xs" style={{ color: '#a16207' }}>day streak · {importantTasks.length} urgent items</p>
            </div>
          ) : (
            <div>
              <div className="text-3xl font-bold text-white">
                {importantTasks.length} <span className="text-sm font-normal" style={{ color: '#71717a' }}>items</span>
              </div>
              <p className="text-xs" style={{ color: '#71717a' }}>Requires attention {formatDateLabel(selectedDate).toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Important Tasks Widget */}
      {importantTasks.length > 0 && (
        <div
          className="p-5 rounded-2xl space-y-3"
          style={{ background: '#141416', border: '1px solid rgba(245, 158, 11, 0.25)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold" style={{ color: '#fbbf24' }}>
              <Zap size={15} />
              <span className="uppercase tracking-wider">High Priority & Deadlines</span>
            </div>
            <span className="text-xs" style={{ color: '#71717a' }}>{importantTasks.length} tasks</span>
          </div>

          <div className="space-y-2">
            {importantTasks.map(task => {
              const pc = priorityColor(task.priority);
              return (
                <div
                  key={task.id}
                  onClick={() => onSelectTask(task)}
                  className="flex items-center justify-between p-4 rounded-xl cursor-pointer group card-hover"
                  style={{ background: '#1c1c1f', border: '1px solid #2e2e33' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#3a3a40'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2e2e33'; }}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div onClick={e => e.stopPropagation()}>
                      <AnimatedCheck
                        isDone={task.status === 'done'}
                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                      />
                    </div>
                    <span className="text-sm font-medium text-white truncate">
                      {task.title}
                    </span>
                    {task.project && (
                      <span
                        className="text-xs px-2.5 py-1 rounded-lg hidden sm:inline"
                        style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.25)' }}
                      >
                        {task.project.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 text-sm flex-shrink-0">
                    {task.due_date && (
                      <span className="flex items-center space-x-1 text-xs" style={{ color: '#fbbf24' }}>
                        <Calendar size={12} />
                        <span>{formatDateNPT(task.due_date, { month: 'short', day: 'numeric' })}</span>
                      </span>
                    )}
                    {task.spent_minutes && task.spent_minutes > 0 && task.estimated_minutes && task.status !== 'done' ? (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                        <span>{task.spent_minutes}/{task.estimated_minutes}m</span>
                        <span className="text-violet-300 font-semibold">({Math.round((task.spent_minutes / task.estimated_minutes) * 100)}%)</span>
                      </span>
                    ) : task.estimated_minutes ? (
                      <span className="text-xs" style={{ color: '#71717a' }}>~{task.estimated_minutes}m</span>
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
          style={{ background: '#141416', border: '1px solid #2e2e33' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
          >
            <Calendar size={28} style={{ color: '#8b5cf6' }} />
          </div>
          <p className="text-base" style={{ color: '#71717a' }}>No tasks scheduled for {formatDateLabel(selectedDate).toLowerCase()}</p>
          <button
            onClick={onOpenQuickAdd}
            className="mt-4 text-sm font-medium transition-colors"
            style={{ color: '#8b5cf6' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#a78bfa'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#8b5cf6'; }}
          >
            + Quick Capture a task
          </button>
        </div>
      )}

      {/* Main Day Tasks List */}
      {dateFilteredTasks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold uppercase tracking-wider" style={{ color: '#d4d4d8' }}>
              All {formatDateLabel(selectedDate)} Tasks
            </h2>
            <span className="text-sm" style={{ color: '#71717a' }}>{dateFilteredTasks.length} total</span>
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
                    background: isDone ? '#0d0d0f' : '#141416',
                    border: `1px solid ${isDone ? '#1c1c1f' : '#2e2e33'}`,
                    opacity: isDone ? 0.55 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!isDone) {
                      (e.currentTarget as HTMLElement).style.borderColor = '#3a3a40';
                      (e.currentTarget as HTMLElement).style.background = '#1c1c1f';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isDone) {
                      (e.currentTarget as HTMLElement).style.borderColor = '#2e2e33';
                      (e.currentTarget as HTMLElement).style.background = '#141416';
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
                      className={`text-sm font-medium truncate ${isDone ? 'line-through' : 'text-white'}`}
                      style={{ color: isDone ? '#52525b' : undefined }}
                    >
                      {task.title}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-md font-mono hidden sm:inline"
                      style={{ background: '#252528', color: '#71717a' }}
                    >
                      {task.category}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-sm flex-shrink-0">
                    {task.subtasks?.length > 0 && (
                      <span className="text-xs hidden sm:inline" style={{ color: '#71717a' }}>
                        {task.subtasks.filter(s => s.is_completed).length}/{task.subtasks.length} subtasks
                      </span>
                    )}
                    {task.spent_minutes && task.spent_minutes > 0 && task.estimated_minutes && !isDone ? (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-mono" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                        <span>{task.spent_minutes}/{task.estimated_minutes}m</span>
                        <span className="text-violet-300 font-semibold">({Math.round((task.spent_minutes / task.estimated_minutes) * 100)}%)</span>
                      </span>
                    ) : task.estimated_minutes ? (
                      <span className="text-xs" style={{ color: '#71717a' }}>~{task.estimated_minutes}m</span>
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

