import { jsPDF } from "jspdf";
import autoTable, { type CellInput, type Styles } from "jspdf-autotable";
import {
  KNOWLEDGE_TYPE_LABELS,
  KNOWLEDGE_TYPE_SLUGS,
  type KnowledgeType,
} from "@/lib/knowledge-management/schema";
import {
  formatKnowledgeDate,
  type KnowledgeFilters,
  type KnowledgeRecordDto,
} from "@/components/dashboard/knowledge-management/types";

// Knowledge Management PDF export.
//
// Follows the existing MSL / Program Kerja conventions without touching them:
// jsPDF + jspdf-autotable, loaded with a dynamic import from the table, logo
// fetched as a data URL only when the export is requested, WIB-free local
// timestamp in the file name, and page furniture with a page counter.
//
// The source of truth is the data already on screen: the table passes its
// filtered records, so the PDF can never contain rows the user could not see.
// No request is made here.
//
// loadWibexLogoDataUrl is intentionally duplicated from the other exporters
// instead of being extracted: refactoring those files is out of scope and the
// duplication is the established pattern (one helper per exporter).
//
// F-02b (whole table) is A4 landscape; F-02a (single record) is A4 portrait.

const MARGIN = 12;
const FOOTER_RESERVE = 18;
const CONTINUATION_TOP = 24;

const NAVY: [number, number, number] = [30, 58, 95];
const ACCENT: [number, number, number] = [0, 97, 165];
const SLATE_TEXT: [number, number, number] = [51, 65, 85];
const MUTED_TEXT: [number, number, number] = [100, 116, 139];
const BORDER_COLOR: [number, number, number] = [226, 232, 240];
const HEAD_FILL: [number, number, number] = [241, 245, 249];
const HEAD_TEXT: [number, number, number] = [51, 65, 85];
const SOFT_FILL: [number, number, number] = [248, 250, 252];

const TABLE_HEADERS = [
  "No",
  "Master Project",
  "Isi Knowledge",
  "PIC",
  "Evidence",
  "Record History",
];

// Printable width on A4 landscape = 297 - 12 - 12 = 273mm.
const TABLE_COLUMN_WIDTHS: Record<string, Partial<Styles>> = {
  "0": { cellWidth: 9 },
  "1": { cellWidth: 52 },
  "2": { cellWidth: 96 },
  "3": { cellWidth: 42 },
  "4": { cellWidth: 38 },
  "5": { cellWidth: 36 },
};

const EMPTY_VALUE = "—";
const CONTINUATION_BRAND = "WIKA - Knowledge Management";

export function knowledgeTablePdfFileName(
  knowledgeType: KnowledgeType,
  now: Date = new Date(),
): string {
  return `Knowledge-${KNOWLEDGE_TYPE_SLUGS[knowledgeType]}-${timestampToken(now)}.pdf`;
}

export function knowledgeRecordPdfFileName(
  knowledgeType: KnowledgeType,
  now: Date = new Date(),
): string {
  return `Knowledge-${KNOWLEDGE_TYPE_SLUGS[knowledgeType]}-${timestampToken(now)}.pdf`;
}

// ---------------------------------------------------------------------------
// F-02b: whole table, A4 landscape
// ---------------------------------------------------------------------------

export function buildKnowledgeTablePdf(
  records: KnowledgeRecordDto[],
  knowledgeType: KnowledgeType,
  filters: KnowledgeFilters,
  logoDataUrl: string | null = null,
): jsPDF {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const label = KNOWLEDGE_TYPE_LABELS[knowledgeType];
  const pageWidth = doc.internal.pageSize.getWidth();
  const projectName = resolveProjectName(records, filters);
  const exportedAt = exportDate();
  const filterLine = `Tahun: ${filters.year ?? "Semua"}  |  Proyek: ${projectName}`;

  doc.setProperties({
    title: `${label} - Knowledge Management`,
    subject: `Knowledge Management ${label}`,
    creator: "WIKA Knowledge Management",
  });

  drawDocumentTitle(doc, {
    title: "KNOWLEDGE MANAGEMENT",
    subtitle: label,
    filterLine,
    exportedAt,
    logoDataUrl,
  });

  const body: CellInput[][] =
    records.length === 0
      ? [
          [
            {
              content: "Tidak ada record untuk filter yang dipilih.",
              colSpan: 6,
              styles: {
                halign: "center",
                fontStyle: "italic",
                textColor: MUTED_TEXT,
              },
            },
          ],
        ]
      : records.map((record, index) => [
          {
            content: String(index + 1),
            styles: { halign: "center", textColor: MUTED_TEXT },
          },
          {
            content: `${record.project.name}\n${record.project.location} | ${record.project.year}`,
            styles: { fontStyle: "bold", textColor: NAVY },
          },
          record.content,
          formatPics(record),
          {
            content: `${record.evidence.name}\n${record.evidence.url}`,
            styles: { fontSize: 6.5, textColor: MUTED_TEXT },
          },
          {
            content: formatHistory(record),
            styles: { fontSize: 6.5, textColor: MUTED_TEXT },
          },
        ]);

  const tableStyles: Partial<Styles> = {
    font: "helvetica",
    fontSize: 6.9,
    textColor: SLATE_TEXT,
    cellPadding: { top: 2, right: 1.8, bottom: 2, left: 1.8 },
    valign: "top",
    overflow: "linebreak",
    lineWidth: 0.1,
    lineColor: BORDER_COLOR,
  };

  autoTable(doc, {
    head: [TABLE_HEADERS],
    body,
    startY: 35,
    margin: {
      left: MARGIN,
      right: MARGIN,
      top: CONTINUATION_TOP,
      bottom: FOOTER_RESERVE,
    },
    theme: "plain",
    styles: tableStyles,
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: HEAD_TEXT,
      fontStyle: "bold",
      fontSize: 7,
      lineWidth: 0.1,
      lineColor: BORDER_COLOR,
    },
    columnStyles: TABLE_COLUMN_WIDTHS,
    rowPageBreak: "avoid",
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...NAVY);
        doc.text(`KNOWLEDGE MANAGEMENT - ${label}`, MARGIN, 13);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...MUTED_TEXT);
        doc.text(`Tanggal export: ${exportedAt}`, pageWidth - MARGIN, 13, {
          align: "right",
        });
        doc.setDrawColor(...ACCENT);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, 16, pageWidth - MARGIN, 16);
      }
    },
  });

  drawFooters(doc);
  return doc;
}

