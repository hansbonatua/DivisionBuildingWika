import { z } from "zod";
import {
  isRegulationAllowedFileName,
  isValidRegulationBlobPathname,
} from "@/lib/regulation/storage";
import { isRegulationDisiplinKey } from "@/lib/regulation/constants";

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

const optionalNoteField = z
  .string()
  .trim()
  .max(2000, "Catatan maksimal 2.000 karakter")
  .nullable()
  .optional()
  .transform((value) =>
    value === undefined
      ? undefined
      : value === null || value.length === 0
        ? null
        : value,
  );

const fileNameField = z
  .string()
  .trim()
  .min(1, "Nama file wajib diisi")
  .max(255, "Nama file maksimal 255 karakter")
  .refine(
    isRegulationAllowedFileName,
    "Format file harus PDF, Word, Excel, atau ZIP",
  );

const blobPathnameField = z
  .string()
  .trim()
  .min(1, "Path file wajib diisi")
  .max(500, "Path file maksimal 500 karakter")
  .refine(
    isValidRegulationBlobPathname,
    "Path file tidak valid atau berada di luar folder Regulation",
  );

const uuidField = z.uuid("ID tidak valid");

export const createSubKategoriSchema = z
  .object({
    kode: kodeField,
    nama: namaField,
    note: noteField,
  })
  .strict();

export type CreateSubKategoriInput = z.infer<typeof createSubKategoriSchema>;

export const updateSubKategoriSchema = z
  .object({
    kode: kodeField,
    nama: namaField,
    note: optionalNoteField,
  })
  .strict();

export type UpdateSubKategoriInput = z.infer<typeof updateSubKategoriSchema>;

export const createDocumentSchema = z
  .object({
    kode: kodeField,
    nama: namaField,
    note: noteField,
    file_name: fileNameField,
    blob_pathname: blobPathnameField,
  })
  .strict();

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z
  .object({
    kode: kodeField.optional(),
    nama: namaField.optional(),
    note: optionalNoteField,
    file_name: fileNameField.optional(),
    blob_pathname: blobPathnameField.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const hasFile = value.file_name !== undefined || value.blob_pathname !== undefined;
    const hasBoth =
      value.file_name !== undefined && value.blob_pathname !== undefined;
    if (hasFile && !hasBoth) {
      context.addIssue({
        code: "custom",
        path: [value.file_name === undefined ? "file_name" : "blob_pathname"],
        message: "Nama file dan path file harus dikirim bersamaan",
      });
    }
    if (
      value.kode === undefined &&
      value.nama === undefined &&
      value.note === undefined &&
      !hasFile
    ) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "Body update tidak boleh kosong",
      });
    }
  });

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const reorderSchema = z
  .object({
    entity: z.enum(["sub_kategori", "document"]),
    parent_id: z.string().trim().min(1, "Parent wajib diisi").max(64),
    ordered_ids: z.array(uuidField).min(1, "Daftar reorder tidak boleh kosong"),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.entity === "sub_kategori" &&
      !isRegulationDisiplinKey(value.parent_id)
    ) {
      context.addIssue({
        code: "custom",
        path: ["parent_id"],
        message: "Parent sub-kategori harus disiplin Regulation",
      });
    }
    if (value.entity === "document" && !UUID_RE.test(value.parent_id)) {
      context.addIssue({
        code: "custom",
        path: ["parent_id"],
        message: "Parent dokumen harus UUID sub-kategori",
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

export const deleteRegulationBlobSchema = z
  .object({
    pathname: blobPathnameField,
  })
  .strict();

export type DeleteRegulationBlobInput = z.infer<
  typeof deleteRegulationBlobSchema
>;
