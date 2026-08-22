import { useCallback, useEffect, useRef, useState } from 'react';
import { FocusFinishedResult, FocusPhase, FocusSession } from '../types';
import { api } from '../services/api';

const STORAGE_KEY = 'nexus_focus_session_v1';
export const BREAK_REMINDER_THRESHOLD_MIN = 60;
export const BREAK_LENGTH_MS = 5 * 60 * 1000;

interface PersistedFocusState {
  version: 1;
  sessionId: number | null;
  taskId: number | null;
  taskTitle: string;
  plannedMinutes: number;
  /** Epoch ms when the focus clock started ticking */
  startedAtEpoch: number;
  /** Total ms subtracted for pauses/breaks so far */
  pausedAccumMs: number;
  /** Epoch ms when the clock was frozen (paused or in-break), null while ticking */
  frozenAtEpoch: number | null;
  phase: FocusPhase;
  breakEndsAtEpoch: number | null;
  reminderHandled: boolean;
  breakTaken: boolean;
}

interface UseFocusTimerOptions {
  onStarted?: (session: FocusSession) => void;
  onBreakEnded?: () => void;
  onFinished?: (result: FocusFinishedResult) => void;
}

function loadPersisted(): PersistedFocusState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 1 || typeof parsed.plannedMinutes !== 'number') return null;
    return parsed as PersistedFocusState;
  } catch {
    return null;
  }
}

