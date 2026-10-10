import React from 'react';
import { Task } from '../types';

interface ManualViewProps {
  tasks: Task[];
  onClose: () => void;
  onOpenQuickAdd: () => void;
  onOpenCommandPalette: () => void;
  onOpenAIAssistant: () => void;
  onOpenPlanDay: () => void;
}

/* Every binding listed here is implemented in App.tsx's keydown handler.
   Kept in one table so the two can't drift apart. */
const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['N'], label: 'Capture a task. Focuses the inline field on Today, opens the full capture elsewhere.' },
  { keys: ['⌘', 'N'], label: 'Full capture, from anywhere.' },
  { keys: ['A'], label: 'AI assistant: chat, recommendations, suggestions' },
  { keys: ['P'], label: 'Plan my day' },
  { keys: ['/'], label: 'Command palette and search' },
  { keys: ['T'], label: 'Go to Today' },
  { keys: ['I'], label: 'Go to Inbox' },
  { keys: ['K'], label: 'Go to Kanban' },
  { keys: ['C'], label: 'Go to Calendar' },
  { keys: ['J'], label: 'Create or manage projects' },
  { keys: ['D'], label: 'Go to Daily Log' },
  { keys: ['W'], label: 'Go to Weekly Review' },
  { keys: ['M'], label: 'Open or close this manual' },
  { keys: ['Esc'], label: 'Close whatever is open' },
];

const PAGES: Array<{ name: string; blurb: string }> = [
  { name: 'Today', blurb: "This day's tasks, newest and most urgent first. Capture inline at the top." },
  { name: 'Inbox', blurb: 'Untriaged captures. Dump text, let the parser fill in the details, then plan them.' },
  { name: 'Kanban', blurb: 'Drag cards between Inbox, Planned, Doing and Done to change state.' },
  { name: 'Calendar', blurb: 'Month grid with Nepali public holidays marked. Click a day to see and add its tasks.' },
  { name: 'Daily Log', blurb: 'What happened on a given day, generated from task activity.' },
  { name: 'Weekly Review', blurb: 'Completion rate, highlights, patterns and suggestions for the week.' },
];

export const ManualView: React.FC<ManualViewProps> = ({
  tasks,
  onClose,
  onOpenQuickAdd,
  onOpenCommandPalette,
  onOpenAIAssistant,
  onOpenPlanDay,
}) => {
  const openCount = tasks.filter(t => t.status !== 'done').length;

  const run = (fn: () => void) => {
    onClose();
    // Let the view unmount before opening an overlay on top of it.
    setTimeout(fn, 0);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-end justify-between pb-4" style={{ borderBottom: '1px solid rgb(var(--sx-border-2))' }}>
        <div>
          <h1 className="text-xl font-semibold text-stone-100">Manual</h1>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--st-500))' }}>
            {openCount} open tasks · everything below works from any page
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-sm transition-colors"
          style={{ color: 'rgb(var(--st-500))' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-300))'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgb(var(--st-500))'; }}
        >
          Close
        </button>
      </div>

      <section>
        <h2 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--st-600))' }}>
          Keyboard
        </h2>
        <dl className="space-y-1">
          {SHORTCUTS.map(s => (
            <div key={s.keys.join('+')} className="flex items-baseline gap-4 py-1.5">
              <dt className="flex-shrink-0 w-20 flex gap-1">
                {s.keys.map(k => (
                  <kbd key={k} className="kbd-badge">{k}</kbd>
                ))}
              </dt>
              <dd className="text-sm" style={{ color: 'rgb(var(--st-400))' }}>{s.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--st-600))' }}>
          Pages
        </h2>
        <dl className="space-y-2.5">
          {PAGES.map(p => (
            <div key={p.name}>
              <dt className="text-sm font-medium" style={{ color: 'rgb(var(--st-200))' }}>{p.name}</dt>
              <dd className="text-sm mt-0.5" style={{ color: 'rgb(var(--st-500))' }}>{p.blurb}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--st-600))' }}>
          Things worth knowing
        </h2>
        <ul className="space-y-2">
          <li className="text-sm" style={{ color: 'rgb(var(--st-400))' }}>
            <span style={{ color: 'rgb(var(--st-600))' }}>Shortcuts are suspended while a focus timer runs</span>.
            so a keypress can't interrupt a session by accident.
          </li>
          <li className="text-sm" style={{ color: 'rgb(var(--st-400))' }}>
            <span style={{ color: 'rgb(var(--st-600))' }}>Shortcuts don't fire inside text inputs</span>.
            typing a title with a "k" in it won't navigate away.
          </li>
          <li className="text-sm" style={{ color: 'rgb(var(--st-400))' }}>
            <span style={{ color: 'rgb(var(--st-600))' }}>Captured text is parsed by the AI</span> - dates,
            durations and categories get filled in where it can infer them. The inline field on Today skips
            that, because "today" is already the intent.
          </li>
          <li className="text-sm" style={{ color: 'rgb(var(--st-400))' }}>
            <span style={{ color: 'rgb(var(--st-600))' }}>AI needs a working model</span> - if a call fails the
            app falls back to heuristics rather than erroring.
          </li>
        </ul>
      </section>

      {/* Shortcuts again as real buttons, for when you've forgotten them
          rather than merely misplaced them. */}
      <section>
        <h2 className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--st-600))' }}>
          Try one
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => run(onOpenQuickAdd)}
            className="px-3 py-1.5 rounded text-sm transition-colors"
            style={{ background: 'rgb(var(--sx-card))', border: '1px solid rgb(var(--sx-border-2))', color: 'rgb(var(--st-300))' }}
          >
            Capture a task
          </button>
          <button
            onClick={() => run(onOpenCommandPalette)}
            className="px-3 py-1.5 rounded text-sm transition-colors"
            style={{ background: 'rgb(var(--sx-card))', border: '1px solid rgb(var(--sx-border-2))', color: 'rgb(var(--st-300))' }}
          >
            Command palette
          </button>
          <button
            onClick={() => run(onOpenAIAssistant)}
            className="px-3 py-1.5 rounded text-sm transition-colors"
            style={{ background: 'rgb(var(--sx-card))', border: '1px solid rgb(var(--sx-border-2))', color: 'rgb(var(--st-300))' }}
          >
            AI assistant
          </button>
          <button
            onClick={() => run(onOpenPlanDay)}
            className="px-3 py-1.5 rounded text-sm transition-colors"
            style={{ background: 'rgb(var(--sx-card))', border: '1px solid rgb(var(--sx-border-2))', color: 'rgb(var(--st-300))' }}
          >
            Plan my day
          </button>
        </div>
      </section>
    </div>
  );
};