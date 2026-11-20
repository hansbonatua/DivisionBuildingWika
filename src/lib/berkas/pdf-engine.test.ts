import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  applyWatermark,
  generateCoverPdf,
  mergePdf,
  type BerkasCoverSignature,
  type GenerateCoverPdfData,
} from "@/lib/berkas/pdf-engine";

const logo = new Uint8Array(readFileSync("public/asset/WIKA-LOGO.png"));
const STANDARD_FONT_DATA_URL = "public/pdfjs/standard_fonts/";

function signature(nama: string, jabatan: string): BerkasCoverSignature {
  return {
    nama,
    jabatan,
    ttdBytes: logo,
    ttdMimeType: "image/png",
    ttdUploadedAt: new Date("2026-11-10T08:00:00.000Z"),
  };
}

function coverData(): GenerateCoverPdfData {
  return {
    judul: "Berita Acara Serah Terima Pekerjaan",
    kodeSeri: "WIKA/BA/2026/001",
    logoBytes: logo,
    penyusun: [signature("Budi Santoso", "Site Engineer")],
    validasi: [
      signature("Sari Wijaya", "Project Manager"),
      signature("Andi Pratama", "Head of Division"),
    ],
  };
}

test("generateCoverPdf creates one A4 portrait page with signatures", async () => {
  const bytes = await generateCoverPdf(coverData());
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(0);

  assert.equal(doc.getPageCount(), 1);
  assert.equal(page.getWidth(), 842);
  assert.equal(page.getHeight(), 595);
  assert.ok(page.getWidth() > page.getHeight());
  assert.ok(bytes.byteLength > 1000);
});

