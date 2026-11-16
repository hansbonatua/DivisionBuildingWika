import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDocumentSchema,
  createSubKategoriSchema,
  reorderSchema,
  updateDocumentSchema,
} from "@/lib/regulation/schema";
import { buildRegulationBlobPathname } from "@/lib/regulation/storage";

describe("regulation input contracts", () => {
  it("normalizes sub-kategori kode and empty note", () => {
    const parsed = createSubKategoriSchema.parse({
      kode: " pw.01 ",
      nama: " Perencanaan ",
      note: "",
    });
    assert.equal(parsed.kode, "PW.01");
    assert.equal(parsed.nama, "Perencanaan");
    assert.equal(parsed.note, null);
  });

  it("accepts a verified upload payload with a ZIP file", () => {
    const pathname = buildRegulationBlobPathname("paket.zip");
    assert.ok(pathname);
    const parsed = createDocumentSchema.parse({
      kode: "pw.01.01",
      nama: "Paket Pendukung",
      note: null,
      file_name: "paket.zip",
      blob_pathname: pathname,
    });
    assert.equal(parsed.kode, "PW.01.01");
    assert.equal(parsed.file_name, "paket.zip");
  });

  it("rejects unsupported extensions and incomplete file replacement", () => {
    assert.equal(
      createDocumentSchema.safeParse({
        kode: "PW.01",
        nama: "Contoh",
        note: null,
        file_name: "virus.exe",
        blob_pathname:
          "regulation/00000000-0000-4000-8000-000000000000/virus.exe",
      }).success,
      false,
    );
    assert.equal(
      updateDocumentSchema.safeParse({
        file_name: "baru.pdf",
      }).success,
      false,
    );
  });

  it("requires a complete reorder list with a known parent shape", () => {
    assert.equal(
      reorderSchema.safeParse({
        entity: "sub_kategori",
        parent_id: "prosedur_wika",
        ordered_ids: ["00000000-0000-4000-8000-000000000001"],
      }).success,
      true,
    );
    assert.equal(
      reorderSchema.safeParse({
        entity: "sub_kategori",
        parent_id: "A",
        ordered_ids: ["00000000-0000-4000-8000-000000000001"],
      }).success,
      false,
    );
  });
});
