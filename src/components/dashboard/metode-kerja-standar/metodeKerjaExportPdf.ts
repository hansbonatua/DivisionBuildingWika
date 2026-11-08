import { jsPDF } from "jspdf";
import autoTable, { type CellInput, type Styles } from "jspdf-autotable";
import type { SummaryRow } from "@/lib/metode-kerja-standar/summary";

// Metode Kerja Standar Summary PDF export.
//
// Follows the existing Knowledge Management / MSL conventions: jsPDF +
// jspdf-autotable, dynamic import from the page, logo fetched as a data URL
// only when the export is requested, local timestamp in the file name, page
// furniture with a page counter.
//
// The builder is pure and synchronous so it can be unit-tested in Node: it
// never fetches and never touches the DOM. The view/download wrappers are the
// only browser-dependent part.
//
// A4 landscape is the default; a long Summary (more than A3_COLUMN_FALLBACK
// rows) switches to A3 landscape so the table does not collapse into
// unreadably narrow columns.
//
// F. Lainnya always exists even when empty (D-D-03): an empty discipline still
// produces one printable row whose Item cell reads "Belum ada item", so the
// PDF is always generated, never skipped and never throws.

const MARGIN = 12;
const FOOTER_RESERVE = 18;
const CONTINUATION_TOP = 24;
const A3_ROW_THRESHOLD = 120;

const NAVY: [number, number, number] = [30, 58, 95];
const ACCENT: [number, number, number] = [0, 97, 165];
const SLATE_TEXT: [number, number, number] = [51, 65, 85];
const MUTED_TEXT: [number, number, number] = [100, 116, 139];
const BORDER_COLOR: [number, number, number] = [226, 232, 240];
const HEAD_FILL: [number, number, number] = [241, 245, 249];
const HEAD_TEXT: [number, number, number] = [51, 65, 85];

const EMPTY_VALUE = "—";
const EMPTY_ITEM = "Belum ada item";
const EMPTY_SUB_KATEGORI = "Belum ada sub-kategori";
const CONTINUATION_BRAND = "WIKA - Metode Kerja Standar";

// The ordinal "No" column is gone: Disiplin + Kode already identify a row, and
// the freed width goes to the descriptive columns below.
const TABLE_HEADERS = [
  "Disiplin",
  "Sub-Kategori",
  "Item",
  "PIC",
  "Evidence",
  "Status",
  "Diperbarui",
];

// Relative widths; scaled to the actual printable width so A4 and A3 both fill
// the page instead of leaving a gap.
const BASE_COLUMN_WIDTHS = [30, 48, 56, 46, 46, 28, 24];

export type SummaryPdfCells = {
  disiplin: string;
  subKategori: string;
  item: string;
  pic: string;
  evidence: string;
  status: string;
  updated: string;
};

export function summaryStatusLabel(status: SummaryRow["status"]): string {
  if (status === "item") return "Item";
  if (status === "sub-kategori-kosong") return "Tanpa item";
  return "Disiplin kosong";
}

