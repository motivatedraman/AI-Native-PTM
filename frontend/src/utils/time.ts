/** Nepal Standard Time — UTC+5:45 */
const TZ = 'Asia/Kathmandu';

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
  return new Date(iso).toLocaleDateString('en-US', { timeZone: TZ, ...opts });
}

/** Format a UTC ISO string to a time string in NPT (HH:MM) */
export function formatTimeNPT(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { timeZone: TZ, ...opts });
}
