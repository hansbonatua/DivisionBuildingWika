import { z } from "zod";
import {
  LEARNING_CATEGORY_NAME_MAX_LENGTH,
  LEARNING_CONTENT_TYPES,
  LEARNING_DESCRIPTION_MAX_LENGTH,
  LEARNING_MAX_ATTACHMENTS,
  LEARNING_TITLE_MAX_LENGTH,
  LEARNING_URL_MAX_LENGTH,
} from "@/lib/learning/constants";
import {
  isLearningAttachmentFileName,
  isValidLearningAttachmentPathname,
  isValidLearningThumbnailPathname,
} from "@/lib/learning/storage-path";

// Input contracts for Building Learning Center. Bodies are snake_case to match
// the public API, while repository/service internals stay camelCase. `.strict()`
// rejects audit fields, ids and pathnames the caller may not choose.

const uuidField = z.uuid("ID tidak valid");

const judulField = z
  .string()
  .trim()
  .min(1, "Judul wajib diisi")
  .max(
    LEARNING_TITLE_MAX_LENGTH,
    `Judul maksimal ${LEARNING_TITLE_MAX_LENGTH} karakter`,
  );

// Create: absent/null/empty all mean "no description".
const descriptionField = z
  .string()
  .trim()
  .max(
    LEARNING_DESCRIPTION_MAX_LENGTH,
    `Deskripsi maksimal ${LEARNING_DESCRIPTION_MAX_LENGTH} karakter`,
  )
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null));

// Update: undefined keeps the current value, null/empty clears it.
const descriptionPatchField = z
  .string()
  .trim()
  .max(
    LEARNING_DESCRIPTION_MAX_LENGTH,
    `Deskripsi maksimal ${LEARNING_DESCRIPTION_MAX_LENGTH} karakter`,
  )
  .nullable()
  .optional()
  .transform((value) =>
    value === undefined
      ? undefined
      : value === null || value.length === 0
        ? null
        : value,
  );

const urlField = z
  .string()
  .trim()
  .max(LEARNING_URL_MAX_LENGTH, `URL maksimal ${LEARNING_URL_MAX_LENGTH} karakter`)
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null));

const urlPatchField = z
  .string()
  .trim()
  .max(LEARNING_URL_MAX_LENGTH, `URL maksimal ${LEARNING_URL_MAX_LENGTH} karakter`)
  .nullable()
  .optional()
  .transform((value) =>
    value === undefined
      ? undefined
      : value === null || value.length === 0
        ? null
        : value,
  );

const thumbnailPathnameField = z
  .string()
  .trim()
  .min(1, "Path thumbnail wajib diisi")
  .max(500, "Path thumbnail maksimal 500 karakter")
  .refine(
    isValidLearningThumbnailPathname,
    "Path thumbnail tidak valid atau berada di luar folder learning",
  );

const attachmentNameField = z
  .string()
  .trim()
  .min(1, "Nama lampiran wajib diisi")
  .max(255, "Nama lampiran maksimal 255 karakter");

/**
 * A newly uploaded attachment, as the browser reports it.
 *
 * `file_mime_type` and `file_size_bytes` are accepted only for contract
 * compatibility with the P3 document; the service IGNORES them and stores the
 * authoritative values read from Blob metadata. A client can therefore never
 * declare a PDF as 1 KB.
 */
const newAttachmentInputSchema = z
  .object({
    nama: attachmentNameField,
    file_name: z
      .string()
      .trim()
      .min(1, "Nama file wajib diisi")
      .max(255, "Nama file maksimal 255 karakter")
      .refine(
        isLearningAttachmentFileName,
        "Format lampiran harus PDF, Word, Excel, PowerPoint, atau ZIP",
      ),
    file_pathname: z
      .string()
      .trim()
      .min(1, "Path lampiran wajib diisi")
      .max(500, "Path lampiran maksimal 500 karakter")
      .refine(
        isValidLearningAttachmentPathname,
        "Path lampiran tidak valid atau berada di luar folder learning",
      ),
    file_mime_type: z.string().trim().max(200).optional(),
    file_size_bytes: z.number().int().positive().optional(),
  })
  .strict();

/**
 * An attachment that already exists on the content.
 *
 * The API deliberately never returns Blob pathnames, so an edit cannot identify
 * a kept attachment by pathname. It references the row by id instead, which is
 * also what keeps `PATCH` a replace-set without dropping untouched files.
 */
const existingAttachmentInputSchema = z
  .object({
    id: uuidField,
    nama: attachmentNameField,
  })
  .strict();

export const learningAttachmentPatchSchema = z.union([
  existingAttachmentInputSchema,
  newAttachmentInputSchema,
]);

