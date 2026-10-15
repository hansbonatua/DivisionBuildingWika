import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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

// Pure builder (no DOM): landscape A3 split into readable sections.
export function buildProgramKerjaPdf(
  rows: ProgramKerjaExportRow[],
  meta: ProgramKerjaExportMeta,
  now: Date = new Date(),
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
  const pageWidth = doc.internal.pageSize.getWidth();

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

  const tableOptions = {
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [30, 58, 95] as [number, number, number], textColor: 255, fontStyle: "bold" as const },
    margin: { left: 14, right: 14 },
  };

  autoTable(doc, {
    ...tableOptions,
    startY: 32,
    head: [
      [
        "No",
        "Kelompok",
        "Nama Program Kerja",
        "Deskripsi",
        "Tahun",
        "Rencana Waktu",
        "Parameter",
        "Unit",
        "Total RA",
        "RI Berjalan",
        "Pencapaian",
        "PIC",
        "Monitor",
        "Catatan",
        "Evidence",
      ],
    ],
    body: rows.map((row, index) => {
      const totals = totalsFor(row.program.unit, row.monthly);
      return [
        index + 1,
        row.groupName ?? "",
        row.program.name,
        row.program.description,
        row.program.year,
        formatPeriod(row.program.startMonth, row.program.endMonth, row.program.year),
        row.program.parameter,
        row.program.unit,
        totals.ra,
        totals.ri,
        achievementFor(row.program.unit, row.monthly),
        row.picNames.join(", "),
        row.program.monitor ?? "",
        row.program.note ?? "",
        row.program.evidenceUrl ?? "",
      ];
    }),
  });

  for (const half of [0, 1] as const) {
    const months = MONTH_SHORT.map((_, index) => index + 1).slice(half * 6, half * 6 + 6);
    autoTable(doc, {
      ...tableOptions,
      head: [["No", "Nama", ...months.flatMap((m) => [`${MONTH_SHORT[m - 1]} RA`, `${MONTH_SHORT[m - 1]} RI`])]],
      body: rows.map((row, index) => [
        index + 1,
        row.program.name,
        ...months.flatMap((month) => {
          const cell = row.monthly.find((item) => item.month === month);
          return [cell ? cell.raValue : "", riText(cell ? cell.riValue ?? null : null)];
        }),
      ]),
      // RA outside-period cells get a light green fill (same meaning as the
      // dashboard table). RI cells are never highlighted.
      didParseCell: (data) => {
        if (data.section !== "body") {
          return;
        }
        const offset = data.column.index - 2;
        if (offset < 0 || offset % 2 !== 0) {
          return;
        }
        const row = rows[data.row.index];
        const month = months[offset / 2];
        if (
          row &&
          month !== undefined &&
          (month < row.program.startMonth || month > row.program.endMonth)
        ) {
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.textColor = [22, 101, 52];
        }
      },
    });
  }

  return doc;
}

export function downloadProgramKerjaPdf(
  rows: ProgramKerjaExportRow[],
  meta: ProgramKerjaExportMeta,
): void {
  const doc = buildProgramKerjaPdf(rows, meta);
  doc.save(exportFileName(meta.yearFilter));
}
