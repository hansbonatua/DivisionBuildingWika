import { z } from "zod";
import {
  BERKAS_VALIDATION_ROLES,
  isBerkasUploadPathname,
  isBerkasValidationTtdPathname,
} from "@/lib/berkas/storage-path";

// Berkas input contracts (Sub-fase B).
//
// The browser uploads bytes directly to the private Blob store, then sends
// metadata here. The server re-verifies every pathname and object; these
// schemas only reject malformed shapes early.
//
// Per the current implementation brief, Tim Penyusun is capped at ONE member
// and there are exactly two validator slots.

const uuidField = z.uuid("ID tidak valid");

const signerNameField = z
  .string()
  .trim()
  .min(1, "Nama penanda tangan tidak boleh kosong")
  .max(150, "Nama penanda tangan maksimal 150 karakter")
  .optional();

const jabatanField = z
  .string()
  .trim()
  .min(1, "Jabatan wajib diisi")
  .max(150, "Jabatan maksimal 150 karakter");

const uploadPathField = z
  .string()
  .trim()
  .min(1, "Path file wajib diisi")
  .max(500, "Path file maksimal 500 karakter")
  .refine(
    isBerkasUploadPathname,
    "Path file tidak valid atau berada di luar folder upload Berkas",
  );

const validationTtdPathField = z
  .string()
  .trim()
  .min(1, "Path TTD wajib diisi")
  .max(500, "Path TTD maksimal 500 karakter")
  .refine(
    isBerkasValidationTtdPathname,
    "Path TTD tidak valid atau berada di luar folder validasi Berkas",
  );

const fileNameField = z
  .string()
  .trim()
  .min(1, "Nama file wajib diisi")
  .max(255, "Nama file maksimal 255 karakter")
  .refine(
    (value) => !value.includes("/") && !value.includes("\\"),
    "Nama file tidak boleh mengandung path",
  )
  .refine(
    (value) => value.toLowerCase().endsWith(".pdf"),
    "File asli harus berformat PDF",
  );

export const createBerkasSchema = z
  .object({
    judul: z
      .string()
      .trim()
      .min(1, "Judul berkas wajib diisi")
      .max(200, "Judul berkas maksimal 200 karakter"),
    uploadId: uuidField,
    originalPdf: z
      .object({
        pathname: uploadPathField,
        fileName: fileNameField,
        pageCount: z
          .number()
          .int("Jumlah halaman harus bilangan bulat")
          .min(1, "PDF minimal 1 halaman")
          .max(200, "PDF maksimal 200 halaman"),
      })
      .strict(),
    penyusun: z
      .array(
        z
          .object({
            userId: uuidField,
            nama: signerNameField,
            jabatan: jabatanField,
            urutan: z.literal(1),
            ttdPathname: uploadPathField,
          })
          .strict(),
      )
      .min(1, "Minimal 1 penyusun")
      .max(1, "Maksimal 1 penyusun"),
    validasi: z
      .array(
        z
          .object({
            userId: uuidField,
            nama: signerNameField,
            jabatan: jabatanField,
            urutan: z.union([z.literal(1), z.literal(2)]),
          })
          .strict(),
      )
      .length(2, "Validasi harus tepat 2 orang"),
  })
  .strict()
  .superRefine((value, ctx) => {
    const penyusunIds = value.penyusun.map((item) => item.userId);
    if (new Set(penyusunIds).size !== penyusunIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["penyusun"],
        message: "Penyusun tidak boleh duplikat",
      });
    }

    const validatorIds = value.validasi.map((item) => item.userId);
    if (new Set(validatorIds).size !== 2) {
      ctx.addIssue({
        code: "custom",
        path: ["validasi"],
        message: "Validator 1 dan Validator 2 harus orang berbeda",
      });
    }

    const urutan = value.validasi.map((item) => item.urutan).sort();
    if (urutan.length !== 2 || urutan[0] !== 1 || urutan[1] !== 2) {
      ctx.addIssue({
        code: "custom",
        path: ["validasi"],
        message: "Validasi harus memiliki urutan 1 dan 2",
      });
    }

    const pathnames = [
      value.originalPdf.pathname,
      ...value.penyusun.map((item) => item.ttdPathname),
    ];
    if (new Set(pathnames).size !== pathnames.length) {
      ctx.addIssue({
        code: "custom",
        path: ["originalPdf", "pathname"],
        message: "Path file tidak boleh digunakan lebih dari sekali",
      });
    }
  });

export type CreateBerkasInput = z.infer<typeof createBerkasSchema>;

export const uploadTtdSchema = z
  .object({
    ttd: z
      .object({
        pathname: validationTtdPathField,
      })
      .strict(),
    catatan: z
      .string()
      .trim()
      .max(2000, "Catatan maksimal 2000 karakter")
      .nullable()
      .optional(),
  })
  .strict();

export type UploadTtdInput = z.infer<typeof uploadTtdSchema>;

// Payload carried in @vercel/blob/client `clientPayload`; the token route
// parses it to constrain the pathname, size and content type.
export const berkasUploadClientPayloadSchema = z
  .object({
    kind: z.enum(["original", "penyusun_ttd", "validator_ttd"]),
    uploadId: uuidField.optional(),
    urutan: z.number().int().min(1).max(1).optional(),
    // Validator signatures are scoped to an existing Berkas and one of its two
    // validation slots, not to a create batch. These fields are intentionally
    // absent for original/penyusun uploads.
    berkasId: uuidField.optional(),
    role: z.enum(BERKAS_VALIDATION_ROLES).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.kind === "validator_ttd") {
      if (value.berkasId === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["berkasId"],
          message: "Berkas wajib diisi untuk TTD validator",
        });
      }
      if (value.role === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["role"],
          message: "Peran validator wajib diisi",
        });
      }
      if (value.uploadId !== undefined || value.urutan !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["kind"],
          message: "TTD validator tidak memakai uploadId atau urutan",
        });
      }
      return;
    }

    if (value.uploadId === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["uploadId"],
        message: "Upload ID wajib diisi",
      });
    }
    if (value.berkasId !== undefined || value.role !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["kind"],
        message: "Berkas dan peran hanya berlaku untuk TTD validator",
      });
    }
    if (value.kind === "original" && value.urutan !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["urutan"],
        message: "Urutan tidak berlaku untuk PDF asli",
      });
    }
    if (value.kind === "penyusun_ttd" && value.urutan === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["urutan"],
        message: "Urutan penyusun wajib diisi",
      });
    }
  });

export type BerkasUploadClientPayload = z.infer<
  typeof berkasUploadClientPayloadSchema
>;
