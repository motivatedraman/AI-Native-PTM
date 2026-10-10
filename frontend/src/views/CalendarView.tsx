import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { Task } from '../types';
import { api } from '../services/api';
import { AnimatedCheck } from '../components/TaskCompletionBurst';
import {
  todayNPT,
  formatDateNPT,
  formatDateLabel,
  dateStrNPT,
  monthGrid,
  addMonthsToDate,
  startOfMonth,
  nptWallClockToUTCISO,
} from '../utils/time';
import {
  getHolidaysOn,
  isPublicHoliday,
  isWeekend,
  holidayShortName,
} from '../utils/holidays';
import {
  toNepaliDate,
  formatNepaliDate,
  formatNepaliMonthDay,
  formatNepaliShort,
  nepaliMonthName,
} from '../utils/nepaliDate';

interface CalendarViewProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onTaskCreated: (task: Task) => void;
}

const WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onSelectTask,
  onToggleComplete,
  onTaskCreated,
}) => {
  const [monthCursor, setMonthCursor] = useState(startOfMonth(todayNPT()));
  // null until a day is clicked. The day panel and its capture field are
  // opt-in: opening the calendar shows the month, not an editor for today.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [capture, setCapture] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  const today = todayNPT();
  const month = monthCursor.slice(0, 7);
  const grid = useMemo(() => monthGrid(monthCursor), [monthCursor]);

  /* Bucket once per task list, not once per cell. A month grid renders 42
     cells and filtering the whole array inside each one is 42 passes over
     every task; grouping first makes each cell an O(1) map read. */
  const tasksByDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      const day = dateStrNPT(task.due_date);
      if (!day) continue;
      const list = map.get(day);
      if (list) list.push(task);
      else map.set(day, [task]);
    }
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    const list = tasksByDay.get(selectedDate) ?? [];
    return list.sort((a, b) => {
      const done = (t: Task) => (t.status === 'done' ? 1 : 0);
      if (done(a) !== done(b)) return done(a) - done(b);
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [tasksByDay, selectedDate]);

  const selectedHolidays = selectedDate ? getHolidaysOn(selectedDate) : [];
  const selectedBs = selectedDate ? toNepaliDate(selectedDate) : null;

  /* Escape closes the day dialog. Registered only while it is open, so the
     listener does not outlive it and fight the App-level Escape handler
     that closes modals elsewhere. */
  useEffect(() => {
    if (!selectedDate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedDate(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedDate]);
  const monthTaskCount = useMemo(
    () => grid.filter(d => d.startsWith(month)).reduce((n, d) => n + (tasksByDay.get(d)?.length ?? 0), 0),
    [grid, month, tasksByDay]
  );

  /* Paging the month carries the selection along to the same day number.
     Leaving it pinned to the old date was the bug that made the panel read
     "Today" while the grid showed a different month: the day panel kept
     describing a day that was no longer on screen. */
  const shiftMonth = (delta: number) => {
    const next = addMonthsToDate(monthCursor, delta);
    setMonthCursor(next);
    setSelectedDate(prev => (prev ? addMonthsToDate(prev, delta) : null));
  };

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = capture.trim();
    if (!title || isCapturing || !selectedDate) return;

    setIsCapturing(true);
    try {
      const created = await api.createTask({
        title,
        status: 'planned',
        due_date: nptWallClockToUTCISO(selectedDate, '09', '00'),
      });
      onTaskCreated(created);
      setCapture('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCapturing(false);
    }
  };

  const monthLabel = formatDateNPT(monthCursor + 'T00:00:00', { month: 'long', year: 'numeric' });

  /* Full-bleed. The month grid is the reason to open this page, so it takes
     the whole content column and the day panel sits beside it rather than
     below it on narrow screens. */
  /* One BS label for the whole grid header. A Gregorian month spans two BS
     months (Baishak ends mid-April), so this is derived from the first day
     of the month and is a label, not a claim about every cell. */
  const bsMonthLabel = useMemo(() => {
    const n = toNepaliDate(monthCursor);
    return n ? `${n.year} ${nepaliMonthName(n.month)}` : null;
  }, [monthCursor]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div
        className="flex items-end justify-between gap-4 pb-4"
        style={{ borderBottom: '1px solid rgb(var(--sx-border-2))' }}
      >
        <div>
          <h1 className="text-xl font-semibold text-stone-100">{monthLabel}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--st-500))' }}>
            {bsMonthLabel && <span className="font-mono">{bsMonthLabel}</span>}
            {bsMonthLabel && monthTaskCount > 0 && ' · '}
            {monthTaskCount} task{monthTaskCount === 1 ? '' : 's'} due this month
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftMonth(-1)}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'rgb(var(--st-500))' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-300))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-500))'; }}
            title="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => shiftMonth(1)}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'rgb(var(--st-500))' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-300))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-500))'; }}
            title="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div>
        {/* Month grid. Always full width: opening the day dialog overlays
            the grid rather than displacing it, so the calendar never
            reflows or rescales under the user. */}
        <div>
          <div className="grid grid-cols-7 gap-px mb-1">
            {WEEKDAYS.map(d => (
              <div
                key={d}
                className="text-center text-xs font-medium py-2"
                style={{ color: 'rgb(var(--st-600))' }}
              >
                {d}
              </div>
            ))}
          </div>

          <div
            className="grid grid-cols-7 gap-px rounded-xl overflow-hidden"
            style={{ background: 'rgb(var(--sx-border))', border: '1px solid rgb(var(--sx-border))' }}
          >
            {grid.map(dateStr => {
              const inMonth = dateStr.startsWith(month);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;
              const count = tasksByDay.get(dateStr)?.length ?? 0;
              const holiday = getHolidaysOn(dateStr)[0];
              const nonWorking = isWeekend(dateStr) || isPublicHoliday(dateStr);
              const bs = toNepaliDate(dateStr);

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  title={[
                    formatDateLabel(dateStr),
                    bs ? `Bikram Sambat ${formatNepaliDate(bs)}` : null,
                    holiday ? holiday.name : null,
                  ].filter(Boolean).join(' — ') || undefined}
                  className="relative flex flex-col items-start p-2 min-h-[6.5rem] text-left transition-colors"
                  style={{
                    background: isSelected
                      ? 'rgb(var(--sx-card))'
                      : inMonth
                        ? 'rgb(var(--sx-modal))'
                        : 'rgb(var(--sx-bg))',
                    borderTop: isToday ? '2px solid rgb(var(--am-500))' : '2px solid transparent',
                    opacity: inMonth ? 1 : 0.45,
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgb(var(--sx-header))';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      (e.currentTarget as HTMLElement).style.background = inMonth
                        ? 'rgb(var(--sx-modal))'
                        : 'rgb(var(--sx-bg))';
                    }
                  }}
                >
                  <span
                    className={`text-sm font-mono ${isToday ? 'font-semibold' : ''}`}
                    style={{
                      color: isToday
                        ? 'rgb(var(--am-300))'
                        : nonWorking
                          ? 'rgb(var(--st-600))'
                          : 'rgb(var(--st-300))',
                    }}
                  >
                    {Number(dateStr.slice(8, 10))}
                  </span>

                  {holiday && (
                    <span
                      className="text-xs leading-tight mt-1 line-clamp-2"
                      style={{ color: isPublicHoliday(dateStr) ? 'var(--rose)' : 'rgb(var(--st-600))' }}
                    >
                      {holidayShortName(dateStr)}
                    </span>
                  )}

                  {/* Bottom right: the Bikram Sambat date, as written on a Nepali patro.
                      A Gregorian month straddles two BS months, so this is
                      the only place the two calendars line up per day. */}
                  {bs && (
                    <span
                      className="absolute bottom-1.5 right-1.5 text-xs font-mono leading-none"
                      style={{
                        /* st-500, not st-600: at 11px the dimmer token fell
                           to 4.2:1 against --sx-modal, under the 4.5 AA
                           threshold for small text. The date is small and
                           peripheral, which is exactly the case where low
                           contrast is least forgivable. */
                        color: isToday ? 'rgb(var(--am-300))' : 'rgb(var(--st-500))',
                        opacity: inMonth ? 1 : 0.6,
                      }}
                    >
                      {formatNepaliShort(bs)}
                    </span>
                  )}

                  {count > 0 && (
                    <span
                      className="mt-auto text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ background: 'rgb(var(--sx-raised))', color: 'rgb(var(--st-400))' }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          </div>
        {/* Day dialog. A fixed overlay rather than a second column: the
            calendar keeps its full width and its scroll position, so
            opening a day never resizes the grid under the pointer. */}
        {selectedDate && (
          <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-[8vh] overflow-y-auto"
            onClick={e => { if (e.target === e.currentTarget) setSelectedDate(null); }}
          >
            <div
              className="w-full max-w-md rounded-xl space-y-3 view-enter"
              style={{
                background: 'rgb(var(--sx-modal))',
                border: '1px solid rgb(var(--sx-border-2))',
                boxShadow: 'var(--shadow-modal)',
              }}
            >
              <div className="p-4 pb-3 space-y-3" style={{ borderBottom: '1px solid rgb(var(--sx-border))' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-stone-100">
                      {formatDateLabel(selectedDate)}
                    </h2>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xs font-mono" style={{ color: 'rgb(var(--st-500))' }}>
                        {formatDateNPT(selectedDate + 'T00:00:00', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      {selectedBs && (
                        <span
                          className="text-xs font-mono leading-none"
                          style={{ color: 'rgb(var(--am-400))' }}
                          title={formatNepaliDate(selectedBs) ?? undefined}
                        >
                          {formatNepaliMonthDay(selectedBs)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="p-1 rounded transition-colors flex-shrink-0"
                    style={{ color: 'rgb(var(--st-500))' }}
                    title="Close (Esc)"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                {selectedHolidays.length > 0 && (
                  <ul className="space-y-1">
                    {selectedHolidays.map(h => (
                      <li key={h.name} className="text-xs" style={{ color: 'rgb(var(--st-500))' }}>
                        <span style={{ color: h.type === 'public' ? 'var(--rose)' : 'rgb(var(--st-600))' }}>
                          {h.name}
                        </span>
                        {h.provisional && <span className="ml-1.5 opacity-60">(unconfirmed)</span>}
                      </li>
                    ))}
                  </ul>
                )}

                <form onSubmit={handleCapture} className="relative">
                  <input
                    type="text"
                    value={capture}
                    onChange={e => setCapture(e.target.value)}
                    placeholder={`Add a task for ${formatDateLabel(selectedDate).toLowerCase()}…`}
                    className="w-full bg-[rgb(var(--sx-card))] border border-[rgb(var(--sx-border-2))] rounded-lg pl-3 pr-16 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                    style={{ color: 'rgb(var(--st-100))' }}
                  />
                  <button
                    type="submit"
                    disabled={!capture.trim() || isCapturing}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded text-xs font-medium transition-colors disabled:opacity-40"
                    style={{ background: 'rgb(var(--sx-raised))', color: 'rgb(var(--st-300))' }}
                  >
                    Add
                  </button>
                </form>
              </div>

              <ul className="p-2 space-y-px max-h-[50vh] overflow-y-auto">
                {selectedTasks.length === 0 ? (
                  <li className="text-sm py-6 text-center" style={{ color: 'rgb(var(--st-600))' }}>
                    Nothing due.
                  </li>
                ) : (
                  selectedTasks.map(task => {
                    const isDone = task.status === 'done';
                    return (
                      <li
                        key={task.id}
                        className="group flex items-center gap-3 px-3 py-2 rounded transition-colors"
                        style={{
                          background: 'rgb(var(--sx-header))',
                          borderLeft: !isDone && (task.priority === 'urgent' || task.priority === 'high')
                            ? '2px solid rgb(var(--am-500))'
                            : '2px solid transparent',
                          opacity: isDone ? 0.5 : 1,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgb(var(--sx-card))'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgb(var(--sx-header))'; }}
                      >
                        <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
                          <AnimatedCheck
                            isDone={isDone}
                            onClick={e => { e.stopPropagation(); onToggleComplete(task); }}
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
                        {!isDone && task.estimated_minutes ? (
                          <span className="text-xs font-mono flex-shrink-0" style={{ color: 'rgb(var(--st-600))' }}>
                            ~{task.estimated_minutes}m
                          </span>
                        ) : null}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
