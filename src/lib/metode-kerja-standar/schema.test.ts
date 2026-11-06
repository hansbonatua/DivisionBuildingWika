import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createItemSchema,
  createSubKategoriSchema,
  isSafeMetodeKerjaUrl,
  reorderSchema,
  updateItemSchema,
  updateSubKategoriSchema,
} from "@/lib/metode-kerja-standar/schema";

const PIC_ID = "22222222-2222-4222-8222-222222222222";
const PIC_ID_2 = "33333333-3333-4333-8333-333333333333";
const SUB_ID = "44444444-4444-4444-8444-444444444444";

describe("metode kerja URL safety", () => {
  it("accepts only absolute http(s) URLs", () => {
    assert.equal(isSafeMetodeKerjaUrl("https://example.com/a"), true);
    assert.equal(isSafeMetodeKerjaUrl("http://example.com/a"), true);
    for (const value of [
      "javascript:alert(1)",
      "data:text/html,x",
      "ftp://example.com/a",
      "//example.com/a",
      "example.com",
      "",
    ]) {
      assert.equal(isSafeMetodeKerjaUrl(value), false, value);
    }
  });
});

describe("metode kerja sub-kategori contract", () => {
  it("normalizes kode, empty text and optional PIC", () => {
    const parsed = createSubKategoriSchema.safeParse({
      kode: " a.1 ",
      nama: "  Pekerjaan Persiapan  ",
      evidence_url: "",
      note: "  ",
    });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.kode, "A.1");
      assert.equal(parsed.data.nama, "Pekerjaan Persiapan");
      assert.deepEqual(parsed.data.pic_ids, []);
      assert.equal(parsed.data.evidence_url, null);
      assert.equal(parsed.data.note, null);
    }
  });

  it("rejects unsafe URLs and unknown fields", () => {
    assert.equal(
      createSubKategoriSchema.safeParse({
        kode: "A.1",
        nama: "Persiapan",
        evidence_url: "javascript:alert(1)",
      }).success,
      false,
    );
    assert.equal(
      createSubKategoriSchema.safeParse({
        kode: "A.1",
        nama: "Persiapan",
        disiplin: "A",
      }).success,
      false,
    );
  });

  it("requires pic_ids on update but allows an empty list", () => {
    assert.equal(
      updateSubKategoriSchema.safeParse({
        kode: "A.1",
        nama: "Persiapan",
      }).success,
      false,
    );
    assert.equal(
      updateSubKategoriSchema.safeParse({
        kode: "A.1",
        nama: "Persiapan",
        pic_ids: [],
      }).success,
      true,
    );
  });
});

describe("metode kerja item contract", () => {
  it("requires at least one PIC on create and update", () => {
    const base = { kode: "A.1.1", nama: "Survey" };
    assert.equal(createItemSchema.safeParse({ ...base, pic_ids: [] }).success, false);
    assert.equal(
      createItemSchema.safeParse({ ...base, pic_ids: [PIC_ID] }).success,
      true,
    );
    assert.equal(updateItemSchema.safeParse({ ...base, pic_ids: [] }).success, false);
    assert.equal(
      updateItemSchema.safeParse({ ...base, pic_ids: [PIC_ID, PIC_ID_2] }).success,
      true,
    );
  });

  it("rejects parent/disiplin/audit fields in the body", () => {
    for (const extra of [
      { sub_kategori_id: SUB_ID },
      { disiplin: "A" },
      { sort_order: 10 },
      { created_by: PIC_ID },
    ]) {
      assert.equal(
        createItemSchema.safeParse({
          kode: "A.1.1",
          nama: "Survey",
          pic_ids: [PIC_ID],
          ...extra,
        }).success,
        false,
      );
    }
  });
});

describe("metode kerja reorder contract", () => {
  it("accepts discipline code and UUID parents", () => {
    assert.equal(
      reorderSchema.safeParse({
        entity: "sub_kategori",
        parent_id: "A",
        ordered_ids: [SUB_ID],
      }).success,
      true,
    );
    assert.equal(
      reorderSchema.safeParse({
        entity: "item",
        parent_id: SUB_ID,
        ordered_ids: [PIC_ID],
      }).success,
      true,
    );
  });

  it("rejects wrong parent shape and duplicate IDs", () => {
    assert.equal(
      reorderSchema.safeParse({
        entity: "sub_kategori",
        parent_id: "Z",
        ordered_ids: [SUB_ID],
      }).success,
      false,
    );
    assert.equal(
      reorderSchema.safeParse({
        entity: "item",
        parent_id: "not-a-uuid",
        ordered_ids: [PIC_ID],
      }).success,
      false,
    );
    assert.equal(
      reorderSchema.safeParse({
        entity: "sub_kategori",
        parent_id: "A",
        ordered_ids: [SUB_ID, SUB_ID],
      }).success,
      false,
    );
  });
});
