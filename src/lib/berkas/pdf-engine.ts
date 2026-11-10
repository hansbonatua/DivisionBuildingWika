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
const TABLE_X = 40;
const TABLE_TOP = 620;
const TABLE_BOTTOM = 200;
const TABLE_WIDTH = 515;
const TABLE_HEIGHT = TABLE_TOP - TABLE_BOTTOM;
const COLUMN_WIDTH = TABLE_WIDTH / 3;
const COLUMN_X = [
  TABLE_X,
  TABLE_X + COLUMN_WIDTH,
  TABLE_X + COLUMN_WIDTH * 2,
] as const;
const LOGO_WIDTH = 160;
const LOGO_HEIGHT = 50;
const LOGO_X = (PAGE_WIDTH - LOGO_WIDTH) / 2;
const LOGO_Y = 752;
const TITLE_Y = 706;
const TITLE_LINE_HEIGHT = 20;
const TITLE_MAX_LINES = 3;

const BLACK = rgb(0, 0, 0);
const TABLE_LINE = rgb(0.72, 0.72, 0.72);
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
    path.join(process.cwd(), "public", "asset", "logo-top.png"),
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

  const padding = 6;
  const maxWidth = box.width - padding * 2;
  const maxHeight = box.height - padding * 2;
  if (maxWidth <= 0 || maxHeight <= 0) return;

  const scale = Math.min(
    maxWidth / image.width,
    maxHeight / image.height,
  );
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
): Promise<void> {
  const columnX = COLUMN_X[columnIndex];
  const centerX = columnX + COLUMN_WIDTH / 2;
  const contentWidth = COLUMN_WIDTH - 24;
  const nameLines = wrapText(signature.nama, fonts.bold, 10, contentWidth, 2);
  const jabatanLines = wrapText(
    signature.jabatan,
    fonts.regular,
    9,
    contentWidth,
    2,
  );

  let baseline = 560;
  for (const line of nameLines) {
    drawCenteredText(page, line, centerX, baseline, fonts.bold, 10);
    baseline -= 12;
  }
  for (const line of jabatanLines) {
    baseline -= 1;
    drawCenteredText(page, line, centerX, baseline, fonts.regular, 9);
    baseline -= 11;
  }

  const ttdBox = {
    x: columnX + 20,
    y: 330,
    width: COLUMN_WIDTH - 40,
    height: 150,
  };
  await drawSignature(doc, page, signature, ttdBox);
  drawSignatureDate(page, signature, centerX, 310, fonts.regular);
}

async function drawPenyusunCell(
  doc: PDFDocument,
  page: PDFPage,
  fonts: CoverFonts,
  signatures: BerkasCoverSignature[],
): Promise<void> {
  const columnX = COLUMN_X[0];
  const centerX = columnX + COLUMN_WIDTH / 2;
  const contentWidth = COLUMN_WIDTH - 24;
  const people = signatures.length > 0 ? signatures : [];
  const count = people.length > 0 ? people.length : 1;
  const areaTop = 560;
  const areaBottom = 220;
  const blockHeight = (areaTop - areaBottom) / count;

  for (let index = 0; index < people.length; index += 1) {
    const signature = people[index];
    const blockTop = areaTop - index * blockHeight;
    const nameLines = wrapText(signature.nama, fonts.bold, 10, contentWidth, 2);
    const jabatanLines = wrapText(
      signature.jabatan,
      fonts.regular,
      9,
      contentWidth,
      1,
    );

    let baseline = blockTop;
    for (const line of nameLines) {
      drawCenteredText(page, line, centerX, baseline, fonts.bold, 10);
      baseline -= 12;
    }
    for (const line of jabatanLines) {
      baseline -= 1;
      drawCenteredText(page, line, centerX, baseline, fonts.regular, 9);
      baseline -= 11;
    }

    const textHeight = blockTop - baseline;
    const ttdHeight = Math.min(
      120,
      Math.max(30, blockHeight - textHeight - 24),
    );
    const ttdY = baseline - 3 - ttdHeight;
    await drawSignature(doc, page, signature, {
      x: columnX + 20,
      y: ttdY,
      width: COLUMN_WIDTH - 40,
      height: ttdHeight,
    });
    drawSignatureDate(page, signature, centerX, ttdY - 12, fonts.regular);
  }
}

function drawTable(page: PDFPage, fonts: CoverFonts): void {
  page.drawRectangle({
    x: TABLE_X,
    y: TABLE_BOTTOM,
    width: TABLE_WIDTH,
    height: TABLE_HEIGHT,
    borderColor: TABLE_LINE,
    borderWidth: 1,
  });

  for (const x of [COLUMN_X[1], COLUMN_X[2]]) {
    page.drawLine({
      start: { x, y: TABLE_BOTTOM },
      end: { x, y: TABLE_TOP },
      thickness: 0.75,
      color: TABLE_LINE,
    });
  }

  const headers = ["Tim Penyusun", "Validasi 1", "Validasi 2"];
  headers.forEach((header, index) => {
    const columnX = COLUMN_X[index];
    page.drawLine({
      start: { x: columnX + 12, y: 580 },
      end: { x: columnX + COLUMN_WIDTH - 12, y: 580 },
      thickness: 0.75,
      color: TABLE_LINE,
    });
    drawCenteredText(
      page,
      header,
      columnX + COLUMN_WIDTH / 2,
      592,
      fonts.bold,
      11,
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
  const logo = await doc.embedPng(logoBytes);
  page.drawImage(logo, {
    x: LOGO_X,
    y: LOGO_Y,
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  });

  const titleLines = wrapText(
    data.judul,
    fonts.bold,
    16,
    515,
    TITLE_MAX_LINES,
  );
  titleLines.forEach((line, index) => {
    drawCenteredText(
      page,
      line,
      PAGE_WIDTH / 2,
      TITLE_Y - index * TITLE_LINE_HEIGHT,
      fonts.bold,
      16,
    );
  });

  drawTable(page, fonts);
  await drawPenyusunCell(doc, page, fonts, data.penyusun);
  await drawValidatorCell(doc, page, fonts, data.validasi[0], 1);
  await drawValidatorCell(doc, page, fonts, data.validasi[1], 2);

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
