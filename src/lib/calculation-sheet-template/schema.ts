import { z } from "zod";
import {
  isCstCategoryId,
  type CstCategoryId,
} from "@/lib/calculation-sheet-template/constants";

// Input contracts for Calculation Sheet Template (CST).
//
// `kategori` is create-only and is ABSENT from the update contract: a template
// cannot be moved between categories (delete + create instead). Identity and
// audit fields are server-owned and rejected by .strict() rather than silently
// stripped.
//
// Kode is normalized to uppercase; empty optional text becomes NULL. Evidence
// is a URL only (no upload): absolute http(s), max 2048 characters.

export const CST_KODE_MAX = 30;
export const CST_NAMA_MAX = 200;
export const CST_EVIDENCE_URL_MAX = 2048;
export const CST_CATATAN_MAX = 2000;

export function isSafeCstUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

const kategoriField = z
  .string()
  .trim()
  .refine(isCstCategoryId, "Kategori tidak valid")
  .transform((value) => value as CstCategoryId);

const kodeField = z
  .string()
  .trim()
  .min(1, "Kode wajib diisi")
  .max(CST_KODE_MAX, `Kode maksimal ${CST_KODE_MAX} karakter`)
  .transform((value) => value.toUpperCase());

const namaField = z
  .string()
  .trim()
  .min(1, "Nama wajib diisi")
  .max(CST_NAMA_MAX, `Nama maksimal ${CST_NAMA_MAX} karakter`);

const picUserIdField = z.uuid("PIC tidak valid");

const evidenceUrlField = z
  .string()
  .trim()
  .max(CST_EVIDENCE_URL_MAX, `URL evidence maksimal ${CST_EVIDENCE_URL_MAX} karakter`)
  .refine(
    (value) => value.length === 0 || isSafeCstUrl(value),
    "URL evidence harus diawali http:// atau https://",
  )
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null));

const catatanField = z
  .string()
  .trim()
  .max(CST_CATATAN_MAX, `Catatan maksimal ${CST_CATATAN_MAX} karakter`)
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null));

export const createCalculationSheetTemplateSchema = z
  .object({
    kategori: kategoriField,
    kode: kodeField,
    nama: namaField,
    pic_user_id: picUserIdField,
    evidence_url: evidenceUrlField,
    catatan: catatanField,
  })
  .strict();

export type CreateCalculationSheetTemplateInput = z.infer<
  typeof createCalculationSheetTemplateSchema
>;

// Update keeps every editable field REQUIRED (PUT semantics) but deliberately
// omits `kategori`. Passing kategori is rejected by .strict(), not ignored.
export const updateCalculationSheetTemplateSchema = z
  .object({
    kode: kodeField,
    nama: namaField,
    pic_user_id: picUserIdField,
    evidence_url: evidenceUrlField,
    catatan: catatanField,
  })
  .strict();

export type UpdateCalculationSheetTemplateInput = z.infer<
  typeof updateCalculationSheetTemplateSchema
>;
