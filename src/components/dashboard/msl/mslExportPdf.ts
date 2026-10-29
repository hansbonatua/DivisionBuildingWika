import { jsPDF } from "jspdf";
import autoTable, {
  type CellHookData,
  type CellInput,
  type Styles,
} from "jspdf-autotable";
import {
  MSL_CATEGORY_LABELS,
  MSL_CATEGORY_LEGEND,
  MSL_CATEGORY_TONES,
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
//
// V2.5 visual polish: the PDF is the print rendering of the SAME table the
// dashboard shows, so it borrows its vocabulary instead of autoTable's default
// grid — a soft header band with a single accent rule, a two-level project cell
// (bold name, secondary location), centered numeric columns, category chips and
// a wide remarks column. Horizontal rules only: the dashboard has no vertical
// borders and no zebra striping, so neither does the PDF.

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

// Page furniture reserves: the footer rule sits just above the content bottom.
const FOOTER_RESERVE = 18;
const CONTINUATION_TOP = 24;

// Colour vocabulary mirrored from the dashboard tokens (a PDF cannot use
// Tailwind classes). text-primary / outline / primary-60 from the design system.
const NAVY: [number, number, number] = [30, 58, 95];
const ACCENT: [number, number, number] = [0, 97, 165];
const SLATE_TEXT: [number, number, number] = [51, 65, 85];
const MUTED_TEXT: [number, number, number] = [100, 116, 139];
const PROJECT_NAME_TEXT: [number, number, number] = [30, 41, 59];
const REMARKS_TEXT: [number, number, number] = [71, 85, 105];
const BORDER_COLOR: [number, number, number] = [226, 232, 240];
const HEAD_FILL: [number, number, number] = [241, 245, 249];
const HEAD_TEXT: [number, number, number] = [51, 65, 85];
const NOTE_FILL: [number, number, number] = [248, 250, 252];

// Legend/chip colours per semantic tone. Tones come from MSL_CATEGORY_TONES
// (single source of truth in the pure engine) and are expressed as the
// dashboard's *-50 fill / *-200 border / *-700 text triple.
type ChipTone = {
  fill: [number, number, number];
  border: [number, number, number];
  text: [number, number, number];
};

const TONE_RGB: Record<string, ChipTone> = {
  amber: { fill: [254, 243, 199], border: [253, 230, 138], text: [180, 83, 9] },
  orange: { fill: [255, 237, 213], border: [254, 215, 170], text: [194, 65, 12] },
  emerald: { fill: [209, 250, 229], border: [167, 243, 208], text: [4, 120, 87] },
  blue: { fill: [219, 234, 254], border: [191, 219, 254], text: [29, 78, 216] },
  sky: { fill: [224, 242, 254], border: [186, 230, 253], text: [3, 105, 161] },
  neutral: { fill: [241, 245, 249], border: [226, 232, 240], text: [71, 85, 105] },
};

// "Belum Dinilai" is deliberately NOT an assessed category tone: it is a soft
// neutral chip so an unassessed row never reads as a scored one.
const PENDING_TONE: ChipTone = {
  fill: [248, 250, 252],
  border: [226, 232, 240],
  text: [100, 116, 139],
};

// Column geometry. Fixed widths (mm) leave the remainder to Remarks, which is
// the widest column because it is the only free-text one. Total fixed = 201mm
// of the 273mm printable width, so Remarks gets the remaining ~72mm.
const COL = {
  no: 0,
  project: 1,
  engineeringValue: 2,
  metodeKerja: 3,
  engineeringExecution: 4,
  score: 5,
  category: 6,
  remarks: 7,
} as const;

const COLUMN_WIDTHS: Record<number, number> = {
  [COL.no]: 9,
  [COL.project]: 58,
  [COL.engineeringValue]: 28,
  [COL.metodeKerja]: 24,
  [COL.engineeringExecution]: 34,
  [COL.score]: 18,
  [COL.category]: 30,
};

const PAD_X = 2;
const PAD_Y = 2.2;
const PROJECT_CONTENT_WIDTH = COLUMN_WIDTHS[COL.project] - PAD_X * 2;

// Project cell typography: the name carries the hierarchy (bold, larger, dark)
// and the location is secondary (smaller, muted) — exactly the dashboard cell.
const PROJECT_NAME_SIZE = 7.8;
const PROJECT_NAME_LINE = 3.9;
const PROJECT_LOCATION_SIZE = 6.8;
const PROJECT_LOCATION_LINE = 3.2;

// Category chip metrics.
const CHIP_FONT_SIZE = 6.8;
const CHIP_HEIGHT = 4.8;
const CHIP_RADIUS = 1;
const CHIP_PAD_X = 2.2;

// Annual note box metrics.
const NOTE_PAD_X = 4;
const NOTE_PAD_Y = 3.4;
const NOTE_ACCENT_WIDTH = 1.4;
const NOTE_LINE_HEIGHT = 4.2;

// A continuation page must always take at least one line, otherwise a box that
// cannot fit would loop forever.
const MIN_NOTE_LINES_PER_PAGE = 1;

type AutoTableDocument = jsPDF & {
  lastAutoTable?: { finalY?: number };
};

type CellBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ProjectCellLayout = {
  nameLines: string[];
  locationLines: string[];
};

type ChipSpec = {
  label: string;
  tone: ChipTone;
};

type TableContent = {
  body: CellInput[][];
  projects: (ProjectCellLayout | null)[];
  chips: (ChipSpec | null)[];
  // Set only for an empty period; drawn across the first body band.
  emptyMessage: string | null;
};

const baseStyles: Partial<Styles> = {
  font: "helvetica",
  fontSize: 7.6,
  cellPadding: { top: PAD_Y, right: PAD_X, bottom: PAD_Y, left: PAD_X },
  textColor: SLATE_TEXT,
  lineColor: BORDER_COLOR,
  // Borders are drawn by hand (horizontal rules only), never by the theme.
  lineWidth: 0,
  overflow: "linebreak",
  valign: "middle",
};

const headStyles: Partial<Styles> = {
  fillColor: HEAD_FILL,
  textColor: HEAD_TEXT,
  fontStyle: "bold",
  fontSize: 7.4,
  cellPadding: { top: 3, right: PAD_X, bottom: 3, left: PAD_X },
  valign: "middle",
  lineWidth: 0,
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
  if (y + needed > pageHeight - FOOTER_RESERVE) {
    doc.addPage();
    return CONTINUATION_TOP;
  }
  return y;
}

// Measures the wrapped lines of a project name/location with the exact font that
// will be drawn, so the reserved cell height always matches the rendered text.
function measureLines(
  doc: jsPDF,
  text: string,
  size: number,
  style: "normal" | "bold",
  width: number,
): string[] {
  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  return doc.splitTextToSize(text, width) as string[];
}

// Category legend: text is always printed next to the colour, so the category is
// never conveyed by colour alone (same rule as the on-screen legend).
function drawLegend(doc: jsPDF, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...MUTED_TEXT);
  doc.text("KATEGORI", MARGIN, y + 1.6);

  let x = MARGIN + 17.5;
  for (const item of MSL_CATEGORY_LEGEND) {
    const tone = TONE_RGB[item.tone] ?? TONE_RGB.neutral;
    const label = MSL_CATEGORY_LABELS[item.category];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(CHIP_FONT_SIZE);
    const chipWidth = doc.getTextWidth(label) + CHIP_PAD_X * 2;
    doc.setFillColor(...tone.fill);
    doc.setDrawColor(...tone.border);
    doc.setLineWidth(0.15);
    doc.roundedRect(x, y - 1.9, chipWidth, CHIP_HEIGHT, CHIP_RADIUS, CHIP_RADIUS, "FD");
    doc.setTextColor(...tone.text);
    doc.text(label, x + CHIP_PAD_X, y + 0.9);
    x += chipWidth + 2.4;
  }

  doc.setTextColor(0);
  return y + 7;
}

