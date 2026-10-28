import { z } from "zod";
import { CMS_IMAGE_SOURCE_TYPES } from "@/lib/cms/image-source";

// Image ownership metadata, identical to Hero/Portfolio/Green Building:
// `logoUrl` stays the only render field (public feed and the landing grid read
// only that), while these two optional fields let cleanup tell a CMS object
// from a hot-linked URL. Legacy documents have neither and are treated as
// external. The shared CMS field names are reused on purpose instead of a
// Clients-only `logoSource`: one source model, one cleanup path.
const imageSourceSchema = z.enum(CMS_IMAGE_SOURCE_TYPES);
const blobPathnameSchema = z.string().trim().min(1).max(400);

export const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name wajib diisi").max(120),
  shortName: z.string().trim().max(120).default(""),
  category: z.string().trim().max(160).default(""),
  link: z.string().trim().max(500).default(""),
  logoUrl: z.string().trim().min(1, "Logo URL wajib diisi"),
  imageSource: imageSourceSchema.optional(),
  blobPathname: blobPathnameSchema.nullable().optional(),
  logoAlt: z.string().trim().max(200).default(""),
  status: z.enum(["active", "hidden"]),
  sortOrder: z.number().int().min(0).optional(),
});

// NOTE: default-free optionals (Hero Phase 2C lesson) — .partial() over
// .default() fields would inject defaults for absent keys and wipe stored
// values on partial PATCH. Omitted fields must remain omitted here.
export const updateClientSchema = z
  .object({
    name: z.string().trim().min(1, "Name wajib diisi").max(120).optional(),
    shortName: z.string().trim().max(120).optional(),
    category: z.string().trim().max(160).optional(),
    link: z.string().trim().max(500).optional(),
    logoUrl: z.string().trim().min(1, "Logo URL wajib diisi").optional(),
    imageSource: imageSourceSchema.optional(),
    blobPathname: blobPathnameSchema.nullable().optional(),
    logoAlt: z.string().trim().max(200).optional(),
    status: z.enum(["active", "hidden"]).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
