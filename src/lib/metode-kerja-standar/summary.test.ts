import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMetodeKerjaSummary,
  filterSummaryRows,
  type SummaryPic,
  type SummarySubKategoriInput,
} from "@/lib/metode-kerja-standar/summary";

const PIC_A: SummaryPic = {
  user_id: "11111111-1111-4111-8111-111111111111",
  name: "Ayu",
  status: "active",
  position: "Engineer",
};
const PIC_B: SummaryPic = {
  user_id: "22222222-2222-4222-8222-222222222222",
  name: "Budi",
  status: "suspended",
  position: "Manager",
};

function input(): SummarySubKategoriInput[] {
  return [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      disiplin: "A",
      kode: "A.1",
      nama: "Pekerjaan Persiapan",
      evidenceUrl: null,
      updatedAt: "2026-11-06T00:00:00.000Z",
      pics: [PIC_A],
      items: [],
    },
    {
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      disiplin: "B",
      kode: "B.1",
      nama: "Desain",
      evidenceUrl: "https://example.com/sub",
      updatedAt: "2026-11-06T01:00:00.000Z",
      pics: [PIC_A],
      items: [
        {
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          kode: "B.1.1",
          nama: "Survey lokasi",
          evidenceUrl: "https://example.com/item",
          updatedAt: "2026-11-06T02:00:00.000Z",
          pics: [PIC_A, PIC_B],
        },
      ],
    },
  ];
}

describe("metode kerja summary builder", () => {
  it("always emits six disciplines and empty rows", () => {
    const rows = buildMetodeKerjaSummary(input());
    assert.equal(rows.length, 6);
    assert.deepEqual(
      rows.map((row) => row.status),
      [
        "sub-kategori-kosong",
        "item",
        "disiplin-kosong",
        "disiplin-kosong",
        "disiplin-kosong",
        "disiplin-kosong",
      ],
    );
    assert.equal(rows[0]?.item, null);
    assert.equal(rows[2]?.sub_kategori, null);
  });

  it("unions sub-kategori and item PICs without duplicates", () => {
    const rows = buildMetodeKerjaSummary(input());
    const itemRow = rows[1];
    assert.equal(itemRow?.status, "item");
    assert.equal(itemRow?.pics.length, 2);
    assert.deepEqual(
      itemRow?.pics.map((pic) => pic.user_id),
      [PIC_A.user_id, PIC_B.user_id],
    );
    assert.equal(itemRow?.evidence_url, "https://example.com/item");
  });

  it("filters by discipline, PIC and free text", () => {
    const rows = buildMetodeKerjaSummary(input());
    assert.equal(filterSummaryRows(rows, { disiplin: "B" }).length, 1);
    assert.equal(
      filterSummaryRows(rows, { picUserId: PIC_B.user_id }).length,
      1,
    );
    assert.equal(filterSummaryRows(rows, { search: "survey" }).length, 1);
    assert.equal(filterSummaryRows(rows, { search: "A.1" }).length, 1);
    assert.equal(filterSummaryRows(rows, { search: "tidak-ada" }).length, 0);
    assert.equal(filterSummaryRows(rows, {}).length, 6);
  });
});
