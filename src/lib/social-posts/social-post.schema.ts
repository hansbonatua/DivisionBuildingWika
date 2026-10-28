import { z } from "zod";
import { CMS_SOCIAL_IMAGE_SOURCE_TYPES } from "@/lib/cms/image-source";

// Curated Instagram feed — the image is OPTIONAL, so this is the only CMS schema
// with a three-state source ("upload" | "external" | "none").
//
// `url` is the ORIGINAL Instagram post URL (what the landing CTA opens).
// `imageUrl` is the image shown on the WIBEX landing and is unrelated to it: it
// may be a CMS public Blob upload, any external image URL, or empty when the
// post is published without an image (the landing then renders its glyph).
//
// `imageUrl` therefore cannot be `.min(1)` as it was before the curated-feed
// revision. The "required unless Tanpa Gambar" rule is enforced server-side
// (social-post.service.ts) where the source is known.
const imageSourceSchema = z.enum(CMS_SOCIAL_IMAGE_SOURCE_TYPES);
const blobPathnameSchema = z.string().trim().min(1).max(400);

export const createSocialPostSchema = z.object({
  platform: z.enum(["instagram"]).default("instagram"),
  account: z.string().trim().min(1, "Account wajib diisi").max(100),
  caption: z.string().trim().max(500).default(""),
  url: z.string().trim().min(1, "URL wajib diisi").max(500),
  type: z.string().trim().min(1).max(30).default("Image"),
  imageUrl: z.string().trim().max(500).default(""),
  imageSource: imageSourceSchema.optional(),
  blobPathname: blobPathnameSchema.nullable().optional(),
  imageAlt: z.string().trim().max(200).default(""),
  status: z.enum(["Published", "Draft", "Hidden"]).default("Draft"),
  sortOrder: z.number().int().min(0).optional(),
});

// NOTE: default-free optionals (Hero Phase 2C lesson) — .partial() over
// .default() fields would inject defaults for absent keys and wipe stored
// values on partial PATCH. Omitted fields must remain omitted here.
export const updateSocialPostSchema = z
  .object({
    platform: z.enum(["instagram"]).optional(),
    account: z.string().trim().min(1, "Account wajib diisi").max(100).optional(),
    caption: z.string().trim().max(500).optional(),
    url: z.string().trim().min(1, "URL wajib diisi").max(500).optional(),
    type: z.string().trim().min(1).max(30).optional(),
    imageUrl: z.string().trim().max(500).optional(),
    imageSource: imageSourceSchema.optional(),
    blobPathname: blobPathnameSchema.nullable().optional(),
    imageAlt: z.string().trim().max(200).optional(),
    status: z.enum(["Published", "Draft", "Hidden"]).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type CreateSocialPostInput = z.infer<typeof createSocialPostSchema>;
export type UpdateSocialPostInput = z.infer<typeof updateSocialPostSchema>;
