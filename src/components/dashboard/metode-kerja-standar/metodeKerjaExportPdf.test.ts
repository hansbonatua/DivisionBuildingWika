import test from "node:test";
import assert from "node:assert/strict";
import {
  buildMetodeKerjaSummary,
  type SummarySubKategoriInput,
} from "@/lib/metode-kerja-standar/summary";
import {
  buildMetodeKerjaSummaryPdf,
  metodeKerjaSummaryPdfFileName,
  summaryPdfCells,
  summaryStatusLabel,
} from "@/components/dashboard/metode-kerja-standar/metodeKerjaExportPdf";

// jsPDF builds documents fully in memory; only view/save touch the browser.
// These tests cover the builder, the pure row-to-cell mapping (D-D-03) and the
// deterministic file name, not the download/open wrappers.

const CODES = ["A", "B", "C", "D", "E", "F"] as const;

function makeSubInput(
  index: number,
  overrides: Partial<SummarySubKategoriInput> = {},
): SummarySubKategoriInput {
  const code = CODES[index % CODES.length];
  return {
    id: `sub-${index}`,
    disiplin: code,
    kode: `K-${index}`,
    nama: `Sub ${index}`,
    evidenceUrl: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    pics: [],
    items: [],
    ...overrides,
  };
}

test("D-D-03: empty disiplin F still renders printable rows", () => {
  const rows = buildMetodeKerjaSummary([]);

  assert.equal(rows.length, 6);
  assert.deepEqual(
    rows.map((row) => row.disiplin.code),
    ["A", "B", "C", "D", "E", "F"],
  );

  const fRow = rows[5];
  assert.equal(fRow.status, "disiplin-kosong");
  assert.equal(fRow.sub_kategori, null);
  assert.equal(fRow.item, null);

  const cells = summaryPdfCells(fRow);
  assert.equal(cells.disiplin, "F. Lainnya");
  assert.equal(cells.subKategori, "Belum ada sub-kategori");
  assert.equal(cells.item, "Belum ada item");
  assert.equal(cells.status, "Disiplin kosong");
  assert.equal(cells.pic, "—");
  assert.equal(cells.evidence, "—");
  assert.equal(cells.updated, "—");
});

test("D-D-03: an all-empty Summary still produces a landscape A4 PDF", () => {
  const rows = buildMetodeKerjaSummary([]);
  const doc = buildMetodeKerjaSummaryPdf(rows);

  assert.ok(doc.getNumberOfPages() >= 1);
  assert.ok(doc.output("arraybuffer").byteLength > 1000);
  // jsPDF converts mm to pt internally, so page sizes carry a tiny float.
  assert.ok(Math.abs(doc.internal.pageSize.getWidth() - 297) < 0.01);
  assert.ok(Math.abs(doc.internal.pageSize.getHeight() - 210) < 0.01);
});

test("summary cells carry item, sub-kategori, PIC and evidence", () => {
  const rows = buildMetodeKerjaSummary([
    makeSubInput(0, {
      pics: [
        { user_id: "u-1", name: "Budi", status: "active", position: "" },
        { user_id: "u-2", name: "Sari", status: "suspended", position: "" },
      ],
      items: [
        {
          id: "item-1",
          kode: "K-0.1",
          nama: "Pekerjaan Pondasi",
          evidenceUrl: "https://example.com/evidence",
          updatedAt: "2026-02-03T00:00:00.000Z",
          pics: [{ user_id: "u-1", name: "Budi", status: "active", position: "" }],
        },
      ],
    }),
  ]);

  // Every discipline always emits at least one row: A is filled and B–F are
  // reported as empty, which is the D-D-03 behaviour.
  assert.equal(rows.length, 6);
  assert.equal(rows[0].status, "item");
  assert.deepEqual(
    rows.slice(1).map((row) => row.status),
    ["disiplin-kosong", "disiplin-kosong", "disiplin-kosong", "disiplin-kosong", "disiplin-kosong"],
  );

  const cells = summaryPdfCells(rows[0]);

  assert.equal(cells.disiplin, "A. Struktur");
  assert.equal(cells.subKategori, "K-0 Sub 0");
  assert.equal(cells.item, "K-0.1 Pekerjaan Pondasi");
  assert.equal(cells.evidence, "https://example.com/evidence");
  assert.equal(cells.status, "Item");
  // Sub-kategori PIC are merged with item PIC and de-duplicated by user.
  assert.equal(cells.pic, "Budi\nSari (non-aktif)");
  assert.equal(cells.updated, "03 Feb 2026");

  const doc = buildMetodeKerjaSummaryPdf(rows);
  assert.ok(doc.getNumberOfPages() >= 1);
  assert.ok(doc.output("arraybuffer").byteLength > 1000);
});

test("a long Summary switches to A3 landscape", () => {
  const inputs: SummarySubKategoriInput[] = Array.from({ length: 130 }, (_, index) =>
    makeSubInput(index, {
      items: [
        {
          id: `item-${index}`,
          kode: `K-${index}.1`,
          nama: `Item ${index}`,
          evidenceUrl: null,
          updatedAt: "2026-01-01T00:00:00.000Z",
          pics: [],
        },
      ],
    }),
  );

  const rows = buildMetodeKerjaSummary(inputs);
  assert.equal(rows.length, 130);

  const doc = buildMetodeKerjaSummaryPdf(rows);
  assert.ok(doc.getNumberOfPages() >= 1);
  assert.ok(Math.abs(doc.internal.pageSize.getWidth() - 420) < 0.01);
  assert.ok(Math.abs(doc.internal.pageSize.getHeight() - 297) < 0.01);
});

test("status labels stay stable", () => {
  assert.equal(summaryStatusLabel("item"), "Item");
  assert.equal(summaryStatusLabel("sub-kategori-kosong"), "Tanpa item");
  assert.equal(summaryStatusLabel("disiplin-kosong"), "Disiplin kosong");
});

test("PDF file name is deterministic and timestamped", () => {
  const fixed = new Date(2026, 10, 5, 9, 7, 3);

  assert.equal(
    metodeKerjaSummaryPdfFileName(fixed),
    "Metode-Kerja-Standar-Summary-20261105-090703.pdf",
  );
});
