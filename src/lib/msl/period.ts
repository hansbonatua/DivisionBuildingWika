// MSL Engineering — assessment period (month) vocabulary.
//
// Dependency-free on purpose, like @/lib/msl/score: the same module is used by
// the repository/service (month validation and conflict messages), the API layer
// (query parsing/defaults), Client Components (labels) and the PDF exporter, so
// a month is always printed with the same Indonesian name everywhere.
//
// The YEAR is deliberately NOT part of this module: a year always comes from
// master_projects.year, the single source of truth. Only the month lives on the
// assessment row itself.

export const MSL_MONTH_MIN = 1;
export const MSL_MONTH_MAX = 12;

export const MSL_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export type MslMonth = (typeof MSL_MONTHS)[number];

export const MSL_MONTH_LABELS: Record<MslMonth, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};

/** True only for an integer 1–12; everything else (0, 13, 1.5, NaN) is false. */
export function isMslMonth(value: number): value is MslMonth {
  return Number.isInteger(value) && value >= MSL_MONTH_MIN && value <= MSL_MONTH_MAX;
}

/** "September 2026" — the canonical human period label. */
export function formatMslPeriod(year: number, month: number): string {
  const label = isMslMonth(month) ? MSL_MONTH_LABELS[month] : `Bulan ${month}`;
  return `${label} ${year}`;
}

// Comparisons and storage stay month-only; a zero-padded token ("09") is handy
// for future filenames/URLs without leaking into the domain contract.
export function mslMonthToken(month: number): string {
  return String(month).padStart(2, "0");
}

/**
 * Default selected month for a request that does not name one: the current
 * server month. Unlike the year, the month has no "fallback to the newest
 * available" rule — every month of a year is a valid, independent view even
 * when nothing has been assessed in it yet.
 */
export function resolveDefaultMslMonth(now = new Date()): MslMonth {
  const month = now.getMonth() + 1;
  // getMonth() is 0-based and always yields 1–12 here; the guard keeps the type
  // honest instead of casting.
  return (isMslMonth(month) ? month : 1) as MslMonth;
}
