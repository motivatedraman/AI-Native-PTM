import holidayData from '../data/nepalHolidays.json';

/**
 * Nepali public holidays.
 *
 * Data lives in data/nepalHolidays.json and is maintained by hand once a
 * year, because no holiday API carries Nepal. Checked in order to be
 * found: Nager.Date -- the usual free option -- omits NP from its country
 * list entirely, and the alternatives either require an API key or return
 * 403 to scripted requests. A network call here would add a dependency and
 * a failure mode to a single-user app for data that changes annually.
 */

export type HolidayType = 'public' | 'optional' | 'local' | 'observance';

export interface Holiday {
  date: string;
  name: string;
  /** Devanagari name. Kept for reference and future use, but deliberately
   *  not rendered: none of this app's fonts carry Devanagari glyphs, so it
   *  needs an extra webfont to show at all. */
  name_np: string;
  type: HolidayType;
  /** Date not yet confirmed by the gazette. Lunar dates in a future BS
   *  year cannot be known in advance, so these are labelled, not hidden. */
  provisional?: boolean;
}

interface HolidayFile {
  holidays: Holiday[];
}

const ALL: Holiday[] = (holidayData as HolidayFile).holidays;

// One holiday can carry two entries for the same date (Buddha Jayanti and
// Labour Day both land on 1 May in 2026), and a day can also be several
// festivals at once. Group once at module load so lookups stay O(1).
const BY_DATE = new Map<string, Holiday[]>();
for (const h of ALL) {
  const list = BY_DATE.get(h.date);
  if (list) list.push(h);
  else BY_DATE.set(h.date, [h]);
}

export function getHolidaysOn(dateStr: string): Holiday[] {
  return BY_DATE.get(dateStr) ?? [];
}

export function isHoliday(dateStr: string): boolean {
  return BY_DATE.has(dateStr);
}

/** Only nationwide days off. Optional and regional leave is not a holiday
 *  for planning purposes: the week is still a working week. */
export function isPublicHoliday(dateStr: string): boolean {
  return getHolidaysOn(dateStr).some(h => h.type === 'public');
}

/** Saturdays and Sundays. Kept here rather than in the view so the weekend
 *  rule lives in one place next to the holiday rule. */
export function isWeekend(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

export function isNonWorkingDay(dateStr: string): boolean {
  return isWeekend(dateStr) || isPublicHoliday(dateStr);
}

/** Short label for a grid cell, where space is a few characters wide. */
export function holidayShortName(dateStr: string): string | null {
  const h = BY_DATE.get(dateStr)?.[0];
  if (!h) return null;
  return h.name.length > 18 ? `${h.name.slice(0, 17)}…` : h.name;
}