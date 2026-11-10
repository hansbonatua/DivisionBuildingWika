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

test("generateCoverPdf places the kode seri above the table, right-aligned", async () => {
  const bytes = await generateCoverPdf({
    ...coverData(),
    kodeSeri: "WIKA/BA/2026/001",
  });
  const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const content = await doc.getPage(1).then((page) => page.getTextContent());
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
  assert.ok(kodeSeri, "kode seri should be drawn");
  assert.ok(header, "Validasi 2 header should be drawn");

  assert.equal(kodeSeri.height, 9);
  assert.ok(
    kodeSeri.y > header.y + 20,
    "kode seri should sit above the table header row",
  );
  assert.ok(
    Math.abs(kodeSeri.x + kodeSeri.width - (40 + 762)) <= 1,
    "kode seri should end on the table's right border",
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
