import type * as XLSX from "xlsx";
import {
  MONTH_SHORT,
  achievementFor,
  formatPeriod,
  totalsFor,
  type ProgramKerjaTableRow,
} from "@/components/dashboard/program-kerja/ProgramKerjaTable";

export type ProgramKerjaExportRow = ProgramKerjaTableRow;

function periodLabel(row: ProgramKerjaTableRow): string {
  const { program } = row;
  return formatPeriod(program.startMonth, program.endMonth, program.year);
}

function monthCell(ra: number | null, ri: number | null): [number | "", number | ""] {
  // RI null stays blank (never coerced to 0); RI 0 stays numeric 0.
  return [ra ?? "", ri ?? ""];
}

// Pure workbook builder (no DOM): unit-testable in Node.
export function buildProgramKerjaWorkbook(
  XLSX: typeof import("xlsx"),
  rows: ProgramKerjaExportRow[],
): XLSX.WorkBook {
  const header = [
    "No",
    "Kelompok Program",
    "Nama Program Kerja",
    "Deskripsi Program Kerja",
    "Tahun",
    "Rencana Waktu",
    "Parameter",
    "Unit",
    "Total RA",
    "RI Berjalan",
    ...MONTH_SHORT.flatMap((label) => [`${label} RA`, `${label} RI`]),
    "Pencapaian Total",
    "PIC",
    "Monitor",
    "Catatan",
    "Evidence URL",
  ];
  const body = rows.map((row, index) => {
    const { program } = row;
    const totals = totalsFor(program.unit, row.monthly);
    const monthCells = MONTH_SHORT.flatMap((_, monthIndex) => {
      const month = monthIndex + 1;
      const cell = row.monthly.find((item) => item.month === month);
      return monthCell(cell ? cell.raValue : null, cell ? cell.riValue : null);
    });
    return [
      index + 1,
      row.groupName ?? "",
      program.name,
      program.description,
      program.year,
      periodLabel(row),
      program.parameter,
      program.unit,
      totals.ra,
      totals.ri,
      ...monthCells,
      achievementFor(program.unit, row.monthly),
      row.picNames.join(", "),
      program.monitor ?? "",
      program.note ?? "",
      program.evidenceUrl ?? "",
    ];
  });
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet["!cols"] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 32 },
    { wch: 44 },
    { wch: 8 },
    { wch: 24 },
    { wch: 22 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    ...MONTH_SHORT.flatMap(() => [{ wch: 9 }, { wch: 9 }]),
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 32 },
    { wch: 40 },
  ];
  sheet["!autofilter"] = { ref: sheet["!ref"] ?? "A1" };
  sheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Program Kerja");
  return workbook;
}

export function exportFileName(yearFilter: string): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const scope = yearFilter ? yearFilter : "semua-tahun";
  return `Program-Kerja-${scope}-${stamp}.xlsx`;
}

export async function downloadProgramKerjaExcel(
  rows: ProgramKerjaExportRow[],
  yearFilter: string,
): Promise<void> {
  // Dynamic import keeps xlsx out of the dashboard bundle until used.
  const XLSX = await import("xlsx");
  const workbook = buildProgramKerjaWorkbook(XLSX, rows);
  XLSX.writeFile(workbook, exportFileName(yearFilter));
}