// Empty period: a full row of ordinary cells keeps autoTable on the same fixed
// column widths as every other export (a colSpan row, or no body at all, makes
// it redistribute the columns and the header stops lining up). The message is
// then painted across that band.
const EMPTY_BAND_HEIGHT = 16;

function buildTableContent(doc: jsPDF, source: MslPdfSource): TableContent {
  if (source.rows.length === 0) {
    return {
      body: [
        Array.from({ length: 8 }, (_, column) => ({
          content: "",
          styles: {
            minCellHeight: EMPTY_BAND_HEIGHT,
            ...(column === 0 ? { halign: "left" as const } : {}),
          },
        })),
      ],
      projects: [null],
      chips: [null],
      emptyMessage: `Belum ada Master Project untuk tahun ${source.year}.`,
    };
  }

  const projects: ProjectCellLayout[] = [];
  const chips: ChipSpec[] = [];

  const body: CellInput[][] = source.rows.map((row, index) => {
    const assessment = row.assessment;
    const location = row.location.trim();

    const nameLines = measureLines(
      doc,
      row.name,
      PROJECT_NAME_SIZE,
      "bold",
      PROJECT_CONTENT_WIDTH,
    );
    const locationLines =
      location === ""
        ? []
        : measureLines(doc, location, PROJECT_LOCATION_SIZE, "normal", PROJECT_CONTENT_WIDTH);
    projects.push({ nameLines, locationLines });

    chips.push(
      assessment
        ? {
            label: MSL_CATEGORY_LABELS[assessment.category],
            tone: TONE_RGB[MSL_CATEGORY_TONES[assessment.category]] ?? TONE_RGB.neutral,
          }
        : { label: "Belum Dinilai", tone: PENDING_TONE },
    );

    // The project and category cells render their content by hand (two type
    // levels / a chip), so they only reserve the space they need here.
    const projectCellHeight =
      nameLines.length * PROJECT_NAME_LINE +
      locationLines.length * PROJECT_LOCATION_LINE +
      PAD_Y * 2;

    const remarks =
      assessment?.remarks && assessment.remarks.trim() !== "" ? assessment.remarks : "-";

    return [
      { content: String(index + 1), styles: { textColor: MUTED_TEXT, fontSize: 7.4 } },
      { content: "", styles: { minCellHeight: projectCellHeight } },
      assessment
        ? formatMslScore(assessment.engineeringValue)
        : { content: "-", styles: { textColor: MUTED_TEXT } },
      assessment
        ? formatMslScore(assessment.metodeKerja)
        : { content: "-", styles: { textColor: MUTED_TEXT } },
      assessment
        ? formatMslScore(assessment.engineeringExecution)
        : { content: "-", styles: { textColor: MUTED_TEXT } },
      assessment
        ? {
            content: formatMslScore(assessment.score),
            styles: { fontStyle: "bold", fontSize: 8.4, textColor: PROJECT_NAME_TEXT },
          }
        : { content: "-", styles: { textColor: MUTED_TEXT } },
      { content: "", styles: { minCellHeight: CHIP_HEIGHT + PAD_Y * 2 } },
      { content: remarks, styles: { fontSize: 7.2, textColor: REMARKS_TEXT } },
    ];
  });

  return { body, projects, chips, emptyMessage: null };
}

