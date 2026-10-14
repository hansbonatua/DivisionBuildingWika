"use client";

import { Fragment } from "react";

// Read-only Kelola Program Kerja table (Phase 4A). No inputs, no mutations.

export type ProgramKerjaTableMonth = {
  month: number;
  raValue: number;
  riValue: number | null;
};

export type ProgramKerjaTableRow = {
  program: {
    id: string;
    name: string;
    description: string;
    startMonth: number;
    endMonth: number;
    parameter: string;
    unit: string;
    monitor: string | null;
    note: string | null;
    evidenceUrl: string | null;
    year: number;
    groupId: string;
  };
  monthly: ProgramKerjaTableMonth[];
  picNames: string[];
  groupName: string | null;
};

const MONTH_SHORT = [
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
];

const MONTH_LONG = [
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
];

const QUARTERS: Array<{ label: string; months: number[] }> = [
  { label: "Quarter I", months: [1, 2, 3] },
  { label: "Quarter II", months: [4, 5, 6] },
  { label: "Quarter III", months: [7, 8, 9] },
  { label: "Quarter IV", months: [10, 11, 12] },
];

// 7 fixed columns + Label + 12 months + 6 trailing columns.
const TOTAL_COLUMNS = 7 + 1 + 12 + 6;

function isOutsidePeriod(month: number, startMonth: number, endMonth: number): boolean {
  return month < startMonth || month > endMonth;
}

function formatPeriod(startMonth: number, endMonth: number, year: number): string {
  const start = MONTH_LONG[startMonth - 1] ?? `Bulan ${startMonth}`;
  const end = MONTH_LONG[endMonth - 1] ?? `Bulan ${endMonth}`;
  return `${start} – ${end} ${year}`;
}

function monthValue(
  monthly: ProgramKerjaTableMonth[],
  month: number,
): ProgramKerjaTableMonth | undefined {
  return monthly.find((row) => row.month === month);
}

function totalsFor(unit: string, monthly: ProgramKerjaTableMonth[]): { ra: string; ri: string } {
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
  return { ra: String(raSum), ri: filled.length === 0 ? "—" : String(filled.reduce((sum, row) => sum + (row.riValue ?? 0), 0)) };
}