function persist(state: PersistedFocusState | null) {
  try {
    if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

function elapsedOf(state: PersistedFocusState, atMs: number): number {
  return Math.max(0, (state.frozenAtEpoch ?? atMs) - state.startedAtEpoch - state.pausedAccumMs);
}

/**
 * Client-side focus timer engine.
 * Time math is epoch-based so it stays accurate across re-renders,
 * tab suspension and full page reloads (state persists in localStorage).
 */
export function useFocusTimer(options: UseFocusTimerOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [session, setSession] = useState<PersistedFocusState | null>(loadPersisted);
  const [now, setNow] = useState(() => Date.now());
  const didRestoreCheck = useRef(false);

  // Always-fresh mirror for callbacks/effects
  const sessionRef = useRef<PersistedFocusState | null>(session);
  sessionRef.current = session;

  // ── Derived time math ──────────────────────
  const elapsedMs = session ? elapsedOf(session, now) : 0;
  const plannedMs = session ? session.plannedMinutes * 60 * 1000 : 0;
  const remainingMs = Math.max(0, plannedMs - elapsedMs);
  const progress = plannedMs > 0 ? Math.min(1, elapsedMs / plannedMs) : 0;
  const breakRemainingMs =
    session?.phase === 'break' && session.breakEndsAtEpoch
      ? Math.max(0, session.breakEndsAtEpoch - now)
      : 0;
  const isBreakDue =
    !!session &&
    session.phase === 'running' &&
    session.plannedMinutes > BREAK_REMINDER_THRESHOLD_MIN &&
    elapsedMs >= plannedMs / 2 &&
    !session.reminderHandled;

  // ── Tick ───────────────────────────────────
  const hasSession = session !== null;
  useEffect(() => {
    if (!hasSession) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [hasSession]);

  // ── Auto transitions ───────────────────────
  useEffect(() => {
    if (!session) return;

    // Break over -> unfreeze the focus clock
    if (session.phase === 'break' && session.breakEndsAtEpoch && now >= session.breakEndsAtEpoch) {
      const endedAt = session.breakEndsAtEpoch;
      const next: PersistedFocusState = {
        ...session,
        phase: 'running',
        pausedAccumMs: session.pausedAccumMs + (endedAt - (session.frozenAtEpoch ?? endedAt)),
        frozenAtEpoch: null,
        breakEndsAtEpoch: null,
      };
      setSession(next);
      persist(next);
      optionsRef.current.onBreakEnded?.();
      return;
    }

    // Focus clock ran out
    if ((session.phase === 'running' || session.phase === 'paused') && remainingMs <= 0) {
      const next: PersistedFocusState = { ...session, phase: 'finished' };
      setSession(next);
      persist(next);
    }
  }, [session, now, remainingMs]);

  // ── Restore check: session expired while the app was closed ──
  useEffect(() => {
    if (didRestoreCheck.current) return;
    didRestoreCheck.current = true;
    const restored = loadPersisted();
    if (!restored || restored.phase === 'finished') return;
    const restoredElapsed = elapsedOf(restored, Date.now());
    const expired = restoredElapsed >= restored.plannedMinutes * 60 * 1000;
    const stale = Date.now() - restored.startedAtEpoch > 24 * 60 * 60 * 1000;
    if (expired || stale) {
      const result: FocusFinishedResult = {
        sessionId: restored.sessionId,
        taskId: restored.taskId,
        taskTitle: restored.taskTitle,
        plannedMinutes: restored.plannedMinutes,
        actualMinutes: Math.min(restored.plannedMinutes, Math.round(restoredElapsed / 60000)),
        status: 'completed',
        breakTaken: restored.breakTaken,
      };
      setSession(null);
      persist(null);
      window.setTimeout(() => optionsRef.current.onFinished?.(result), 0);
    }
  }, []);

  // ── Actions ────────────────────────────────
  const start = useCallback(async (taskId: number | null, taskTitle: string, plannedMinutes: number) => {
    let created: FocusSession | null = null;
    try {
      created = await api.startFocusSession(taskId, plannedMinutes);
    } catch (err) {
      console.error('Failed to register focus session on server, continuing locally:', err);
    }

    const state: PersistedFocusState = {
      version: 1,
      sessionId: created?.id ?? null,
      taskId,
      taskTitle,
      plannedMinutes,
      startedAtEpoch: Date.now(),
      pausedAccumMs: 0,
      frozenAtEpoch: null,
      phase: 'running',
      breakEndsAtEpoch: null,
      reminderHandled: false,
      breakTaken: false,
    };
    setNow(Date.now());
    setSession(state);
    persist(state);
    if (created) optionsRef.current.onStarted?.(created);
  }, []);

  const pause = useCallback(() => {
    const prev = sessionRef.current;
    if (!prev || prev.phase !== 'running') return;
    const next: PersistedFocusState = { ...prev, phase: 'paused', frozenAtEpoch: Date.now() };
    setSession(next);
    persist(next);
  }, []);

  const resume = useCallback(() => {
    const prev = sessionRef.current;
    if (!prev || prev.phase !== 'paused') return;
    const extraPause = Date.now() - (prev.frozenAtEpoch ?? Date.now());
    const next: PersistedFocusState = {
      ...prev,
      phase: 'running',
      pausedAccumMs: prev.pausedAccumMs + extraPause,
      frozenAtEpoch: null,
    };
    setSession(next);
    persist(next);
  }, []);

  /** Extend the session by n minutes (also revives a finished session). */
  const extend = useCallback((minutes: number) => {
    const prev = sessionRef.current;
    if (!prev || prev.phase === 'break') return;
    const next: PersistedFocusState = {
      ...prev,
      plannedMinutes: prev.plannedMinutes + minutes,
      phase: 'running',
      reminderHandled: true,
    };
    setSession(next);
    persist(next);
  }, []);

  const dismissReminder = useCallback(() => {
    const prev = sessionRef.current;
    if (!prev) return;
    const next: PersistedFocusState = { ...prev, reminderHandled: true };
    setSession(next);
    persist(next);
  }, []);

  const takeBreak = useCallback(() => {
    const prev = sessionRef.current;
    if (!prev || prev.phase !== 'running') return;
    const ts = Date.now();
    const next: PersistedFocusState = {
      ...prev,
      phase: 'break',
      frozenAtEpoch: ts,
      breakEndsAtEpoch: ts + BREAK_LENGTH_MS,
      reminderHandled: true,
      breakTaken: true,
    };
    setSession(next);
    persist(next);
  }, []);

  const skipBreak = useCallback(() => {
    const prev = sessionRef.current;
    if (!prev || prev.phase !== 'break') return;
    const ts = Date.now();
    const next: PersistedFocusState = {
      ...prev,
      phase: 'running',
      pausedAccumMs: prev.pausedAccumMs + (ts - (prev.frozenAtEpoch ?? ts)),
      frozenAtEpoch: null,
      breakEndsAtEpoch: null,
    };
    setSession(next);
    persist(next);
  }, []);

  const buildResult = (state: PersistedFocusState, status: 'completed' | 'abandoned'): FocusFinishedResult => {
    const rawElapsedMin = elapsedOf(state, Date.now()) / 60000;
    const actualMinutes =
      status === 'completed'
        ? state.plannedMinutes
        : Math.min(state.plannedMinutes, Math.floor(rawElapsedMin));
    return {
      sessionId: state.sessionId,
      taskId: state.taskId,
      taskTitle: state.taskTitle,
      plannedMinutes: state.plannedMinutes,
      actualMinutes,
      status,
      breakTaken: state.breakTaken,
    };
  };

  /** End early: logs elapsed minutes and closes focus mode immediately. */
  const finishAbandoned = useCallback(() => {
    const cur = sessionRef.current;
    if (!cur) return;
    const result = buildResult(cur, 'abandoned');
    setSession(null);
    persist(null);
    optionsRef.current.onFinished?.(result);
  }, []);

  /** Called from the completion screen ("Done") to log & exit. */
  const commitFinished = useCallback(() => {
    const cur = sessionRef.current;
    if (!cur) return;
    const result = buildResult(cur, 'completed');
    setSession(null);
    persist(null);
    optionsRef.current.onFinished?.(result);
  }, []);

  return {
    session,
    phase: session?.phase ?? null,
    remainingMs,
    elapsedMs,
    plannedMinutes: session?.plannedMinutes ?? 0,
    progress,
    breakRemainingMs,
    isBreakDue,
    isActive: session !== null,
    start,
    pause,
    resume,
    extend,
    dismissReminder,
    takeBreak,
    skipBreak,
    finishAbandoned,
    commitFinished,
  };
}

export type FocusTimerApi = ReturnType<typeof useFocusTimer>;
