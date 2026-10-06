import { z } from "zod";

export const createGreenBuildingSchema = z.object({
  projectName: z.string().trim().min(1, "Project name wajib diisi").max(160),
  certificationBody: z.string().trim().min(1, "Certification body wajib diisi").max(160),
  certificationType: z.string().trim().max(100).default("Greenship"),
  level: z.string().trim().max(100).default("Certified"),
  year: z.number().int().min(2000).max(2100).default(new Date().getFullYear()),
  certificateNumber: z.string().trim().max(120).default(""),
  score: z.number().min(0).max(100).default(0),
  description: z.string().trim().max(500).default(""),
  imageUrl: z.string().trim().min(1, "Image URL wajib diisi"),
  imageAlt: z.string().trim().max(200).default(""),
  status: z.enum(["Verified", "Pending", "Expired"]).default("Pending"),
  publishStatus: z.enum(["Draft", "Published", "Archived"]).default("Draft"),
  sortOrder: z.number().int().min(0).optional(),
});

// NOTE: default-free optionals (Hero Phase 2C lesson) — .partial() over
// .default() fields would inject defaults for absent keys and wipe stored
// values on partial PATCH. Omitted fields must remain omitted here.
export const updateGreenBuildingSchema = z
  .object({
    projectName: z.string().trim().min(1, "Project name wajib diisi").max(160).optional(),
    certificationBody: z.string().trim().min(1, "Certification body wajib diisi").max(160).optional(),
    certificationType: z.string().trim().max(100).optional(),
    level: z.string().trim().max(100).optional(),
    year: z.number().int().min(2000).max(2100).optional(),
    certificateNumber: z.string().trim().max(120).optional(),
    score: z.number().min(0).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    imageUrl: z.string().trim().min(1, "Image URL wajib diisi").optional(),
    imageAlt: z.string().trim().max(200).optional(),
    status: z.enum(["Verified", "Pending", "Expired"]).optional(),
    publishStatus: z.enum(["Draft", "Published", "Archived"]).optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Body update tidak boleh kosong",
  });

export type CreateGreenBuildingInput = z.infer<typeof createGreenBuildingSchema>;
export type UpdateGreenBuildingInput = z.infer<typeof updateGreenBuildingSchema>;
