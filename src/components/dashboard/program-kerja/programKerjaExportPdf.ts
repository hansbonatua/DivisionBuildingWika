import { jsPDF } from "jspdf";
import autoTable, { type CellInput } from "jspdf-autotable";
import {
  MONTH_SHORT,
  achievementFor,
  formatPeriod,
  totalsFor,
  type ProgramKerjaTableRow,
} from "@/components/dashboard/program-kerja/ProgramKerjaTable";

export type ProgramKerjaExportRow = ProgramKerjaTableRow;

export type ProgramKerjaExportMeta = {
  yearFilter: string;
  groupFilterName: string;
  unitFilter: string;
  search: string;
};

const QUARTERS = ["Quarter I", "Quarter II", "Quarter III", "Quarter IV"];
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// Light green for RA outside-period cells (dashboard meaning preserved);
// dark green text. RI cells are never highlighted.
const OUTSIDE_FILL: [number, number, number] = [220, 252, 231];
const OUTSIDE_TEXT: [number, number, number] = [22, 101, 52];
const NAVY_FILL: [number, number, number] = [30, 58, 95];

function riText(value: number | null): string {
  return value === null ? "-" : String(value);
}

function filterLine(meta: ProgramKerjaExportMeta): string {
  const parts = [
    `Tahun: ${meta.yearFilter || "Semua"}`,
    `Kelompok: ${meta.groupFilterName || "Semua"}`,
    `Unit: ${meta.unitFilter || "Semua"}`,
  ];
  if (meta.search.trim()) {
    parts.push(`Pencarian: ${meta.search.trim()}`);
  }
  return parts.join("  |  ");
}

function exportStamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function exportFileName(yearFilter: string, now: Date = new Date()): string {
  const scope = yearFilter ? yearFilter : "semua-tahun";
  return `Program-Kerja-${scope}-${exportStamp(now)}.pdf`;
}

function isOutsidePeriod(month: number, startMonth: number, endMonth: number): boolean {
  return month < startMonth || month > endMonth;
}

function yearHeading(rows: ProgramKerjaExportRow[], activeYear: string): string {
  if (activeYear) {
    return `Program Kerja Strategis ${activeYear}`;
  }
  const years = [...new Set(rows.map((row) => row.program.year))];
  if (years.length === 1 && years[0] !== undefined) {
    return `Program Kerja Strategis ${years[0]}`;
  }
  return "Program Kerja Strategis";
}

type GroupSection = { key: string; name: string | null; rows: ProgramKerjaExportRow[] };

