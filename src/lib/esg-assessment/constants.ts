// Domain constants for Penilaian ESG.
//
// A month cell has exactly three states: empty (NULL), "Complete", or "Half".
// The arrays below feed Zod and must stay in sync with the database CHECK
// constraints on `project_esg_assessments.month_*_status`.

export const ESG_MONTH_STATUSES = ["Complete", "Half"] as const;
export type EsgMonthStatus = (typeof ESG_MONTH_STATUSES)[number];

export const ESG_MONTH_COUNT = 12;

// Grid headers use the short label; the full label feeds aria-label/title only.
export const ESG_MONTHS = [
  { month: 1, short: "Jan", label: "Januari" },
  { month: 2, short: "Feb", label: "Februari" },
  { month: 3, short: "Mar", label: "Maret" },
  { month: 4, short: "Apr", label: "April" },
  { month: 5, short: "Mei", label: "Mei" },
  { month: 6, short: "Jun", label: "Juni" },
  { month: 7, short: "Jul", label: "Juli" },
  { month: 8, short: "Agu", label: "Agustus" },
  { month: 9, short: "Sep", label: "September" },
  { month: 10, short: "Okt", label: "Oktober" },
  { month: 11, short: "Nov", label: "November" },
  { month: 12, short: "Des", label: "Desember" },
] as const;

export function esgMonthLabel(month: number): string {
  return ESG_MONTHS.find((item) => item.month === month)?.label ?? `Bulan ${month}`;
}

export function isEsgMonthStatus(value: unknown): value is EsgMonthStatus {
  return (
    typeof value === "string" &&
    (ESG_MONTH_STATUSES as readonly string[]).includes(value)
  );
}
