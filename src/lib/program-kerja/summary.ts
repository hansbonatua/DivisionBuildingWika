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

// ---------------------------------------------------------------------------
// Summary Report V1 (pure). Deliberately separate from the frozen Kelola
// display helpers above: Summary has its own Persentase denominator rule
// (planned months, NULL treated as 0) and its own status vocabulary.
// ---------------------------------------------------------------------------

export type ProgramKerjaStatus = "Belum Mulai" | "Berjalan" | "Tercapai" | "Over Target";

export const SUMMARY_STATUSES: readonly ProgramKerjaStatus[] = [
  "Belum Mulai",
  "Berjalan",
  "Tercapai",
  "Over Target",
];

// Floating-point tolerance for the 100% boundary (achievements are rounded
// to 4 decimals, so this only absorbs representation noise).
const STATUS_EPSILON = 0.0001;

function inPeriod(month: number, startMonth: number, endMonth: number): boolean {
  return month >= startMonth && month <= endMonth;
}

// "RI exists" is about reporting, not magnitude: 0 counts as reported.
export function hasReportedRi(monthly: readonly ProgramKerjaMonth[]): boolean {
  return monthly.some((row) => row.riValue !== null);
}

// Per-program achievement for Summary, expressed as a percentage (0..100+).
//   Jumlah      : SUM(all RI) / SUM(all RA) * 100, null when RA <= 0.
//   Persentase  : SUM(RI in planned months, NULL -> 0) / SUM(RA in planned
//                 months) * 100, null when planned RA <= 0. Outside-period
//                 months never contribute. No averaging of reported months.
// Over-achievement is preserved; never clamped.
export function summaryAchievementFor(
  unit: string,
  monthly: readonly ProgramKerjaMonth[],
  startMonth: number,
  endMonth: number,
): number | null {
  if (unit === "Persentase") {
    if (!isValidMonth(startMonth) || !isValidMonth(endMonth) || startMonth > endMonth) {
      return null;
    }
    let raSum = 0;
    let riSum = 0;
    for (const row of monthly) {
      if (!inPeriod(row.month, startMonth, endMonth)) {
        continue;
      }
      raSum += row.raValue;
      riSum += row.riValue ?? 0;
    }
    if (!Number.isFinite(raSum) || raSum <= 0) {
      return null;
    }
    return roundTo((riSum / raSum) * 100, 4);
  }

  const raSum = monthly.reduce((sum, row) => sum + row.raValue, 0);
  if (!Number.isFinite(raSum) || raSum <= 0) {
    return null;
  }
  const riSum = monthly.reduce(
    (sum, row) => (row.riValue === null ? sum : sum + row.riValue),
    0,
  );
  if (!Number.isFinite(riSum)) {
    return null;
  }
  return roundTo((riSum / raSum) * 100, 4);
}

export function reportedRiAverageForProgram(
  monthly: readonly ProgramKerjaMonth[],
  startMonth: number,
  endMonth: number,
): number | null {
  if (!isValidMonth(startMonth) || !isValidMonth(endMonth) || startMonth > endMonth) {
    return null;
  }
  let sum = 0;
  let count = 0;
  for (const row of monthly) {
    if (!inPeriod(row.month, startMonth, endMonth)) {
      continue;
    }
    if (row.riValue === null || !Number.isFinite(row.riValue)) {
      continue;
    }
    sum += row.riValue;
    count += 1;
  }
  return count === 0 ? null : roundTo(sum / count, 4);
}

export type SummaryProgramChartMetrics = {
  ra: number | null;
  riActualRunning: number | null;
};

