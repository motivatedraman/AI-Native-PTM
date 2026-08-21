import { useMemo } from 'react';
import { Task } from '../types';
import { dateStrNPT, todayNPT, offsetDateNPT } from './time';

/**
 * Calculates the user's current daily completion streak.
 * A "day" counts if at least 1 task was completed that day.
 * Accounts for NPT timezone and ensures continuous consecutive tracking.
 */
export const useStreak = (tasks: Task[]): number => {
  return useMemo(() => {
    if (!tasks || tasks.length === 0) return 0;

    const completedDates = tasks
      .filter(t => t.status === 'done' && t.completed_at)
      .map(t => dateStrNPT(t.completed_at))
      .filter((d): d is string => Boolean(d));

    if (completedDates.length === 0) return 0;

    const dateSet = new Set(completedDates);
    const today = todayNPT();
    const yesterday = offsetDateNPT(-1);

    // Determine starting day offset
    let dayOffset = 0;
    if (dateSet.has(today)) {
      dayOffset = 0;
    } else if (dateSet.has(yesterday)) {
      dayOffset = -1;
    } else {
      // Check if there are any completions on or after today (handles client/server clock variance)
      const hasRecent = Array.from(dateSet).some(d => d >= today);
      if (hasRecent) {
        dayOffset = 0;
      } else {
        return 0;
      }
    }

    let streak = 0;
    // Walk backward one day at a time
    while (true) {
      const targetDate = offsetDateNPT(dayOffset);
      if (dateSet.has(targetDate)) {
        streak++;
        dayOffset--;
      } else {
        break;
      }
    }

    return streak;
  }, [tasks]);
};
