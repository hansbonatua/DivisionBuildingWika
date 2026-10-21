export const SUMMARY_MONTH_LONG = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

export const SUMMARY_MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

const countFormatter = new Intl.NumberFormat("id-ID");
const achievementFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

export function formatSummaryCount(value: number): string {
  return Number.isFinite(value) ? countFormatter.format(value) : "—";
}

export function formatSummaryAchievement(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  return `${achievementFormatter.format(value)}%`;
}

export function formatSummaryPeriod(startMonth: number, endMonth: number): string {
  const start = SUMMARY_MONTH_LONG[startMonth - 1] ?? `Bulan ${startMonth}`;
  const end = SUMMARY_MONTH_LONG[endMonth - 1] ?? `Bulan ${endMonth}`;
  return `${start} – ${end}`;
}

export function formatSummaryMonthlyValue(
  value: number | null,
  unit: "Jumlah" | "Persentase",
): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }
  const formatted = achievementFormatter.format(value);
  return unit === "Persentase" ? `${formatted}%` : formatted;
}
