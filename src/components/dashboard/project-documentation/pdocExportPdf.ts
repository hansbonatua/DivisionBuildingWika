import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDOC_WEEKS } from "@/lib/project-documentation/constants";
import type { PdocRowDto } from "@/lib/project-documentation/pdoc-draft";

// Project Documentation PDF export (client-side only).
//
// Built from the rows currently visible on screen, so the PDF can never disagree
// with the table. Uploader metadata is intentionally omitted (D-PDOC-05).

const MARGIN = 12;
const FOOTER_RESERVE = 16;

const NAVY: [number, number, number] = [0, 31, 63];
const ACCENT: [number, number, number] = [0, 97, 165];
const SLATE_TEXT: [number, number, number] = [51, 65, 85];
const MUTED_TEXT: [number, number, number] = [100, 116, 139];
const BORDER_COLOR: [number, number, number] = [226, 232, 240];
const HEAD_FILL: [number, number, number] = [241, 245, 249];

export const PDOC_PDF_HEADERS = [
  "Nama Proyek",
  "Minggu 1",
  "Minggu 2",
  "Minggu 3",
  "Minggu 4",
  "Minggu 5",
  "Catatan",
];

const EMPTY_VALUE = "—";
const URL_PDF_MAX = 58;

export function truncatePdocUrl(value: string, max = URL_PDF_MAX): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

function weekUrl(row: PdocRowDto, week: number): string | null {
  return row.weeks.find((item) => item.week === week)?.url ?? null;
}

export function buildPdocPdfBody(rows: readonly PdocRowDto[]): string[][] {
  return rows.map((row) => [
    row.project_name,
    ...PDOC_WEEKS.map((week) => {
      const url = weekUrl(row, week);
      return url ? truncatePdocUrl(url) : EMPTY_VALUE;
    }),
    row.catatan ?? EMPTY_VALUE,
  ]);
}

function exportDate(): string {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

export function buildPdocPdf(
  rows: readonly PdocRowDto[],
  filterLine: string,
): jsPDF {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const exportedAt = exportDate();

  doc.setProperties({
    title: "Project Documentation",
    subject: "Dokumentasi mingguan project",
    creator: "WIKA Project Documentation",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text("PROJECT DOCUMENTATION", MARGIN, 16);

  doc.setFontSize(9.5);
  doc.setTextColor(...ACCENT);
  doc.text("Dokumentasi Mingguan Project", MARGIN, 21.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED_TEXT);
  doc.text(filterLine, MARGIN, 26.5);
  doc.text(`Tanggal export: ${exportedAt}`, pageWidth - MARGIN, 26.5, {
    align: "right",
  });

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.7);
  doc.line(MARGIN, 30, pageWidth - MARGIN, 30);

  autoTable(doc, {
    head: [PDOC_PDF_HEADERS],
    body:
      rows.length === 0
        ? [[{ content: "Belum ada data.", colSpan: PDOC_PDF_HEADERS.length }]]
        : buildPdocPdfBody(rows),
    startY: 35,
    margin: {
      left: MARGIN,
      right: MARGIN,
      top: 24,
      bottom: FOOTER_RESERVE,
    },
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 6.8,
      textColor: SLATE_TEXT,
      cellPadding: { top: 2, right: 1.8, bottom: 2, left: 1.8 },
      valign: "top",
      overflow: "linebreak",
      lineWidth: 0.1,
      lineColor: BORDER_COLOR,
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: SLATE_TEXT,
      fontStyle: "bold",
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 43 },
      1: { cellWidth: 35 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 35 },
      5: { cellWidth: 35 },
      6: { cellWidth: 55 },
    },
    rowPageBreak: "avoid",
  });

  const total = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, pageHeight - 12, pageWidth - MARGIN, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED_TEXT);
    doc.text("WIKA - Project Documentation", MARGIN, pageHeight - 7.5);
    doc.text(
      `Halaman ${pageNumber} / ${total}`,
      pageWidth - MARGIN,
      pageHeight - 7.5,
      { align: "right" },
    );
  }

  return doc;
}

export function pdocPdfFileName(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  const stamp = [
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join("-");
  return `Project-Documentation-${stamp}.pdf`;
}

export async function downloadPdocPdf(
  rows: readonly PdocRowDto[],
  filterLine: string,
): Promise<void> {
  buildPdocPdf(rows, filterLine).save(pdocPdfFileName());
}