// ---------------------------------------------------------------------------
// F-02a: single record, A4 portrait
// ---------------------------------------------------------------------------

export function buildKnowledgeRecordPdf(
  record: KnowledgeRecordDto,
  knowledgeType: KnowledgeType,
  logoDataUrl: string | null = null,
): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const label = KNOWLEDGE_TYPE_LABELS[knowledgeType];
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const exportedAt = exportDate();

  doc.setProperties({
    title: `${label} - ${record.project.name} - Knowledge Management`,
    subject: `Knowledge Management ${label}`,
    creator: "WIKA Knowledge Management",
  });

  drawDocumentTitle(doc, {
    title: "KNOWLEDGE MANAGEMENT",
    subtitle: label,
    filterLine: `${record.project.location} | ${record.project.year}`,
    exportedAt,
    logoDataUrl,
    portrait: true,
  });

  let y = 36;
  doc.setFillColor(...SOFT_FILL);
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.2);
  doc.roundedRect(MARGIN, y, contentWidth, 17, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...NAVY);
  doc.text(record.project.name, MARGIN + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED_TEXT);
  doc.text(
    `Master Project | ${record.project.location} | ${record.project.year}`,
    MARGIN + 4,
    y + 12.5,
  );
  y += 26;

  function drawContinuation(): void {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(`KNOWLEDGE MANAGEMENT - ${label}`, MARGIN, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED_TEXT);
    doc.text(`Tanggal export: ${exportedAt}`, pageWidth - MARGIN, 13, {
      align: "right",
    });
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 16, pageWidth - MARGIN, 16);
  }

  function ensureSpace(needed: number, currentY: number): number {
    if (currentY + needed <= pageHeight - FOOTER_RESERVE) return currentY;
    doc.addPage();
    drawContinuation();
    return CONTINUATION_TOP;
  }

  function drawSectionTitle(title: string, currentY: number): number {
    const top = ensureSpace(12, currentY);
    doc.setFillColor(...ACCENT);
    doc.rect(MARGIN, top - 2.6, 2, 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    doc.text(title.toUpperCase(), MARGIN + 4, top);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, top + 2.4, pageWidth - MARGIN, top + 2.4);
    return top + 7;
  }

  function drawParagraph(text: string, currentY: number): number {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_TEXT);
    const lines = doc.splitTextToSize(
      text.length > 0 ? text : EMPTY_VALUE,
      contentWidth,
    ) as string[];
    const lineHeight = 4.8;
    let top = currentY;
    for (const line of lines) {
      top = ensureSpace(lineHeight, top);
      doc.text(line, MARGIN, top);
      top += lineHeight;
    }
    return top + 2;
  }

  y = drawSectionTitle("Isi Knowledge", y);
  y = drawParagraph(record.content, y) + 3;

  y = ensureSpace(14, y);
  y = drawSectionTitle("PIC", y);
  y = drawParagraph(formatPics(record, ", "), y) + 3;

  y = ensureSpace(16, y);
  y = drawSectionTitle("Evidence", y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  y = ensureSpace(6, y);
  doc.text(record.evidence.name, MARGIN, y);
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...ACCENT);
  const urlLines = doc.splitTextToSize(record.evidence.url, contentWidth) as string[];
  for (const line of urlLines) {
    y = ensureSpace(4.2, y);
    doc.textWithLink(line, MARGIN, y, { url: record.evidence.url });
    y += 4.2;
  }
  y += 3;

  y = ensureSpace(30, y);
  y = drawSectionTitle("Record History", y);
  const columnWidth = contentWidth / 2 - 3;
  const updatedByName = record.updated_by?.name ?? EMPTY_VALUE;
  drawHistoryColumn(doc, "Dibuat oleh", record.created_by.name, record.created_at, MARGIN, y, columnWidth);
  drawHistoryColumn(
    doc,
    "Diubah oleh",
    updatedByName,
    record.updated_at,
    MARGIN + contentWidth / 2 + 3,
    y,
    columnWidth,
  );

  drawFooters(doc);
  return doc;
}