export function formatSummaryDate(iso: string | null): string {
  if (!iso) return EMPTY_VALUE;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPics(row: SummaryRow): string {
  if (row.pics.length === 0) return EMPTY_VALUE;
  return row.pics
    .map((pic) =>
      pic.status === "active" ? pic.name : `${pic.name} (non-aktif)`,
    )
    .join("\n");
}

// Pure SummaryRow -> cell text mapping. Exported so the empty-discipline
// rendering (D-D-03) is testable without parsing PDF bytes.
export function summaryPdfCells(row: SummaryRow): SummaryPdfCells {
  return {
    disiplin: `${row.disiplin.code}. ${row.disiplin.name}`,
    subKategori: row.sub_kategori
      ? `${row.sub_kategori.kode} ${row.sub_kategori.nama}`
      : EMPTY_SUB_KATEGORI,
    item: row.item ? `${row.item.kode} ${row.item.nama}` : EMPTY_ITEM,
    pic: formatPics(row),
    evidence: row.evidence_url ?? EMPTY_VALUE,
    status: summaryStatusLabel(row.status),
    updated: formatSummaryDate(row.updated_at),
  };
}

export function metodeKerjaSummaryPdfFileName(now: Date = new Date()): string {
  return `Metode-Kerja-Standar-Summary-${timestampToken(now)}.pdf`;
}

export type MetodeKerjaSummaryPdfOptions = {
  logoDataUrl?: string | null;
  filterLine?: string;
};

export function buildMetodeKerjaSummaryPdf(
  rows: readonly SummaryRow[],
  options: MetodeKerjaSummaryPdfOptions = {},
): jsPDF {
  const format = rows.length > A3_ROW_THRESHOLD ? "a3" : "a4";
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format,
    compress: true,
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  const exportedAt = exportDate();
  const disiplinTerisi = new Set(
    rows.filter((row) => row.status !== "disiplin-kosong").map((row) => row.disiplin.code),
  ).size;

  doc.setProperties({
    title: "Metode Kerja Standar - Summary Report",
    subject: "Summary Metode Kerja Standar",
    creator: "WIKA Metode Kerja Standar",
  });

  drawDocumentTitle(doc, {
    title: "METODE KERJA STANDAR",
    subtitle: "Summary Report",
    filterLine:
      options.filterLine ??
      `${rows.length} baris  |  ${disiplinTerisi} dari 6 disiplin terisi`,
    exportedAt,
    logoDataUrl: options.logoDataUrl ?? null,
  });

  const body: CellInput[][] =
    rows.length === 0
      ? [
          [
            {
              content: "Belum ada data Metode Kerja Standar.",
              colSpan: TABLE_HEADERS.length,
              styles: {
                halign: "center",
                fontStyle: "italic",
                textColor: MUTED_TEXT,
              },
            },
          ],
        ]
      : rows.map((row) => {
          const cells = summaryPdfCells(row);
          const empty = row.status !== "item";
          return [
            {
              content: cells.disiplin,
              styles: { fontStyle: "bold", textColor: NAVY },
            },
            {
              content: cells.subKategori,
              styles: { textColor: empty ? MUTED_TEXT : SLATE_TEXT },
            },
            {
              content: cells.item,
              styles: {
                cellPadding: { top: 2, right: 1.8, bottom: 2, left: 4 },
                textColor: empty ? MUTED_TEXT : SLATE_TEXT,
                fontStyle: empty ? "italic" : "normal",
              },
            },
            { content: cells.pic, styles: { fontSize: 6.8 } },
            {
              content: cells.evidence,
              styles: { fontSize: 6.4, textColor: ACCENT },
            },
            {
              content: cells.status,
              styles: { fontSize: 6.4, textColor: MUTED_TEXT },
            },
            {
              content: cells.updated,
              styles: { fontSize: 6.4, textColor: MUTED_TEXT },
            },
          ];
        });

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
    styles: {
      font: "helvetica",
      fontSize: 7,
      textColor: SLATE_TEXT,
      cellPadding: { top: 2, right: 1.8, bottom: 2, left: 1.8 },
      valign: "top",
      overflow: "linebreak",
      lineWidth: 0.1,
      lineColor: BORDER_COLOR,
    } satisfies Partial<Styles>,
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: HEAD_TEXT,
      fontStyle: "bold",
      fontSize: 7,
      lineWidth: 0.1,
      lineColor: BORDER_COLOR,
    },
    columnStyles: columnWidths(contentWidth),
    rowPageBreak: "avoid",
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...NAVY);
        doc.text("METODE KERJA STANDAR - SUMMARY", MARGIN, 13);
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

  drawFooters(doc, pageWidth, pageHeight);
  return doc;
}

// ---------------------------------------------------------------------------
// Browser wrappers
// ---------------------------------------------------------------------------

export async function viewMetodeKerjaSummaryPdf(
  rows: readonly SummaryRow[],
  filterLine?: string,
): Promise<void> {
  const logo = await loadWibexLogoDataUrl();
  openPdfInNewTab(
    buildMetodeKerjaSummaryPdf(rows, { logoDataUrl: logo, filterLine }),
  );
}

export async function downloadMetodeKerjaSummaryPdf(
  rows: readonly SummaryRow[],
  filterLine?: string,
): Promise<void> {
  const logo = await loadWibexLogoDataUrl();
  buildMetodeKerjaSummaryPdf(rows, { logoDataUrl: logo, filterLine }).save(
    metodeKerjaSummaryPdfFileName(),
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function columnWidths(contentWidth: number): Record<string, Partial<Styles>> {
  const total = BASE_COLUMN_WIDTHS.reduce((sum, width) => sum + width, 0);
  const scale = contentWidth / total;
  const widths: Record<string, Partial<Styles>> = {};
  BASE_COLUMN_WIDTHS.forEach((width, index) => {
    widths[String(index)] = { cellWidth: width * scale };
  });
  return widths;
}

function drawDocumentTitle(
  doc: jsPDF,
  options: {
    title: string;
    subtitle: string;
    filterLine: string;
    exportedAt: string;
    logoDataUrl: string | null;
  },
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoWidth = 32;
  const logoHeight = 10.5;

  if (options.logoDataUrl) {
    doc.addImage(
      options.logoDataUrl,
      "PNG",
      pageWidth - MARGIN - logoWidth,
      9,
      logoWidth,
      logoHeight,
    );
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(options.title, MARGIN, 16);

  doc.setFontSize(9.5);
  doc.setTextColor(...ACCENT);
  doc.text(options.subtitle, MARGIN, 21.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED_TEXT);
  doc.text(options.filterLine, MARGIN, 26.5);
  doc.text(`Tanggal export: ${options.exportedAt}`, pageWidth - MARGIN, 26.5, {
    align: "right",
  });

  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.7);
  doc.line(MARGIN, 30, pageWidth - MARGIN, 30);
}

function drawFooters(doc: jsPDF, pageWidth: number, pageHeight: number): void {
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
    doc.text(
      `Halaman ${pageNumber} / ${total}`,
      pageWidth - MARGIN,
      pageHeight - 7.5,
      { align: "right" },
    );
  }
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
