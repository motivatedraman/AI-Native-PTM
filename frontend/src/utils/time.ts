/** Nepal Standard Time — UTC+5:45 */
const TZ = 'Asia/Kathmandu';

/**
 * Parse a datetime string as UTC.
 * Backend stores naive UTC datetimes like "2026-08-18T10:30:00" without a
 * timezone suffix. JavaScript's new Date() treats those as *local* time,
 * which causes double-conversion when we then format to NPT.
 * Appending "Z" forces UTC interpretation.
 */
function asUTC(iso: string): Date {
  // Already has a timezone suffix — leave it alone
  if (iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso)) {
    return new Date(iso);
  }
  return new Date(iso + 'Z');
}

/** Current hour (0-23) in NPT — for greeting logic */
export function currentHourNPT(): number {
  return parseInt(
    new Date().toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }),
    10
  );
}

/** Today's date string in NPT (YYYY-MM-DD) */
export function todayNPT(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
}

/** Format a UTC ISO string to a localised date string in NPT */
export function formatDateNPT(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  if (!iso) return '—';
  return asUTC(iso).toLocaleDateString('en-US', { timeZone: TZ, ...opts });
}

/** Format a UTC ISO string to a time string in NPT (HH:MM) */
export function formatTimeNPT(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string {
  if (!iso) return '—';
  return asUTC(iso).toLocaleTimeString('en-US', { timeZone: TZ, ...opts });
}

/** Extract YYYY-MM-DD date string from a UTC ISO datetime in NPT */
export function dateStrNPT(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return asUTC(iso).toLocaleDateString('sv-SE', { timeZone: TZ });
}

/** Get a date N days from today in NPT (YYYY-MM-DD) */
export function offsetDateNPT(days: number): string {
  const now = new Date();
  const offset = new Date(now.getTime() + days * 86400000);
  return offset.toLocaleDateString('sv-SE', { timeZone: TZ });
}

/** Format a YYYY-MM-DD string into a human-readable label */
export function formatDateLabel(dateStr: string): string {
  const today = todayNPT();
  if (dateStr === today) return 'Today';
  const tomorrow = offsetDateNPT(1);
  if (dateStr === tomorrow) return 'Tomorrow';
  const yesterday = offsetDateNPT(-1);
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
