// Pure, dependency-free Program Kerja calculation helpers shared by the
// Kelola table, the PDF exporter, and the (future) Summary Report.
//
// Semantics preserved from the Kelola table:
//   RA = Rencana (target).  RI = Realisasi (actual).
//   RI null  -> month not yet reported.
//   RI zero  -> month explicitly reported as zero.
//   "Persentase" -> a single RA percentage replicated across months; RI
//                   totals are the average of reported months.
//   "Jumlah"     -> RA and RI totals are sums over their own rows.
//
// No React, database, or network imports here.

export type ProgramKerjaMonth = {
  month: number;
  raValue: number;
  riValue: number | null;
};

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// RA/RI totals exactly as displayed in the Kelola table and PDF.
export function totalsFor(
  unit: string,
  monthly: readonly ProgramKerjaMonth[],
): { ra: string; ri: string } {
  if (unit === "Persentase") {
    const ra = monthly.length > 0 ? `${monthly[0].raValue}%` : "—";
    const filled = monthly.filter((row) => row.riValue !== null);
    if (filled.length === 0) {
      return { ra, ri: "—" };
    }
    const avg = filled.reduce((sum, row) => sum + (row.riValue ?? 0), 0) / filled.length;
    return { ra, ri: `${Math.round(avg * 10) / 10}%` };
  }
  const raSum = monthly.reduce((sum, row) => sum + row.raValue, 0);
  const filled = monthly.filter((row) => row.riValue !== null);
  if (monthly.length === 0) {
    return { ra: "—", ri: "—" };
  }
  return {
    ra: String(raSum),
    ri: filled.length === 0 ? "—" : String(filled.reduce((sum, row) => sum + (row.riValue ?? 0), 0)),
  };
}

// Pencapaian Total label exactly as displayed in the Kelola table and PDF.
export function achievementFor(
  unit: string,
  monthly: readonly ProgramKerjaMonth[],
): string {
  const filled = monthly.filter((row) => row.riValue !== null);
  if (monthly.length === 0 || filled.length === 0) {
    return "—";
  }
  if (unit === "Persentase") {
    const avg = filled.reduce((sum, row) => sum + (row.riValue ?? 0), 0) / filled.length;
    return `${Math.round(avg * 10) / 10}%`;
  }
  const raSum = monthly.reduce((sum, row) => sum + row.raValue, 0);
  const riSum = filled.reduce((sum, row) => sum + (row.riValue ?? 0), 0);
  return `${riSum} / ${raSum}`;
}

// Safe per-program achievement ratio (0..1) for summary roll-ups.
// Returns null when achievement is undefined: no reported RI, invalid
// numbers, or a zero/negative RA denominator for "Jumlah". Values above 1
// are valid over-achievement and are never clamped.
export function achievementRatioFor(
  unit: string,
  monthly: readonly ProgramKerjaMonth[],
): number | null {
  const filled = monthly.filter((row) => row.riValue !== null);
  if (filled.length === 0) {
    return null;
  }
  if (unit === "Persentase") {
    const sum = filled.reduce((total, row) => total + (row.riValue ?? 0), 0);
    const avg = sum / filled.length;
    if (!Number.isFinite(avg)) {
      return null;
    }
    return roundTo(avg / 100, 4);
  }
  const raSum = monthly.reduce((total, row) => total + row.raValue, 0);
  if (!Number.isFinite(raSum) || raSum <= 0) {
    return null;
  }
  const riSum = filled.reduce((total, row) => total + (row.riValue ?? 0), 0);
  if (!Number.isFinite(riSum)) {
    return null;
  }
  return roundTo(riSum / raSum, 4);
}

export type ProgramKerjaReportingCoverage = {
  // Number of months in startMonth..endMonth (0 when the period is invalid).
  periodMonths: number;
  // Period months that have a non-null RI (0 counts as reported).
  reportedMonths: number;
  missingMonths: number;
  // reportedMonths / periodMonths, or null when the period is invalid.
  coverageRatio: number | null;
  // coverageRatio as 0..100 with 1 decimal, or null.
  coveragePercent: number | null;
  isComplete: boolean;
};

function isValidMonth(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 12;
}

// RI reporting coverage scoped to the program period. Months outside the
// period are ignored even if they happen to carry an RI value, and months
// with no monthly row count as unreported. Invalid or inverted periods
// yield zero period months and null ratios rather than NaN.
export function reportingCoverage(
  monthly: readonly ProgramKerjaMonth[],
  startMonth: number,
  endMonth: number,
): ProgramKerjaReportingCoverage {
  const periodMonths =
    isValidMonth(startMonth) && isValidMonth(endMonth) && startMonth <= endMonth
      ? endMonth - startMonth + 1
      : 0;

  if (periodMonths === 0) {
    return {
      periodMonths: 0,
      reportedMonths: 0,
      missingMonths: 0,
      coverageRatio: null,
      coveragePercent: null,
      isComplete: false,
    };
  }

  const reported = new Set<number>();
  for (const row of monthly) {
    if (row.riValue !== null) {
      reported.add(row.month);
    }
  }

  let reportedMonths = 0;
  for (let month = startMonth; month <= endMonth; month += 1) {
    if (reported.has(month)) {
      reportedMonths += 1;
    }
  }

  const missingMonths = periodMonths - reportedMonths;
  const coverageRatio = reportedMonths / periodMonths;

  return {
    periodMonths,
    reportedMonths,
    missingMonths,
    coverageRatio,
    coveragePercent: roundTo(coverageRatio * 100, 1),
    isComplete: missingMonths === 0,
  };
}