export type LearningNewAttachmentInput = z.infer<
  typeof newAttachmentInputSchema
>;

export type LearningAttachmentPatchInput = z.infer<
  typeof learningAttachmentPatchSchema
>;

export const createLearningContentSchema = z
  .object({
    type: z.enum(LEARNING_CONTENT_TYPES, "Tipe konten tidak valid"),
    judul: judulField,
    deskripsi: descriptionField,
    kategori_id: uuidField,
    thumbnail_pathname: thumbnailPathnameField,
    video_url: urlField,
    external_url: urlField,
    attachments: z
      .array(newAttachmentInputSchema)
      .max(
        LEARNING_MAX_ATTACHMENTS,
        `Maksimal ${LEARNING_MAX_ATTACHMENTS} lampiran per konten`,
      )
      .optional(),
  })
  .strict();

export type CreateLearningContentInput = z.infer<
  typeof createLearningContentSchema
>;

export const updateLearningContentSchema = z
  .object({
    // Accepted only so the service can answer 400 when it differs from the
    // stored type; `type` is immutable after creation.
    type: z.enum(LEARNING_CONTENT_TYPES, "Tipe konten tidak valid").optional(),
    judul: judulField.optional(),
    deskripsi: descriptionPatchField,
    kategori_id: uuidField.optional(),
    thumbnail_pathname: thumbnailPathnameField.optional(),
    video_url: urlPatchField,
    external_url: urlPatchField,
    attachments: z
      .array(learningAttachmentPatchSchema)
      .max(
        LEARNING_MAX_ATTACHMENTS,
        `Maksimal ${LEARNING_MAX_ATTACHMENTS} lampiran per konten`,
      )
      .optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const hasField =
      value.type !== undefined ||
      value.judul !== undefined ||
      value.deskripsi !== undefined ||
      value.kategori_id !== undefined ||
      value.thumbnail_pathname !== undefined ||
      value.video_url !== undefined ||
      value.external_url !== undefined ||
      value.attachments !== undefined;

    if (!hasField) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "Body update tidak boleh kosong",
      });
    }
  });

export type UpdateLearningContentInput = z.infer<
  typeof updateLearningContentSchema
>;

export const learningContentListQuerySchema = z.object({
  type: z.enum(LEARNING_CONTENT_TYPES, "Tipe konten wajib diisi"),
  category: uuidField.optional(),
  q: z
    .string()
    .trim()
    .max(200, "Pencarian maksimal 200 karakter")
    .optional(),
  page: z.coerce
    .number("Halaman harus berupa angka")
    .int("Halaman harus berupa bilangan bulat")
    .min(1, "Halaman minimal 1")
    .optional(),
});

export type LearningContentListQuery = z.infer<
  typeof learningContentListQuerySchema
>;

export const createLearningCategorySchema = z
  .object({
    nama: z
      .string()
      .trim()
      .min(1, "Nama kategori wajib diisi")
      .max(
        LEARNING_CATEGORY_NAME_MAX_LENGTH,
        `Nama kategori maksimal ${LEARNING_CATEGORY_NAME_MAX_LENGTH} karakter`,
      ),
    sort_order: z
      .number("Urutan harus berupa angka")
      .int("Urutan harus berupa bilangan bulat")
      .min(0, "Urutan minimal 0")
      .optional(),
  })
  .strict();

export type CreateLearningCategoryInput = z.infer<
  typeof createLearningCategorySchema
>;

/**
 * Payload carried in `@vercel/blob/client` `clientPayload`. The token route
 * reads `kind` BEFORE signing, because thumbnails are signed with the public
 * CMS store token while attachments use the private store token.
 */
export const learningUploadClientPayloadSchema = z
  .object({
    kind: z.enum(["thumbnail", "attachment"], "Jenis upload tidak valid"),
    upload_id: z.uuid("ID upload tidak valid").optional(),
  })
  .strict();

export type LearningUploadClientPayload = z.infer<
  typeof learningUploadClientPayloadSchema
>;

/**
 * Orphan cleanup: exactly one pathname, either a public thumbnail or a private
 * attachment. The service refuses a pathname that a row still references.
 */
export const deleteLearningBlobSchema = z
  .object({
    pathname: z
      .string()
      .trim()
      .min(1, "Path file wajib diisi")
      .max(500, "Path file maksimal 500 karakter")
      .refine(
        (value) =>
          isValidLearningThumbnailPathname(value) ||
          isValidLearningAttachmentPathname(value),
        "Path file tidak valid atau berada di luar folder Building Learning Center",
      ),
  })
  .strict();

export type DeleteLearningBlobInput = z.infer<typeof deleteLearningBlobSchema>;
