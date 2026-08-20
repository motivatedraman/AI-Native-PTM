import { useMemo } from 'react';
import { Task } from '../types';

/**
 * Calculates the user's current daily completion streak.
 * A "day" counts if at least 1 task was completed that day.
 */
export const useStreak = (tasks: Task[]): number => {
  return useMemo(() => {
    const completedDates = tasks
      .filter(t => t.status === 'done' && t.completed_at)
      .map(t => {
        const d = new Date(t.completed_at!);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      });

    if (completedDates.length === 0) return 0;

    const uniqueDates = Array.from(new Set(completedDates)).sort().reverse();

    // Check if today or yesterday has a completion (streak still alive)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (uniqueDates[0] !== todayStr && uniqueDates[0] !== yesterdayStr) return 0;

    // Count consecutive days going backward
    let streak = 0;
    let checkDate = uniqueDates[0] === todayStr ? today : yesterday;

    for (const dateStr of uniqueDates) {
      const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (dateStr === checkStr) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [tasks]);
};