function groupSections(rows: ProgramKerjaExportRow[]): GroupSection[] {
  const sections = new Map<string, GroupSection>();
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

// Single main table mirroring the Kelola dashboard table: 3-level header,
// full-span group separators, paired RA/RI rows with rowSpan master cells.
export function buildProgramKerjaPdf(
  rows: ProgramKerjaExportRow[],
  meta: ProgramKerjaExportMeta,
  now: Date = new Date(),
  logoDataUrl: string | null = null,
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // WIBEX logo top-right (1920x600 source, aspect preserved). Falls back
  // to a text-only header when the logo cannot be loaded. Title and filter
  // lines always start at the left margin, so no overlap is possible.
  if (logoDataUrl) {
    try {
      const logoWidth = 48;
      const logoHeight = (logoWidth * 600) / 1920;
      const logoX = pageWidth - 14 - logoWidth;
      doc.addImage(logoDataUrl, "PNG", logoX, 8, logoWidth, logoHeight);
    } catch {
      console.warn("WIBEX logo skipped in PDF export (unreadable image).");
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PROGRAM KERJA ENGINEERING", 14, 14);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Kelola Program Kerja", 14, 21);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(filterLine(meta), 14, 27);
  const dateLabel = now.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  const stampLabel = `Tanggal export: ${dateLabel}`;
  doc.text(stampLabel, pageWidth - 14 - doc.getTextWidth(stampLabel), 27);
  doc.setTextColor(0);

  const headRow1: CellInput[] = [
    { content: "No", rowSpan: 3 },
    { content: "Nama Program Kerja", rowSpan: 3 },
    { content: "Deskripsi Program Kerja", rowSpan: 3 },
    { content: "Rencana Waktu", rowSpan: 3 },
    { content: "Parameter", rowSpan: 3 },
    { content: "Total RA & RI Bulan Berjalan", rowSpan: 3 },
    { content: "Unit", rowSpan: 3 },
    { content: "Label", rowSpan: 3 },
    { content: yearHeading(rows, meta.yearFilter), colSpan: 12, styles: { halign: "center" } },
    { content: "Pencapaian Total", rowSpan: 3 },
    { content: "PIC", rowSpan: 3 },
    { content: "Monitor", rowSpan: 3 },
    { content: "Catatan", rowSpan: 3 },
    { content: "Evidence", rowSpan: 3 },
  ];
  const headRow2: CellInput[] = QUARTERS.map((label) => ({
    content: label,
    colSpan: 3,
    styles: { halign: "center" },
  }));
  const headRow3: CellInput[] = MONTH_SHORT.map((label) => ({ content: label }));

  // 8 fixed + Label + 12 months + 5 trailing = 26 columns.
  const TOTAL_COLUMNS = 8 + 12 + 5;

  const body: CellInput[][] = [];
  const sections = groupSections(rows);
  let counter = 0;
  for (const section of sections) {
    body.push([
      {
        content: section.name ?? "Kelompok Program",
        colSpan: TOTAL_COLUMNS,
        styles: { fillColor: NAVY_FILL, textColor: 255, fontStyle: "bold" },
      },
    ]);
    for (const row of section.rows) {
      counter += 1;
      const { program } = row;
      const totals = totalsFor(program.unit, row.monthly);
      const shared = { rowSpan: 2, styles: { valign: "top" as const } };
      const raCells: CellInput[] = MONTHS.map((month) => {
        const cell = row.monthly.find((item) => item.month === month);
        const outside = isOutsidePeriod(month, program.startMonth, program.endMonth);
        return {
          content: cell ? cell.raValue : "",
          styles: outside
            ? { fillColor: OUTSIDE_FILL, textColor: OUTSIDE_TEXT }
            : undefined,
        };
      });
      const riCells: CellInput[] = MONTHS.map((month) => {
        const cell = row.monthly.find((item) => item.month === month);
        return riText(cell ? cell.riValue ?? null : null);
      });
      body.push([
        { content: counter, ...shared },
        { content: program.name, ...shared },
        { content: program.description, ...shared },
        { content: formatPeriod(program.startMonth, program.endMonth, program.year), ...shared },
        { content: program.parameter, ...shared },
        { content: `RA ${totals.ra}\nRI ${totals.ri}`, ...shared },
        { content: program.unit, ...shared },
        "RA",
        ...raCells,
        { content: achievementFor(program.unit, row.monthly), ...shared },
        { content: row.picNames.join(", "), ...shared },
        { content: program.monitor ?? "", ...shared },
        { content: program.note ?? "", ...shared },
        { content: program.evidenceUrl ?? "", ...shared },
      ]);
      body.push(["RI", ...riCells]);
    }
  }

  autoTable(doc, {
    startY: 32,
    head: [headRow1, headRow2, headRow3],
    body,
    styles: { fontSize: 6.5, cellPadding: 1.5 },
    headStyles: { fillColor: NAVY_FILL, textColor: 255, fontStyle: "bold" },
    margin: { left: 10, right: 10 },
  });

  return doc;
}

export function downloadProgramKerjaPdf(
  rows: ProgramKerjaExportRow[],
  meta: ProgramKerjaExportMeta,
  logoDataUrl: string | null = null,
): void {
  const doc = buildProgramKerjaPdf(rows, meta, new Date(), logoDataUrl);
  doc.save(exportFileName(meta.yearFilter));
}

let lastPreviewUrl: string | null = null;

function revokeLastPreviewUrl(): void {
  if (lastPreviewUrl !== null) {
    URL.revokeObjectURL(lastPreviewUrl);
    lastPreviewUrl = null;
  }
}

export async function loadWibexLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch("/asset/logo-top.png");
    if (!response.ok) {
      return null;
    }
    const blob = await response.blob();
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    return dataUrl;
  } catch {
    console.warn("WIBEX logo skipped in PDF export (unavailable).");
    return null;
  }
}

export function viewProgramKerjaPdf(
  rows: ProgramKerjaExportRow[],
  meta: ProgramKerjaExportMeta,
  logoDataUrl: string | null = null,
): void {
  const doc = buildProgramKerjaPdf(rows, meta, new Date(), logoDataUrl);
  const blob = doc.output("blob");
  revokeLastPreviewUrl();
  const url = URL.createObjectURL(blob);
  lastPreviewUrl = url;
  window.open(url, "_blank", "noopener,noreferrer");
  // Bounded cleanup: revoke after 60s (long after the tab has loaded),
  // plus immediate revoke when superseded by the next preview.
  window.setTimeout(() => {
    if (lastPreviewUrl === url) {
      revokeLastPreviewUrl();
    }
  }, 60000);
}