// Message painted across the empty-period band (which is a normal row, so the
// column geometry is unchanged).
function drawEmptyMessage(doc: jsPDF, cell: CellBox, message: string): void {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED_TEXT);
  doc.text(message, doc.internal.pageSize.getWidth() / 2, cell.y + cell.height / 2, {
    align: "center",
    baseline: "middle",
  });
  doc.setTextColor(0);
}

// Two type levels in one cell: bold dark name, smaller muted location.
function drawProjectCell(doc: jsPDF, cell: CellBox, layout: ProjectCellLayout): void {
  const x = cell.x + PAD_X;
  const blockHeight =
    layout.nameLines.length * PROJECT_NAME_LINE +
    layout.locationLines.length * PROJECT_LOCATION_LINE;
  let y = cell.y + Math.max(PAD_Y, (cell.height - blockHeight) / 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(PROJECT_NAME_SIZE);
  doc.setTextColor(...PROJECT_NAME_TEXT);
  for (const line of layout.nameLines) {
    doc.text(line, x, y, { baseline: "top" });
    y += PROJECT_NAME_LINE;
  }

  if (layout.locationLines.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(PROJECT_LOCATION_SIZE);
    doc.setTextColor(...MUTED_TEXT);
    for (const line of layout.locationLines) {
      doc.text(line, x, y, { baseline: "top" });
      y += PROJECT_LOCATION_LINE;
    }
  }

  doc.setTextColor(0);
}

// Rounded chip centred in the category cell, matching the dashboard badge.
function drawChip(doc: jsPDF, cell: CellBox, chip: ChipSpec): void {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(CHIP_FONT_SIZE);
  const width = Math.min(
    doc.getTextWidth(chip.label) + CHIP_PAD_X * 2,
    cell.width - PAD_X,
  );
  const height = CHIP_HEIGHT;
  const x = cell.x + (cell.width - width) / 2;
  const y = cell.y + (cell.height - height) / 2;

  doc.setFillColor(...chip.tone.fill);
  doc.setDrawColor(...chip.tone.border);
  doc.setLineWidth(0.15);
  doc.roundedRect(x, y, width, height, CHIP_RADIUS, CHIP_RADIUS, "FD");
  doc.setTextColor(...chip.tone.text);
  doc.text(chip.label, cell.x + cell.width / 2, y + height / 2, {
    align: "center",
    baseline: "middle",
  });
  doc.setTextColor(0);
}

// Horizontal rules only (no grid): the dashboard separates rows with a bottom
// border, and the header band is closed by the accent rule.
function drawCellDecorations(doc: jsPDF, data: CellHookData, content: TableContent): void {
  const { cell, section } = data;

  if (section === "head") {
    doc.setDrawColor(...ACCENT);
    doc.setLineWidth(0.5);
    doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
    return;
  }
  if (section !== "body") {
    return;
  }

  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.12);
  doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);

  if (data.column.index === COL.project) {
    const layout = content.projects[data.row.index];
    if (layout) {
      drawProjectCell(doc, cell, layout);
    }
    return;
  }

  if (data.column.index === COL.category) {
    const chip = content.chips[data.row.index];
    if (chip) {
      drawChip(doc, cell, chip);
    }
    return;
  }

  if (content.emptyMessage !== null && data.column.index === COL.no) {
    drawEmptyMessage(doc, cell, content.emptyMessage);
  }
}

