import { z } from "zod";

export const createSocialPostSchema = z.object({
  platform: z.enum(["instagram"]).default("instagram"),
  account: z.string().trim().min(1, "Account wajib diisi").max(100),
  caption: z.string().trim().max(500).default(""),
  url: z.string().trim().min(1, "URL wajib diisi").max(500),
  type: z.string().trim().min(1).max(30).default("Image"),
  imageUrl: z.string().trim().min(1, "Image URL wajib diisi"),
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
    imageUrl: z.string().trim().min(1, "Image URL wajib diisi").optional(),
    imageAlt: z.string().trim().max(200).optional(),
    status: z.enum(["Published", "Draft", "Hidden"]).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type CreateSocialPostInput = z.infer<typeof createSocialPostSchema>;
export type UpdateSocialPostInput = z.infer<typeof updateSocialPostSchema>;
