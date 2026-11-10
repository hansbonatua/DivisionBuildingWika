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

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
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
const TITLE_TABLE_GAP = 34;

const HEADER_ROW_HEIGHT = 28;
const HEADER_SIZE = 10;
const NAME_SIZE = 10;
const JABATAN_SIZE = 9;
const DATE_SIZE = 8;
const MAX_TTD_WIDTH = 80;
const MAX_TTD_HEIGHT = 40;

// The table has no outer box: only the two header rules and thin separators.
const TABLE_BOTTOM = 96;
const COLUMN_COUNT = 3;
const COLUMN_WIDTH = CONTENT_WIDTH / COLUMN_COUNT;
const COLUMN_X = [
  MARGIN_X,
  MARGIN_X + COLUMN_WIDTH,
  MARGIN_X + COLUMN_WIDTH * 2,
] as const;

const BLACK = rgb(0, 0, 0);
const GRID_LINE = rgb(0.8, 0.8, 0.8);
const WATERMARK_GRAY = rgb(0.5, 0.5, 0.5);

export type BerkasCoverSignature = {
  nama: string;
  jabatan: string;
  ttdBytes: Uint8Array | null;
  ttdMimeType: string | null;
  ttdUploadedAt: Date | null;
};

export type GenerateCoverPdfData = {
  judul: string;
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

function drawSignatureDate(
  page: PDFPage,
  signature: BerkasCoverSignature,
  centerX: number,
  y: number,
  font: PDFFont,
): void {
  drawCenteredText(
    page,
    `Tanggal: ${formatCoverDate(signature.ttdUploadedAt)}`,
    centerX,
    y,
    font,
    8,
  );
}

async function drawValidatorCell(
  doc: PDFDocument,
  page: PDFPage,
  fonts: CoverFonts,
  signature: BerkasCoverSignature,
  columnIndex: 1 | 2,
  headerBottom: number,
): Promise<void> {
  const columnX = COLUMN_X[columnIndex];
  const centerX = columnX + COLUMN_WIDTH / 2;
  const contentWidth = COLUMN_WIDTH - 24;
  const nameLines = wrapText(
    signature.nama,
    fonts.bold,
    NAME_SIZE,
    contentWidth,
    2,
  );
  const jabatanLines = wrapText(
    signature.jabatan,
    fonts.regular,
    JABATAN_SIZE,
    contentWidth,
    2,
  );

  // Name and jabatan start just below the header rule; the signature is placed
  // in the remaining space so it can never overlap the name block.
  let baseline = headerBottom - 20;
  for (const line of nameLines) {
    drawCenteredText(page, line, centerX, baseline, fonts.bold, NAME_SIZE);
    baseline -= 12;
  }
  baseline -= 2;
  for (const line of jabatanLines) {
    drawCenteredText(
      page,
      line,
      centerX,
      baseline,
      fonts.regular,
      JABATAN_SIZE,
    );
    baseline -= 10;
  }

  // Keep signature and date together as one block, centered in the space left
  // below the name/jabatan text instead of anchoring the date to the page foot.
  const availableTop = baseline - 10;
  const availableBottom = TABLE_BOTTOM + 14;
  const groupHeight = MAX_TTD_HEIGHT + 12 + DATE_SIZE;
  const freeHeight = Math.max(0, availableTop - availableBottom);
  const blockTop =
    availableTop - Math.max(0, (freeHeight - groupHeight) / 2);
  const dateY = blockTop - MAX_TTD_HEIGHT - 12;

  await drawSignature(doc, page, signature, {
    x: columnX + 12,
    y: blockTop - MAX_TTD_HEIGHT,
    width: COLUMN_WIDTH - 24,
    height: MAX_TTD_HEIGHT,
  });
  drawSignatureDate(page, signature, centerX, dateY, fonts.regular);
}

async function drawPenyusunCell(
  doc: PDFDocument,
  page: PDFPage,
  fonts: CoverFonts,
  signatures: BerkasCoverSignature[],
  headerBottom: number,
): Promise<void> {
  if (signatures.length === 0) return;

  const columnX = COLUMN_X[0];
  const centerX = columnX + COLUMN_WIDTH / 2;
  const contentWidth = COLUMN_WIDTH - 24;
  const areaTop = headerBottom - 18;
  const areaBottom = TABLE_BOTTOM + 14;
  const blockHeight = (areaTop - areaBottom) / signatures.length;

  for (let index = 0; index < signatures.length; index += 1) {
    const signature = signatures[index];
    const nameLines = wrapText(
      signature.nama,
      fonts.bold,
      NAME_SIZE,
      contentWidth,
      2,
    );
    const jabatanLines = wrapText(
      signature.jabatan,
      fonts.regular,
      JABATAN_SIZE,
      contentWidth,
      2,
    );

    const textHeight = nameLines.length * 12 + 2 + jabatanLines.length * 10;
    const blockContentHeight =
      textHeight + 6 + MAX_TTD_HEIGHT + 12 + DATE_SIZE + 4;
    const blockTop = areaTop - index * blockHeight;
    // Center each penyusun block inside its slot so repeated signers stay tidy.
    let baseline =
      blockTop - Math.max(0, (blockHeight - blockContentHeight) / 2);

    for (const line of nameLines) {
      drawCenteredText(page, line, centerX, baseline, fonts.bold, NAME_SIZE);
      baseline -= 12;
    }
    baseline -= 2;
    for (const line of jabatanLines) {
      drawCenteredText(
        page,
        line,
        centerX,
        baseline,
        fonts.regular,
        JABATAN_SIZE,
      );
      baseline -= 10;
    }

    const ttdY = baseline - 6 - MAX_TTD_HEIGHT;
    await drawSignature(doc, page, signature, {
      x: columnX + 12,
      y: ttdY,
      width: COLUMN_WIDTH - 24,
      height: MAX_TTD_HEIGHT,
    });
    drawSignatureDate(page, signature, centerX, ttdY - 12, fonts.regular);
  }
}

function drawTable(
  page: PDFPage,
  fonts: CoverFonts,
  tableTop: number,
  headerBottom: number,
): void {
  for (const y of [tableTop, headerBottom]) {
    page.drawLine({
      start: { x: MARGIN_X, y },
      end: { x: MARGIN_X + CONTENT_WIDTH, y },
      thickness: 0.9,
      color: GRID_LINE,
    });
  }

  for (const x of [COLUMN_X[1], COLUMN_X[2]]) {
    page.drawLine({
      start: { x, y: tableTop },
      end: { x, y: TABLE_BOTTOM },
      thickness: 0.6,
      color: GRID_LINE,
    });
  }

  const headers = ["Tim Penyusun", "Validasi 1", "Validasi 2"];
  headers.forEach((header, index) => {
    drawCenteredText(
      page,
      header,
      COLUMN_X[index] + COLUMN_WIDTH / 2,
      headerBottom + 9,
      fonts.bold,
      HEADER_SIZE,
    );
  });
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
  const tableTop = lastTitleBaseline - TITLE_TABLE_GAP;
  const headerBottom = tableTop - HEADER_ROW_HEIGHT;

  drawTable(page, fonts, tableTop, headerBottom);
  await drawPenyusunCell(doc, page, fonts, data.penyusun, headerBottom);
  await drawValidatorCell(doc, page, fonts, data.validasi[0], 1, headerBottom);
  await drawValidatorCell(doc, page, fonts, data.validasi[1], 2, headerBottom);

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
