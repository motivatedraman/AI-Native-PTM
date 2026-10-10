/** Nepal Standard Time. UTC+5:45 (no DST) */
const TZ = 'Asia/Kathmandu';
const NPT_OFFSET_MINUTES = 5 * 60 + 45;

/**
 * Parse a backend datetime string as an instant.
 *
 * Timestamps are stored as TIMESTAMPTZ, so the backend sends an explicit
 * offset ("2026-08-18T10:30:00+00:00") and new Date() reads that directly.
 * Values predating the timestamptz migration are bare wall clock with no
 * suffix; those were written as UTC, so 'Z' is appended to keep them
 * meaning the same instant rather than being re-read as browser-local time.
 */
function asUTC(iso: string): Date {
  // Already has a timezone suffix, leave it alone
  if (iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso)) {
    return new Date(iso);
  }
  return new Date(iso + 'Z');
}

/** Current hour (0-23) in NPT, for greeting logic */
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
  if (!iso) return ', ';
  return asUTC(iso).toLocaleDateString('en-US', { timeZone: TZ, ...opts });
}

/** Format a UTC ISO string to a time string in NPT (HH:MM) */
export function formatTimeNPT(
  iso: string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string {
  if (!iso) return ', ';
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

/* ── Calendar arithmetic ───────────────────────────────────────────
   Pure 'YYYY-MM-DD' string maths on a day-granular value. Deliberately
   independent of Date's timezone behaviour: these strings name a day in
   Nepal, so constructing them with `new Date('2026-10-09')` would parse
   as UTC midnight and then render as the previous day for anyone west of
   Greenwich. A UTC-backed Date used only as a day counter sidesteps that
   entirely, and offsetDateNPT above has the same caveat in reverse. */

/** Add days to a YYYY-MM-DD string. Negative values go backwards. */
export function addDaysToDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(
    next.getUTCDate()
  ).padStart(2, '0')}`;
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD string. */
export function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** First day of the month containing dateStr, as YYYY-MM-DD. */
export function startOfMonth(dateStr: string): string {
  return dateStr.slice(0, 8) + '01';
}

export function addMonthsToDate(dateStr: string, months: number): string {
  const [y, m] = dateStr.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = total % 12;
  // Clamp to the last valid day so 31 Jan plus one month is 28/29 Feb
  // rather than rolling into March.
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(Math.min(Number(dateStr.slice(8, 10)), lastDay)).padStart(2, '0')}`;
}

/**
 * A 6x7 grid of YYYY-MM-DD covering the month that contains dateStr.
 *
 * Always 42 cells, leading and trailing days included, so the grid never
 * reflows between months. Nepal's week starts on Saturday, which is why
 * the padding is computed against Saturday rather than Monday.
 */
export function monthGrid(dateStr: string): string[] {
  const first = startOfMonth(dateStr);
  const lead = (dayOfWeek(first) + 1) % 7; // Saturday = 0
  const gridStart = addDaysToDate(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDaysToDate(gridStart, i));
}

/**
 * Convert a stored UTC ISO datetime to a value for <input type="datetime-local">
 * showing NPT wall-clock time (YYYY-MM-DDTHH:mm). Independent of browser timezone.
 */
export function utcToNPTInput(iso: string): string {
  const formatted = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(asUTC(iso));
  return formatted.replace(' ', 'T');
}

/**
 * Convert a datetime-local input value (interpreted as NPT wall clock)
 * to an ISO instant for the backend (YYYY-MM-DDTHH:MM:SS.sssZ).
 *
 * The offset is explicit rather than sliced off. A bare wall-clock string
 * carries no zone, so the server would have to guess one from its own
 * session -- which is how a Kathmandu-set database ended up storing
 * browser-written due dates 05:45 out.
 * Returns null for empty/invalid input.
 */
export function nptInputToUTC(value: string): string | null {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  return nptWallClockToUTCISO(m[1], m[2], m[3], m[4], m[5]);
}

/**
 * Build an ISO instant from an NPT wall-clock date and time.
 *
 * Independent of the browser's own timezone, which is the entire point:
 * a capture typed as "09:00" must mean 09:00 in Nepal regardless of
 * whether the laptop is set to Kathmandu, UTC or anything else.
 */
export function nptWallClockToUTCISO(
  dateStr: string,
  hour = '00',
  minute = '00',
  second = '00',
  ms = '000'
): string {
  const [y, mo, d] = dateStr.split('-');
  const utcMs = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(hour),
    Number(minute),
    Number(second),
    Number(ms)
  ) - NPT_OFFSET_MINUTES * 60000;
  return new Date(utcMs).toISOString();
}
