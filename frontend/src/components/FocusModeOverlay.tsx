import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCircle2, Coffee, Pause, Play, Plus, Power } from 'lucide-react';
import { FocusTimerApi } from '../hooks/useFocusTimer';
import { playFocusChime } from '../utils/chime';

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface FocusModeOverlayProps {
  focus: FocusTimerApi;
}

export const FocusModeOverlay: React.FC<FocusModeOverlayProps> = ({ focus }) => {
  const [wallClock, setWallClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const [confirmEnd, setConfirmEnd] = useState(false);

  const { session, phase } = focus;

  useEffect(() => {
    if (!focus.isActive) return;
    const interval = window.setInterval(
      () => setWallClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
      1000
    );
    return () => window.clearInterval(interval);
  }, [focus.isActive]);

  useEffect(() => {
    const originalTitle = document.title;
    return () => {
      document.title = originalTitle;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    if (phase === 'break') document.title = `Break ${formatCountdown(focus.breakRemainingMs)} · Nexus`;
    else if (phase === 'finished') document.title = `Session complete · ${session.taskTitle}`;
    else document.title = `${formatCountdown(focus.remainingMs)} · ${session.taskTitle}`;
  }, [session, phase, focus.remainingMs, focus.breakRemainingMs]);

  const prevPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (phase !== prev && phase !== null) {
      if (phase === 'finished') playFocusChime('complete');
      else if (phase === 'running' && prev === 'break') playFocusChime('break-over');
      prevPhaseRef.current = phase;
    }
  }, [phase]);

  const wasBreakDueRef = useRef(false);
  useEffect(() => {
    if (focus.isBreakDue && !wasBreakDueRef.current) playFocusChime('reminder');
    wasBreakDueRef.current = focus.isBreakDue;
  }, [focus.isBreakDue]);

  useEffect(() => {
    if (!confirmEnd) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmEnd(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirmEnd]);

  if (!focus.isActive || !session) return null;

  const elapsedFocusedMin = Math.floor(focus.elapsedMs / 60000);
  const isLongSession = session.plannedMinutes > 60;

  const ringRadius = 148;
  const ringCircumference = 2 * Math.PI * ringRadius;

  const ghostBtn =
    'flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/15 text-sm font-medium text-stone-300 hover:bg-white/5 hover:text-stone-100 transition-colors';

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center overflow-hidden select-none"
      style={{ background: 'rgba(12, 9, 6, 0.97)', backdropFilter: 'blur(28px)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          width: '900px',
          height: '900px',
          transform: 'translate(-50%, -50%)',
          background:
            phase === 'break'
              ? 'radial-gradient(circle, rgba(20, 184, 166, 0.10) 0%, transparent 60%)'
              : 'radial-gradient(circle, rgba(171, 118, 49, 0.12) 0%, transparent 60%)',
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-6 lg:px-8 py-5 z-10">
        <span
          className="text-[11px] font-mono uppercase tracking-[0.35em]"
          style={{ color: 'rgb(var(--st-600))' }}
        >
          Nexus · Focus Mode
        </span>
        <span className="font-mono text-sm text-stone-400 tabular-nums">{wallClock}</span>
      </div>

      {/* Mid-session break reminder */}
      {focus.isBreakDue && (
        <div className="absolute top-16 lg:top-20 inset-x-0 flex justify-center z-20 animate-slide-up-fade">
          <div className="flex items-center gap-4 px-5 py-3 rounded-2xl border border-amber-500/30 bg-amber-950/60 backdrop-blur-md shadow-xl">
            <Bell size={18} className="text-amber-300 flex-shrink-0" />
            <span className="text-sm text-amber-100">
              Halfway there — a 5-minute break keeps the streak alive.
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={focus.takeBreak}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors"
              >
                Take 5-min break
              </button>
              <button
                onClick={focus.dismissReminder}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-200/70 hover:text-amber-100 hover:bg-amber-900/40 transition-colors"
              >
                Keep going
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Center content ── */}
      <div className="relative flex-1 w-full flex items-center justify-center">
        {phase === 'break' ? (
          /* ── Break mode ── */
          <div className="flex flex-col items-center gap-6 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center animate-float">
              <Coffee size={28} className="text-teal-300" />
            </div>
            <div>
              <p className="text-[11px] font-mono uppercase tracking-[0.35em] text-teal-400 mb-3">
                Break Time
              </p>
              <p
                className="font-mono font-bold text-stone-100 tabular-nums text-7xl md:text-8xl"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatCountdown(focus.breakRemainingMs)}
              </p>
            </div>
            <p className="text-sm text-stone-400 max-w-xs">
              Stretch, hydrate, look away from the screen. Your timer resumes automatically.
            </p>
            <button onClick={focus.skipBreak} className={ghostBtn}>
              Skip break
            </button>
          </div>
        ) : phase === 'finished' ? (
          /* ── Completion screen ── */
          <div className="flex flex-col items-center gap-6 text-center px-6 animate-slide-up-fade">
            <CheckCircle2 size={64} className="text-emerald-400 animate-check-pop" strokeWidth={1.5} />
            <div>
              <h1 className="text-3xl font-bold text-stone-100">Session complete</h1>
              <p className="text-sm text-stone-400 mt-3 max-w-md">
                Focused for{' '}
                <span className="font-mono font-semibold text-emerald-300">
                  {formatMinutes(session.plannedMinutes)}
                </span>{' '}
                on <span className="text-stone-200">“{session.taskTitle}”</span>
                {session.breakTaken && (
                  <span className="text-stone-500"> · included a break</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={() => focus.extend(5)} className={ghostBtn}>
                <Plus size={15} />
                5 more minutes
              </button>
              <button
                onClick={focus.commitFinished}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ab7631] hover:bg-[#cfa45f] text-white text-sm font-semibold transition-colors shadow-lg shadow-black/40"
              >
                Log time & close
              </button>
            </div>
            <p className="text-[11px] font-mono text-stone-600">
              Time will be added to this task's log.
            </p>
          </div>
        ) : (
          /* ── Running / paused clock ── */
          <div className="flex flex-col items-center gap-8">
            <div className="relative" style={{ width: 320, height: 320 }}>
              <svg width="320" height="320" className="-rotate-90">
                <circle
                  cx="160"
                  cy="160"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth="5"
                />
                <circle
                  cx="160"
                  cy="160"
                  r={ringRadius}
                  fill="none"
                  stroke={phase === 'paused' ? '#78716c' : '#ab7631'}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringCircumference * (1 - focus.progress)}
                  style={{ transition: 'stroke-dashoffset 0.4s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <p
                  className={`font-mono font-bold text-stone-100 text-6xl md:text-7xl ${phase === 'paused' ? 'opacity-50' : ''}`}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatCountdown(focus.remainingMs)}
                </p>
                <p
                  className={`text-[11px] font-mono uppercase tracking-[0.35em] ${
                    phase === 'paused' ? 'text-stone-500 animate-pulse' : 'text-amber-400'
                  }`}
                >
                  {phase === 'paused' ? 'Paused' : 'Focusing'}
                </p>
              </div>
            </div>

            <div className="text-center px-6 max-w-lg">
              <h2 className="text-xl font-semibold text-stone-100">{session.taskTitle}</h2>
              <p className="text-xs font-mono text-stone-500 mt-2">
                {isLongSession && 'long session · '}
                {formatMinutes(elapsedFocusedMin)} focused ·{' '}
                {formatMinutes(session.plannedMinutes)} planned
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 mt-2">
              {phase === 'paused' ? (
                <button
                  onClick={focus.resume}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#ab7631] hover:bg-[#cfa45f] text-white text-sm font-semibold transition-colors"
                >
                  <Play size={16} />
                  Resume
                </button>
              ) : (
                <button onClick={focus.pause} className={ghostBtn}>
                  <Pause size={16} />
                  Pause
                </button>
              )}

              <button onClick={() => focus.extend(5)} className={ghostBtn}>
                <Plus size={15} />
                5 min
              </button>

              {confirmEnd ? (
                <div className="flex items-center gap-2 pl-2">
                  <span className="text-xs text-stone-400">
                    Log {elapsedFocusedMin}m and exit?
                  </span>
                  <button
                    onClick={() => {
                      setConfirmEnd(false);
                      focus.finishAbandoned();
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-800 hover:bg-rose-700 text-white text-xs font-semibold transition-colors"
                  >
                    End session
                  </button>
                  <button
                    onClick={() => setConfirmEnd(false)}
                    className="px-3 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmEnd(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-rose-500/25 text-sm font-medium text-rose-400 hover:bg-rose-950/40 transition-colors"
                >
                  <Power size={15} />
                  End
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
