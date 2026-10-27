import { z } from "zod";
import { TEMPLATE_FORM_SOURCE_TYPES } from "@/lib/template-form/source";
import { isValidTemplateFormBlobPathname } from "@/lib/template-form/storage-path";

// Template & Form input contracts (revised V1).
//
// Every record has exactly one source: `link` or `upload`.
// - Existing clients that send only { name, fileUrl, uploaderPicUserId } keep
//   working: a missing `sourceType` is interpreted as `link`.
// - Upload metadata is part of the contract and is now writable once the
//   server has verified the stored object exists (see service.ts).
//
// Validation is a single strict object plus a cross-field `superRefine` (rather
// than a discriminated union) so validation errors keep landing in
// `flatten().fieldErrors` and the existing editor can show the specific message.

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const nameField = z.string().trim().min(1, "Nama wajib diisi").max(200);

const fileUrlField = z
  .string()
  .trim()
  .min(1, "File URL wajib diisi")
  .max(2000, "File URL maksimal 2000 karakter")
  .refine(isHttpUrl, "File URL harus menggunakan http atau https");

const uploaderPicUserIdField = z.uuid("PIC tidak valid");

const sourceTypeField = z.enum(TEMPLATE_FORM_SOURCE_TYPES, {
  message: "Sumber file tidak valid",
});

const fileNameField = z
  .string()
  .trim()
  .min(1, "Nama file wajib diisi")
  .max(255, "Nama file maksimal 255 karakter");

const fileMimeTypeField = z
  .string()
  .trim()
  .min(1, "Tipe file tidak valid")
  .max(200, "Tipe file maksimal 200 karakter");

const fileSizeBytesField = z
  .number()
  .int("Ukuran file tidak valid")
  .positive("Ukuran file harus lebih dari 0");

const blobPathnameField = z
  .string()
  .trim()
  .min(1, "Path file wajib diisi")
  .max(500, "Path file maksimal 500 karakter")
  .refine(
    isValidTemplateFormBlobPathname,
    "Path file tidak valid atau berada di luar folder Template & Form",
  );

type UploadFieldKey =
  | "fileName"
  | "fileMimeType"
  | "fileSizeBytes"
  | "blobPathname";

function presentUploadFields(value: {
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  blobPathname?: string;
}): UploadFieldKey[] {
  const keys: UploadFieldKey[] = [];
  if (value.fileName !== undefined) keys.push("fileName");
  if (value.fileMimeType !== undefined) keys.push("fileMimeType");
  if (value.fileSizeBytes !== undefined) keys.push("fileSizeBytes");
  if (value.blobPathname !== undefined) keys.push("blobPathname");
  return keys;
}

export const createTemplateFormSchema = z
  .object({
    sourceType: sourceTypeField.default("link"),
    name: nameField,
    fileUrl: fileUrlField.optional(),
    fileName: fileNameField.optional(),
    fileMimeType: fileMimeTypeField.optional(),
    fileSizeBytes: fileSizeBytesField.optional(),
    blobPathname: blobPathnameField.optional(),
    uploaderPicUserId: uploaderPicUserIdField,
  })
  .strict()
  .superRefine((value, ctx) => {
    const uploadKeys = presentUploadFields(value);

    if (value.sourceType === "link") {
      if (value.fileUrl === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["fileUrl"],
          message: "File URL wajib diisi",
        });
      }
      for (const key of uploadKeys) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Data upload tidak boleh dikirim untuk sumber Link",
        });
      }
      return;
    }

    if (value.fileUrl !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["fileUrl"],
        message: "File URL tidak boleh dikirim untuk sumber Upload",
      });
    }
    if (value.fileName === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["fileName"],
        message: "Nama file wajib diisi",
      });
    }
    if (value.blobPathname === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["blobPathname"],
        message: "Path file wajib diisi",
      });
    }
  });

export type CreateTemplateFormInput = z.infer<
  typeof createTemplateFormSchema
>;

// Partial update. A name/PIC-only patch must never touch the source or file:
// when `sourceType` is absent, upload metadata is rejected instead of being
// silently ignored, so a partial PATCH can never clear a record's file.
export const updateTemplateFormSchema = z
  .object({
    sourceType: sourceTypeField.optional(),
    name: nameField.optional(),
    fileUrl: fileUrlField.optional(),
    fileName: fileNameField.optional(),
    fileMimeType: fileMimeTypeField.optional(),
    fileSizeBytes: fileSizeBytesField.optional(),
    blobPathname: blobPathnameField.optional(),
    uploaderPicUserId: uploaderPicUserIdField.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "Body update tidak boleh kosong",
      });
      return;
    }

    const uploadKeys = presentUploadFields(value);

    if (value.sourceType === undefined) {
      if (uploadKeys.length > 0) {
        ctx.addIssue({
          code: "custom",
          path: ["sourceType"],
          message: "Sumber file wajib disertakan saat mengirim data upload",
        });
      }
      return;
    }

    if (value.sourceType === "link") {
      if (value.fileUrl === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["fileUrl"],
          message: "File URL wajib diisi",
        });
      }
      for (const key of uploadKeys) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: "Data upload tidak boleh dikirim untuk sumber Link",
        });
      }
      return;
    }

    if (value.fileUrl !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["fileUrl"],
        message: "File URL tidak boleh dikirim untuk sumber Upload",
      });
    }
    if (value.fileName === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["fileName"],
        message: "Nama file wajib diisi",
      });
    }
    if (value.blobPathname === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["blobPathname"],
        message: "Path file wajib diisi",
      });
    }
  });

export type UpdateTemplateFormInput = z.infer<
  typeof updateTemplateFormSchema
>;

// Orphan-cleanup input: a single Template & Form storage pathname. The client
// can never name a free-form blob location.
export const deleteTemplateFormBlobSchema = z
  .object({
    pathname: blobPathnameField,
  })
  .strict();

export type DeleteTemplateFormBlobInput = z.infer<
  typeof deleteTemplateFormBlobSchema
>;