// ---------------------------------------------------------------------------
// Browser wrappers
// ---------------------------------------------------------------------------

export async function viewKnowledgeTablePdf(
  records: KnowledgeRecordDto[],
  knowledgeType: KnowledgeType,
  filters: KnowledgeFilters,
): Promise<void> {
  const logo = await loadWibexLogoDataUrl();
  openPdfInNewTab(buildKnowledgeTablePdf(records, knowledgeType, filters, logo));
}

export async function downloadKnowledgeTablePdf(
  records: KnowledgeRecordDto[],
  knowledgeType: KnowledgeType,
  filters: KnowledgeFilters,
): Promise<void> {
  const logo = await loadWibexLogoDataUrl();
  buildKnowledgeTablePdf(records, knowledgeType, filters, logo).save(
    knowledgeTablePdfFileName(knowledgeType),
  );
}

export async function viewKnowledgeRecordPdf(
  record: KnowledgeRecordDto,
  knowledgeType: KnowledgeType,
): Promise<void> {
  const logo = await loadWibexLogoDataUrl();
  openPdfInNewTab(buildKnowledgeRecordPdf(record, knowledgeType, logo));
}

export async function downloadKnowledgeRecordPdf(
  record: KnowledgeRecordDto,
  knowledgeType: KnowledgeType,
): Promise<void> {
  const logo = await loadWibexLogoDataUrl();
  buildKnowledgeRecordPdf(record, knowledgeType, logo).save(
    knowledgeRecordPdfFileName(knowledgeType),
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function drawDocumentTitle(
  doc: jsPDF,
  options: {
    title: string;
    subtitle: string;
    filterLine: string;
    exportedAt: string;
    logoDataUrl: string | null;
    portrait?: boolean;
  },
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = options.portrait ? 14 : MARGIN;
  const logoWidth = 32;
  const logoHeight = 10.5;

  if (options.logoDataUrl) {
    doc.addImage(
      options.logoDataUrl,
      "PNG",
      pageWidth - margin - logoWidth,
      9,
      logoWidth,
      logoHeight,
    );
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(options.portrait ? 14 : 15);
  doc.setTextColor(...NAVY);
  doc.text(options.title, margin, 16);

  doc.setFontSize(options.portrait ? 9 : 9.5);
  doc.setTextColor(...ACCENT);
  doc.text(options.subtitle, margin, 21.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED_TEXT);
  doc.text(options.filterLine, margin, 26.5);
  doc.text(`Tanggal export: ${options.exportedAt}`, pageWidth - margin, 26.5, {
    align: "right",
  });

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.7);
  doc.line(margin, 30, pageWidth - margin, 30);
}

function drawFooters(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();

  for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, pageHeight - 12, pageWidth - MARGIN, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED_TEXT);
    doc.text(CONTINUATION_BRAND, MARGIN, pageHeight - 7.5);
    doc.text(`Halaman ${pageNumber} / ${total}`, pageWidth - MARGIN, pageHeight - 7.5, {
      align: "right",
    });
  }
}

function drawHistoryColumn(
  doc: jsPDF,
  label: string,
  name: string,
  date: string,
  x: number,
  y: number,
  width: number,
): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED_TEXT);
  doc.text(label.toUpperCase(), x, y);

  doc.setFontSize(9);
  doc.setTextColor(...SLATE_TEXT);
  const nameLines = doc.splitTextToSize(name, width) as string[];
  doc.text(nameLines, x, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED_TEXT);
  doc.text(formatKnowledgeDate(date), x, y + 5 + nameLines.length * 4.2 + 1);
}

function formatPics(record: KnowledgeRecordDto, separator = "\n"): string {
  if (record.pics.length === 0) return EMPTY_VALUE;
  return record.pics
    .map((pic) => (pic.status === "active" ? pic.name : `${pic.name} (non-aktif)`))
    .join(separator);
}

function formatHistory(record: KnowledgeRecordDto): string {
  const updatedByName = record.updated_by?.name ?? EMPTY_VALUE;
  return [
    `Dibuat: ${record.created_by.name}`,
    formatKnowledgeDate(record.created_at),
    `Diubah: ${updatedByName}`,
    formatKnowledgeDate(record.updated_at),
  ].join("\n");
}

function resolveProjectName(
  records: KnowledgeRecordDto[],
  filters: KnowledgeFilters,
): string {
  if (!filters.projectId) return "Semua proyek";
  return (
    records.find((record) => record.project.project_id === filters.projectId)?.project
      .name ?? "Proyek terpilih"
  );
}

function exportDate(): string {
  return new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function timestampToken(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return [
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`,
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`,
  ].join("-");
}

async function loadWibexLogoDataUrl(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const response = await fetch("/asset/logo-top.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function openPdfInNewTab(doc: jsPDF): void {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
