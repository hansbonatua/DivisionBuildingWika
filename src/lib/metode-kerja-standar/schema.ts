import { z } from "zod";
import { isDisiplinCode } from "@/lib/metode-kerja-standar/constants";

// Input contracts for Metode Kerja Standar.
//
// `disiplin`, `sub_kategori_id`, `sort_order`, audit fields and PIC targets are
// never accepted in create/update bodies. Kode is normalized to uppercase;
// empty optional text becomes NULL. Evidence URLs must be absolute http(s).

export function isSafeMetodeKerjaUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return false;
  }
  return parsed.protocol === "http:" || parsed.protocol === "https:";
}

const kodeField = z
  .string()
  .trim()
  .min(1, "Kode wajib diisi")
  .max(30, "Kode maksimal 30 karakter")
  .transform((value) => value.toUpperCase());

const namaField = z
  .string()
  .trim()
  .min(1, "Nama wajib diisi")
  .max(200, "Nama maksimal 200 karakter");

const noteField = z
  .string()
  .trim()
  .max(2000, "Catatan maksimal 2.000 karakter")
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null));

const evidenceUrlField = z
  .string()
  .trim()
  .max(2048, "URL evidence maksimal 2.048 karakter")
  .refine(
    (value) => value.length === 0 || isSafeMetodeKerjaUrl(value),
    "URL evidence harus diawali http:// atau https://",
  )
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null));

const uuidField = z.uuid("ID tidak valid");
const picIdsField = z.array(uuidField);
const itemPicIdsField = z
  .array(uuidField)
  .min(1, "Item wajib memiliki minimal 1 PIC");

export const createSubKategoriSchema = z
  .object({
    kode: kodeField,
    nama: namaField,
    pic_ids: picIdsField.optional().default([]),
    evidence_url: evidenceUrlField,
    note: noteField,
  })
  .strict();

export type CreateSubKategoriInput = z.infer<typeof createSubKategoriSchema>;

export const updateSubKategoriSchema = z
  .object({
    kode: kodeField,
    nama: namaField,
    // Required on edit: the form always sends the full PIC state. An empty
    // array is valid because sub-kategori PIC is optional.
    pic_ids: picIdsField,
    evidence_url: evidenceUrlField,
    note: noteField,
  })
  .strict();

export type UpdateSubKategoriInput = z.infer<typeof updateSubKategoriSchema>;

export const createItemSchema = z
  .object({
    kode: kodeField,
    nama: namaField,
    pic_ids: itemPicIdsField,
    evidence_url: evidenceUrlField,
    note: noteField,
  })
  .strict();

export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = z
  .object({
    kode: kodeField,
    nama: namaField,
    pic_ids: itemPicIdsField,
    evidence_url: evidenceUrlField,
    note: noteField,
  })
  .strict();

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const reorderSchema = z
  .object({
    entity: z.enum(["sub_kategori", "item"]),
    parent_id: z.string().trim().min(1, "Parent wajib diisi").max(64),
    ordered_ids: z.array(uuidField).min(1, "Daftar reorder tidak boleh kosong"),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.entity === "sub_kategori" && !isDisiplinCode(value.parent_id)) {
      context.addIssue({
        code: "custom",
        path: ["parent_id"],
        message: "Parent sub-kategori harus kode disiplin A–F",
      });
    }
    if (value.entity === "item" && !UUID_RE.test(value.parent_id)) {
      context.addIssue({
        code: "custom",
        path: ["parent_id"],
        message: "Parent item harus UUID sub-kategori",
      });
    }
    if (new Set(value.ordered_ids).size !== value.ordered_ids.length) {
      context.addIssue({
        code: "custom",
        path: ["ordered_ids"],
        message: "Daftar reorder tidak boleh berisi ID duplikat",
      });
    }
  });

export type ReorderInput = z.infer<typeof reorderSchema>;