export function chartMetricsForProgram(
  unit: string,
  monthly: readonly ProgramKerjaMonth[],
  startMonth: number,
  endMonth: number,
): SummaryProgramChartMetrics {
  if (unit === "Persentase") {
    return {
      ra: 100,
      riActualRunning: reportedRiAverageForProgram(monthly, startMonth, endMonth),
    };
  }

  if (monthly.length === 0) {
    return { ra: null, riActualRunning: null };
  }

  const raSum = monthly.reduce((sum, row) => sum + row.raValue, 0);
  const riRows = monthly.filter(
    (row): row is ProgramKerjaMonth & { riValue: number } =>
      row.riValue !== null && Number.isFinite(row.riValue),
  );
  return {
    ra: Number.isFinite(raSum) ? roundTo(raSum, 4) : null,
    riActualRunning:
      riRows.length === 0
        ? null
        : roundTo(
            riRows.reduce((sum, row) => sum + row.riValue, 0),
            4,
          ),
  };
}

// V1 statuses only. Edge case: RI already reported but achievement is
// undefined (zero planned RA) is treated as "Berjalan" — the work has
// started and there is no fifth status. This keeps the status distribution
// total equal to totalPrograms.
export function statusForAchievement(
  achievement: number | null,
  hasRi: boolean,
): ProgramKerjaStatus {
  if (!hasRi) {
    return "Belum Mulai";
  }
  if (achievement === null || !Number.isFinite(achievement)) {
    return "Berjalan";
  }
  const normalized = roundTo(achievement, 4);
  // Round the delta too: |99.9999 - 100| is 0.0001 mathematically but
  // slightly larger in binary floating point.
  const delta = Math.abs(roundTo(normalized - 100, 6));
  if (delta <= STATUS_EPSILON) {
    return "Tercapai";
  }
  if (normalized > 100) {
    return "Over Target";
  }
  return "Berjalan";
}

// AVG over valid (non-null) per-program achievements; never a pooled ratio.
export function averageAchievement(values: readonly (number | null)[]): number | null {
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );
  if (valid.length === 0) {
    return null;
  }
  return roundTo(valid.reduce((sum, value) => sum + value, 0) / valid.length, 4);
}

export type SummaryProgramInput = {
  id: string;
  name: string;
  unit: string;
  startMonth: number;
  endMonth: number;
  parameter: string;
  monitor: string | null;
  group: { id: string; name: string } | null;
  monthly: ProgramKerjaMonth[];
  pics: Array<{ id: string; name: string }>;
};

export type SummaryJumlahMetrics = {
  totalRa: number;
  totalRi: number;
  averageAchievement: number | null;
};

export type SummaryAverageMetric = {
  averageAchievement: number | null;
};

export type SummaryGroupItem = {
  groupId: string | null;
  groupName: string;
  programCount: number;
  jumlah: SummaryJumlahMetrics | null;
  persentase: SummaryAverageMetric | null;
};

export type SummaryPicItem = {
  picId: string;
  picName: string;
  programCount: number;
  jumlah: SummaryAverageMetric | null;
  persentase: SummaryAverageMetric | null;
};

export type SummaryMonthlyJumlah = {
  month: number;
  ra: number;
  ri: number | null;
};

export type SummaryMonthlyPersentase = {
  month: number;
  ra: number | null;
  ri: number | null;
};

export type SummaryKpis = {
  totalPrograms: number;
  programsWithRi: number;
  programsWithoutRi: number;
  averageAchievement: {
    jumlah: number | null;
    persentase: number | null;
  };
};

export type SummaryStatusDistribution = {
  belumMulai: number;
  berjalan: number;
  tercapai: number;
  overTarget: number;
};

export type SummaryProgramRow = {
  id: string;
  name: string;
  group: { id: string; name: string } | null;
  unit: string;
  startMonth: number;
  endMonth: number;
  pics: Array<{ id: string; name: string }>;
  achievement: number | null;
  status: ProgramKerjaStatus;
  parameter: string;
  monitor: string | null;
  chartMetrics: SummaryProgramChartMetrics;
};

export type SummaryAggregate = {
  kpis: SummaryKpis;
  statusDistribution: SummaryStatusDistribution;
  groups: SummaryGroupItem[];
  pics: SummaryPicItem[];
  monthly: {
    jumlah: SummaryMonthlyJumlah[];
    persentase: SummaryMonthlyPersentase[];
  };
  programs: SummaryProgramRow[];
};

