import test from "node:test";
import assert from "node:assert/strict";
import type { CellInput } from "jspdf-autotable";
import {
  buildMetodeKerjaSummary,
  buildSummaryTree,
  filterSummaryRows,
  type SummaryItemInput,
  type SummaryPic,
  type SummarySubKategoriInput,
} from "@/lib/metode-kerja-standar/summary";
import {
  TABLE_HEADERS,
  buildMetodeKerjaSummaryPdf,
  buildSummaryPdfBody,
  metodeKerjaSummaryPdfFileName,
  summaryPdfCells,
  summaryStatusLabel,
} from "@/components/dashboard/metode-kerja-standar/metodeKerjaExportPdf";

// jsPDF builds documents fully in memory; only view/save touch the browser.
// These tests cover the builder, the pure row-to-cell mapping (D-D-03), the
// Disiplin → Sub-Kategori → Item tree, the printed body and the deterministic
// file name, not the download/open wrappers.

const CODES = ["A", "B", "C", "D", "E", "F"] as const;

const BUDI: SummaryPic = {
  user_id: "u-1",
  name: "Budi",
  status: "active",
  position: "",
};

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

function makeItem(
  index: number,
  overrides: Partial<SummaryItemInput> = {},
): SummaryItemInput {
  return {
    id: `item-${index}`,
    kode: `K-0.${index + 1}`,
    nama: `Item ${index}`,
    evidenceUrl: null,
    updatedAt: "2026-01-01T00:00:00.000Z",
    pics: [],
    ...overrides,
  };
}

// autoTable accepts plain strings as well as CellDef objects; the body
// assertions only read the object form.
type CellShape = {
  content?: string | number;
  colSpan?: number;
  styles?: {
    fontStyle?: string;
    fillColor?: number[];
    textColor?: number[];
  };
};

function cellAt(line: CellInput[], index = 0): CellShape {
  return line[index] as unknown as CellShape;
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
  assert.equal(cells.subKategori, "Belum ada sub-kategori");
  assert.equal(cells.item, "Belum ada item");
  assert.equal(cells.status, "Disiplin kosong");
  assert.equal(cells.pic, "—");
  assert.equal(cells.evidence, "—");
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
        BUDI,
        { user_id: "u-2", name: "Sari", status: "suspended", position: "" },
      ],
      items: [
        {
          id: "item-1",
          kode: "K-0.1",
          nama: "Pekerjaan Pondasi",
          evidenceUrl: "https://example.com/evidence",
          updatedAt: "2026-02-03T00:00:00.000Z",
          pics: [BUDI],
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

  assert.equal(cells.subKategori, "K-0 Sub 0");
  assert.equal(cells.item, "K-0.1 Pekerjaan Pondasi");
  assert.equal(cells.evidence, "https://example.com/evidence");
  assert.equal(cells.status, "Item");
  // Sub-kategori PIC are merged with item PIC and de-duplicated by user.
  assert.equal(cells.pic, "Budi\nSari (non-aktif)");

  const doc = buildMetodeKerjaSummaryPdf(rows);
  assert.ok(doc.getNumberOfPages() >= 1);
  assert.ok(doc.output("arraybuffer").byteLength > 1000);
});

test("PDF table keeps five columns and no Disiplin column", () => {
  assert.equal(TABLE_HEADERS.length, 5);
  assert.deepEqual([...TABLE_HEADERS], [
    "Sub-Kategori",
    "Item",
    "PIC",
    "Evidence",
    "Status",
  ]);
  assert.equal(TABLE_HEADERS.includes("Disiplin"), false);
});