function drawNoteHeading(
  doc: jsPDF,
  year: number,
  y: number,
  continued: boolean,
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  // Year, never the month: the annual note is one per year and must not read as
  // a September-only note.
  doc.text(
    `Note Akhir Tahun ${year}${continued ? " (lanjutan)" : ""}`,
    MARGIN,
    y,
  );
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 1.8, MARGIN + 12, y + 1.8);
  doc.setTextColor(0);
  return y + 7;
}

// Soft boxed body with an accent edge, wrapping as authored and continuing onto
// new pages instead of clipping.
function drawNoteSection(doc: jsPDF, source: MslPdfSource, startY: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const boxWidth = pageWidth - MARGIN * 2;
  const contentWidth = boxWidth - NOTE_ACCENT_WIDTH - NOTE_PAD_X * 2;

  const text = source.note && source.note.trim() !== "" ? source.note.trim() : "-";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  const wrapped = doc.splitTextToSize(text, contentWidth) as string[];
  const lines = wrapped.length > 0 ? wrapped : ["-"];

  let y = startY;
  let index = 0;

  while (index < lines.length) {
    if (index === 0) {
      y = ensureSpace(doc, y + 9, 24);
    } else {
      doc.addPage();
      y = CONTINUATION_TOP;
    }

    y = drawNoteHeading(doc, source.year, y, index > 0);

    const available = pageHeight - FOOTER_RESERVE - y;
    const maxLines = Math.max(
      MIN_NOTE_LINES_PER_PAGE,
      Math.floor((available - NOTE_PAD_Y * 2) / NOTE_LINE_HEIGHT),
    );
    const chunk = lines.slice(index, index + maxLines);
    const boxHeight = chunk.length * NOTE_LINE_HEIGHT + NOTE_PAD_Y * 2;

    doc.setFillColor(...NOTE_FILL);
    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.15);
    doc.roundedRect(MARGIN, y, boxWidth, boxHeight, 1.2, 1.2, "FD");
    doc.setFillColor(...ACCENT);
    doc.rect(MARGIN, y, NOTE_ACCENT_WIDTH, boxHeight, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(...SLATE_TEXT);
    let textY = y + NOTE_PAD_Y;
    for (const line of chunk) {
      doc.text(line, MARGIN + NOTE_ACCENT_WIDTH + NOTE_PAD_X, textY, {
        baseline: "top",
      });
      textY += NOTE_LINE_HEIGHT;
    }

    index += chunk.length;
    y += boxHeight;
  }

  doc.setTextColor(0);
  return y;
}

