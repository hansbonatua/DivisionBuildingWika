import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTableRows,
  DISIPLIN_ROW_COLUMN_COUNT,
  itemReorderIds,
  moveWithin,
  subKategoriReorderIds,
  subKategoriRowSpan,
} from "@/components/dashboard/metode-kerja-standar/MetodeKerjaTable";
import type {
  MetodeKerjaItemDto,
  MetodeKerjaSubKategoriDto,
} from "@/lib/metode-kerja-standar/service";

// The table renders from a plain DTO array and its ordering helpers are pure, so
// these regressions run without a DOM (the repository has no jsdom).

const AUDIT = {
  created_by: { user_id: "u-author", name: "Author" },
  created_at: "2026-01-01T00:00:00.000Z",
  updated_by: null,
  updated_at: "2026-01-01T00:00:00.000Z",
} as const;

function makeItem(id: string, kode: string, sortOrder = 10): MetodeKerjaItemDto {
  return {
    id,
    kode,
    nama: `Item ${kode}`,
    sort_order: sortOrder,
    evidence_url: null,
    note: null,
    pics: [],
    created_by: { ...AUDIT.created_by },
    created_at: AUDIT.created_at,
    updated_by: null,
    updated_at: AUDIT.updated_at,
  };
}

function makeSub(
  id: string,
  kode: string,
  items: MetodeKerjaItemDto[] = [],
  sortOrder = 10,
): MetodeKerjaSubKategoriDto {
  return {
    id,
    disiplin: "A",
    kode,
    nama: `Sub ${kode}`,
    sort_order: sortOrder,
    evidence_url: null,
    note: null,
    pics: [],
    items,
    created_by: { ...AUDIT.created_by },
    created_at: AUDIT.created_at,
    updated_by: null,
    updated_at: AUDIT.updated_at,
  };
}

test("the discipline table renders seven columns (no ordinal column)", () => {
  assert.equal(DISIPLIN_ROW_COLUMN_COUNT, 7);
});

test("the merged sub-kategori cell spans its own row plus every item", () => {
  assert.equal(subKategoriRowSpan(makeSub("s1", "A.1")), 1);
  assert.equal(
    subKategoriRowSpan(
      makeSub("s2", "A.2", [makeItem("i1", "A.2.1"), makeItem("i2", "A.2.2")]),
    ),
    3,
  );
});

test("buildTableRows puts each sub-kategori immediately before its own items", () => {
  const subKategori = [
    makeSub("s1", "A.1", [makeItem("i1", "A.1.1"), makeItem("i2", "A.1.2")]),
    makeSub("s2", "A.2"),
  ];

  const rows = buildTableRows(subKategori);

  assert.deepEqual(
    rows.map((row) => row.key),
    ["sub-s1", "item-i1", "item-i2", "sub-s2"],
  );
  assert.deepEqual(
    rows.map((row) => row.level),
    [1, 2, 2, 1],
  );
  assert.deepEqual(
    rows.map((row) => row.subKategoriId),
    ["s1", "s1", "s1", "s2"],
  );
});

test("buildTableRows keeps a sub-kategori that has no items", () => {
  const rows = buildTableRows([makeSub("s1", "A.1")]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].level, 1);
  assert.equal(rows[0].itemId, null);
});

test("moveWithin swaps neighbours without mutating the input", () => {
  const source = ["a", "b", "c"];

  assert.deepEqual(moveWithin(source, 1, "up"), ["b", "a", "c"]);
  assert.deepEqual(moveWithin(source, 1, "down"), ["a", "c", "b"]);
  assert.deepEqual(source, ["a", "b", "c"]);
});

test("moveWithin refuses moves outside the list", () => {
  const source = ["a", "b", "c"];

  assert.equal(moveWithin(source, 0, "up"), null);
  assert.equal(moveWithin(source, 2, "down"), null);
  assert.equal(moveWithin(source, 5, "down"), null);
  assert.equal(moveWithin(source, -1, "up"), null);
});

test("subKategoriReorderIds returns the complete new order", () => {
  const subKategori = [makeSub("s1", "A.1"), makeSub("s2", "A.2"), makeSub("s3", "A.3")];

  assert.deepEqual(subKategoriReorderIds(subKategori, 2, "up"), ["s1", "s3", "s2"]);
  assert.equal(subKategoriReorderIds(subKategori, 0, "up"), null);
});

test("itemReorderIds stays inside one parent sub-kategori", () => {
  const items = [makeItem("i1", "A.1.1"), makeItem("i2", "A.1.2")];

  assert.deepEqual(itemReorderIds(items, 0, "down"), ["i2", "i1"]);
  assert.equal(itemReorderIds(items, 1, "down"), null);
});
