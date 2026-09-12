/**
 * Minimal date helpers for `YYYY-MM-DD` strings (as returned by the backend
 * for `study-plans/week/` etc). No date library is pulled in for this —
 * `Intl.DateTimeFormat` already covers locale-aware weekday/day formatting,
 * and the only other need is enumerating a short, known-inclusive date
 * range, which plain `Date` arithmetic handles without any DST/timezone
 * subtlety (dates are parsed as UTC midnight and only ever re-formatted,
 * never shifted).
 */

/** Inclusive list of `YYYY-MM-DD` strings from `start` to `end`. */
export function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  while (cursor.getTime() <= endDate.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

export function formatWeekdayLabel(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

export function formatDayLabel(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function isToday(isoDate: string): boolean {
  return isoDate === new Date().toISOString().slice(0, 10);
}