function drawDocumentHeader(
  doc: jsPDF,
  source: MslPdfSource,
  now: Date,
  logoDataUrl: string | null,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const periodLabel = formatMslPeriod(source.year, source.month);

  doc.setProperties({
    title: `MSL Engineering ${periodLabel}`,
    subject: `MSL Engineering \u00b7 ${periodLabel}`,
    author: "WIBEX",
  });

  if (logoDataUrl) {
    try {
      const logoWidth = 40;
      const logoHeight = (logoWidth * 600) / 1920;
      doc.addImage(
        logoDataUrl,
        "PNG",
        pageWidth - MARGIN - logoWidth,
        8.5,
        logoWidth,
        logoHeight,
      );
    } catch {
      console.warn("WIBEX logo skipped in MSL PDF (unreadable image).");
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15.5);
  doc.setTextColor(...NAVY);
  doc.text("MSL ENGINEERING", MARGIN, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...MUTED_TEXT);
  doc.text("Penilaian Kapabilitas Engineering per Proyek", MARGIN, 20.4);

  // Period, not just the year: the same year has twelve independent exports.
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...SLATE_TEXT);
  doc.text(`Periode: ${periodLabel}`, MARGIN, 26.6);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED_TEXT);
  const dateLabel = now.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const stampLabel = `Tanggal export: ${dateLabel}`;
  doc.text(stampLabel, pageWidth - MARGIN - doc.getTextWidth(stampLabel), 26.6);

  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, 29.5, pageWidth - MARGIN, 29.5);
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, 29.5, MARGIN + 26, 29.5);
  doc.setTextColor(0);

  return drawLegend(doc, 35);
}

// Running header on continuation pages plus the shared footer on every page.
function addPageDecorations(doc: jsPDF, source: MslPdfSource): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();
  const periodLabel = formatMslPeriod(source.year, source.month);

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);

    if (page > 1) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.4);
      doc.setTextColor(...NAVY);
      doc.text("MSL ENGINEERING", MARGIN, 13);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED_TEXT);
      const continuedLabel = `${periodLabel} \u00b7 lanjutan`;
      doc.text(continuedLabel, pageWidth - MARGIN - doc.getTextWidth(continuedLabel), 13);

      doc.setDrawColor(...BORDER_COLOR);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, 16.5, pageWidth - MARGIN, 16.5);
    }

    doc.setDrawColor(...BORDER_COLOR);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, pageHeight - 11, pageWidth - MARGIN, pageHeight - 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.setTextColor(...MUTED_TEXT);
    doc.text(`MSL Engineering \u00b7 ${periodLabel}`, MARGIN, pageHeight - 7);
    const pageLabel = `Halaman ${page} / ${total}`;
    doc.text(pageLabel, pageWidth - MARGIN - doc.getTextWidth(pageLabel), pageHeight - 7);
  }

  doc.setTextColor(0);
}

export function buildMslPdf(
  source: MslPdfSource,
  now: Date = new Date(),
  logoDataUrl: string | null = null,
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const tableStartY = drawDocumentHeader(doc, source, now, logoDataUrl);
  const content = buildTableContent(doc, source);

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
    body: content.body,
    theme: "plain",
    styles: baseStyles,
    headStyles,
    columnStyles: {
      [COL.no]: { cellWidth: COLUMN_WIDTHS[COL.no], halign: "center" },
      [COL.project]: { cellWidth: COLUMN_WIDTHS[COL.project], halign: "left" },
      [COL.engineeringValue]: { cellWidth: COLUMN_WIDTHS[COL.engineeringValue], halign: "center" },
      [COL.metodeKerja]: { cellWidth: COLUMN_WIDTHS[COL.metodeKerja], halign: "center" },
      [COL.engineeringExecution]: {
        cellWidth: COLUMN_WIDTHS[COL.engineeringExecution],
        halign: "center",
      },
      [COL.score]: { cellWidth: COLUMN_WIDTHS[COL.score], halign: "center" },
      [COL.category]: { cellWidth: COLUMN_WIDTHS[COL.category], halign: "center" },
      [COL.remarks]: { cellWidth: "auto", halign: "left" },
    },
    margin: {
      top: CONTINUATION_TOP,
      left: MARGIN,
      right: MARGIN,
      bottom: FOOTER_RESERVE,
    },
    showHead: "everyPage",
    rowPageBreak: "avoid",
    didDrawCell: (data) => {
      drawCellDecorations(doc, data, content);
    },
  });

  drawNoteSection(doc, source, currentY(doc, tableStartY));
  addPageDecorations(doc, source);

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
