import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

// Server-only PDF engine for Berkas.
//
// This module deliberately has no database, auth or storage imports: callers
// provide bytes and metadata, and the functions return PDF bytes. The service
// layer is responsible for loading private blobs and persisting the result.
//
// Layout constants mirror docs/design/BERKAS_P3_TECHNICAL_DESIGN.md section H.

// A4 landscape (842 × 595 pt).
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;
const MARGIN_X = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

// Logo sits centered in the top margin and keeps its natural aspect ratio.
const LOGO_MAX_WIDTH = 120;
const LOGO_MAX_HEIGHT = 44;
const LOGO_TOP = PAGE_HEIGHT - 64;

const TITLE_SIZE = 16;
const TITLE_LINE_HEIGHT = 20;
const TITLE_MAX_LINES = 3;
const TITLE_GAP = 30;
const TITLE_RULE_GAP = 9;
const TITLE_TABLE_GAP = 28;
const TITLE_RULE_OVERHANG = 12;

// Fixed grid geometry: every row keeps a constant height, so long text can
// only wrap inside its own cell and never pushes the signature or date.
const HEADER_ROW_HEIGHT = 28;
const NAME_ROW_HEIGHT = 30;
const JABATAN_ROW_HEIGHT = 34;
const TTD_ROW_HEIGHT = 80;
const DATE_ROW_HEIGHT = 16;

const HEADER_SIZE = 10;
const NAME_SIZE = 11;
const JABATAN_SIZE = 9;
const DATE_SIZE = 8;
const NAME_LINE_HEIGHT = 12;
const JABATAN_LINE_HEIGHT = 10.5;
const CELL_PADDING_X = 10;
const MAX_TTD_WIDTH = 140;
const MAX_TTD_HEIGHT = TTD_ROW_HEIGHT - 8;

const COLUMN_COUNT = 3;
const COLUMN_WIDTH = CONTENT_WIDTH / COLUMN_COUNT;
const COLUMN_X = [
  MARGIN_X,
  MARGIN_X + COLUMN_WIDTH,
  MARGIN_X + COLUMN_WIDTH * 2,
] as const;

const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const GRID_LINE = rgb(0.8, 0.8, 0.8);
const WATERMARK_GRAY = rgb(0.5, 0.5, 0.5);
const TITLE_RULE_RED = rgb(1, 0, 0);
const COVER_FOOTER_BLUE = rgb(0, 0.15, 0.3);
const COVER_FOOTER_HEIGHT = 35;
const COVER_FOOTER_SIZE = 8;
const COVER_FOOTER_LINES = [
  "Dokumen Proposal Teknis ini dibuat oleh PT WIJAYA KARYA (Persero) Tbk.",
  "Dilarang menduplikasikan Dokumen ini tanpa izin tertulis dari PT WIJAYA KARYA (Persero) Tbk.",
] as const;

export type BerkasCoverSignature = {
  nama: string;
  jabatan: string;
  ttdBytes: Uint8Array | null;
  ttdMimeType: string | null;
  ttdUploadedAt: Date | null;
};

export type GenerateCoverPdfData = {
  judul: string;
  kodeSeri?: string | null;
  penyusun: BerkasCoverSignature[];
  validasi: [BerkasCoverSignature, BerkasCoverSignature];
  /** Optional for tests; production reads the public WIKA asset. */
  logoBytes?: Uint8Array;
};

type CoverFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

let cachedLogoBytes: Uint8Array | null = null;

async function loadLogoBytes(): Promise<Uint8Array> {
  if (cachedLogoBytes) return cachedLogoBytes;
  const file = await readFile(
    path.join(process.cwd(), "public", "asset", "WIKA-LOGO.png"),
  );
  cachedLogoBytes = new Uint8Array(file);
  return cachedLogoBytes;
}

function pdfSafeText(value: string): string {
  // Standard PDF fonts use WinAnsi. Replacing unsupported code points avoids
  // pdf-lib throwing on emoji/control characters while preserving Latin text.
  return value
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7e\xa0-\xff]/g, "?")
    .trim();
}