test("tree groups Disiplin → Sub-Kategori → Item and keeps rowSpan after filtering", () => {
  const rows = buildMetodeKerjaSummary([
    makeSubInput(0, {
      items: [
        makeItem(0, { pics: [BUDI] }),
        makeItem(1),
        makeItem(2, { pics: [BUDI] }),
      ],
    }),
  ]);

  const tree = buildSummaryTree(rows);
  assert.equal(tree.length, 6);
  assert.equal(tree[0].label, "A. Struktur");
  assert.equal(tree[0].empty, false);
  assert.equal(tree[0].subKategori.length, 1);
  assert.equal(tree[0].subKategori[0].rows.length, 3);
  assert.equal(tree[0].subKategori[0].sub_kategori?.kode, "K-0");
  // B–F have no sub-kategori at all.
  assert.equal(tree[1].empty, true);
  assert.equal(tree[1].subKategori.length, 0);

  // Only two of the three items match the PIC filter, so the visible
  // sub-kategori block shrinks to two rows — and that is the UI rowSpan.
  const filtered = filterSummaryRows(rows, { picUserId: "u-1" });
  const filteredTree = buildSummaryTree(filtered);
  assert.equal(filteredTree.length, 1);
  assert.equal(filteredTree[0].code, "A");
  assert.equal(filteredTree[0].subKategori[0].rows.length, 2);
});

test("each discipline prints once as a merged header row with an empty placeholder", () => {
  const rows = buildMetodeKerjaSummary([]);
  const body = buildSummaryPdfBody(rows);

  // Six discipline headers plus one "Belum ada sub-kategori" row each.
  assert.equal(body.length, 12);

  const headerRows = body.filter((line) => cellAt(line).styles?.fillColor);
  assert.equal(headerRows.length, 6);
  assert.deepEqual(
    headerRows.map((line) => cellAt(line).colSpan),
    [5, 5, 5, 5, 5, 5],
  );
  assert.deepEqual(
    headerRows.map((line) => cellAt(line).styles?.fontStyle),
    ["bold", "bold", "bold", "bold", "bold", "bold"],
  );
  assert.deepEqual(cellAt(headerRows[0]).styles?.textColor, [255, 255, 255]);
  assert.equal(cellAt(headerRows[0]).content, "A. Struktur");
  assert.equal(cellAt(headerRows[5]).content, "F. Lainnya");

  const placeholders = body.filter(
    (line) => cellAt(line).content === "Belum ada sub-kategori",
  );
  assert.equal(placeholders.length, 6);
  for (const line of placeholders) {
    assert.equal(line.length, 1);
    assert.equal(cellAt(line).colSpan, 5);
    assert.equal(cellAt(line).styles?.fillColor, undefined);
  }
});

test("a sub-kategori prints once and later item rows leave the cell blank", () => {
  const rows = buildMetodeKerjaSummary([
    makeSubInput(0, { items: [makeItem(0), makeItem(1), makeItem(2)] }),
  ]);

  const body = buildSummaryPdfBody(rows);

  assert.equal(cellAt(body[0]).content, "A. Struktur");
  assert.equal(body[1].length, 5);
  assert.equal(cellAt(body[1]).content, "K-0 Sub 0");
  assert.equal(body[2].length, 5);
  assert.equal(cellAt(body[2]).content, "");
  assert.equal(body[3].length, 5);
  assert.equal(cellAt(body[3]).content, "");
  assert.equal(cellAt(body[1], 1).content, "K-0.1 Item 0");
  assert.equal(cellAt(body[3], 1).content, "K-0.3 Item 2");

  // B starts a new discipline block: header, then the empty placeholder.
  assert.equal(body[4].length, 1);
  assert.ok(String(cellAt(body[4]).content).startsWith("B."));
  assert.equal(cellAt(body[5]).content, "Belum ada sub-kategori");
  assert.equal(cellAt(body[5]).colSpan, 5);
});

test("a sub-kategori without items keeps its row and prints \"Belum ada item\"", () => {
  const rows = buildMetodeKerjaSummary([makeSubInput(0)]);
  const body = buildSummaryPdfBody(rows);

  assert.equal(cellAt(body[1]).content, "K-0 Sub 0");
  assert.equal(cellAt(body[1], 1).content, "Belum ada item");
  assert.equal(cellAt(body[1], 4).content, "Tanpa item");
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
