import React, { useState, useRef, useEffect } from 'react';
import { Timer, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { Task, Project } from '../types';
import { currentHourNPT, todayNPT, dateStrNPT, formatDateLabel, formatDateNPT } from '../utils/time';
import { AnimatedCheck, TaskCompletionBurst } from '../components/TaskCompletionBurst';
import { useStreak } from '../utils/useStreak';
import { api } from '../services/api';
import { DailyQuote } from '../types';

interface TodayViewProps {
  tasks: Task[];
  projects: Project[];
  quote?: DailyQuote | null;
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onTaskCreated: (task: Task) => void;
  onOpenPlanDay?: () => void;
  onStartFocus?: (task: Task) => void;
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export const TodayView: React.FC<TodayViewProps> = ({
  tasks,
  quote,
  onSelectTask,
  onToggleComplete,
  onTaskCreated,
  onStartFocus,
}) => {
  const [selectedDate, setSelectedDate] = useState(todayNPT());
  const [capture, setCapture] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [burstTrigger, setBurstTrigger] = useState(false);
  const [celebratingTaskIds, setCelebratingTaskIds] = useState<Set<number>>(new Set());
  const streak = useStreak(tasks);
  const burstTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureRef = useRef<HTMLInputElement>(null);

  const getGreeting = () => {
    const hour = currentHourNPT();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const isToday = selectedDate === todayNPT();

  /* ── Inline capture ────────────────────────────────────────────
     A plain create with today's due date. Deliberately not the
     quick-add endpoint: that routes through the AI parser to guess a
     due date and category, which is right for an untriaged inbox dump
     but wrong here, where "today" is the whole point. For anything
     ambiguous the N shortcut still opens the full capture modal. */
  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = capture.trim();
    if (!title || isCapturing) return;

    setIsCapturing(true);
    try {
      const created = await api.createTask({
        title,
        status: 'planned',
        due_date: new Date(`${selectedDate}T09:00:00`).toISOString(),
      });
      onTaskCreated(created);
      setCapture('');
      captureRef.current?.focus();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleToggleComplete = (task: Task) => {
    if (task.status !== 'done') {
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

  const shiftDay = (delta: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const next = new Date(y, m - 1, d + delta);
    setSelectedDate(next.toLocaleDateString('sv-SE'));
  };

  /* One list. Urgent first, then by due date, then by priority, the
     status badge that used to sit on every row is gone because the
     ordering now carries that signal. */
  const dayTasks = tasks
    .filter(t => dateStrNPT(t.due_date) === selectedDate)
    .sort((a, b) => {
      if (a.status === 'done' && b.status !== 'done') return 1;
      if (b.status === 'done' && a.status !== 'done') return -1;
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

  const open = dayTasks.filter(t => t.status !== 'done');
  const done = dayTasks.filter(t => t.status === 'done');
  const totalMinutes = open.reduce((acc, t) => acc + (t.estimated_minutes || 0), 0);

  const subtitle = [
    `${open.length} open`,
    totalMinutes > 0 ? `~${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : null,
    streak > 0 ? `${streak} day streak` : null,
  ].filter(Boolean).join(' · ');

  /* N focuses the inline field instead of opening the modal. Done via a
     custom event rather than a "type anywhere" listener, which would
     swallow the K / T / D / / navigation shortcuts. */
  useEffect(() => {
    const focus = () => captureRef.current?.focus();
    window.addEventListener('nexus:focus-capture', focus);
    return () => window.removeEventListener('nexus:focus-capture', focus);
  }, []);

  return (
    <div className="max-w-3xl space-y-5">
      <TaskCompletionBurst
        trigger={burstTrigger}
        onComplete={() => setBurstTrigger(false)}
      />

      {/* Header, one line, no eyebrow, no explanation */}
      <div className="flex items-end justify-between gap-4 pb-4" style={{ borderBottom: '1px solid rgb(var(--sx-border-2))' }}>
        <div>
          <h1 className="text-xl font-semibold text-stone-100">
            {isToday ? getGreeting() : formatDateLabel(selectedDate)}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--st-500))' }}>
            {subtitle}
            {streak > 0 && (
              <Flame size={12} className="inline ml-1 -mt-0.5" style={{ color: 'rgb(var(--streak))' }} />
            )}
          </p>
        </div>

        {/* Date navigation, tertiary */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftDay(-1)}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'rgb(var(--st-500))' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-300))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-500))'; }}
            title="Previous day"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-mono px-1" style={{ color: 'rgb(var(--st-600))' }}>
            {isToday ? 'today' : formatDateNPT(selectedDate + 'T00:00:00', { month: 'short', day: 'numeric' })}
          </span>
          <button
            onClick={() => shiftDay(1)}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'rgb(var(--st-500))' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-300))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-500))'; }}
            title="Next day"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Capture, always present, no modal required */}
      <form onSubmit={handleCapture} className="relative">
        <input
          ref={captureRef}
          type="text"
          value={capture}
          onChange={(e) => setCapture(e.target.value)}
          placeholder={isToday ? 'Add a task for today…' : `Add a task for ${formatDateLabel(selectedDate).toLowerCase()}…`}
          className="w-full bg-[rgb(var(--sx-card))] border border-[rgb(var(--sx-border-2))] rounded-lg pl-3 pr-20 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          style={{ color: 'rgb(var(--st-100))' }}
        />
        <button
          type="submit"
          disabled={!capture.trim() || isCapturing}
          className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded text-xs font-medium transition-colors disabled:opacity-40"
          style={{ background: 'rgb(var(--sx-raised))', color: 'rgb(var(--st-300))' }}
        >
          Add
        </button>
      </form>

      {/* The list */}
      {dayTasks.length === 0 ? (
        <p className="text-sm py-8" style={{ color: 'rgb(var(--st-600))' }}>
          Nothing scheduled. Type above to add something.
        </p>
      ) : (
        <ul className="space-y-px">
          {[...open, ...done].map(task => {
            const isDone = task.status === 'done';
            const isUrgent = task.priority === 'urgent' || task.priority === 'high';
            const celebrating = celebratingTaskIds.has(task.id);
            const doneSubs = task.subtasks?.filter(s => s.is_completed).length ?? 0;
            const totalSubs = task.subtasks?.length ?? 0;

            return (
              <li
                key={task.id}
                className={`group flex items-center gap-3 px-3 py-2 rounded transition-colors ${celebrating ? 'celebrate' : ''}`}
                style={{
                  background: celebrating ? 'transparent' : 'transparent',
                  borderLeft: isUrgent && !isDone ? '2px solid rgb(var(--am-500))' : '2px solid transparent',
                  opacity: isDone ? 0.5 : 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgb(var(--sx-card))'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
                  <AnimatedCheck
                    isDone={isDone}
                    onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                  />
                </div>

                <button
                  onClick={() => onSelectTask(task)}
                  className="flex-1 text-left text-sm min-w-0 truncate"
                  style={{
                    color: isDone ? 'rgb(var(--st-600))' : 'rgb(var(--st-100))',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}
                >
                  {task.title}
                </button>

                {/* At most three items, and only when they say something */}
                <div className="flex items-center gap-2 flex-shrink-0 text-xs" style={{ color: 'rgb(var(--st-600))' }}>
                  {totalSubs > 0 && (
                    <span className="font-mono">{doneSubs}/{totalSubs}</span>
                  )}
                  {!isDone && task.estimated_minutes ? (
                    <span className="font-mono">~{task.estimated_minutes}m</span>
                  ) : null}
                  {onStartFocus && !isDone && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onStartFocus(task); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                      style={{ color: 'rgb(var(--st-500))' }}
                      title="Start focus timer"
                    >
                      <Timer size={13} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Daily quote. Sits at the foot on purpose: it should be the last
          thing on the page, not compete with the list for first read. */}
      {quote && (
        <footer className="pt-6 mt-2" style={{ borderTop: '1px solid rgb(var(--sx-border))' }}>
          <blockquote className="text-sm italic leading-relaxed" style={{ color: 'rgb(var(--st-500))' }}>
            {quote.text}
            {quote.author && (
              <cite className="not-italic" style={{ color: 'rgb(var(--st-600))' }}>
                {' '}, {quote.author}
              </cite>
            )}
          </blockquote>
        </footer>
      )}
    </div>
  );
};