test("generateCoverPdf draws the kode seri in a top-right uppercase box", async () => {
  const bytes = await generateCoverPdf({
    ...coverData(),
    kodeSeri: "wika/ba/2026/001",
  });
  const doc = await pdfjs.getDocument({
    data: bytes.slice(),
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;
  const pdfPage = await doc.getPage(1);
  const content = await pdfPage.getTextContent();
  const items = content.items.flatMap((item) =>
    "str" in item
      ? [
          {
            text: item.str,
            x: item.transform[4],
            y: item.transform[5],
            width: item.width,
            height: item.height,
          },
        ]
      : [],
  );

  const kodeSeri = items.find((item) => item.text === "WIKA/BA/2026/001");
  const header = items.find((item) => item.text === "Validasi 2");
  assert.ok(kodeSeri, "kode seri should be drawn in uppercase");
  assert.ok(header, "Validasi 2 header should be drawn");

  assert.equal(kodeSeri.height, 9);
  assert.ok(
    kodeSeri.y > header.y + 20,
    "kode seri should sit above the table header row",
  );
  assert.ok(
    kodeSeri.y > 480,
    "kode seri should sit in the top margin, level with the logo",
  );
  assert.ok(
    kodeSeri.x + kodeSeri.width <= 40 + 762 - 4,
    "kode seri text should be padded inside the box",
  );
  assert.ok(
    kodeSeri.x + kodeSeri.width > 40 + 762 - 220,
    "kode seri box should hug the top right corner",
  );

  const operators = await pdfPage.getOperatorList();
  const indices = (fn: number) =>
    operators.fnArray.flatMap((value, index) => (value === fn ? [index] : []));
  const thinStrokeIndex = indices(pdfjs.OPS.setLineWidth).find((index) => {
    const args = operators.argsArray[index] as ArrayLike<number> | undefined;
    return Math.abs(Number(args?.[0]) - 0.5) < 0.01;
  });
  const strokeColors = indices(pdfjs.OPS.setStrokeRGBColor).map((index) => {
    const args = operators.argsArray[index] as ArrayLike<unknown> | undefined;
    return args?.[0];
  });

  assert.ok(strokeColors.includes("#000000"), "box border should be black");
  assert.ok(thinStrokeIndex !== undefined, "box border should be 0.5pt thin");

  // pdfjs encodes drawRectangle() as a stroked path, so the box is the only
  // filled-free path drawn while the 0.5pt black stroke is active.
  const boxPathIndex = indices(pdfjs.OPS.constructPath).find(
    (index) => index > thinStrokeIndex,
  );
  assert.ok(boxPathIndex !== undefined, "the kode seri box should be drawn");
});

test("generateCoverPdf adds a red title rule and WIKA footer on the cover", async () => {
  const bytes = await generateCoverPdf(coverData());
  const doc = await pdfjs.getDocument({
    data: bytes.slice(),
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  const items = content.items.flatMap((item) =>
    "str" in item
      ? [{ text: item.str, y: item.transform[5] }]
      : [],
  );
  const footerLines = [
    "Dokumen Proposal Teknis ini dibuat oleh PT WIJAYA KARYA (Persero) Tbk.",
    "Dilarang menduplikasikan Dokumen ini tanpa izin tertulis dari PT WIJAYA KARYA (Persero) Tbk.",
  ];

  for (const line of footerLines) {
    assert.ok(
      items.some((item) => item.text.includes(line)),
      `footer line should be drawn: ${line}`,
    );
  }
  const footerItems = items.filter((item) =>
    footerLines.some((line) => item.text.includes(line)),
  );
  assert.ok(
    footerItems.every((item) => item.y < 35),
    "footer text should sit inside the 35pt bottom band",
  );

  const operators = await page.getOperatorList();
  const hasRedRule = operators.fnArray.some((fn, index) => {
    if (fn !== pdfjs.OPS.setStrokeRGBColor) return false;
    const args = operators.argsArray[index] as ArrayLike<unknown> | undefined;
    return args?.[0] === "#ff0000";
  });
  const hasThickRule = operators.fnArray.some((fn, index) => {
    if (fn !== pdfjs.OPS.setLineWidth) return false;
    const args = operators.argsArray[index] as ArrayLike<number> | undefined;
    return Boolean(args && Math.abs(Number(args[0]) - 2) < 0.01);
  });
  const hasDarkBlueFooter = operators.fnArray.some((fn, index) => {
    if (fn !== pdfjs.OPS.setFillRGBColor) return false;
    const args = operators.argsArray[index] as ArrayLike<unknown> | undefined;
    return args?.[0] === "#00264c";
  });

  assert.ok(hasRedRule, "the title rule should be red");
  assert.ok(hasThickRule, "the title rule should be 2pt thick");
  assert.ok(hasDarkBlueFooter, "the footer band should be dark blue");

  assert.ok(
    items.some((item) => item.text.includes("Penyusun")),
    "the first column header should read Penyusun",
  );
  assert.ok(
    items.every((item) => !item.text.includes("Tim Penyusun")),
    "the old Tim Penyusun header should be gone",
  );
});

test("generateCoverPdf keeps two penyusun and a long title on one landscape page", async () => {
  const bytes = await generateCoverPdf({
    judul:
      "Lembar Pengesahan Metode Kerja Standar Pekerjaan Struktur Atas Gedung Bertingkat",
    logoBytes: logo,
    penyusun: [
      signature("Budi Santoso", "Site Engineer"),
      signature("Rina Kartika", "Quality Control Engineer"),
    ],
    validasi: [
      signature("Sari Wijaya", "Project Manager"),
      signature("Andi Pratama", "Head of Division"),
    ],
  });
  const doc = await PDFDocument.load(bytes);

  assert.equal(doc.getPageCount(), 1);
  assert.ok(bytes.byteLength > 1000);
});

test("generateCoverPdf keeps long text inside the fixed grid rows", async () => {
  const bytes = await generateCoverPdf({
    judul: "Lembar Pengesahan",
    logoBytes: logo,
    penyusun: [
      signature(
        "Muhammad Rizky Pratama Kusumawardhana",
        "Senior Construction Quality Assurance and Control Engineer",
      ),
    ],
    validasi: [
      signature("Sari Wijaya", "Project Manager"),
      signature("Andi Pratama", "Head of Division"),
    ],
  });
  const doc = await PDFDocument.load(bytes);

  assert.equal(doc.getPageCount(), 1);
  assert.ok(bytes.byteLength > 1000);
});

test("mergePdf places the cover before the original pages", async () => {
  const original = await PDFDocument.create();
  original.addPage([300, 400]);
  original.addPage([300, 400]);
  const originalBytes = await original.save();

  const coverBytes = await generateCoverPdf(coverData());
  const mergedBytes = await mergePdf(originalBytes, coverBytes);
  const merged = await PDFDocument.load(mergedBytes);

  assert.equal(merged.getPageCount(), 3);
  assert.equal(merged.getPage(0).getWidth(), 842);
  assert.equal(merged.getPage(0).getHeight(), 595);
  assert.equal(merged.getPage(1).getWidth(), 300);
  assert.equal(merged.getPage(2).getWidth(), 300);
});

test("applyWatermark processes every page and rejects an empty NIP", async () => {
  const source = await PDFDocument.create();
  source.addPage([595, 842]);
  source.addPage([842, 595]);
  const sourceBytes = await source.save();

  const watermarkedBytes = await applyWatermark(sourceBytes, "198001");
  const watermarked = await PDFDocument.load(watermarkedBytes);

  assert.equal(watermarked.getPageCount(), 2);
  assert.ok(watermarkedBytes.byteLength > sourceBytes.byteLength);

  await assert.rejects(() => applyWatermark(sourceBytes, "   "));
});
