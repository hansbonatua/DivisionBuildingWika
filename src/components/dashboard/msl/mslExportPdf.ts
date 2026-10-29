import { jsPDF } from "jspdf";
import autoTable, { type CellInput, type Styles } from "jspdf-autotable";
import {
  MSL_CATEGORY_LABELS,
  MSL_CATEGORY_LEGEND,
  formatMslScore,
} from "@/lib/msl/score";
import { formatMslPeriod, mslMonthToken } from "@/lib/msl/period";
import type { MslYearRowDto } from "./msl-api.types";

// MSL Engineering PDF export.
//
// Same conventions as the Program Kerja exporters: jsPDF + jspdf-autotable,
// loaded through a dynamic import from the page so the library stays out of the
// initial bundle, and the logo is fetched as a data URL only when the export is
// actually requested.
//
// No formula lives here: score and category come from the already-derived
// values in the year view (the shared engine computed them server-side), and
// the display helpers (formatMslScore, MSL_CATEGORY_LABELS) are reused so the
// PDF can never disagree with the table.

// The export period is the period currently on screen: a year (from Master
// Project) plus the selected month. `month` is the assessment period, so the
// PDF can never mix two months — the rows below already belong to it.
// The annual note stays YEAR-scoped on purpose and is printed as such.
export type MslPdfSource = {
  year: number;
  month: number;
  rows: MslYearRowDto[];
  note: string | null;
};

const MARGIN = 12;
const COLUMN_COUNT = 8;
const NOTE_LINE_HEIGHT = 4.4;

const NAVY_FILL: [number, number, number] = [30, 58, 95];
const ACCENT: [number, number, number] = [0, 97, 165];
const SLATE_TEXT: [number, number, number] = [51, 65, 85];
const MUTED_TEXT: [number, number, number] = [100, 116, 139];
const BORDER_COLOR: [number, number, number] = [226, 232, 240];
const STRIPE_FILL: [number, number, number] = [248, 250, 252];
const PENDING_FILL: [number, number, number] = [255, 251, 235];
const PENDING_TEXT: [number, number, number] = [180, 83, 9];

// Legend chip colours per semantic tone. Mirrors MSL_CATEGORY_TONES, expressed
// as RGB because a PDF cannot use the dashboard's Tailwind classes.
const TONE_RGB: Record<string, { fill: [number, number, number]; text: [number, number, number] }> = {
  amber: { fill: [254, 243, 199], text: [180, 83, 9] },
  orange: { fill: [255, 237, 213], text: [194, 65, 12] },
  emerald: { fill: [209, 250, 229], text: [4, 120, 87] },
  blue: { fill: [219, 234, 254], text: [29, 78, 216] },
  sky: { fill: [224, 242, 254], text: [3, 105, 161] },
  neutral: { fill: [241, 245, 249], text: [71, 85, 105] },
};

type AutoTableDocument = jsPDF & {
  lastAutoTable?: { finalY?: number };
};

const baseStyles: Partial<Styles> = {
  font: "helvetica",
  fontSize: 8,
  cellPadding: 2,
  textColor: SLATE_TEXT,
  lineColor: BORDER_COLOR,
  lineWidth: 0.1,
  overflow: "linebreak",
  valign: "top",
};

const headStyles: Partial<Styles> = {
  fillColor: NAVY_FILL,
  textColor: 255,
  fontStyle: "bold",
  fontSize: 8,
  valign: "middle",
};