function achievementFor(unit: string, monthly: ProgramKerjaTableMonth[]): string {
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

function yearHeading(rows: ProgramKerjaTableRow[], activeYear: string): string {
  if (activeYear) {
    return `Program Kerja Strategis ${activeYear}`;
  }
  const years = [...new Set(rows.map((row) => row.program.year))];
  if (years.length === 1 && years[0] !== undefined) {
    return `Program Kerja Strategis ${years[0]}`;
  }
  return "Program Kerja Strategis";
}

function groupSections(rows: ProgramKerjaTableRow[]): Array<{ key: string; name: string | null; rows: ProgramKerjaTableRow[] }> {
  const sections = new Map<string, { key: string; name: string | null; rows: ProgramKerjaTableRow[] }>();
  for (const row of rows) {
    const key = row.program.groupId;
    const section = sections.get(key);
    if (section) {
      section.rows.push(row);
    } else {
      sections.set(key, { key, name: row.groupName, rows: [row] });
    }
  }
  return [...sections.values()];
}

const headerCell =
  "border border-outline/40 bg-background px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-600";
const monthHeaderCell =
  "border border-outline/40 bg-background px-1 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-600";
const bodyCell = "border border-outline/40 px-3 py-2.5 align-top text-xs";
const monthCell = "border border-outline/40 px-1 py-2 text-center font-mono text-[11px]";
const outsideMonthCell = `${monthCell} bg-blue-50/70 text-blue-800`;
const emptyCell = `${monthCell} text-slate-300`;

export default function ProgramKerjaTable({
  rows,
  activeYear,
}: {
  rows: ProgramKerjaTableRow[];
  activeYear: string;
}) {
  const sections = groupSections(rows);
  const numberedSections = sections.map((section) => ({
    ...section,
    rows: section.rows.map((row, index) => ({ row, rowNo: index + 1 })),
  }));
  // Row numbers restart per group section (No column is section-scoped).

  return (
    <div className="overflow-hidden rounded-lg border border-outline bg-surface shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[2100px] border-collapse text-xs">
          <thead>
            <tr>
              <th rowSpan={3} scope="col" className={headerCell}>No</th>
              <th rowSpan={3} scope="col" className={headerCell}>Nama Program Kerja</th>
              <th rowSpan={3} scope="col" className={headerCell}>Deskripsi Program Kerja</th>
              <th rowSpan={3} scope="col" className={headerCell}>Rencana Waktu</th>
              <th rowSpan={3} scope="col" className={headerCell}>Parameter</th>
              <th rowSpan={3} scope="col" className={headerCell}>Total RA &amp; RI Bulan Berjalan</th>
              <th rowSpan={3} scope="col" className={headerCell}>Unit</th>
              <th rowSpan={3} scope="col" className={headerCell}>Label</th>
              <th scope="col" colSpan={12} className={`${headerCell} text-center`}>
                {yearHeading(rows, activeYear)}
              </th>
              <th rowSpan={3} scope="col" className={headerCell}>Pencapaian Total</th>
              <th rowSpan={3} scope="col" className={headerCell}>PIC</th>
              <th rowSpan={3} scope="col" className={headerCell}>Monitor</th>
              <th rowSpan={3} scope="col" className={headerCell}>Catatan</th>
              <th rowSpan={3} scope="col" className={headerCell}>Berkas / Evidence</th>
              <th rowSpan={3} scope="col" className={`${headerCell} text-right`}>Aksi</th>
            </tr>
            <tr>
              {QUARTERS.map((quarter) => (
                <th key={quarter.label} scope="col" colSpan={3} className={`${monthHeaderCell} text-center`}>
                  {quarter.label}
                </th>
              ))}
            </tr>
            <tr>
              {MONTH_SHORT.map((label) => (
                <th key={label} scope="col" className={monthHeaderCell}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {numberedSections.map((section) => (
              <Fragment key={`group-${section.key}`}>
                <tr>
                  <td
                    colSpan={TOTAL_COLUMNS}
                    className="border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
                  >
                    {section.name ?? "Kelompok Program"}
                  </td>
                </tr>
                {section.rows.map(({ row, rowNo }) => {
                  const { program } = row;
                  const totals = totalsFor(program.unit, row.monthly);
                  const achievement = achievementFor(program.unit, row.monthly);
                  const sharedCell = `${bodyCell} border-t-2 border-t-outline/60`;
                  return (
                    <Fragment key={program.id}>
                      <tr key={`${program.id}-ra`} className="hover:bg-background/50">
                        <td rowSpan={2} className={sharedCell}>{rowNo}</td>
                        <td rowSpan={2} className={`${sharedCell} min-w-48 font-bold text-primary`}>
                          {program.name}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} min-w-64`}>
                          <span className="line-clamp-2 block max-w-72 text-primary/70">
                            {program.description || "—"}
                          </span>
                        </td>
                        <td rowSpan={2} className={`${sharedCell} whitespace-nowrap text-primary/70`}>
                          {formatPeriod(program.startMonth, program.endMonth, program.year)}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} text-primary/70`}>
                          {program.parameter}
                        </td>
                        <td rowSpan={2} className={sharedCell}>
                          <div className="text-[11px] font-bold text-primary">RA {totals.ra}</div>
                          <div className="mt-0.5 text-[11px] font-bold text-secondary">RI {totals.ri}</div>
                        </td>
                        <td rowSpan={2} className={sharedCell}>{program.unit}</td>
                        <td className={bodyCell}>
                          <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                            RA
                          </span>
                        </td>
                        {MONTH_SHORT.map((_, index) => {
                          const month = index + 1;
                          const cell = monthValue(row.monthly, month);
                          if (!cell) {
                            return (
                              <td key={month} className={emptyCell}>—</td>
                            );
                          }
                          const outside = isOutsidePeriod(month, program.startMonth, program.endMonth);
                          return (
                            <td key={month} className={outside ? outsideMonthCell : monthCell}>
                              {cell.raValue}
                            </td>
                          );
                        })}
                        <td rowSpan={2} className={`${sharedCell} font-bold text-secondary`}>
                          {achievement}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} min-w-32 text-primary/70`}>
                          {row.picNames.length > 0 ? row.picNames.join(", ") : "—"}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} text-primary/70`}>
                          {program.monitor || "—"}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} min-w-40`}>
                          <span className="line-clamp-2 block max-w-56 text-primary/70">
                            {program.note || "—"}
                          </span>
                        </td>
                        <td rowSpan={2} className={sharedCell}>
                          {program.evidenceUrl ? (
                            <a
                              href={program.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded border border-outline/50 px-2.5 py-1 text-[11px] font-bold text-secondary transition-colors hover:bg-secondary hover:text-white"
                            >
                              Buka Berkas
                            </a>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td rowSpan={2} className={`${sharedCell} whitespace-nowrap text-right`}>
                          <button
                            type="button"
                            disabled
                            title="Edit Program segera hadir"
                            className="cursor-not-allowed rounded px-2.5 py-1 text-xs font-bold text-slate-300"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled
                            title="Hapus Program segera hadir"
                            className="cursor-not-allowed rounded px-2.5 py-1 text-xs font-bold text-slate-300"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      <tr key={`${program.id}-ri`} className="hover:bg-background/50">
                        <td className={bodyCell}>
                          <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold text-blue-700">
                            RI
                          </span>
                        </td>
                        {MONTH_SHORT.map((_, index) => {
                          const month = index + 1;
                          const cell = monthValue(row.monthly, month);
                          if (!cell || cell.riValue === null) {
                            return (
                              <td key={month} className={emptyCell}>—</td>
                            );
                          }
                          return (
                            <td key={month} className={monthCell}>
                              {cell.riValue}
                            </td>
                          );
                        })}
                      </tr>
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
