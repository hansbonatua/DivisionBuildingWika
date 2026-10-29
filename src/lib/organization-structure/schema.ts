import { z } from "zod";

// Struktur Organisasi input contract.
//
// ONE operation exists: replace (or create) the single active chart. The body
// describes an object the browser has ALREADY uploaded to the public CMS store
// namespace `cms/organization/`; the server re-verifies that object before
// anything is persisted.
//
// Strict by design, matching @/lib/msl/schema:
//   - `imageSource` is the literal "upload". External/hot-linked URLs are not a
//     supported source for this module, so the value is fixed rather than free.
//   - Every server-owned column (id, singleton, createdBy, updatedBy,
//     createdAt, updatedAt, fileName) is REJECTED by .strict() instead of being
//     silently stripped, so a client cannot attempt to set an actor or a
//     timestamp and believe it worked.
//   - `fileName` is derived server-side from the pathname's final segment.

export const replaceOrganizationStructureSchema = z
  .object({
    imageUrl: z
      .string()
      .trim()
      .min(1, "URL gambar wajib diisi")
      .max(2000, "URL gambar terlalu panjang"),
    imageSource: z.literal("upload"),
    blobPathname: z
      .string()
      .trim()
      .min(1, "Lokasi file gambar wajib diisi")
      .max(400, "Lokasi file gambar terlalu panjang"),
  })
  .strict();

export type ReplaceOrganizationStructureInput = z.infer<
  typeof replaceOrganizationStructureSchema
>;