function exportStamp(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// Period-aware, filesystem-safe name: MSL-Engineering-2026-09-20261029-130000.pdf
// The month is the zero-padded numeric token (never a localised month name, so
// the file sorts correctly and survives any filesystem/locale).
export function mslPdfFileName(
  year: number,
  month: number,
  now: Date = new Date(),
): string {
  return `MSL-Engineering-${year}-${mslMonthToken(month)}-${exportStamp(now)}.pdf`;
}

function currentY(doc: jsPDF, fallback: number): number {
  const finalY = (doc as AutoTableDocument).lastAutoTable?.finalY;
  return typeof finalY === "number" ? finalY : fallback;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 16) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

// Category legend: text is always printed next to the colour, so the category is
// never conveyed by colour alone (same rule as the on-screen legend).
function drawLegend(doc: jsPDF, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED_TEXT);
  doc.text("Kategori", MARGIN, y + 0.6);

  let x = MARGIN + 18;
  for (const item of MSL_CATEGORY_LEGEND) {
    const tone = TONE_RGB[item.tone] ?? TONE_RGB.neutral;
    const label = MSL_CATEGORY_LABELS[item.category];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const chipWidth = doc.getTextWidth(label) + 5;
    doc.setFillColor(tone.fill[0], tone.fill[1], tone.fill[2]);
    doc.setDrawColor(tone.fill[0], tone.fill[1], tone.fill[2]);
    doc.roundedRect(x, y - 2.6, chipWidth, 5.2, 1, 1, "F");
    doc.setTextColor(tone.text[0], tone.text[1], tone.text[2]);
    doc.text(label, x + 2.5, y + 0.7);
    x += chipWidth + 2.5;
  }

  doc.setTextColor(0);
  return y + 7;
}

function tableBody(source: MslPdfSource): CellInput[][] {
  if (source.rows.length === 0) {
    return [
      [
        {
          content: `Belum ada Master Project untuk tahun ${source.year}.`,
          colSpan: COLUMN_COUNT,
          styles: { halign: "center", textColor: MUTED_TEXT, fontStyle: "normal" },
        },
      ],
    ];
  }

  return source.rows.map((row, index) => {
    const assessment = row.assessment;
    const location = row.location.trim();
    return [
      { content: String(index + 1), styles: { halign: "center" } },
      {
        content: location !== "" ? `${row.name}\n${location}` : row.name,
        styles: { fontStyle: "bold", textColor: [30, 41, 59] },
      },
      assessment ? formatMslScore(assessment.engineeringValue) : "-",
      assessment ? formatMslScore(assessment.metodeKerja) : "-",
      assessment ? formatMslScore(assessment.engineeringExecution) : "-",
      assessment
        ? { content: formatMslScore(assessment.score), styles: { fontStyle: "bold" } }
        : "-",
      assessment
        ? MSL_CATEGORY_LABELS[assessment.category]
        : {
            content: "Belum Dinilai",
            styles: {
              fillColor: PENDING_FILL,
              textColor: PENDING_TEXT,
              fontStyle: "bold",
            },
          },
      assessment?.remarks && assessment.remarks.trim() !== "" ? assessment.remarks : "-",
    ];
  });
}

function drawNoteSection(
  doc: jsPDF,
  note: string | null,
  year: number,
  startY: number,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = ensureSpace(doc, startY + 4, 26);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY_FILL);
  // Year, never the month: the annual note is one per year and must not read as
  // a September-only note.
  doc.text(`Note Akhir Tahun ${year}`, MARGIN, y);
  doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 1.8, MARGIN + 12, y + 1.8);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_TEXT);

  const text = note && note.trim() !== "" ? note.trim() : "-";
  // Long notes wrap and break onto a new page instead of being clipped.
  const lines = doc.splitTextToSize(text, pageWidth - MARGIN * 2) as string[];
  for (const line of lines) {
    y = ensureSpace(doc, y, NOTE_LINE_HEIGHT + 4);
    doc.text(line, MARGIN, y);
    y += NOTE_LINE_HEIGHT;
  }

  doc.setTextColor(0);
  return y;
}