type EvaluatedProgram = SummaryProgramInput & {
  achievement: number | null;
  hasRi: boolean;
  status: ProgramKerjaStatus;
};

function evaluate(program: SummaryProgramInput): EvaluatedProgram {
  const achievement = summaryAchievementFor(
    program.unit,
    program.monthly,
    program.startMonth,
    program.endMonth,
  );
  const hasRi = hasReportedRi(program.monthly);
  return {
    ...program,
    achievement,
    hasRi,
    status: statusForAchievement(achievement, hasRi),
  };
}

function monthlyValue(
  program: EvaluatedProgram,
  month: number,
): ProgramKerjaMonth | undefined {
  return program.monthly.find((row) => row.month === month);
}

// Aggregates an already-filtered dataset. Filtering itself stays in the
// service so every section provably consumes the same program list.
export function aggregateSummary(
  programs: readonly SummaryProgramInput[],
  unitFilter: string | null,
): SummaryAggregate {
  const evaluated = programs.map(evaluate);
  const includeJumlah = unitFilter === null || unitFilter === "Jumlah";
  const includePersentase = unitFilter === null || unitFilter === "Persentase";

  const statusDistribution: SummaryStatusDistribution = {
    belumMulai: 0,
    berjalan: 0,
    tercapai: 0,
    overTarget: 0,
  };
  for (const program of evaluated) {
    switch (program.status) {
      case "Belum Mulai":
        statusDistribution.belumMulai += 1;
        break;
      case "Berjalan":
        statusDistribution.berjalan += 1;
        break;
      case "Tercapai":
        statusDistribution.tercapai += 1;
        break;
      case "Over Target":
        statusDistribution.overTarget += 1;
        break;
    }
  }

  const jumlahPrograms = evaluated.filter((program) => program.unit === "Jumlah");
  const persentasePrograms = evaluated.filter((program) => program.unit === "Persentase");
  const programsWithRi = evaluated.filter((program) => program.hasRi).length;

  const kpis: SummaryKpis = {
    totalPrograms: evaluated.length,
    programsWithRi,
    programsWithoutRi: evaluated.length - programsWithRi,
    averageAchievement: {
      jumlah: includeJumlah
        ? averageAchievement(jumlahPrograms.map((program) => program.achievement))
        : null,
      persentase: includePersentase
        ? averageAchievement(persentasePrograms.map((program) => program.achievement))
        : null,
    },
  };

  const groupMap = new Map<string | null, EvaluatedProgram[]>();
  for (const program of evaluated) {
    const key = program.group?.id ?? null;
    const list = groupMap.get(key) ?? [];
    list.push(program);
    groupMap.set(key, list);
  }
  const groups: SummaryGroupItem[] = [...groupMap.entries()]
    .map(([groupId, groupPrograms]) => {
      const groupName = groupPrograms[0]?.group?.name ?? "Tanpa Kelompok";
      const groupJumlah = groupPrograms.filter((program) => program.unit === "Jumlah");
      const groupPersentase = groupPrograms.filter(
        (program) => program.unit === "Persentase",
      );
      const jumlah =
        groupJumlah.length === 0
          ? null
          : {
              totalRa: roundTo(
                groupJumlah.reduce(
                  (sum, program) =>
                    sum + program.monthly.reduce((inner, row) => inner + row.raValue, 0),
                  0,
                ),
                4,
              ),
              totalRi: roundTo(
                groupJumlah.reduce(
                  (sum, program) =>
                    sum +
                    program.monthly.reduce(
                      (inner, row) =>
                        row.riValue === null ? inner : inner + row.riValue,
                      0,
                    ),
                  0,
                ),
                4,
              ),
              averageAchievement: averageAchievement(
                groupJumlah.map((program) => program.achievement),
              ),
            };
      const persentase =
        groupPersentase.length === 0
          ? null
          : {
              averageAchievement: averageAchievement(
                groupPersentase.map((program) => program.achievement),
              ),
            };
      return {
        groupId,
        groupName,
        programCount: groupPrograms.length,
        jumlah,
        persentase,
      };
    })
    .sort((a, b) => a.groupName.localeCompare(b.groupName));

  const picMap = new Map<string, { id: string; name: string; programs: Map<string, EvaluatedProgram> }>();
  for (const program of evaluated) {
    for (const pic of program.pics) {
      const entry = picMap.get(pic.id) ?? { id: pic.id, name: pic.name, programs: new Map() };
      entry.programs.set(program.id, program);
      picMap.set(pic.id, entry);
    }
  }
  const pics: SummaryPicItem[] = [...picMap.values()]
    .map((entry) => {
      const picPrograms = [...entry.programs.values()];
      const picJumlah = picPrograms.filter((program) => program.unit === "Jumlah");
      const picPersentase = picPrograms.filter(
        (program) => program.unit === "Persentase",
      );
      return {
        picId: entry.id,
        picName: entry.name,
        programCount: picPrograms.length,
        jumlah:
          picJumlah.length === 0
            ? null
            : {
                averageAchievement: averageAchievement(
                  picJumlah.map((program) => program.achievement),
                ),
              },
        persentase:
          picPersentase.length === 0
            ? null
            : {
                averageAchievement: averageAchievement(
                  picPersentase.map((program) => program.achievement),
                ),
              },
      };
    })
    .sort((a, b) => a.picName.localeCompare(b.picName));

  const monthlyJumlah: SummaryMonthlyJumlah[] = [];
  const monthlyPersentase: SummaryMonthlyPersentase[] = [];
  for (let month = 1; month <= 12; month += 1) {
    if (includeJumlah) {
      const relevant = jumlahPrograms.filter((program) =>
        inPeriod(month, program.startMonth, program.endMonth),
      );
      let ra = 0;
      let ri = 0;
      let reported = false;
      for (const program of relevant) {
        const row = monthlyValue(program, month);
        if (!row) {
          continue;
        }
        ra += row.raValue;
        if (row.riValue !== null) {
          reported = true;
          ri += row.riValue;
        }
      }
      monthlyJumlah.push({
        month,
        ra: roundTo(ra, 4),
        ri: reported ? roundTo(ri, 4) : null,
      });
    }
    if (includePersentase) {
      const relevant = persentasePrograms.filter((program) =>
        inPeriod(month, program.startMonth, program.endMonth),
      );
      const raValues = relevant
        .map((program) => monthlyValue(program, month)?.raValue)
        .filter((value): value is number => value !== undefined);
      const riValues = relevant
        .map((program) => monthlyValue(program, month)?.riValue)
        .filter((value): value is number => value !== null && value !== undefined);
      monthlyPersentase.push({
        month,
        ra:
          raValues.length === 0
            ? null
            : roundTo(raValues.reduce((sum, value) => sum + value, 0) / raValues.length, 4),
        ri:
          riValues.length === 0
            ? null
            : roundTo(riValues.reduce((sum, value) => sum + value, 0) / riValues.length, 4),
      });
    }
  }

  const programRows: SummaryProgramRow[] = evaluated
    .map((program) => ({
      id: program.id,
      name: program.name,
      group: program.group,
      unit: program.unit,
      startMonth: program.startMonth,
      endMonth: program.endMonth,
      pics: program.pics,
      achievement: program.achievement,
      status: program.status,
      parameter: program.parameter,
      monitor: program.monitor,
      chartMetrics: chartMetricsForProgram(
        program.unit,
        program.monthly,
        program.startMonth,
        program.endMonth,
      ),
    }))
    .sort((a, b) => {
      const groupOrder = (a.group?.name ?? "").localeCompare(b.group?.name ?? "");
      return groupOrder !== 0 ? groupOrder : a.name.localeCompare(b.name);
    });

  return {
    kpis,
    statusDistribution,
    groups,
    pics,
    monthly: { jumlah: monthlyJumlah, persentase: monthlyPersentase },
    programs: programRows,
  };
}
