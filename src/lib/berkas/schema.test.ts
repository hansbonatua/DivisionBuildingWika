import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createBerkasSchema,
  rejectBerkasSchema,
  revisiBerkasSchema,
  uploadTtdSchema,
} from "./schema";

const ACTOR_ID = "11111111-1111-4111-8111-111111111111";
const UPLOAD_ID = "22222222-2222-4222-8222-222222222222";
const VALIDATOR_1_ID = "33333333-3333-4333-8333-333333333333";
const VALIDATOR_2_ID = "44444444-4444-4444-8444-444444444444";
const BERKAS_ID = "55555555-5555-4555-8555-555555555555";

function validCreate() {
  return {
    judul: "Berita Acara",
    uploadId: UPLOAD_ID,
    originalPdf: {
      pathname: `berkas/uploads/${ACTOR_ID}/${UPLOAD_ID}/original/berita-acara.pdf`,
      fileName: "berita-acara.pdf",
      pageCount: 2,
    },
    penyusun: [
      {
        userId: ACTOR_ID,
        nama: "Penyusun Lapangan",
        jabatan: "Site Engineer",
        urutan: 1,
        ttdPathname: `berkas/uploads/${ACTOR_ID}/${UPLOAD_ID}/penyusun/1/ttd-penyusun.png`,
      },
    ],
    validasi: [
      {
        userId: VALIDATOR_1_ID,
        nama: "Validator Satu",
        jabatan: "Project Manager",
        urutan: 1,
      },
      {
        userId: VALIDATOR_2_ID,
        nama: "Validator Dua",
        jabatan: "Engineering Manager",
        urutan: 2,
      },
    ],
  };
}

test("createBerkasSchema accepts manual signer jabatan and optional nama", () => {
  const parsed = createBerkasSchema.parse(validCreate());
  assert.equal(parsed.penyusun[0]?.jabatan, "Site Engineer");
  assert.equal(parsed.validasi[0]?.jabatan, "Project Manager");
  assert.equal(parsed.validasi[1]?.jabatan, "Engineering Manager");

  const withoutNames = validCreate();
  withoutNames.penyusun[0] = { ...withoutNames.penyusun[0], nama: undefined } as never;
  withoutNames.validasi = withoutNames.validasi.map((item) => ({
    ...item,
    nama: undefined,
  })) as never;
  assert.equal(createBerkasSchema.safeParse(withoutNames).success, true);
});

test("createBerkasSchema rejects an empty manual jabatan", () => {
  const input = validCreate();
  input.validasi[0] = { ...input.validasi[0], jabatan: "   " };
  assert.equal(createBerkasSchema.safeParse(input).success, false);
});

test("rejectBerkasSchema requires a trimmed reason up to 2000 chars", () => {
  assert.equal(rejectBerkasSchema.parse({ reason: "  Tidak lengkap.  " }).reason, "Tidak lengkap.");
  assert.equal(rejectBerkasSchema.safeParse({ reason: "   " }).success, false);
  assert.equal(
    rejectBerkasSchema.safeParse({ reason: "x".repeat(2001) }).success,
    false,
  );
});

test("revisiBerkasSchema accepts only a Berkas upload PDF path", () => {
  const valid = {
    newPdfPathname: `berkas/uploads/${ACTOR_ID}/${UPLOAD_ID}/original/revisi.pdf`,
    fileName: "revisi.pdf",
  };
  assert.equal(revisiBerkasSchema.safeParse(valid).success, true);
  assert.equal(
    revisiBerkasSchema.safeParse({ newPdfPathname: "berkas/lain.pdf" }).success,
    false,
  );
  assert.equal(
    revisiBerkasSchema.safeParse({ ...valid, fileName: "revisi.txt" }).success,
    false,
  );
});

test("uploadTtdSchema accepts and trims catatan, including null", () => {
  const withNote = uploadTtdSchema.parse({
    ttd: {
      pathname: `berkas/${BERKAS_ID}/validasi/1/ttd.png`,
    },
    catatan: "  Dokumen sesuai.  ",
  });
  assert.equal(withNote.catatan, "Dokumen sesuai.");

  assert.equal(
    uploadTtdSchema.safeParse({
      ttd: {
        pathname: `berkas/${BERKAS_ID}/validasi/2/ttd.png`,
      },
      catatan: null,
    }).success,
    true,
  );
});
