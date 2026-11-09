import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getCstCategoryLabel } from "@/lib/calculation-sheet-template/constants";
import type { CstTemplateRow } from "@/lib/calculation-sheet-template/cst-draft";

// Calculation Sheet Template Summary PDF export (client-side only).
//
// Built from the rows currently visible on screen, so the PDF can never
// disagree with the table. Kept deliberately simpler than the MKS exporter: no
// logo, no A3 fallback, no grouped header rows.

const MARGIN = 12;
const FOOTER_RESERVE = 16;

const NAVY: [number, number, number] = [0, 31, 63];
const ACCENT: [number, number, number] = [0, 97, 165];
const SLATE_TEXT: [number, number, number] = [51, 65, 85];
const MUTED_TEXT: [number, number, number] = [100, 116, 139];
const BORDER_COLOR: [number, number, number] = [226, 232, 240];
const HEAD_FILL: [number, number, number] = [241, 245, 249];

export const CST_SUMMARY_HEADERS = [
  "Kategori",
  "Kode",
  "Nama",
  "PIC",
  "Evidence",
  "Catatan",
];

const EMPTY_VALUE = "—";

function exportDate(): string {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function buildCstSummaryPdfBody(
  rows: readonly CstTemplateRow[],
): string[][] {
  return rows.map((row) => [
    getCstCategoryLabel(row.kategori) ?? row.kategori,
    row.kode,
    row.nama,
    row.pic.status === "active"
      ? row.pic.name
      : `${row.pic.name} (non-aktif)`,
    row.evidence_url ?? EMPTY_VALUE,
    row.catatan ?? EMPTY_VALUE,
  ]);
}

export function buildCstSummaryPdf(
  rows: readonly CstTemplateRow[],
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
    title: "Calculation Sheet Template - Summary Report",
    subject: "Summary Calculation Sheet Template",
    creator: "WIKA Calculation Sheet Template",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text("CALCULATION SHEET TEMPLATE", MARGIN, 16);

  doc.setFontSize(9.5);
  doc.setTextColor(...ACCENT);
  doc.text("Summary Report", MARGIN, 21.5);

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
    head: [CST_SUMMARY_HEADERS],
    body:
      rows.length === 0
        ? [[{ content: "Belum ada data.", colSpan: CST_SUMMARY_HEADERS.length }]]
        : buildCstSummaryPdfBody(rows),
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
      fontSize: 7,
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
      0: { cellWidth: 34 },
      1: { cellWidth: 28 },
      2: { cellWidth: 55 },
      3: { cellWidth: 40 },
      4: { cellWidth: 58 },
      5: { cellWidth: 60 },
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
    doc.text("WIKA - Calculation Sheet Template", MARGIN, pageHeight - 7.5);
    doc.text(
      `Halaman ${pageNumber} / ${total}`,
      pageWidth - MARGIN,
      pageHeight - 7.5,
      { align: "right" },
    );
  }

  return doc;
}

export function cstSummaryPdfFileName(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  const stamp = [
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`,
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`,
  ].join("-");
  return `Calculation-Sheet-Template-Summary-${stamp}.pdf`;
}

export async function downloadCstSummaryPdf(
  rows: readonly CstTemplateRow[],
  filterLine: string,
): Promise<void> {
  buildCstSummaryPdf(rows, filterLine).save(cstSummaryPdfFileName());
}
