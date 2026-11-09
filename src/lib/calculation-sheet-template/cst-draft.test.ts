import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_CST_DRAFT,
  draftEquals,
  draftToCreatePayload,
  draftToUpdatePayload,
  filterCstRows,
  isEmptyDraft,
  isSafeCstUrl,
  toCstDraft,
  validateCstDraft,
  type CstDraft,
  type CstTemplateRow,
} from "@/lib/calculation-sheet-template/cst-draft";

const PIC_ID = "11111111-1111-4111-8111-111111111111";

function draft(overrides: Partial<CstDraft> = {}): CstDraft {
  return {
    kode: "ars-01",
    nama: "Shop Drawing",
    picUserId: PIC_ID,
    evidenceUrl: "https://example.com/file.pdf",
    catatan: "Catatan",
    ...overrides,
  };
}

function row(overrides: Partial<CstTemplateRow> = {}): CstTemplateRow {
  return {
    id: "row-1",
    kategori: "arsitektur",
    kode: "ARS-01",
    nama: "Shop Drawing",
    pic: { user_id: PIC_ID, name: "PIC", status: "active", position: "Engineer" },
    evidence_url: null,
    catatan: null,
    created_by: { user_id: "user-1", name: "Creator" },
    created_at: "2026-11-09T00:00:00.000Z",
    updated_by: null,
    updated_at: "2026-11-09T00:00:00.000Z",
    ...overrides,
  };
}

describe("CST draft helpers", () => {
  it("maps a row into an editable draft", () => {
    assert.deepEqual(toCstDraft(row()), {
      kode: "ARS-01",
      nama: "Shop Drawing",
      picUserId: PIC_ID,
      evidenceUrl: "",
      catatan: "",
    });
  });

  it("detects dirty drafts and empty drafts", () => {
    assert.equal(draftEquals(draft(), draft()), true);
    assert.equal(draftEquals(draft(), draft({ nama: "Lain" })), false);
    assert.equal(isEmptyDraft(EMPTY_CST_DRAFT), true);
    assert.equal(isEmptyDraft(draft()), false);
    assert.equal(
      isEmptyDraft({ kode: " ", nama: "", picUserId: "", evidenceUrl: "", catatan: " " }),
      true,
    );
  });

  it("validates required fields and PIC", () => {
    assert.equal(validateCstDraft(draft())?.field, undefined);
    assert.equal(validateCstDraft(draft({ kode: "  " }))?.field, "kode");
    assert.equal(validateCstDraft(draft({ kode: "K".repeat(31) }))?.field, "kode");
    assert.equal(validateCstDraft(draft({ nama: "" }))?.field, "nama");
    assert.equal(validateCstDraft(draft({ picUserId: "" }))?.field, "picUserId");
  });

  it("validates evidence URL and catatan limits", () => {
    assert.equal(
      validateCstDraft(draft({ evidenceUrl: "ftp://example.com" }))?.field,
      "evidenceUrl",
    );
    assert.equal(
      validateCstDraft(draft({ evidenceUrl: "https://" + "a".repeat(2100) }))?.field,
      "evidenceUrl",
    );
    assert.equal(
      validateCstDraft(draft({ catatan: "c".repeat(2001) }))?.field,
      "catatan",
    );
    assert.equal(validateCstDraft(draft({ evidenceUrl: "", catatan: "" })), null);
  });

  it("builds create/update payloads only for valid drafts", () => {
    const create = draftToCreatePayload(draft({ kode: " ars-01 " }), "arsitektur");
    assert.deepEqual(create, {
      kategori: "arsitektur",
      kode: "ARS-01",
      nama: "Shop Drawing",
      pic_user_id: PIC_ID,
      evidence_url: "https://example.com/file.pdf",
      catatan: "Catatan",
    });

    const update = draftToUpdatePayload(draft({ evidenceUrl: "  ", catatan: "" }));
    assert.deepEqual(update, {
      kode: "ARS-01",
      nama: "Shop Drawing",
      pic_user_id: PIC_ID,
      evidence_url: null,
      catatan: null,
    });

    assert.equal(draftToCreatePayload(draft({ kode: "" }), "arsitektur"), null);
    assert.equal(draftToUpdatePayload(draft({ picUserId: "" })), null);
  });
});

describe("CST summary filters", () => {
  const rows = [
    row({ id: "a", kode: "ARS-01", nama: "Shop Drawing" }),
    row({
      id: "s",
      kategori: "struktur",
      kode: "STR-01",
      nama: "Pondasi",
      pic: { user_id: "pic-2", name: "PIC Dua", status: "active", position: "Engineer" },
    }),
    row({ id: "m", kategori: "meep", kode: "MEP-01", nama: "Panel Listrik" }),
  ];

  it("returns every row for empty filters and preserves API order", () => {
    assert.deepEqual(
      filterCstRows(rows, { kategori: "", picUserId: "", search: "" }).map(
        (item) => item.id,
      ),
      ["a", "s", "m"],
    );
  });

  it("filters by one category", () => {
    assert.deepEqual(
      filterCstRows(rows, { kategori: "struktur", picUserId: "", search: "" }).map(
        (item) => item.id,
      ),
      ["s"],
    );
  });

  it("filters by PIC", () => {
    assert.deepEqual(
      filterCstRows(rows, { kategori: "", picUserId: PIC_ID, search: "" }).map(
        (item) => item.id,
      ),
      ["a", "m"],
    );
  });

  it("searches kode and nama case-insensitively", () => {
    assert.deepEqual(
      filterCstRows(rows, { kategori: "", picUserId: "", search: "shop" }).map(
        (item) => item.id,
      ),
      ["a"],
    );
    assert.deepEqual(
      filterCstRows(rows, { kategori: "", picUserId: "", search: "mep-01" }).map(
        (item) => item.id,
      ),
      ["m"],
    );
  });

  it("combines category, PIC, and search", () => {
    assert.deepEqual(
      filterCstRows(rows, {
        kategori: "arsitektur",
        picUserId: "pic-2",
        search: "",
      }),
      [],
    );
  });
});

describe("isSafeCstUrl", () => {
  it("accepts http(s) and rejects everything else", () => {
    assert.equal(isSafeCstUrl("https://example.com"), true);
    assert.equal(isSafeCstUrl("http://example.com"), true);
    assert.equal(isSafeCstUrl("ftp://example.com"), false);
    assert.equal(isSafeCstUrl("javascript:alert(1)"), false);
    assert.equal(isSafeCstUrl("contoh"), false);
  });
});