function addPageNumbers(doc: jsPDF, source: MslPdfSource): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  const periodLabel = formatMslPeriod(source.year, source.month);

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_TEXT);
    doc.text(`MSL Engineering \u00b7 ${periodLabel}`, MARGIN, pageHeight - 7);
    const label = `Halaman ${page} / ${total}`;
    doc.text(label, pageWidth - MARGIN - doc.getTextWidth(label), pageHeight - 7);
  }
  doc.setTextColor(0);
}

export function buildMslPdf(
  source: MslPdfSource,
  now: Date = new Date(),
  logoDataUrl: string | null = null,
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const periodLabel = formatMslPeriod(source.year, source.month);

  doc.setProperties({
    title: `MSL Engineering ${periodLabel}`,
    subject: `MSL Engineering \u00b7 ${periodLabel}`,
    author: "WIBEX",
  });

  if (logoDataUrl) {
    try {
      const logoWidth = 42;
      const logoHeight = (logoWidth * 600) / 1920;
      doc.addImage(
        logoDataUrl,
        "PNG",
        pageWidth - MARGIN - logoWidth,
        9,
        logoWidth,
        logoHeight,
      );
    } catch {
      console.warn("WIBEX logo skipped in MSL PDF (unreadable image).");
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("MSL ENGINEERING", MARGIN, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...SLATE_TEXT);
  doc.text("Penilaian Kapabilitas Engineering per Proyek", MARGIN, 21);

  doc.setFontSize(9);
  doc.setTextColor(...MUTED_TEXT);
  // Period, not just the year: the same year has twelve independent exports.
  doc.text(`Periode: ${periodLabel}`, MARGIN, 27);
  const dateLabel = now.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const stampLabel = `Tanggal export: ${dateLabel}`;
  doc.text(stampLabel, pageWidth - MARGIN - doc.getTextWidth(stampLabel), 27);

  doc.setDrawColor(BORDER_COLOR[0], BORDER_COLOR[1], BORDER_COLOR[2]);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 30, pageWidth - MARGIN, 30);
  doc.setTextColor(0);

  const tableStartY = drawLegend(doc, 35);

  autoTable(doc, {
    startY: tableStartY,
    head: [
      [
        "No",
        "Nama Proyek",
        "Engineering Value",
        "Metode Kerja",
        "Engineering Execution",
        "MSL Score",
        "MSL Kategori",
        "Remarks",
      ],
    ],
    body: tableBody(source),
    theme: "grid",
    styles: baseStyles,
    headStyles,
    alternateRowStyles: { fillColor: STRIPE_FILL },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 62 },
      2: { cellWidth: 28, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 34, halign: "right" },
      5: { cellWidth: 22, halign: "right" },
      6: { cellWidth: 33 },
      7: { cellWidth: "auto" },
    },
    margin: { left: MARGIN, right: MARGIN, bottom: 16 },
    showHead: "everyPage",
  });

  drawNoteSection(doc, source.note, source.year, currentY(doc, tableStartY));
  addPageNumbers(doc, source);

  return doc;
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
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === "string" ? reader.result : null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    console.warn("WIBEX logo skipped in MSL PDF (unavailable).");
    return null;
  }
}

export function downloadMslPdf(source: MslPdfSource, logoDataUrl: string | null = null): void {
  const now = new Date();
  const doc = buildMslPdf(source, now, logoDataUrl);
  doc.save(mslPdfFileName(source.year, source.month, now));
}

export function viewMslPdf(source: MslPdfSource, logoDataUrl: string | null = null): void {
  const doc = buildMslPdf(source, new Date(), logoDataUrl);
  const blob = doc.output("blob");
  revokeLastPreviewUrl();
  const url = URL.createObjectURL(blob);
  lastPreviewUrl = url;
  window.open(url, "_blank", "noopener,noreferrer");
  // Bounded cleanup: revoke after 60s (long after the tab has loaded), plus
  // immediate revoke when superseded by the next preview.
  window.setTimeout(() => {
    if (lastPreviewUrl === url) {
      revokeLastPreviewUrl();
    }
  }, 60000);
}
