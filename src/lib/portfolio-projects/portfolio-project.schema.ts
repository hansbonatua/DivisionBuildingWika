import { z } from "zod";

export const createPortfolioProjectSchema = z.object({
  title: z.string().trim().min(1, "Title wajib diisi").max(160),
  category: z.string().trim().min(1, "Category wajib diisi").max(120),
  location: z.string().trim().min(1, "Location wajib diisi").max(160),
  imageUrl: z.string().trim().min(1, "Image URL wajib diisi"),
  imageAlt: z.string().trim().max(200).default(""),
  description: z.string().trim().max(1000).default(""),
  progress: z.number().int().min(0).max(100).default(0),
  status: z.enum(["Active", "Draft"]).default("Active"),
  sortOrder: z.number().int().min(0).optional(),
});

// NOTE: default-free optionals (Hero Phase 2C lesson) — .partial() over
// .default() fields would inject defaults for absent keys and wipe stored
// values on partial PATCH. Omitted fields must remain omitted here.
export const updatePortfolioProjectSchema = z
  .object({
    title: z.string().trim().min(1, "Title wajib diisi").max(160).optional(),
    category: z.string().trim().min(1, "Category wajib diisi").max(120).optional(),
    location: z.string().trim().min(1, "Location wajib diisi").max(160).optional(),
    imageUrl: z.string().trim().min(1, "Image URL wajib diisi").optional(),
    imageAlt: z.string().trim().max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    progress: z.number().int().min(0).max(100).optional(),
    status: z.enum(["Active", "Draft"]).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type CreatePortfolioProjectInput = z.infer<typeof createPortfolioProjectSchema>;
export type UpdatePortfolioProjectInput = z.infer<typeof updatePortfolioProjectSchema>;
