import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  REGULATION_MAX_FILE_SIZE_BYTES,
  buildRegulationBlobPathname,
  isRegulationAllowedFileName,
  isRegulationMimeTypeAllowed,
  isValidRegulationBlobPathname,
  regulationBlobPathnameExtension,
} from "@/lib/regulation/storage";

describe("regulation storage policy", () => {
  it("uses the isolated 20 MB limit", () => {
    assert.equal(REGULATION_MAX_FILE_SIZE_BYTES, 20 * 1024 * 1024);
  });

  it("accepts PDF, Word, Excel, and ZIP names only", () => {
    for (const name of [
      "panduan.pdf",
      "prosedur.doc",
      "prosedur.docx",
      "data.xls",
      "data.xlsx",
      "paket.zip",
    ]) {
      assert.equal(isRegulationAllowedFileName(name), true, name);
    }
    assert.equal(isRegulationAllowedFileName("aplikasi.exe"), false);
    assert.equal(isRegulationAllowedFileName("gambar.png"), false);
    assert.equal(isRegulationAllowedFileName("tanpa-ekstensi"), false);
  });

  it("supports ZIP MIME variants and the octet-stream fallback", () => {
    assert.equal(isRegulationMimeTypeAllowed(".zip", "application/zip"), true);
    assert.equal(
      isRegulationMimeTypeAllowed(".zip", "application/x-zip-compressed"),
      true,
    );
    assert.equal(
      isRegulationMimeTypeAllowed(".zip", "application/octet-stream"),
      true,
    );
    assert.equal(
      isRegulationMimeTypeAllowed(".zip", "application/pdf"),
      false,
    );
    assert.equal(
      isRegulationMimeTypeAllowed(
        ".docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
      true,
    );
    assert.equal(
      isRegulationMimeTypeAllowed(".docx", "application/octet-stream"),
      false,
    );
  });

  it("builds and validates a pathname inside the regulation namespace", () => {
    const pathname = buildRegulationBlobPathname("Panduan Perencanaan.pdf");
    assert.ok(pathname);
    assert.match(
      pathname,
      /^regulation\/[0-9a-f-]{36}\/Panduan-Perencanaan\.pdf$/,
    );
    assert.equal(isValidRegulationBlobPathname(pathname), true);
    assert.equal(regulationBlobPathnameExtension(pathname), ".pdf");

    const zipPathname = buildRegulationBlobPathname("paket.zip");
    assert.ok(zipPathname);
    assert.equal(isValidRegulationBlobPathname(zipPathname), true);
  });

  it("rejects paths outside the namespace or with malformed segments", () => {
    assert.equal(
      isValidRegulationBlobPathname(
        "template-form/00000000-0000-4000-8000-000000000000/a.pdf",
      ),
      false,
    );
    assert.equal(
      isValidRegulationBlobPathname("regulation/not-a-uuid/a.pdf"),
      false,
    );
    assert.equal(
      isValidRegulationBlobPathname(
        "regulation/00000000-0000-4000-8000-000000000000/a.pdf/extra",
      ),
      false,
    );
    assert.equal(
      isValidRegulationBlobPathname(
        "regulation/00000000-0000-4000-8000-000000000000/a.exe",
      ),
      false,
    );
  });
});
