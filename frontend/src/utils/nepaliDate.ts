/**
 * Bikram Sambat (B.S) conversion.
 *
 * The Bikram Sambat solar calendar has no arithmetic rule. Month lengths
 * are set by solar longitude and differ year to year -- Jestha can be 30 or
 * 32 days, and any month can gain or lose a day against its neighbours. So
 * there is nothing to compute: a table of month lengths per year is the
 * whole algorithm.
 *
 * Table covers BS 2080-2100 (AD 2023-2044), generated from the
 * `nepali_datetime` package (nepali_datetime/data/calendar_bs.csv), whose
 * anchor is BS 1975-01-01 = AD 1918-04-13. Spot-checked against the
 * gazette dates independently: Nepali New Year, Republic Day, Constitution
 * Day, Dashain and Tihar all resolve to their published BS dates.
 *
 * 2080 rather than the package's full 1975-2100 range, because a calendar
 * grid cannot usefully show dates 50 years either side of now, and 21 rows
 * is small enough to read at a glance. Widen it if that stops being true;
 * the conversion code below needs no change.
 */

const MONTH_LENGTHS: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2091: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2092: [30, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2093: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2094: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2095: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30],
  2096: [30, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2097: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2098: [31, 31, 32, 31, 31, 31, 29, 30, 29, 30, 29, 31],
  2099: [31, 31, 32, 31, 31, 31, 30, 29, 29, 30, 30, 30],
  2100: [31, 32, 31, 32, 30, 31, 30, 29, 30, 29, 30, 30],
};

/** BS 2080-01-01 is AD 2023-04-14. Derived by walking the table above from
 *  the package's own anchor; verified against Nepali New Year. */
const MIN_YEAR = 2080;
const ANCHOR_AD = Date.UTC(2023, 3, 14); // 2023-04-14

export interface NepaliDate {
  year: number;
  month: number;
  day: number;
}

export const MIN_BS_YEAR = MIN_YEAR;
export const MAX_BS_YEAR = 2100;

function toDaysUtc(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromDaysUtc(days: number): string {
  const dt = new Date(days);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

/** Day counts from BS 2080-01-01 to each year's Baishakh 1, precomputed once
 *  so a lookup is arithmetic rather than a walk down 21 rows. */
const YEAR_STARTS: { year: number; offset: number }[] = (() => {
  const out: { year: number; offset: number }[] = [];
  let offset = 0;
  for (const year of Object.keys(MONTH_LENGTHS).map(Number).sort((a, b) => a - b)) {
    out.push({ year, offset });
    for (const len of MONTH_LENGTHS[year]) offset += len;
  }
  return out;
})();

/** Short month labels for compact display.
 *
 *  Latin, not Devanagari, and deliberately so. Devanagari needs a font
 *  that neither Geist, Inter Tight nor JetBrains Mono carries, so it
 *  depends on either an extra webfont request or whatever Indic fonts the
 *  OS happens to have -- and a date that silently renders as nothing is
 *  worse than one written in a script everyone in Nepal reads anyway.
 *  "Kartik 1" is also the form used on Nepali patro wall calendars.
 */
const MONTH_LABELS = [
  'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
];

/** Convert a Gregorian 'YYYY-MM-DD' to Bikram Sambat. Returns null outside
 *  the table, which the caller should treat as "no BS date to show" rather
 *  than a failure: a calendar can be paged outside the supported range. */
export function toNepaliDate(dateStr: string): NepaliDate | null {
  const days = toDaysUtc(dateStr) - ANCHOR_AD;
  if (days < 0) return null;

  // Past the end of the table there is no answer to give. Returning null
  // lets the caller omit the BS date rather than print a wrong one.
  const last = YEAR_STARTS[YEAR_STARTS.length - 1];
  const totalDays = last.offset + MONTH_LENGTHS[last.year]!.reduce((a, b) => a + b, 0);
  if (days >= totalDays) return null;

  // Last year that starts at or before `days`.
  let lo = 0;
  let hi = YEAR_STARTS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (YEAR_STARTS[mid].offset <= days) lo = mid;
    else hi = mid - 1;
  }
  const year = YEAR_STARTS[lo].year;
  const dayOfYear = days - YEAR_STARTS[lo].offset;

  const lengths = MONTH_LENGTHS[year];
  if (!lengths) return null;
  let remaining = dayOfYear;
  for (let m = 0; m < 12; m++) {
    if (remaining < lengths[m]) return { year, month: m + 1, day: remaining + 1 };
    remaining -= lengths[m];
  }
  return null; // unreachable while the table is well-formed
}

/** Month name, e.g. 7 -> 'Kartik'. */
export function nepaliMonthName(month: number): string {
  return MONTH_LABELS[month - 1];
}

/** Full BS date as 'YYYY/MM/DD', the numeric form used in Nepal. */
export function formatNepaliDate(n: NepaliDate | null): string | null {
  if (!n) return null;
  const p = (v: number) => String(v).padStart(2, '0');
  return `${n.year}/${p(n.month)}/${p(n.day)}`;
}

/**
 * Month-and-day form, e.g. 'Kartik 1'.
 *
 * This is what a Nepali patro actually prints in each cell -- the month
 * name with the day under it -- so it reads as a date rather than as a
 * bare number needing context. Year is left out because it changes once
 * per grid, not once per cell.
 */
export function formatNepaliMonthDay(n: NepaliDate | null): string | null {
  if (!n) return null;
  return `${nepaliMonthName(n.month)} ${n.day}`;
}

/** Compact form for a grid cell: 'Kart 1', 'Bha 9'. */
export function formatNepaliShort(n: NepaliDate | null): string | null {
  if (!n) return null;
  return `${nepaliMonthName(n.month).slice(0, 3)} ${n.day}`;
}

export { fromDaysUtc as _fromDaysUtc, toDaysUtc as _toDaysUtc };