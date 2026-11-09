import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createCalculationSheetTemplateSchema,
  isSafeCstUrl,
  updateCalculationSheetTemplateSchema,
} from "@/lib/calculation-sheet-template/schema";

const PIC_ID = "11111111-1111-4111-8111-111111111111";

function validCreate(overrides: Record<string, unknown> = {}) {
  return {
    kategori: "arsitektur",
    kode: " ars-01 ",
    nama: " Shop Drawing Arsitektur ",
    pic_user_id: PIC_ID,
    evidence_url: "https://example.com/evidence.pdf",
    catatan: " Catatan ",
    ...overrides,
  };
}

describe("CST create schema", () => {
  it("normalizes kode to uppercase, trims nama and catatan", () => {
    const parsed = createCalculationSheetTemplateSchema.parse(validCreate());
    assert.equal(parsed.kode, "ARS-01");
    assert.equal(parsed.nama, "Shop Drawing Arsitektur");
    assert.equal(parsed.catatan, "Catatan");
    assert.equal(parsed.kategori, "arsitektur");
  });

  it("treats empty evidence and catatan as NULL", () => {
    const parsed = createCalculationSheetTemplateSchema.parse(
      validCreate({ evidence_url: "   ", catatan: "" }),
    );
    assert.equal(parsed.evidence_url, null);
    assert.equal(parsed.catatan, null);

    const omitted = createCalculationSheetTemplateSchema.parse({
      kategori: "meep",
      kode: "M-1",
      nama: "Nama",
      pic_user_id: PIC_ID,
    });
    assert.equal(omitted.evidence_url, null);
    assert.equal(omitted.catatan, null);
  });

  it("rejects an unknown kategori", () => {
    const result = createCalculationSheetTemplateSchema.safeParse(
      validCreate({ kategori: "arsitektur-1" }),
    );
    assert.equal(result.success, false);
  });

  it("rejects kode longer than 30 characters and empty kode", () => {
    assert.equal(
      createCalculationSheetTemplateSchema.safeParse(
        validCreate({ kode: "K".repeat(31) }),
      ).success,
      false,
    );
    assert.equal(
      createCalculationSheetTemplateSchema.safeParse(validCreate({ kode: "   " }))
        .success,
      false,
    );
  });

  it("rejects empty nama and nama longer than 200 characters", () => {
    assert.equal(
      createCalculationSheetTemplateSchema.safeParse(validCreate({ nama: "  " }))
        .success,
      false,
    );
    assert.equal(
      createCalculationSheetTemplateSchema.safeParse(
        validCreate({ nama: "N".repeat(201) }),
      ).success,
      false,
    );
  });

  it("rejects a non-UUID PIC", () => {
    assert.equal(
      createCalculationSheetTemplateSchema.safeParse(
        validCreate({ pic_user_id: "not-a-uuid" }),
      ).success,
      false,
    );
  });

  it("rejects non-http(s) and over-long evidence URLs", () => {
    assert.equal(
      createCalculationSheetTemplateSchema.safeParse(
        validCreate({ evidence_url: "ftp://example.com/file" }),
      ).success,
      false,
    );
    assert.equal(
      createCalculationSheetTemplateSchema.safeParse(
        validCreate({ evidence_url: "https://" + "a".repeat(2100) }),
      ).success,
      false,
    );
  });

  it("rejects catatan longer than 2000 characters", () => {
    assert.equal(
      createCalculationSheetTemplateSchema.safeParse(
        validCreate({ catatan: "c".repeat(2001) }),
      ).success,
      false,
    );
  });

  it("rejects unknown fields instead of stripping them", () => {
    assert.equal(
      createCalculationSheetTemplateSchema.safeParse(
        validCreate({ sort_order: 10 }),
      ).success,
      false,
    );
  });
});

describe("CST update schema", () => {
  const validUpdate = {
    kode: "ars-01",
    nama: "Nama Baru",
    pic_user_id: PIC_ID,
    evidence_url: null,
    catatan: null,
  };

  it("accepts the full editable payload and omits kategori", () => {
    const parsed = updateCalculationSheetTemplateSchema.parse(validUpdate);
    assert.equal(parsed.kode, "ARS-01");
    assert.equal("kategori" in parsed, false);
  });

  it("rejects kategori because it is immutable", () => {
    const result = updateCalculationSheetTemplateSchema.safeParse({
      ...validUpdate,
      kategori: "struktur",
    });
    assert.equal(result.success, false);
  });
});

describe("isSafeCstUrl", () => {
  it("accepts absolute http and https URLs", () => {
    assert.equal(isSafeCstUrl("http://example.com"), true);
    assert.equal(isSafeCstUrl("https://example.com/a?b=1"), true);
  });

  it("rejects relative, javascript and malformed URLs", () => {
    assert.equal(isSafeCstUrl("/dashboard"), false);
    assert.equal(isSafeCstUrl("javascript:alert(1)"), false);
    assert.equal(isSafeCstUrl("not a url"), false);
  });
});