function formatCoverDate(value: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(value);
}

function fitLine(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = "...";
  let candidate = text;
  while (candidate.length > 0) {
    const next = `${candidate.trimEnd()}${ellipsis}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) return next;
    candidate = candidate.slice(0, -1);
  }
  return ellipsis;
}

function wrapText(
  value: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = pdfSafeText(value).split(" ").filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) {
      lines.push(current);
      current = "";
    }
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      lines.push(fitLine(word, font, size, maxWidth));
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  if (lines.length <= maxLines) return lines;

  const limited = lines.slice(0, maxLines);
  limited[maxLines - 1] = fitLine(
    `${limited[maxLines - 1]} ...`,
    font,
    size,
    maxWidth,
  );
  return limited;
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  font: PDFFont,
  size: number,
  color = BLACK,
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: centerX - width / 2,
    y,
    size,
    font,
    color,
  });
}

function isJpeg(mimeType: string | null, bytes: Uint8Array): boolean {
  return (
    mimeType?.toLowerCase() === "image/jpeg" ||
    (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8)
  );
}

async function drawSignature(
  doc: PDFDocument,
  page: PDFPage,
  signature: BerkasCoverSignature,
  box: { x: number; y: number; width: number; height: number },
): Promise<void> {
  if (!signature.ttdBytes || signature.ttdBytes.length === 0) return;

  const image = isJpeg(signature.ttdMimeType, signature.ttdBytes)
    ? await doc.embedJpg(signature.ttdBytes)
    : await doc.embedPng(signature.ttdBytes);

  const maxWidth = Math.min(box.width, MAX_TTD_WIDTH);
  const maxHeight = Math.min(box.height, MAX_TTD_HEIGHT);
  if (maxWidth <= 0 || maxHeight <= 0) return;

  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;

  page.drawImage(image, {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  });
}

function drawTextBlock(
  page: PDFPage,
  lines: string[],
  centerX: number,
  rowTop: number,
  rowHeight: number,
  font: PDFFont,
  size: number,
  lineHeight: number,
): void {
  if (lines.length === 0) return;
  const firstCenter =
    rowTop - rowHeight / 2 + ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    drawCenteredText(
      page,
      line,
      centerX,
      firstCenter - index * lineHeight - size * 0.35,
      font,
      size,
    );
  });
}

type CoverColumn = {
  header: string;
  signatures: BerkasCoverSignature[];
};

async function drawColumn(
  doc: PDFDocument,
  page: PDFPage,
  fonts: CoverFonts,
  column: CoverColumn,
  columnIndex: 0 | 1 | 2,
  rowTops: number[],
): Promise<void> {
  const columnX = COLUMN_X[columnIndex];
  const centerX = columnX + COLUMN_WIDTH / 2;
  const maxWidth = COLUMN_WIDTH - CELL_PADDING_X * 2;

  drawTextBlock(
    page,
    [column.header],
    centerX,
    rowTops[0],
    HEADER_ROW_HEIGHT,
    fonts.bold,
    HEADER_SIZE,
    HEADER_SIZE,
  );

  for (let index = 0; index < column.signatures.length; index += 1) {
    const rowOffset = 1 + index * 4;
    const nameTop = rowTops[rowOffset];
    if (nameTop === undefined) break;

    const signature = column.signatures[index];
    drawTextBlock(
      page,
      wrapText(signature.nama, fonts.bold, NAME_SIZE, maxWidth, 2),
      centerX,
      nameTop,
      NAME_ROW_HEIGHT,
      fonts.bold,
      NAME_SIZE,
      NAME_LINE_HEIGHT,
    );
    drawTextBlock(
      page,
      wrapText(signature.jabatan, fonts.regular, JABATAN_SIZE, maxWidth, 3),
      centerX,
      rowTops[rowOffset + 1],
      JABATAN_ROW_HEIGHT,
      fonts.regular,
      JABATAN_SIZE,
      JABATAN_LINE_HEIGHT,
    );

    // The signature box is the whole TTD row minus a small padding, so the
    // image is centered on both axes and can never enter the adjacent rows.
    await drawSignature(doc, page, signature, {
      x: columnX + CELL_PADDING_X,
      y: rowTops[rowOffset + 2] - TTD_ROW_HEIGHT + 4,
      width: maxWidth,
      height: MAX_TTD_HEIGHT,
    });

    drawTextBlock(
      page,
      [`Tanggal: ${formatCoverDate(signature.ttdUploadedAt)}`],
      centerX,
      rowTops[rowOffset + 3],
      DATE_ROW_HEIGHT,
      fonts.regular,
      DATE_SIZE,
      DATE_SIZE,
    );
  }
}

function drawKodeSeri(
  page: PDFPage,
  fonts: CoverFonts,
  kodeSeri: string | null | undefined,
  tableTop: number,
): void {
  const value = pdfSafeText(kodeSeri ?? "");
  if (!value) return;

  // Right-aligned above the table's top rule, outside the grid area, so it
  // never sits inside the "Validasi 2" header cell.
  const size = 9;
  const rightEdge = MARGIN_X + CONTENT_WIDTH;
  page.drawText(value, {
    x: rightEdge - fonts.bold.widthOfTextAtSize(value, size),
    y: tableTop + 12,
    size,
    font: fonts.bold,
    color: BLACK,
  });
}

function drawGrid(
  page: PDFPage,
  tableTop: number,
  tableBottom: number,
  rowTops: number[],
): void {
  page.drawRectangle({
    x: MARGIN_X,
    y: tableBottom,
    width: CONTENT_WIDTH,
    height: tableTop - tableBottom,
    borderColor: GRID_LINE,
    borderWidth: 0.8,
  });

  for (const y of rowTops.slice(1)) {
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: MARGIN_X + CONTENT_WIDTH, y },
      thickness: 0.6,
      color: GRID_LINE,
    });
  }

  for (const x of [COLUMN_X[1], COLUMN_X[2]]) {
    page.drawLine({
      start: { x, y: tableTop },
      end: { x, y: tableBottom },
      thickness: 0.6,
      color: GRID_LINE,
    });
  }
}

/**
 * Builds the signed A4 cover. Signature images are embedded proportionally and
 * each date comes from the corresponding TTD upload timestamp.
 */
export async function generateCoverPdf(
  data: GenerateCoverPdfData,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const fonts: CoverFonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: rgb(1, 1, 1),
  });

  const logoBytes = data.logoBytes ?? (await loadLogoBytes());
  const logo = isJpeg(null, logoBytes)
    ? await doc.embedJpg(logoBytes)
    : await doc.embedPng(logoBytes);
  const logoScale = Math.min(
    LOGO_MAX_WIDTH / logo.width,
    LOGO_MAX_HEIGHT / logo.height,
  );
  const logoWidth = logo.width * logoScale;
  const logoHeight = logo.height * logoScale;
  const logoY = LOGO_TOP - logoHeight;
  page.drawImage(logo, {
    x: (PAGE_WIDTH - logoWidth) / 2,
    y: logoY,
    width: logoWidth,
    height: logoHeight,
  });

  const titleLines = wrapText(
    data.judul,
    fonts.bold,
    TITLE_SIZE,
    CONTENT_WIDTH,
    TITLE_MAX_LINES,
  );
  const firstTitleBaseline = logoY - TITLE_GAP;
  titleLines.forEach((line, index) => {
    drawCenteredText(
      page,
      line,
      PAGE_WIDTH / 2,
      firstTitleBaseline - index * TITLE_LINE_HEIGHT,
      fonts.bold,
      TITLE_SIZE,
    );
  });

  const lastTitleBaseline =
    firstTitleBaseline - (titleLines.length - 1) * TITLE_LINE_HEIGHT;
  const titleRuleY = lastTitleBaseline - TITLE_RULE_GAP;
  page.drawLine({
    start: { x: MARGIN_X - TITLE_RULE_OVERHANG, y: titleRuleY },
    end: {
      x: MARGIN_X + CONTENT_WIDTH + TITLE_RULE_OVERHANG,
      y: titleRuleY,
    },
    thickness: 2,
    color: TITLE_RULE_RED,
  });
  const tableTop = titleRuleY - TITLE_TABLE_GAP;

  // The grid starts with the header row, then one fixed group of name, jabatan,
  // signature and date rows per signer. Heights are constant, so the rows can
  // never drift; extra penyusun simply add another identical row group.
  const rowCount = Math.max(1, data.penyusun.length);
  const rowTops: number[] = [tableTop];
  let cursor = tableTop - HEADER_ROW_HEIGHT;
  for (let index = 0; index < rowCount; index += 1) {
    rowTops.push(cursor);
    cursor -= NAME_ROW_HEIGHT;
    rowTops.push(cursor);
    cursor -= JABATAN_ROW_HEIGHT;
    rowTops.push(cursor);
    cursor -= TTD_ROW_HEIGHT;
    rowTops.push(cursor);
    cursor -= DATE_ROW_HEIGHT;
  }
  const tableBottom = cursor;

  drawGrid(page, tableTop, tableBottom, rowTops);
  drawKodeSeri(page, fonts, data.kodeSeri, tableTop);

  const columns: CoverColumn[] = [
    { header: "Tim Penyusun", signatures: data.penyusun },
    { header: "Validasi 1", signatures: [data.validasi[0]] },
    { header: "Validasi 2", signatures: [data.validasi[1]] },
  ];
  for (const [index, column] of columns.entries()) {
    await drawColumn(doc, page, fonts, column, index as 0 | 1 | 2, rowTops);
  }

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: COVER_FOOTER_HEIGHT,
    color: COVER_FOOTER_BLUE,
  });
  COVER_FOOTER_LINES.forEach((line, index) => {
    drawCenteredText(
      page,
      line,
      PAGE_WIDTH / 2,
      21 - index * 11,
      fonts.regular,
      COVER_FOOTER_SIZE,
      WHITE,
    );
  });

  doc.setTitle(pdfSafeText(data.judul));
  doc.setAuthor("WIBEX");
  doc.setCreator("WIBEX Berkas");

  return doc.save({ useObjectStreams: true });
}

/** Copies the cover first, then every page of the original PDF. */
export async function mergePdf(
  originalPdfBytes: Uint8Array,
  coverPdfBytes: Uint8Array,
): Promise<Uint8Array> {
  const output = await PDFDocument.create();
  const cover = await PDFDocument.load(coverPdfBytes);
  const original = await PDFDocument.load(originalPdfBytes);
  const coverPages = await output.copyPages(cover, cover.getPageIndices());
  for (const page of coverPages) output.addPage(page);
  const originalPages = await output.copyPages(
    original,
    original.getPageIndices(),
  );
  for (const page of originalPages) output.addPage(page);
  return output.save({ useObjectStreams: true });
}

/**
 * Adds a centered diagonal NIP watermark to every page. The generated PDF is
 * never persisted; this runs in memory for each authenticated download.
 */
export async function applyWatermark(
  pdfBytes: Uint8Array,
  nip: string,
): Promise<Uint8Array> {
  const normalizedNip = pdfSafeText(nip);
  if (!normalizedNip) {
    throw new Error("NIP is required for watermarking");
  }

  const doc = await PDFDocument.load(pdfBytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const text = `NIP: ${normalizedNip}`;
  const angle = Math.PI / 4;

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.max(
      36,
      Math.min(64, Math.min(width, height) * 0.08),
    );
    const textWidth = font.widthOfTextAtSize(text, size);
    const textHeight = font.heightAtSize(size);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const centerX = width / 2;
    const centerY = height / 2;

    // drawText() rotates around the text origin, not its center. Shift the
    // origin so the rotated text's center lands on the page center.
    const x = centerX - (textWidth / 2) * cosine + (textHeight / 2) * sine;
    const y = centerY - (textWidth / 2) * sine - (textHeight / 2) * cosine;

    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: WATERMARK_GRAY,
      opacity: 0.3,
      rotate: degrees(45),
    });
  }

  return doc.save({ useObjectStreams: true });
}
